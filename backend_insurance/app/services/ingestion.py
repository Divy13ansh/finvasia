from __future__ import annotations

import asyncio
import io
import re
import time
import uuid
from typing import Any

import fitz
from langchain_core.documents import Document
from qdrant_client.http import models as rest

from app.core.config import get_settings
from app.dashboard.cache import cache_dashboard_facts_async
from app.services.llm import get_embeddings
from app.services.ocr import azure_vision_ocr, should_use_ocr
from app.services.qdrant_store import ensure_collection, get_client
from app.services.sectioning import build_section_chunks


def _clean_text(text: str) -> str:
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _normalize_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip().lower()


def _strip_boilerplate(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not pages:
        return pages

    line_counts: dict[str, int] = {}
    for page in pages:
        seen: set[str] = set()
        for line in page["text"].splitlines():
            norm = _normalize_line(line)
            if len(norm) < 8:
                continue
            seen.add(norm)
        for line in seen:
            line_counts[line] = line_counts.get(line, 0) + 1

    threshold = max(3, len(pages) // 2)
    boilerplate = {line for line, count in line_counts.items() if count >= threshold}

    cleaned_pages: list[dict[str, Any]] = []
    for page in pages:
        lines = []
        for line in page["text"].splitlines():
            norm = _normalize_line(line)
            if norm in boilerplate:
                continue
            lines.append(line)
        new_page = dict(page)
        new_page["text"] = _clean_text("\n".join(lines))
        new_page["raw_text"] = page["text"]
        cleaned_pages.append(new_page)

    return cleaned_pages


def _extract_pdf_pages(pdf_bytes: bytes) -> list[dict[str, Any]]:
    doc = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
    pages: list[dict[str, Any]] = []
    for idx in range(len(doc)):
        page = doc[idx]
        text = _clean_text(page.get_text("text"))
        pages.append(
            {
                "page_num": idx + 1,
                "text": text,
                "raw_text": text,
                "ocr_used": False,
            }
        )
    return pages


async def ingest_policy_pdf(pdf_bytes: bytes, filename: str, policy_name: str | None = None) -> dict[str, Any]:
    settings = get_settings()
    document_id = str(uuid.uuid4())
    started_at = time.perf_counter()

    def log_progress(step: str, progress: int, **details: Any) -> None:
        payload = {
            "document_id": document_id,
            "filename": filename,
            "progress": progress,
            **details,
        }
        print(f"[ingestion] {step} {payload}", flush=True)

    log_progress("received", 0, bytes=len(pdf_bytes), policy_name=policy_name or filename)

    pages = _extract_pdf_pages(pdf_bytes)
    log_progress("pdf_extracted", 15, pages=len(pages))

    use_ocr = bool(pages and should_use_ocr("\n".join(page["text"] for page in pages)))
    log_progress("ocr_check_complete", 25, enabled=use_ocr)

    if use_ocr:
        doc = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
        log_progress("ocr_started", 30, pages=len(doc))
        for idx in range(len(doc)):
            page = doc[idx]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image_bytes = pix.tobytes("png")
            try:
                ocr_text = await azure_vision_ocr(image_bytes)
            except Exception:
                ocr_text = ""
            if ocr_text.strip():
                pages[idx]["text"] = _clean_text(ocr_text)
                pages[idx]["ocr_used"] = True
            log_progress("ocr_page_processed", 30 + int(((idx + 1) / max(len(doc), 1)) * 15), page=idx + 1, ocr_used=bool(ocr_text.strip()))

    pages = _strip_boilerplate(pages)
    log_progress("boilerplate_stripped", 50, pages=len(pages))

    section_chunks = build_section_chunks(pages)
    log_progress("sections_built", 60, sections=len(section_chunks))
    embeddings = get_embeddings()

    sample_vector = embeddings.embed_query("insurance policy section")
    ensure_collection(len(sample_vector))
    log_progress("collection_ready", 70, vector_size=len(sample_vector))

    docs: list[Document] = []
    for chunk in section_chunks:
        docs.append(
            Document(
                page_content=chunk.text,
                metadata={
                    "document_id": document_id,
                    "policy_name": policy_name or filename,
                    "filename": filename,
                    "section_id": chunk.section_id,
                    "section_title": chunk.section_title,
                    "section_type": _infer_section_type(chunk.section_title),
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                    "chunk_index": chunk.chunk_index,
                    "chunk_type": "section",
                    "source": "pdf",
                    "ocr_used": any(page["ocr_used"] for page in pages[chunk.page_start - 1:chunk.page_end]),
                },
            )
        )

    client = get_client()
    vectors = embeddings.embed_documents([doc.page_content for doc in docs])
    points = []

    if len(docs) != len(vectors):
        raise ValueError(f"Number of documents ({len(docs)}) does not match number of vectors ({len(vectors)})")
    for doc, vector in zip(docs, vectors):
        points.append(
            rest.PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={**doc.metadata, "text": doc.page_content},
            )
        )

    # client.upsert(collection_name=settings.qdrant_collection, points=points)
    BATCH_SIZE = 50
    for i in range(0, len(points), BATCH_SIZE):
        batch = points[i : i + BATCH_SIZE]
        client.upsert(collection_name=settings.qdrant_collection, points=batch)
        progress = 75 + int(((i + len(batch)) / max(len(points), 1)) * 15)
        log_progress("vector_upserted", progress, batch_size=len(batch), indexed=i + len(batch), total=len(points))

    section_payloads = [
        {
            "section_id": doc.metadata["section_id"],
            "section_title": doc.metadata["section_title"],
            "section_type": doc.metadata["section_type"],
            "page_start": doc.metadata["page_start"],
            "page_end": doc.metadata["page_end"],
            "chunk_index": doc.metadata["chunk_index"],
            "text": doc.page_content,
            "metadata": doc.metadata,
        }
        for doc in docs
    ]

    await cache_dashboard_facts_async(section_payloads)
    log_progress("dashboard_cached", 95, cached_sections=len(section_payloads))

    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    log_progress(
        "completed",
        100,
        pages=len(pages),
        sections=len(section_chunks),
        chunks=len(points),
        elapsed_ms=elapsed_ms,
        ocr_used=any(page["ocr_used"] for page in pages),
    )

    return {
        "document_id": document_id,
        "collection": settings.qdrant_collection,
        "chunks_indexed": len(points),
        "sections_indexed": len(section_chunks),
        "ocr_used": any(page["ocr_used"] for page in pages),
    }


def _infer_section_type(title: str) -> str:
    text = title.lower()
    if any(word in text for word in ["exclusion", "not covered"]):
        return "exclusion"
    if any(word in text for word in ["coverage", "benefit", "covered"]):
        return "coverage"
    if "limit" in text:
        return "limit"
    if any(word in text for word in ["condition", "claims", "claim process"]):
        return "condition"
    return "general"
