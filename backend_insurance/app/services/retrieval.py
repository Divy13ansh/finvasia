from __future__ import annotations

import json
import re
from typing import Any

from qdrant_client.http import models as rest

from app.core.config import get_settings
from app.services.llm import get_chat_model, get_embeddings
from app.services.qdrant_store import get_client


def search_sections(document_id: str, query: str, top_k: int = 6) -> list[dict[str, Any]]:
    settings = get_settings()
    client = get_client()
    embeddings = get_embeddings()
    query_vector = embeddings.embed_query(query)

    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_vector,
        limit=top_k,
        query_filter=rest.Filter(
            must=[
                rest.FieldCondition(key="document_id", match=rest.MatchValue(value=document_id)),
                rest.FieldCondition(key="chunk_type", match=rest.MatchValue(value="section")),
            ]
        ),
        with_payload=True,
    )

    chunks: list[dict[str, Any]] = []
    for hit in results.points:
        payload = hit.payload or {}
        chunks.append(
            {
                "text": payload.get("text", ""),
                "score": hit.score,
                "metadata": payload,
            }
        )
    return chunks


def answer_question(document_id: str, question: str, top_k: int = 6) -> dict[str, Any]:
    model = get_chat_model()
    chunks = search_sections(document_id, question, top_k=top_k)

    context = "\n\n".join(
        f"[Source {idx + 1}]\nSection: {chunk['metadata'].get('section_title', 'unknown')}\nPages: {chunk['metadata'].get('page_start')} - {chunk['metadata'].get('page_end')}\nText: {chunk['text']}"
        for idx, chunk in enumerate(chunks)
    )

    prompt = (
        "You are an insurance policy assistant. Answer only from the provided policy context. "
        "Use plain language, mention what is covered and what is not covered when relevant, and cite the section/page ranges. "
        "If the answer is not in the context, say that clearly.\n\n"
        f"Question: {question}\n\n"
        f"Policy Context:\n{context}\n\n"
        "Answer:"
    )
    answer = model.invoke(prompt).content
    return {"answer": answer, "sources": chunks}


def evaluate_scenario(document_id: str, scenario: str, top_k: int = 8) -> dict[str, Any]:
    model = get_chat_model()
    chunks = search_sections(document_id, scenario, top_k=top_k)
    context = "\n\n".join(
        f"[Source {idx + 1}] {chunk['metadata'].get('section_title', 'unknown')} | pages {chunk['metadata'].get('page_start')} - {chunk['metadata'].get('page_end')}\n{chunk['text']}"
        for idx, chunk in enumerate(chunks)
    )

    prompt = (
        "You are evaluating an insurance claim scenario from a policy. Return strict JSON only. "
        "Use exactly these keys: verdict, explanation. verdict must be one of: covered, not covered, partial, unknown. "
        "The verdict and explanation must agree. Do not include markdown fences or extra text. "
        "Explain why in plain language and reference the relevant sections/pages. If policy facts conflict, say so.\n\n"
        f"Scenario: {scenario}\n\n"
        f"Policy Context:\n{context}\n\n"
        "Return strict JSON with keys verdict and explanation."
    )
    result = model.invoke(prompt).content
    parsed = _parse_json_result(result)
    parsed = _reconcile_verdict(parsed)
    return {"result": parsed, "sources": chunks}


def _parse_json_result(text: str) -> dict[str, Any]:
    try:
        return _extract_json_object(text)
    except Exception:
        return {"verdict": "unknown", "explanation": text}


def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    return json.loads(cleaned[start : end + 1])


def _reconcile_verdict(payload: dict[str, Any]) -> dict[str, Any]:
    verdict = str(payload.get("verdict", "unknown")).strip().lower()
    explanation = str(payload.get("explanation", ""))
    inferred = _infer_verdict_from_text(explanation)

    if inferred != "unknown" and inferred != verdict:
        verdict = inferred

    if verdict not in {"covered", "not covered", "partial", "unknown"}:
        verdict = inferred if inferred != "unknown" else "unknown"

    payload["verdict"] = verdict
    payload["explanation"] = explanation.strip()
    return payload


def _infer_verdict_from_text(text: str) -> str:
    lowered = text.lower()
    if any(token in lowered for token in ["not covered", "excluded", "exclusion", "does not cover", "not payable"]):
        return "not covered"
    if any(token in lowered for token in ["partial", "partially", "subject to limits", "subject to sub-limits"]):
        return "partial"
    if any(token in lowered for token in ["covered", "payable", "covered under this policy"]):
        return "covered"
    return "unknown"
