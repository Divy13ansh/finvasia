from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict
from typing import Any

from app.services.llm import get_chat_model


FACT_KINDS = {
    "coverage": "coverage",
    "exclusion": "exclusion",
    "limit": "limit",
    "deductible": "deductible",
    "waiting_period": "condition",
    "condition": "condition",
    "claim": "claims",
    "definition": "definitions",
}


def _normalize_kind(kind: str) -> str:
    return FACT_KINDS.get(kind.strip().lower(), "general")


def _shorten(text: Any, limit: int = 220) -> str:
    if isinstance(text, list):
        text = " ".join(map(str, text))  # convert list → string

    text = str(text)  # ensure string
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."


def _extract_json_payload(raw: str) -> dict[str, Any]:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    return json.loads(text[start : end + 1])


def extract_section_facts(section: dict[str, Any]) -> dict[str, Any]:
    model = get_chat_model()
    text = section["text"]
    prompt = (
        "Extract only explicit insurance facts from this policy section. Do not infer. "
        "Return strict JSON with keys: summary, facts, conflicts. "
        "Each fact must have: kind, title, description, evidence_quote. "
        "Kinds allowed: coverage, exclusion, limit, deductible, waiting_period, condition, claim, definition, general. "
        "Use only quotes from the section text. If nothing relevant exists, return empty arrays.\n\n"
        f"Section title: {section['section_title']}\n"
        f"Pages: {section['page_start']} - {section['page_end']}\n"
        f"Text:\n{text}\n\n"
        "Return JSON now."
    )

    raw = model.invoke(prompt).content
    try:
        payload = _extract_json_payload(raw)
    except Exception:
        payload = {"summary": _shorten(text, 260), "facts": [], "conflicts": []}

    payload.setdefault("summary", _shorten(text, 260))
    payload.setdefault("facts", [])
    payload.setdefault("conflicts", [])
    return payload


def build_dashboard_facts(sections: list[dict[str, Any]]) -> dict[str, Any]:
    facts_by_kind: dict[str, list[dict[str, Any]]] = defaultdict(list)
    conflicts: list[dict[str, Any]] = []
    section_cards: list[dict[str, Any]] = []

    for section in sections:
        extracted = extract_section_facts(section)
        section_cards.append(
            {
                "section_id": section["section_id"],
                "section_title": section["section_title"],
                "section_type": section["section_type"],
                "page_start": section["page_start"],
                "page_end": section["page_end"],
                "chunk_index": section["chunk_index"],
                "excerpt": extracted.get("summary", _shorten(section["text"])),
                "metadata": section.get("metadata", {}),
            }
        )

        for fact in extracted.get("facts", []):
            kind = _normalize_kind(str(fact.get("kind", "general")))
            evidence_quote = str(fact.get("evidence_quote", "")).strip() or _shorten(section["text"], 180)
            facts_by_kind[kind].append(
                {
                    "kind": kind,
                    "title": str(fact.get("title", "Untitled")).strip(),
                    "description": str(fact.get("description", "")).strip(),
                    "evidence_quote": evidence_quote,
                    "section_id": section["section_id"],
                    "section_title": section["section_title"],
                    "page_start": section["page_start"],
                    "page_end": section["page_end"],
                    "metadata": section.get("metadata", {}),
                }
            )

        for item in extracted.get("conflicts", []):
            conflicts.append(
                {
                    "title": str(item.get("title", "Potential conflict")).strip(),
                    "description": str(item.get("description", "")).strip(),
                    "evidence": [],
                }
            )

    return {"sections": section_cards, "facts_by_kind": facts_by_kind, "conflicts": conflicts}


def build_dashboard_facts_parallel(sections: list[dict[str, Any]], max_workers: int = 4) -> dict[str, Any]:
    facts_by_kind: dict[str, list[dict[str, Any]]] = defaultdict(list)
    conflicts: list[dict[str, Any]] = []
    section_cards: list[dict[str, Any]] = []

    worker_count = max(1, min(max_workers, len(sections) or 1))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        results = list(executor.map(extract_section_facts, sections))

    for section, extracted in zip(sections, results, strict=True):
        section_cards.append(
            {
                "section_id": section["section_id"],
                "section_title": section["section_title"],
                "section_type": section["section_type"],
                "page_start": section["page_start"],
                "page_end": section["page_end"],
                "chunk_index": section["chunk_index"],
                "excerpt": extracted.get("summary", _shorten(section["text"])),
                "metadata": section.get("metadata", {}),
            }
        )

        for fact in extracted.get("facts", []):
            kind = _normalize_kind(str(fact.get("kind", "general")))
            evidence_quote = str(fact.get("evidence_quote", "")).strip() or _shorten(section["text"], 180)
            facts_by_kind[kind].append(
                {
                    "kind": kind,
                    "title": str(fact.get("title", "Untitled")).strip(),
                    "description": str(fact.get("description", "")).strip(),
                    "evidence_quote": evidence_quote,
                    "section_id": section["section_id"],
                    "section_title": section["section_title"],
                    "page_start": section["page_start"],
                    "page_end": section["page_end"],
                    "metadata": section.get("metadata", {}),
                }
            )

        for item in extracted.get("conflicts", []):
            conflicts.append(
                {
                    "title": str(item.get("title", "Potential conflict")).strip(),
                    "description": str(item.get("description", "")).strip(),
                    "evidence": [],
                }
            )

    return {"sections": section_cards, "facts_by_kind": facts_by_kind, "conflicts": conflicts}


def build_overview(sections: list[dict[str, Any]], facts_by_kind: dict[str, list[dict[str, Any]]]) -> str:
    coverage_count = len(facts_by_kind.get("coverage", []))
    exclusion_count = len(facts_by_kind.get("exclusion", []))
    limit_count = len(facts_by_kind.get("limit", []))
    claim_count = len(facts_by_kind.get("claims", []))
    return (
        f"Found {len(sections)} policy sections with {coverage_count} coverage items, "
        f"{exclusion_count} exclusions, {limit_count} limits, and {claim_count} claim-related items."
    )
