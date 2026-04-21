from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.dashboard.api import router as dashboard_router
from app.schemas import ChatRequest, ChatResponse, IngestResponse, ScenarioRequest, ScenarioResponse
from app.services.ingestion import ingest_policy_pdf
from app.services.retrieval import answer_question, evaluate_scenario

from typing import Optional

app = FastAPI(title="Insurance Policy Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/policies/upload", response_model=IngestResponse)
async def upload_policy(
    file: UploadFile = File(...),
    policy_name: Optional[str] = Form(default=None),
) -> dict:
    pdf_bytes = await file.read()
    return await ingest_policy_pdf(pdf_bytes, file.filename or "policy.pdf", policy_name)


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> dict:
    result = answer_question(request.document_id, request.question, request.top_k)
    return {
        "answer": result["answer"],
        "sources": result["sources"],
        "document_id": request.document_id,
    }


@app.post("/v1/scenarios/evaluate", response_model=ScenarioResponse)
async def scenario_eval(request: ScenarioRequest) -> dict:
    result = evaluate_scenario(request.document_id, request.scenario, request.top_k)
    payload = result["result"]
    return {
        "verdict": str(payload.get("verdict", "unknown")).lower(),
        "explanation": str(payload.get("explanation", payload.get("message", ""))),
        "sources": result["sources"],
        "document_id": request.document_id,
    }
