from __future__ import annotations

from typing import Any

from qdrant_client.http import models as rest

from app.core.config import get_settings
from app.services.qdrant_store import get_client


def fetch_document_records(document_id: str, chunk_type: str | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    client = get_client()
    chunks: list[dict[str, Any]] = []
    offset = None

    filters = [rest.FieldCondition(key="document_id", match=rest.MatchValue(value=document_id))]
    if chunk_type:
        filters.append(rest.FieldCondition(key="chunk_type", match=rest.MatchValue(value=chunk_type)))

    while True:
        records, next_offset = client.scroll(
            collection_name=settings.qdrant_collection,
            scroll_filter=rest.Filter(must=filters),
            limit=128,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        for record in records:
            payload = record.payload or {}
            chunks.append(
                {
                    "text": payload.get("text", ""),
                    "metadata": payload,
                }
            )

        if next_offset is None:
            break
        offset = next_offset

    chunks.sort(
        key=lambda item: (
            item["metadata"].get("page_start", 0),
            item["metadata"].get("chunk_index", 0),
            item["metadata"].get("section_id", ""),
        )
    )
    return chunks


def fetch_document_chunks(document_id: str) -> list[dict[str, Any]]:
    return fetch_document_records(document_id=document_id, chunk_type="section")


def fetch_cached_fact_records(document_id: str) -> list[dict[str, Any]]:
    return fetch_document_records(document_id=document_id, chunk_type="fact")


def fetch_unique_policies() -> list[dict[str, Any]]:
    settings = get_settings()
    client = get_client()
    policies: dict[str, dict[str, Any]] = {}
    offset = None

    while True:
        records, next_offset = client.scroll(
            collection_name=settings.qdrant_collection,
            scroll_filter=rest.Filter(
                must=[rest.FieldCondition(key="chunk_type", match=rest.MatchValue(value="section"))]
            ),
            limit=256,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )

        for record in records:
            payload = record.payload or {}
            document_id = payload.get("document_id")
            if not document_id:
                continue

            policy = policies.setdefault(
                document_id,
                {
                    "document_id": document_id,
                    "policy_name": payload.get("policy_name", ""),
                    "filename": payload.get("filename", ""),
                    "ocr_used": bool(payload.get("ocr_used", False)),
                    "sections_indexed": 0,
                    "page_count": 0,
                    "section_titles": [],
                    "section_types": [],
                },
            )
            policy["sections_indexed"] += 1
            policy["page_count"] = max(policy["page_count"], int(payload.get("page_end", 0) or 0))
            title = payload.get("section_title")
            if title and title not in policy["section_titles"]:
                policy["section_titles"].append(title)
            section_type = payload.get("section_type")
            if section_type and section_type not in policy["section_types"]:
                policy["section_types"].append(section_type)

        if next_offset is None:
            break
        offset = next_offset

    return sorted(policies.values(), key=lambda item: item.get("policy_name") or item.get("filename") or item["document_id"])


def group_sections(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for chunk in chunks:
        meta = chunk["metadata"]
        section_id = meta.get("section_id") or f"section_{meta.get('chunk_index', 0)}"
        section = grouped.setdefault(
            section_id,
            {
                "section_id": section_id,
                "section_title": meta.get("section_title", "Unknown"),
                "section_type": meta.get("section_type", "general"),
                "page_start": meta.get("page_start", 0),
                "page_end": meta.get("page_end", 0),
                "chunk_index": meta.get("chunk_index", 0),
                "text": [],
                "metadata": meta,
            },
        )
        section["text"].append(chunk["text"])
        if meta.get("page_start", 0) < section["page_start"]:
            section["page_start"] = meta.get("page_start", 0)
        if meta.get("page_end", 0) > section["page_end"]:
            section["page_end"] = meta.get("page_end", 0)

    sections = list(grouped.values())
    sections.sort(key=lambda item: (item["page_start"], item["chunk_index"], item["section_id"]))
    return sections
