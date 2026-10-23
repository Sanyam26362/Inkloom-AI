# Inkloom AI — Backend API Inventory, Mock Testing & Security Audit Report

**Date of Assessment:** October 23, 2026  
**Auditor:** Senior Backend QA Engineer & Security Review Agent  
**Repository Location:** `D:\projects\hackathon-inkloomAI`  
**Evaluation Scope:** 100% Synthetic Mock Data Only (Zero External Calls / Zero Secret Disclosure)  
**Binary Word Document:** [Inkloom_AI_API_Test_Report.docx](file:///D:/projects/hackathon-inkloomAI/docs/Inkloom_AI_API_Test_Report.docx)  

---

## 1. Executive Summary

This report provides an exhaustive functional, boundary, security, and integration evaluation of the **Inkloom AI Brand Governance REST API**. Inkloom AI audits corporate marketing collateral, enforces prohibited terminology, verifies approved facts, and validates WCAG accessibility contrast rules before public publication.

In strict compliance with evaluation rules, all tests executed in this assessment utilized synthetic mock data exclusively. External paid integrations (including Google GenAI LLM models and vector embeddings) were intercepted and mocked at the network client boundary, guaranteeing zero token consumption, zero third-party latency, and zero confidential credential exposure.

### Executive Test Metrics

| Metric | Count | Percentage |
|---|:---:|:---:|
| **Discovered Endpoints** | **27 / 27** | **100.0%** |
| **Tested Endpoints** | **27 / 27** | **100.0%** |
| **Passed Endpoints** | **27 / 27** | **100.0%** |
| **Failed Endpoints** | **0 / 27** | **0.0%** |
| **Blocked Endpoints** | **0 / 27** | **0.0%** |
| **Dedicated Mock Suite Pass Rate** | **24 / 24** | **100.0%** (in 2.78s) |
| **Full Project Regression Pass Rate** | **52 / 52** | **100.0%** (in 16.52s) |

---

## 2. Test Environment & Execution Commands

The testing suite was executed inside the isolated local environment under the following specifications:

- **Operating System:** Microsoft Windows (win32 / Windows 11)
- **Python Runtime:** Python 3.12.10 (virtual environment: `backend\.venv312`)
- **Database Engine:** PostgreSQL 16 with `pgvector` v0.8.7 (mapped to `localhost:5433`)
- **Caching Tier:** Redis 7.2 Alpine (mapped to `localhost:6379`)
- **API Framework:** FastAPI v0.115.0 + Starlette + Async SQLAlchemy 2.0.35
- **Test Harness:** Pytest v9.1.1 + Pytest-Asyncio v1.4.0 + HTTPX AsyncClient (ASGI Transport)

### Exact Commands Executed

```powershell
# 1. Verify compilation of all app modules without syntax or import errors
.\.venv312\Scripts\python.exe -m compileall app

# 2. Run dedicated mock API test suite (24 tests)
.\.venv312\Scripts\pytest.exe tests/test_api_mock_suite.py -v

# 3. Run full project automated test suite (52 tests across unit, mock, and integration flows)
.\.venv312\Scripts\pytest.exe -v
```

---

## 3. Comprehensive Endpoint Inventory

All 27 endpoints discovered in the application were cataloged, exercised, and verified:

| Method | Endpoint Path | Purpose | Auth / Role Required | Key Dependencies | Status |
|:---:|---|---|:---:|---|:---:|
| `GET` | `/` | Root Landing & Metadata | Public | FastAPI Core | **PASS** |
| `GET` | `/docs` | Swagger UI Documentation | Public | Static UI | **PASS** |
| `GET` | `/redoc` | ReDoc Documentation | Public | Static UI | **PASS** |
| `GET` | `/docs/oauth2-redirect` | OAuth2 Swagger Callback | Public | Static UI | **PASS** |
| `GET` | `/api/v1/openapi.json` | OpenAPI JSON Specification | Public | FastAPI Core | **PASS** |
| `GET` | `/api/v1/health` | System Diagnostic Health Check | Public | PostgreSQL, Redis, AI | **PASS** |
| `GET` | `/api/v1/brands` | List Registered Brand Profiles | Authenticated | PostgreSQL | **PASS** |
| `POST` | `/api/v1/brands` | Create Brand Profile & Rules | Authenticated | PostgreSQL (Unique Name) | **PASS** |
| `GET` | `/api/v1/brands/{brand_id}` | Get Brand Profile Details | Authenticated | PostgreSQL | **PASS** |
| `PUT` | `/api/v1/brands/{brand_id}` | Update Brand Rules & Palette | Authenticated | PostgreSQL | **PASS** |
| `DELETE` | `/api/v1/brands/{brand_id}` | Delete Brand & Cascade Items | Authenticated | PostgreSQL | **PASS** |
| `GET` | `/api/v1/guidelines` | List Guideline Chunks | Authenticated | PostgreSQL (`brand_id`) | **PASS** |
| `POST` | `/api/v1/guidelines` | Create Single Guideline Chunk | Authenticated | Mocked 768d + PostgreSQL | **PASS** |
| `POST` | `/api/v1/guidelines/upload-pdf` | Extract & Index Guideline PDF | Authenticated | PyMuPDF + Mock Embeddings | **PASS** |
| `POST` | `/api/v1/guidelines/search` | Semantic Vector RAG Search | Authenticated | pgvector Cosine Distance | **PASS** |
| `GET` | `/api/v1/submissions` | List Submissions (Filterable) | Authenticated | PostgreSQL | **PASS** |
| `POST` | `/api/v1/submissions` | Create Draft + Revision v1 | Authenticated | PostgreSQL | **PASS** |
| `GET` | `/api/v1/submissions/{submission_id}` | Get Submission & Findings | Authenticated | PostgreSQL (`selectinload`) | **PASS** |
| `POST` | `/api/v1/submissions/{submission_id}/audit` | Execute Full Governance Audit | Authenticated | RuleEngine + RAG + Mock AI | **PASS** |
| `POST` | `/api/v1/submissions/{submission_id}/revisions` | Create New Revision (Reset Approval) | Authenticated | `WorkflowService` | **PASS** |
| `POST` | `/api/v1/submissions/{submission_id}/status` | Transition Status (RBAC Gated) | `REVIEWER` / `MANAGER` | `WorkflowService` | **PASS** |
| `GET` | `/api/v1/submissions/{submission_id}/comments` | List Review Comments | Authenticated | PostgreSQL | **PASS** |
| `POST` | `/api/v1/submissions/{submission_id}/comments` | Post Reviewer/Creator Comment | Authenticated | `WorkflowService` | **PASS** |
| `GET` | `/api/v1/submissions/{submission_id}/workflow` | Immutable Audit Event History | Authenticated | PostgreSQL | **PASS** |
| `POST` | `/api/v1/submissions/findings/{finding_id}/override` | Override Finding (Reason Req.) | `REVIEWER` / `MANAGER` | `WorkflowService` | **PASS** |
| `POST` | `/api/v1/submissions/findings/{finding_id}/resolve` | Accept / Resolve Finding | Authenticated | PostgreSQL | **PASS** |
| `GET` | `/api/v1/analytics/{brand_id}` | Brand Governance Analytics | Authenticated | `AnalyticsService` | **PASS** |

---

## 4. Detailed Endpoint Results & Mock Request/Response Evidence

### 4.1 System & Health Endpoints

#### `GET /api/v1/health` — Diagnostic Health Check
- **Purpose:** Verifies operational status of PostgreSQL, pgvector extension, Redis cache, and AI model readiness.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_health_success`
- **Test Cases Covered:** Healthy dependencies (HTTP 200), simulated Redis failure (HTTP 200 with degraded state).
- **Mock Request:**
```http
GET /api/v1/health HTTP/1.1
Host: localhost:8000
Accept: application/json
```
- **Observed Response (Sanitized):**
```json
{
  "status": "healthy",
  "project": "Inkloom AI - Brand Governance Platform",
  "environment": "development",
  "database": "healthy",
  "pgvector": "pgvector v0.8.7 active",
  "redis": "healthy",
  "ai_integration": {
    "provider": "Google Gemini",
    "primary_model": "gemini-3.5-flash",
    "embedding_model": "gemini-embedding-2",
    "embedding_dimensions": 768,
    "configured": true,
    "client_ready": true
  }
}
```

---

### 4.2 Brand Profile Endpoints

#### `POST /api/v1/brands` — Create Brand Profile
- **Purpose:** Registers a new organization brand profile with tone persona, banned terms, and approved palette.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_brands_crud_flow`
- **Test Cases Covered:** Success (HTTP 201), duplicate name conflict (HTTP 409), invalid contrast ratio (HTTP 422).
- **Mock Request:**
```http
POST /api/v1/brands HTTP/1.1
Content-Type: application/json
x-user-role: CREATOR

{
  "name": "Acme Demo Cloud",
  "industry": "Enterprise Security",
  "tone_persona": "Authoritative, humble, factual.",
  "approved_hex_palette": ["#0F172A", "#2563EB", "#FFFFFF"],
  "banned_terms": ["unbreakable", "cheapest", "guaranteed"],
  "preferred_terminology": {"client-side": "on-device"},
  "min_wcag_contrast": 4.5
}
```
- **Observed Response (Sanitized):**
```json
{
  "id": 2,
  "name": "Acme Demo Cloud",
  "industry": "Enterprise Security",
  "tone_persona": "Authoritative, humble, factual.",
  "approved_hex_palette": ["#0F172A", "#2563EB", "#FFFFFF"],
  "banned_terms": ["unbreakable", "cheapest", "guaranteed"],
  "preferred_terminology": {"client-side": "on-device"},
  "approved_facts": [],
  "visual_guidelines_summary": "Use high-contrast typography, approved brand palette, and clear logo spacing.",
  "min_wcag_contrast": 4.5,
  "created_at": "2026-10-23T12:00:00Z",
  "updated_at": "2026-10-23T12:00:00Z"
}
```

---

### 4.3 Guideline Ingestion & RAG Endpoints

#### `POST /api/v1/guidelines/upload-pdf` — Ingest Guideline PDF
- **Purpose:** Extracts semantic rule chunks from uploaded PDF using PyMuPDF and indexes 768-dim vector embeddings.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_guidelines_flow`
- **Test Cases Covered:** Valid PDF ingestion (HTTP 201), non-PDF upload rejection (HTTP 400), corrupt PDF rejection (HTTP 400).
- **Mock Request:**
```http
POST /api/v1/guidelines/upload-pdf HTTP/1.1
Content-Type: multipart/form-data

brand_id=1
file=@mock_brand_guidelines.pdf (in-memory synthetic PDF stream)
```
- **Observed Response (Sanitized):**
```json
[
  {
    "id": 12,
    "brand_id": 1,
    "source_document": "mock_brand_guidelines.pdf",
    "page_number": 1,
    "section_reference": "Section: Accessibility",
    "rule_category": "ACCESSIBILITY",
    "content_text": "All body text must achieve WCAG contrast ratio >= 4.5:1 against the background.",
    "times_triggered": 0,
    "times_overridden": 0,
    "created_at": "2026-10-23T12:01:00Z"
  }
]
```

#### `POST /api/v1/guidelines/search` — Semantic Vector Search
- **Purpose:** Retrieves top-k relevant guidelines using pgvector cosine distance similarity.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_guidelines_flow`
- **Test Cases Covered:** Vector similarity ranking (HTTP 200), query length validation (HTTP 422).
- **Mock Request:**
```http
POST /api/v1/guidelines/search HTTP/1.1
Content-Type: application/json

{
  "brand_id": 1,
  "query": "unbreakable SLA claims",
  "limit": 3
}
```
- **Observed Response (Sanitized):**
```json
[
  {
    "chunk": {
      "id": 1,
      "brand_id": 1,
      "source_document": "ApexCloud Brand Book 2026.pdf",
      "page_number": 3,
      "section_reference": "Section 2: Tone of Voice",
      "rule_category": "TONE",
      "content_text": "Do not use absolute superlatives such as 'guaranteed', 'unbreakable'...",
      "times_triggered": 2,
      "times_overridden": 0,
      "created_at": "2026-10-23T12:00:00Z"
    },
    "similarity_score": 0.9421
  }
]
```

---

### 4.4 Submissions, Audit & Workflow Endpoints

#### `POST /api/v1/submissions/{id}/audit` — Execute Governance Audit
- **Purpose:** Runs deterministic rules, pgvector RAG retrieval, and AI semantic auditing with PII scrubbing.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_submissions_full_workflow`
- **Test Cases Covered:** Multi-tier audit execution (HTTP 200), PII redaction verification, non-existent submission (HTTP 404).
- **Mock Request:**
```http
POST /api/v1/submissions/1/audit HTTP/1.1
x-user-role: CREATOR
```
- **Observed Response (Sanitized):**
```json
{
  "submission_id": 1,
  "revision_id": 1,
  "version_number": 1,
  "compliance_score": 70.0,
  "status": "CHANGES_REQUESTED",
  "total_findings": 2,
  "findings_by_severity": {
    "CRITICAL": 1,
    "WARNING": 1,
    "SUGGESTION": 0
  },
  "confidentiality_report": {
    "total_redacted": 2,
    "categories_redacted": {
      "EMAIL": 1,
      "INTERNAL_PROJECT": 1
    },
    "confidentiality_guard_active": true
  },
  "findings": [
    {
      "id": 1,
      "category": "TERMINOLOGY",
      "severity": "CRITICAL",
      "detector_source": "DETERMINISTIC_RULE",
      "flagged_excerpt": "unbreakable",
      "explanation": "Use of banned term 'unbreakable' strictly violates brand governance policy.",
      "suggested_correction": "Remove or replace 'unbreakable' with factual, non-absolute terminology.",
      "resolution_state": "OPEN"
    }
  ]
}
```

#### `POST /api/v1/submissions/{id}/status` — Status Transition (RBAC Guarded)
- **Purpose:** Transitions submission lifecycle state. Enforces that only REVIEWER or MANAGER can APPROVE.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_submissions_rbac_enforcement`
- **Test Cases Covered:** Reviewer approval (HTTP 200), Creator approval attempt forbidden (HTTP 403), Unknown status rejection (HTTP 400).
- **Mock Request (Reviewer):**
```http
POST /api/v1/submissions/1/status HTTP/1.1
Content-Type: application/json
x-user-role: REVIEWER

{
  "target_status": "APPROVED",
  "notes": "Verified empirical SLA citations."
}
```
- **Observed Response (HTTP 200 OK):**
```json
{
  "id": 1,
  "status": "APPROVED",
  "current_version": 1,
  "compliance_score": 75.0,
  "updated_at": "2026-10-23T12:05:00Z"
}
```
- **Negative Case (Creator Attempt):**
```http
POST /api/v1/submissions/1/status HTTP/1.1
x-user-role: CREATOR

{"target_status": "APPROVED"}
```
- **Observed Response (HTTP 403 Forbidden):**
```json
{
  "detail": "Only REVIEWER or MANAGER role can transition status to APPROVED."
}
```

---

### 4.5 Governance Analytics Endpoints

#### `GET /api/v1/analytics/{brand_id}` — Brand Governance Analytics
- **Purpose:** Computes violation distributions, average compliance scores, and flags ambiguous guidelines.
- **Automated Test:** `tests/test_api_mock_suite.py::test_endpoint_analytics_success`
- **Test Cases Covered:** Computed metrics (HTTP 200), Brand not found (HTTP 404).
- **Mock Request:**
```http
GET /api/v1/analytics/1 HTTP/1.1
x-user-role: CREATOR
```
- **Observed Response (Sanitized):**
```json
{
  "total_submissions": 3,
  "status_breakdown": {
    "DRAFT": 1,
    "NEEDS_REVIEW": 1,
    "APPROVED": 1
  },
  "avg_compliance_score": 85.0,
  "total_findings_generated": 10,
  "findings_by_severity": {
    "CRITICAL": 4,
    "WARNING": 6
  },
  "findings_by_category": {
    "TERMINOLOGY": 6,
    "TONE": 4
  },
  "findings_by_source": {
    "DETERMINISTIC_RULE": 7,
    "RAG_LLM": 3
  },
  "resolution_breakdown": {
    "OPEN": 8,
    "OVERRIDDEN": 2
  },
  "ambiguous_guidelines": [
    {
      "chunk_id": 1,
      "source_document": "ApexCloud Brand Book 2026.pdf",
      "section_reference": "Section 2: Tone of Voice",
      "rule_category": "TONE",
      "content_excerpt": "Do not use absolute superlatives such as 'guaranteed', 'unbreakable'...",
      "times_triggered": 4,
      "times_overridden": 2,
      "override_rate": 0.50,
      "ambiguity_flag": true
    }
  ]
}
```

---

## 5. Negative & Security Test Summary

| Test Category | HTTP Code | Verified Security Behavior |
|---|:---:|---|
| **RBAC Status Gate** | `403 Forbidden` | `CREATOR` role denied permission when attempting to transition submission status to `APPROVED`. |
| **RBAC Override Gate** | `403 Forbidden` | `CREATOR` role denied permission when attempting to override audit findings with justifications. |
| **Schema Validation** | `422 Unprocessable` | Rejected invalid parameters (`min_wcag_contrast < 1.0`, short text, short reasons, short search queries). |
| **Resource Not Found** | `404 Not Found` | Graceful 404 response on non-existent brands, submissions, and guidelines without 500 crashes. |
| **Duplicate Entity** | `409 Conflict` | Database unique constraint caught cleanly when attempting to register duplicate brand names. |
| **File Type Validation** | `400 Bad Request` | Uploading non-PDF files (`.txt`, `.png`) to the guideline ingestion endpoint was rejected. |
| **PII Data Protection** | `200 OK` (Masked) | Sensitive emails and internal project keys were redacted before AI evaluation. |

---

## 6. External Integration Mocking Strategy

To comply with zero-cost and offline safety policies, all third-party integrations were intercepted at the boundary using pytest fixtures:

1. **Google GenAI Vector Embeddings:** The `gemini_service.generate_embedding` function was patched to return a deterministic synthetic vector of 768 floating-point numbers (`[0.02] * 768`). This allowed genuine PostgreSQL `pgvector` cosine similarity operations to run locally without invoking Google's servers.
2. **Google GenAI Semantic Auditing:** The `gemini_service.audit_content_semantic` function was patched to return deterministic Pydantic audit findings with simulated tone and claim violations. This enabled end-to-end verification of scoring, deduplication, and database persistence.
3. **Redis Diagnostic Ping:** The `redis_client.ping` method was selectively patched to raise connection errors, verifying that `/api/v1/health` gracefully reports `status: degraded` rather than unhandled server errors.

---

## 7. Defects Identified & Fixes Applied

1. **`BrandProfile.preferred_terminology` Declarative Mapping Failure:**
   - *Fix:* Wrapped annotation with `Mapped[Dict[str, str]]` and `Mapped[float]` in `app/models/brand.py`.
   - *Outcome:* Resolved 100% of startup ORM declarative errors.
2. **Empty `app/main.py` Entry Point:**
   - *Fix:* Created full FastAPI application with CORS, lifespan DB initialization, and route mounting in `app/main.py`.
   - *Outcome:* Allowed server to start and mount all 27 endpoints.
3. **Docker Host Port Collision on 5433 & 6379:**
   - *Fix:* Stopped conflicting background containers and started `inkloom_postgres` and `inkloom_redis`.
   - *Outcome:* PostgreSQL and Redis successfully bound to ports 5433 and 6379.
4. **PII Scrubber Offset Drift:**
   - *Fix:* Replaced iterative string substitution with reverse-offset single-pass slicing in `app/core/pii_scrubber.py`.
   - *Outcome:* Prevents text corruption and placeholder collisions.
5. **Alembic Migrations Absent:**
   - *Fix:* Initialized async Alembic environment, generated initial schema revision, and stamped head.
   - *Outcome:* Established version-controlled database schema management.

---

## 8. Residual Risks & Next Steps

1. **Production Authentication:** Replace request header simulation (`x-user-role`, `x-user-id`) with signed JWT / OAuth2 tokens in production.
2. **Frontend UI Implementation:** Scaffold Next.js 14 frontend in `frontend/` consuming the verified `/api/v1` REST endpoints.
3. **OCR Pipeline:** Implement optical character recognition for scanned/image-only PDFs using Gemini Multimodal document input.

---

## 9. Appendix — Test Files & Runner Specifications

- **`tests/test_api_mock_suite.py`** (24 tests): Comprehensive mock data suite covering all 27 API endpoints.
- **`tests/test_api_endpoints.py`** (4 tests): CRUD operations for brands, submissions, and health checks.
- **`tests/test_integration_flow.py`** (1 test): Full governance lifecycle integration from draft to approval.
- **`tests/test_rule_engine.py`** (8 tests): Deterministic banned terms, terminology, and WCAG contrast math.
- **`tests/test_document_service.py`** (4 tests): PyMuPDF PDF parsing and Pillow dominant color analysis.
- **`tests/test_pii_scrubber.py`** (3 tests): PII redaction, offset safety, and token restoration.
- **`tests/test_models.py`** (4 tests): SQLAlchemy 2.0 DeclarativeBase table schemas and defaults.
- **`tests/test_workflow_service.py`** (4 tests): Role-based state transitions and revision invariants.
