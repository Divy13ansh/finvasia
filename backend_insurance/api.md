# Insurance Policy Assistant API

Base URL: `http://localhost:8000`

Backend stack:
- FastAPI
- Qdrant
- Azure OpenAI embeddings and chat
- Azure Vision OCR fallback

## Overview

This API powers an insurance policy intelligence product. It supports:
- PDF upload and ingestion
- policy dashboard generation
- policy inventory listing from Qdrant
- evidence search within a single policy
- RAG chat over a policy
- scenario evaluation against a policy

All policy-specific endpoints operate on `document_id`.

---

## `GET /health`

Health check for the backend.

### Response

```json
{ "status": "ok" }
```

---

## `POST /v1/policies/upload`

Upload a policy PDF, extract text, chunk it by section, create embeddings, and index into Qdrant.

### Content Type

`multipart/form-data`

### Form Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | file | Yes | PDF file to ingest |
| `policy_name` | string | No | Human-friendly policy name |

### Response Model: `IngestResponse`

```json
{
  "document_id": "uuid",
  "collection": "insurance_policy_sections",
  "chunks_indexed": 27,
  "sections_indexed": 27,
  "ocr_used": false
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `document_id` | string | Random UUID assigned during ingestion |
| `collection` | string | Qdrant collection name |
| `chunks_indexed` | integer | Number of records written |
| `sections_indexed` | integer | Number of section chunks written |
| `ocr_used` | boolean | Whether OCR fallback was used |

### Notes

- The same PDF should not be uploaded again from the frontend if its file hash is already known.
- Backend still generates a new `document_id` on every ingest.
- OCR is attempted only when text extraction is weak.

---

## `GET /v1/dashboard/policies`

List all unique ingested policies currently available in Qdrant.

This endpoint is used by the frontend policy library.

### Response

```json
[
  {
    "document_id": "uuid",
    "policy_name": "sbi-general-health-insurance-retail.pdf",
    "filename": "sbi-general-health-insurance-retail.pdf",
    "ocr_used": false,
    "sections_indexed": 27,
    "page_count": 27,
    "section_titles": ["Scope of Cover", "Definitions"],
    "section_types": ["coverage", "condition"]
  }
]
```

### Fields

| Field | Type | Description |
|---|---|---|
| `document_id` | string | Unique policy identifier |
| `policy_name` | string | Display name if available |
| `filename` | string | Original filename |
| `ocr_used` | boolean | Whether OCR was used during ingestion |
| `sections_indexed` | integer | Number of section chunks indexed |
| `page_count` | integer | Highest page number seen for that policy |
| `section_titles` | string[] | Unique section titles found |
| `section_types` | string[] | Unique section types found |

### Notes

- The backend derives uniqueness from `document_id`.
- It scans Qdrant section chunks and groups them by policy.

---

## `GET /v1/dashboard/{document_id}`

Build a full structured dashboard for a single policy.

This endpoint reads section chunks and cached fact chunks from Qdrant.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `document_id` | string | Yes | Policy UUID returned by upload |

### Response Model: `DashboardResponse`

```json
{
  "document_id": "uuid",
  "policy_name": "SBI General Health",
  "filename": "sbi-general-health-insurance-retail.pdf",
  "ocr_used": false,
  "overview": "Found 27 policy sections with 32 coverage items, 52 exclusions, 19 limits, and 0 claim-related items.",
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
  "sections": [],
  "coverage": [],
  "exclusions": [],
  "limits": [],
  "deductibles": [],
  "conditions": [],
  "claims": [],
  "definitions": [],
  "conflicts": []
}
```

### `stats` Fields

| Field | Type | Description |
|---|---|---|
| `pages` | integer | Page count inferred from indexed chunks |
| `sections` | integer | Number of section chunks |
| `facts` | integer | Total extracted fact count |
| `coverage_items` | integer | Coverage facts |
| `exclusions` | integer | Exclusion facts |
| `limits` | integer | Limit facts |
| `deductibles` | integer | Deductible facts |
| `conditions` | integer | Condition facts |
| `claims` | integer | Claims facts |
| `definitions` | integer | Definition facts |

### `sections` Items: `DashboardSection`

```json
{
  "section_id": "section_0000",
  "section_title": "Scope of Cover",
  "section_type": "coverage",
  "page_start": 1,
  "page_end": 2,
  "chunk_index": 0,
  "excerpt": "...",
  "metadata": { "document_id": "uuid", "section_type": "coverage" }
}
```

### `coverage` / `exclusions` / `limits` / `deductibles` / `conditions` / `claims` / `definitions`

Each item is a `DashboardFact`:

```json
{
  "kind": "coverage",
  "title": "Hospitalization expenses",
  "description": "Covered subject to terms and the sum insured.",
  "evidence_quote": "Insurer undertakes to pay...",
  "section_id": "section_0000",
  "section_title": "Scope of Cover",
  "page_start": 1,
  "page_end": 2,
  "metadata": { "document_id": "uuid" }
}
```

### `conflicts` Items: `DashboardConflict`

```json
{
  "title": "Potential conflict",
  "description": "...",
  "evidence": []
}
```

### Notes

- If cached fact records exist, the dashboard uses them.
- Otherwise, it falls back to live extraction over sections.
- This endpoint is the main UI payload for the policy workspace.

---

## `GET /v1/dashboard/{document_id}/search?q=...&top_k=8`

Search for evidence snippets within one policy.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---:|---:|---|
| `q` | string | Yes | - | Search query |
| `top_k` | integer | No | 8 | Number of results to return |

### Response Model: `DashboardSearchResponse`

```json
{
  "document_id": "uuid",
  "query": "room rent limit",
  "hits": [
    {
      "text": "...",
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

### Hit Fields

| Field | Type | Description |
|---|---|---|
| `text` | string | Matching chunk text |
| `score` | number \| null | Similarity score |
| `metadata` | object | Full Qdrant payload for the chunk |

### Notes

- This searches only the policy specified by `document_id`.
- The frontend uses it for evidence lookup, not as the source of truth for the dashboard.

---

## `POST /v1/chat`

Ask a policy question in plain language.

### Request Body: `ChatRequest`

```json
{
  "document_id": "uuid",
  "question": "Is OPD covered?",
  "top_k": 6
}
```

### Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `document_id` | string | Yes | Policy UUID |
| `question` | string | Yes | User question |
| `top_k` | integer | No | Number of retrieved chunks, default `6` |

### Response Model: `ChatResponse`

```json
{
  "document_id": "uuid",
  "answer": "...",
  "sources": [
    {
      "text": "...",
      "score": 0.88,
      "metadata": {
        "section_title": "Scope of Cover",
        "page_start": 1,
        "page_end": 2
      }
    }
  ]
}
```

### `sources` Items: `RetrievedChunk`

| Field | Type | Description |
|---|---|---|
| `text` | string | Retrieved policy text |
| `score` | number \| null | Similarity score |
| `metadata` | object | Full chunk metadata |

### Notes

- Answers are generated by Azure OpenAI `gpt-4.1-mini`.
- The response should be interpreted with the returned sources.

---

## `POST /v1/scenarios/evaluate`

Evaluate whether a claim scenario is likely covered, not covered, or partial.

### Request Body: `ScenarioRequest`

```json
{
  "document_id": "uuid",
  "scenario": "A 34-year-old undergoes appendectomy after 18 months of policy purchase.",
  "top_k": 8
}
```

### Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `document_id` | string | Yes | Policy UUID |
| `scenario` | string | Yes | Claim or benefit scenario |
| `top_k` | integer | No | Number of retrieved chunks, default `8` |

### Response Model: `ScenarioResponse`

```json
{
  "document_id": "uuid",
  "verdict": "covered",
  "explanation": "...",
  "sources": [
    {
      "text": "...",
      "score": 0.92,
      "metadata": {
        "section_title": "Waiting Periods",
        "page_start": 3,
        "page_end": 4
      }
    }
  ]
}
```

### Verdict Values

- `covered`
- `not covered`
- `partial`
- `unknown`

### Notes

- The backend currently uses the LLM output for verdict and explanation.
- The frontend displays the verdict and explanation as-is.

---

## Common Response Shapes

### `RetrievedChunk`

Used in both chat and search responses.

```json
{
  "text": "string",
  "score": 0.91,
  "metadata": { "...": "..." }
}
```

### `DashboardFact`

```json
{
  "kind": "coverage | exclusion | limit | deductible | condition | claim | definition | general",
  "title": "string",
  "description": "string",
  "evidence_quote": "string",
  "section_id": "string",
  "section_title": "string",
  "page_start": 1,
  "page_end": 2,
  "metadata": { "...": "..." }
}
```

### `DashboardSection`

```json
{
  "section_id": "string",
  "section_title": "string",
  "section_type": "string",
  "page_start": 1,
  "page_end": 2,
  "chunk_index": 0,
  "excerpt": "string",
  "metadata": { "...": "..." }
}
```

---

## Frontend Usage Notes

- The policy library should call `GET /v1/dashboard/policies`.
- Clicking a policy should call `GET /v1/dashboard/{document_id}`.
- Evidence search should call `GET /v1/dashboard/{document_id}/search`.
- Chat should call `POST /v1/chat`.
- Scenario simulation should call `POST /v1/scenarios/evaluate`.
- Upload should call `POST /v1/policies/upload`.

---

## Important Product Notes

- The backend UUID is not stable across uploads.
- Frontend dedupe should use file hash, not UUID.
- Dashboard is the source of truth for the workspace.
- Search and chat are explanation/evidence layers, not the primary policy model.
