from __future__ import annotations

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from qdrant_client.http import models as rest

from app.core.config import get_settings
from app.dashboard.extraction import extract_section_facts
from app.services.llm import get_embeddings
from app.services.qdrant_store import ensure_collection, get_client


def _build_fact_text(section: dict[str, Any], fact: dict[str, Any]) -> str:
    return " ".join(
        part
        for part in [
            str(fact.get("title", "")).strip(),
            str(fact.get("description", "")).strip(),
            str(fact.get("evidence_quote", "")).strip(),
            str(section.get("section_title", "")).strip(),
        ]
        if part
    )


def cache_dashboard_facts(sections: list[dict[str, Any]]) -> int:
    if not sections:
        return 0

    embeddings = get_embeddings()
    client = get_client()
    settings = get_settings()

    worker_count = max(1, min(4, len(sections)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        extracted_sections = list(executor.map(extract_section_facts, sections))

    fact_rows: list[dict[str, Any]] = []
    for section, extracted in zip(sections, extracted_sections, strict=True):
        for fact in extracted.get("facts", []):
            fact_rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "text": _build_fact_text(section, fact),
                    "payload": {
                        "document_id": section["metadata"].get("document_id"),
                        "policy_name": section["metadata"].get("policy_name"),
                        "filename": section["metadata"].get("filename"),
                        "chunk_type": "fact",
                        "kind": str(fact.get("kind", "general")).strip().lower(),
                        "title": str(fact.get("title", "Untitled")).strip(),
                        "description": str(fact.get("description", "")).strip(),
                        "evidence_quote": str(fact.get("evidence_quote", "")).strip(),
                        "section_id": section["section_id"],
                        "section_title": section["section_title"],
                        "section_type": section["section_type"],
                        "page_start": section["page_start"],
                        "page_end": section["page_end"],
                        "source": "dashboard_fact",
                    },
                }
            )

    if not fact_rows:
        return 0

    ensure_collection(vector_size=len(embeddings.embed_query("insurance policy fact")))
    vectors = embeddings.embed_documents([row["text"] for row in fact_rows])
    points = [
        rest.PointStruct(id=row["id"], vector=vector, payload={**row["payload"], "text": row["text"]})
        for row, vector in zip(fact_rows, vectors, strict=True)
    ]

    for i in range(0, len(points), 50):
        client.upsert(collection_name=settings.qdrant_collection, points=points[i : i + 50])

    return len(points)


async def cache_dashboard_facts_async(sections: list[dict[str, Any]]) -> int:
    return await asyncio.to_thread(cache_dashboard_facts, sections)
