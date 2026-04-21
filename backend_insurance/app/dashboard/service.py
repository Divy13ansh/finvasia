from __future__ import annotations

from typing import Any

from app.dashboard.extraction import build_dashboard_facts, build_overview
from app.dashboard.repository import fetch_cached_fact_records, fetch_document_chunks, group_sections
from app.dashboard.schemas import DashboardConflict, DashboardFact, DashboardResponse, DashboardSearchResponse, DashboardStats
from app.services.retrieval import search_sections


def _to_fact(items: list[dict[str, Any]]) -> list[DashboardFact]:
    return [DashboardFact(**item) for item in items]


def build_dashboard(document_id: str) -> DashboardResponse:
    chunks = fetch_document_chunks(document_id)
    if not chunks:
        return DashboardResponse(
            document_id=document_id,
            overview="No indexed sections found for this document.",
            stats=DashboardStats(
                pages=0,
                sections=0,
                facts=0,
                coverage_items=0,
                exclusions=0,
                limits=0,
                deductibles=0,
                conditions=0,
                claims=0,
                definitions=0,
            ),
            sections=[],
            coverage=[],
            exclusions=[],
            limits=[],
            deductibles=[],
            conditions=[],
            claims=[],
            definitions=[],
            conflicts=[],
        )

    sections = group_sections(chunks)
    cached_facts = fetch_cached_fact_records(document_id)
    metadata = chunks[0]["metadata"] if chunks else {}

    if cached_facts:
        facts_by_kind: dict[str, list[dict[str, Any]]] = {}
        for record in cached_facts:
            payload = record["metadata"]
            kind = payload.get("kind", "general")
            facts_by_kind.setdefault(kind, []).append(
                {
                    "kind": kind,
                    "title": payload.get("title", "Untitled"),
                    "description": payload.get("description", ""),
                    "evidence_quote": payload.get("evidence_quote", record["text"]),
                    "section_id": payload.get("section_id", ""),
                    "section_title": payload.get("section_title", ""),
                    "page_start": payload.get("page_start", 0),
                    "page_end": payload.get("page_end", 0),
                    "metadata": payload,
                }
            )
        extracted_sections = [
            {
                "section_id": s["section_id"],
                "section_title": s["section_title"],
                "section_type": s["section_type"],
                "page_start": s["page_start"],
                "page_end": s["page_end"],
                "chunk_index": s["chunk_index"],
                "excerpt": " ".join(s["text"])[:260],
                "metadata": s["metadata"],
            }
            for s in sections
        ]
        extracted_conflicts: list[dict[str, Any]] = []
    else:
        extracted = build_dashboard_facts(sections)
        facts_by_kind = extracted["facts_by_kind"]
        extracted_sections = extracted["sections"]
        extracted_conflicts = extracted["conflicts"]

    pages = sorted({chunk["metadata"].get("page_start", 0) for chunk in chunks} | {chunk["metadata"].get("page_end", 0) for chunk in chunks})
    stats = DashboardStats(
        pages=len({p for p in pages if p}),
        sections=len(sections),
        facts=sum(len(v) for v in facts_by_kind.values()),
        coverage_items=len(facts_by_kind.get("coverage", [])),
        exclusions=len(facts_by_kind.get("exclusion", [])),
        limits=len(facts_by_kind.get("limit", [])),
        deductibles=len(facts_by_kind.get("deductible", [])),
        conditions=len(facts_by_kind.get("condition", [])),
        claims=len(facts_by_kind.get("claims", [])),
        definitions=len(facts_by_kind.get("definitions", [])),
    )

    return DashboardResponse(
        document_id=document_id,
        policy_name=metadata.get("policy_name"),
        filename=metadata.get("filename"),
        ocr_used=any(chunk["metadata"].get("ocr_used", False) for chunk in chunks),
        overview=build_overview(sections, facts_by_kind),
        stats=stats,
        sections=extracted_sections,
        coverage=_to_fact(facts_by_kind.get("coverage", [])),
        exclusions=_to_fact(facts_by_kind.get("exclusion", [])),
        limits=_to_fact(facts_by_kind.get("limit", [])),
        deductibles=_to_fact(facts_by_kind.get("deductible", [])),
        conditions=_to_fact(facts_by_kind.get("condition", [])),
        claims=_to_fact(facts_by_kind.get("claims", [])),
        definitions=_to_fact(facts_by_kind.get("definitions", [])),
        conflicts=[DashboardConflict(**item) for item in extracted_conflicts],
    )


def search_dashboard(document_id: str, query: str, top_k: int = 8) -> DashboardSearchResponse:
    hits = search_sections(document_id=document_id, query=query, top_k=top_k)

    return DashboardSearchResponse(
        document_id=document_id,
        query=query,
        hits=[
            {"text": hit["text"], "score": hit["score"], "metadata": hit["metadata"]}
            for hit in hits
        ],
    )
