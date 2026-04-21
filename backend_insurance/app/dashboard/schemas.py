from typing import Any

from pydantic import BaseModel, Field


class DashboardSection(BaseModel):
    section_id: str
    section_title: str
    section_type: str
    page_start: int
    page_end: int
    chunk_index: int
    excerpt: str
    metadata: dict[str, Any]


class DashboardFact(BaseModel):
    kind: str
    title: str
    description: str
    evidence_quote: str
    section_id: str
    section_title: str
    page_start: int
    page_end: int
    metadata: dict[str, Any]


class DashboardConflict(BaseModel):
    title: str
    description: str
    evidence: list[DashboardFact] = Field(default_factory=list)


class DashboardStats(BaseModel):
    pages: int
    sections: int
    facts: int
    coverage_items: int
    exclusions: int
    limits: int
    deductibles: int
    conditions: int
    claims: int
    definitions: int


class DashboardResponse(BaseModel):
    document_id: str
    policy_name: str | None = None
    filename: str | None = None
    ocr_used: bool = False
    overview: str
    stats: DashboardStats
    sections: list[DashboardSection]
    coverage: list[DashboardFact]
    exclusions: list[DashboardFact]
    limits: list[DashboardFact]
    deductibles: list[DashboardFact]
    conditions: list[DashboardFact]
    claims: list[DashboardFact]
    definitions: list[DashboardFact]
    conflicts: list[DashboardConflict]


class DashboardSearchRequest(BaseModel):
    document_id: str
    query: str
    top_k: int = Field(default=8, ge=1, le=20)


class DashboardSearchHit(BaseModel):
    text: str
    score: float | None = None
    metadata: dict[str, Any]


class DashboardSearchResponse(BaseModel):
    document_id: str
    query: str
    hits: list[DashboardSearchHit]
