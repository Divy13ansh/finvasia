# backend_insurance

FastAPI backend for insurance policy understanding.

## Architecture

- PDF ingestion with section-wise chunking
- OCR fallback through Azure Vision when text extraction is weak
- Qdrant vector search with rich metadata
- Azure OpenAI embeddings via `text-embedding-3-small`
- Azure OpenAI chat via `gpt-4.1-mini`
- Section-aware RAG for policy chat and scenario evaluation

## Endpoints

- `GET /health`
- `POST /v1/policies/upload`
- `POST /v1/chat`
- `POST /v1/scenarios/evaluate`
