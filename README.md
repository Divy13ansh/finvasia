# Clarify - Insurance Policy Intelligence

An AI-powered platform for understanding and querying insurance policies. Upload PDF insurance documents, chat with them naturally, and evaluate coverage scenarios against specific claim situations.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [Frontend](#frontend)
6. [Backend](#backend)
7. [API Reference](#api-reference)
8. [Local Development](#local-development)
9. [Deployment](#deployment)
10. [Environment Variables](#environment-variables)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Clarify solves a common pain point: understanding what's actually covered in an insurance policy. Policy documents are notoriously complex, filled with legal jargon, exclusions, and conditional language. This platform lets users:

- **Upload** insurance PDFs and have them automatically parsed, chunked by section, and indexed
- **Browse** a structured dashboard showing all coverage items, exclusions, limits, deductibles, and conditions
- **Chat** with their policy in plain language ("Is OPD covered?")
- **Evaluate** specific claim scenarios ("I broke my arm - is this covered?")

---

## Architecture

The application follows a standard client-server architecture:

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │  HTTP   │   Backend       │
│   (React +      │◄───────►│   (FastAPI)     │
│   Vite)         │  JSON   │                 │
└─────────────────┘         └────────┬────────┘
                                     │
                              ┌──────┴──────┐
                              │             │
                         ┌────▼────┐   ┌────▼────┐
                         │ Qdrant  │   │ Azure   │
                         │(Vector  │   │ OpenAI  │
                         │ Store)  │   │         │
                         └─────────┘   └─────────┘
```

### Data Flow

1. **Upload Flow**: PDF → Backend → Text extraction / OCR → Section chunking → Embeddings → Qdrant vector store
2. **Query Flow**: User question → Backend → Retrieve relevant chunks → LLM generate answer → Return with sources
3. **Dashboard Flow**: Request policy → Backend → Read chunks from Qdrant → Extract structured facts → Return dashboard

---

## Tech Stack

### Frontend (`fe_new/`)

| Technology | Purpose |
|-------------|---------|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS | Styling |
| React Router | Page navigation |
| Fetch API | HTTP client |

### Backend (`backend_insurance/`)

| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework |
| Qdrant | Vector similarity search |
| Azure OpenAI | Text embeddings (`text-embedding-3-small`) |
| Azure OpenAI | Chat completion (`gpt-4o-mini`) |
| Azure Vision | OCR fallback for scanned PDFs |
| PyMuPDF (fitz) | PDF text extraction |
| python-multipart | File upload handling |

---

## Features

### Core Features

1. **PDF Upload & Ingestion**
   - Accepts PDF files via multipart/form-data
   - Extracts text using PyMuPDF
   - Falls back to Azure Vision OCR if text extraction is weak
   - Chunks content by policy sections (coverage, exclusions, limits, etc.)
   - Generates embeddings and indexes to Qdrant

2. **Policy Dashboard**
   - Structured view of all policy sections
   - Extracted facts: coverage items, exclusions, limits, deductibles, conditions, claims, definitions
   - Statistics summary (counts per category)
   - Page-level navigation

3. **Evidence Search**
   - Semantic search within a single policy
   - Returns relevant chunks with similarity scores
   - Source citations for verification

4. **Chat with Policy**
   - Natural language questions
   - RAG-powered answers using retrieved context
   - Sources included for transparency

5. **Scenario Evaluation**
   - Evaluate whether a claim scenario is covered
   - Verdict: `covered`, `not covered`, `partial`, or `unknown`
   - Explanation with supporting evidence

### Frontend Pages

1. **Landing Page** - Hero with Call-to-Action cards: Upload, Library, Resume
2. **Library Page** - Grid of uploaded policies, filterable
3. **Policy Workspace** - Dashboard, chat, search, and scenario tools

---

## Frontend

### Pages

| Page | File | Route | Description |
|------|------|-------|--------------|
| Landing | `src/pages/LandingPage.jsx` | `/` | Hero with Upload/Library/Resume cards |
| Library | `src/pages/LibraryPage.jsx` | `/library` | Grid of all uploaded policies |
| Policy Workspace | `src/pages/PolicyWorkspace.jsx` | `/workspace/:document_id` | Main policy dashboard and chat |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Brand | `src/components/Brand.jsx` | "Clarify" wordmark logo |
| Sidebar | `src/components/Sidebar.jsx` | Workspace navigation |
| UploadDropzone | `src/components/UploadDropzone.jsx` | Drag-and-drop PDF upload |
| ChatBubble | `src/components/ChatBubble.jsx` | Chat message display |
| SectionAccordion | `src/components/SectionAccordion.jsx` | Expandable sections |
| StatCard | `src/components/StatCard.jsx` | Dashboard stat display |
| SourceCard | `src/components/SourceCard.jsx` | Evidence source display |
| TagPill | `src/components/TagPill.jsx` | Category label |
| ErrorState | `src/components/ErrorState.jsx` | Error message display |
| Skeleton | `src/components/Skeleton.jsx` | Loading skeleton |
| SkeletonLines | `src/components/SkeletonLines.jsx` | Text loading skeleton |

### API Client

The frontend uses a centralized API client configuration:

```javascript
// fe_new/src/lib/api.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

Set `VITE_API_URL` in your environment to change the backend URL (e.g., `http://homelab:8000` for deployment).

### Building

```bash
cd fe_new
npm install
npm run build   # Output: dist/
```

The `dist/` folder contains static assets ready for deployment.

---

## Backend

### Project Structure

```
backend_insurance/
├── app/
│   ├── main.py           # FastAPI app entry point
│   ├── routes/
│   │   ├── health.py    # GET /health
│   │   ├── upload.py    # POST /v1/policies/upload
│   │   ├── dashboard.py # Dashboard endpoints
│   │   └── chat.py      # Chat and scenario endpoints
│   ├── services/
│   │   ├── extractor.py    # PDF text extraction
│   │   ├── chunker.py     # Section chunking
│   │   ├── embedder.py    # Embedding generation
│   │   ├── qdrant_client.py # Vector store
│   │   └── llm.py        # LLM chat
│   └── models/
│       └── *.py         # Pydantic models
├── .env                 # Environment variables
└── requirements.txt    # Python dependencies
```

### Key Services

1. **Extractor** (`app/services/extractor.py`)
   - Uses PyMuPDF (fitz) to extract text from PDFs
   - Falls back to Azure Vision OCR when text extraction yields < 500 characters
   - Returns raw text with page numbers

2. **Chunker** (`app/services/chunker.py`)
   - Splits PDF text into semantic sections
   - Identifies section types: `coverage`, `exclusion`, `limit`, `deductible`, `condition`, `claim`, `definition`
   - Assigns section IDs and page ranges

3. **Embedder** (`app/services/embedder.py`)
   - Generates embeddings using Azure OpenAI `text-embedding-3-small`
   - 1536-dimensional vectors
   - Batches requests for efficiency

4. **Qdrant Client** (`app/services/qdrant_client.py`)
   - Manages `insurance_policy_sections` collection
   - Stores chunks with full metadata
   - Supports filtered queries by `document_id`

5. **LLM** (`app/services/llm.py`)
   - Uses Azure OpenAI `gpt-4o-mini` for chat completion
   - System prompt includes policy context
   - Returns answer + retrieved sources

### Ingestion Pipeline

When a PDF is uploaded, the backend performs these steps:

```
1. Receive multipart/form-data with file
2. Extract text using PyMuPDF
3. IF text_length < 500 chars:
      Use Azure Vision OCR
4. Chunk by detected sections
5. Generate embeddings for each chunk (batch)
6. Write to Qdrant with metadata:
   - document_id (UUID)
   - section_id
   - section_title
   - section_type
   - page_start, page_end
   - chunk_index
7. Return IngestResponse
```

Console output shows progress:
```
Extracting text from PDF...
Detected 27 sections
Chunking into sections...
Embedding 27 sections...
Indexing to Qdrant...
Done. Indexed 27 sections.
```

---

## API Reference

Base URL: `http://localhost:8000` (local) or `http://homelab:8000` (deployed)

### Health Check

**GET** `/health`

Returns backend health status.

```json
{ "status": "ok" }
```

---

### Upload Policy

**POST** `/v1/policies/upload`

Upload and ingest a policy PDF.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | PDF file |
| `policy_name` | string | No | Display name |

```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "collection": "insurance_policy_sections",
  "chunks_indexed": 27,
  "sections_indexed": 27,
  "ocr_used": false
}
```

---

### List Policies

**GET** `/v1/dashboard/policies`

Returns all uploaded policies.

```json
[
  {
    "document_id": "uuid",
    "policy_name": "sbi-general-health-insurance.pdf",
    "filename": "sbi-general-health-insurance.pdf",
    "ocr_used": false,
    "sections_indexed": 27,
    "page_count": 27,
    "section_titles": ["Scope of Cover", "Definitions"],
    "section_types": ["coverage", "condition"]
  }
]
```

---

### Get Policy Dashboard

**GET** `/v1/dashboard/{document_id}`

Returns structured dashboard for a policy.

```json
{
  "document_id": "uuid",
  "policy_name": "SBI General Health",
  "overview": "Found 27 policy sections with 32 coverage items, 52 exclusions...",
  "stats": {
    "pages": 27,
    "sections": 27,
    "facts": 205,
    "coverage_items": 32,
    "exclusions": 52,
    "limits": 19,
    "deductibles": 0,
    "conditions": 35,
    "claims": 0,
    "definitions": 0
  },
  "sections": [...],
  "coverage": [...],
  "exclusions": [...],
  "limits": [...],
  "conditions": [...]
}
```

---

### Search Policy

**GET** `/v1/dashboard/{document_id}/search?q=...&top_k=8`

Search for evidence within a policy.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query |
| `top_k` | integer | 8 | Number of results |

```json
{
  "document_id": "uuid",
  "query": "room rent limit",
  "hits": [
    {
      "text": "Room rent cap of Rs. 5000 per day...",
      "score": 0.91,
      "metadata": {
        "section_title": "Limits and Sub-limits",
        "page_start": 4,
        "page_end": 5
      }
    }
  ]
}
```

---

### Chat with Policy

**POST** `/v1/chat`

Ask a question about the policy.

```json
{
  "document_id": "uuid",
  "question": "Is OPD covered?",
  "top_k": 6
}
```

Response:

```json
{
  "document_id": "uuid",
  "answer": "Yes, OPD expenses are covered up to Rs. 1500 per visit...",
  "sources": [
    {
      "text": "OPD benefit of Rs. 1500 per visit...",
      "score": 0.88,
      "metadata": { "section_title": "Scope of Cover", ... }
    }
  ]
}
```

---

### Evaluate Scenario

**POST** `/v1/scenarios/evaluate`

Evaluate a claim scenario against the policy.

```json
{
  "document_id": "uuid",
  "scenario": "A 34-year-old undergoes appendectomy after 18 months of policy purchase.",
  "top_k": 8
}
```

Response:

```json
{
  "document_id": "uuid",
  "verdict": "covered",
  "explanation": "Appendectomy after 12-month waiting period is covered...",
  "sources": [...]
}
```

Verdict values: `covered`, `not covered`, `partial`, `unknown`

---

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+
- Azure OpenAI account
- Qdrant instance (local or cloud)

### Frontend

```bash
cd fe_new
npm install
npm run dev
```

Runs at `http://localhost:5173`

### Backend

```bash
cd backend_insurance
cp .env.example .env
# Edit .env with your credentials
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Runs at `http://localhost:8000`

### Connecting Frontend to Backend

If running backend on a different port or machine, set the environment variable:

```bash
# In fe_new/.env
VITE_API_URL=http://localhost:8000
```

---

## Deployment

### Homelab Deployment

The application is deployed to a homelab server running Ubuntu 24.04.

#### File Structure

```
~/projects/clarify/
├── backend_insurance/
│   ├── app/
│   ├── .env
│   ├── requirements.txt
│   └── venv/          # Python virtual environment
└── fe_new/
    └── dist/         # Built static files
```

#### Starting Services

**Backend** (port 8000):

```bash
cd ~/projects/clarify/backend_insurance
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or with nohup for background:

```bash
cd ~/projects/clarify/backend_insurance
nohup ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

**Frontend** (port 4200):

```bash
cd ~/projects/clarify/fe_new/dist
python3 -m http.server 4200
```

Or with nohup:

```bash
cd ~/projects/clarify/fe_new/dist
nohup python3 -m http.server 4200 > frontend.log 2>&1 &
```

#### Access URLs

- Frontend: **http://homelab:4200**
- Backend API: **http://homelab:8000**

#### Managing Services

Check running services:

```bash
ps aux | grep -E "uvicorn|http.server" | grep -v grep
```

View logs:

```bash
tail -f ~/projects/clarify/backend_insurance/backend.log
tail -f ~/projects/clarify/fe_new/dist/frontend.log
```

Stop services:

```bash
pkill -f "uvicorn app.main:app"
pkill -f "http.server 4200"
```

---

## Environment Variables

### Required

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Azure Vision (OCR fallback)
AZURE_VISION_API_KEY=your-vision-key
AZURE_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com/

# Qdrant
QDRANT_HOST=http://localhost:6333
QDRANT_API_KEY=your-qdrant-key  # Optional if auth disabled
```

### Optional (Frontend)

```env
# fe_new/.env
VITE_API_URL=http://localhost:8000
```

---

## Troubleshooting

### Common Issues

**OCR being used unexpectedly**: If `ocr_used: true` appears in responses but the PDF has selectable text, check first that the text extraction length exceeds 500 characters. The OCR threshold may need adjustment in `app/services/extractor.py`.

**No chunks returned**: Verify Qdrant is running and accessible. Check the collection exists: `http://qdrant-host:6333/dashboard`.

**Chat answers seem wrong**: Verify the LLM is receiving the correct context in the system prompt. Check that `top_k` retrieval is working and relevant chunks are being fetched.

**Slow ingestion**: Embedding generation is the bottleneck. Check batch size in `app/services/embedder.py`.

**Frontend not connecting to backend**: Verify `VITE_API_URL` is set correctly in the frontend environment.

### Logs

Backend logs show ingestion pipeline progress:

```
Extracting text from PDF...
Detected 27 sections
Chunking into sections...
Embedding 27 sections...
Indexing to Qdrant...
Done. Indexed 27 sections.
```

Check backend logs on homelab:

```bash
ssh homelab "tail -f ~/projects/clarify/backend_insurance/backend.log"
```

---

## License

MIT
