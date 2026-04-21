from typing import Any

from pydantic import BaseModel, Field

from typing import Optional

class IngestResponse(BaseModel):
    document_id: str
    collection: str
    chunks_indexed: int
    sections_indexed: int
    ocr_used: bool


class ChatRequest(BaseModel):
    document_id: str
    question: str
    top_k: int = Field(default=6, ge=1, le=20)


class ScenarioRequest(BaseModel):
    document_id: str
    scenario: str
    top_k: int = Field(default=8, ge=1, le=20)


class RetrievedChunk(BaseModel):
    text: str
    score: Optional[float] = None
    metadata: dict[str, Any]


class ChatResponse(BaseModel):
    answer: str
    sources: list[RetrievedChunk]
    document_id: str


class ScenarioResponse(BaseModel):
    verdict: str
    explanation: str
    sources: list[RetrievedChunk]
    document_id: str
