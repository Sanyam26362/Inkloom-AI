# Phase 1 Implementation Notes: Reliable AI Calls

## Overview
Phase 1 focuses exclusively on making the AI calling pipeline reliable, asynchronous, resilient, and fail-closed across all multi-modal channels (text, image, audio, video, and pgvector embeddings).

## 1. Single Model Architecture & Deprecation Cleanup
- **Primary LLM & Vision**: Standardized strictly on `gemini-3.5-flash` for all text, vision, audio, and video audits.
- **Embeddings**: Retained `gemini-embedding-2` producing 768-dimensional vectors matching the PostgreSQL `pgvector` column.
- **Removed Deprecated Models**: Removed `FAST_INLINE_MODEL` and multi-model fallback chain (`FALLBACK_MODELS`). Zero references remain in code, configuration, documentation, or `.env.example` to `gemini-3.8-flash`, `gemini-3.8-flash-lite`, `gemini-3.5-flash-lite`, or `gemini-2.5-flash`.
- **Model Validation on Startup & Health**:
  - `gemini_service.verify_configured_models()` runs during application startup (`lifespan`).
  - Results are exposed in `/health` under `ai_integration.models` with boolean validity per model (`gemini-3.5-flash` and `gemini-embedding-2`).

## 2. Configurable Timeouts & Tenacity Retries
- Configurable settings in `app.core.config`:
  - `GEMINI_TIMEOUT_TEXT = 30` seconds
  - `GEMINI_TIMEOUT_IMAGE = 60` seconds
  - `GEMINI_TIMEOUT_MEDIA = 180` seconds (audio/video)
  - `GEMINI_TIMEOUT_EMBEDDING = 20` seconds
- Retries use `tenacity` with up to 3 attempts and exponential backoff (`wait_exponential(multiplier=1.0, min=2.0, max=10.0)`), retrying on 429 Resource Exhausted, 5xx server errors, and API connection/read timeouts.
- In place of multi-model fallback, the engine reliably retries the single model before failing closed.

## 3. Native Asynchronous Execution
- Fully converted `GeminiService` to use `google-genai` SDK's native async interface (`client.aio.models.generate_content`, `client.aio.models.embed_content`).
- All callers in `audit_service.py`, `submissions.py`, `guidelines.py`, `seed_data.py`, and `seed_blinkit.py` await these calls.
- Event loop remains non-blocking during AI calls, allowing concurrent audits to execute in parallel without sequential queuing.

## 4. Fail-Closed Governance
- Added `ai_status` (`"ok" | "partial" | "failed" | "skipped"`) and `ai_error` to:
  - `SubmissionRevision.ai_governance_metadata`
  - `AuditExecutionResponse` Pydantic schema
- If any AI step times out, exhausts quota, or fails:
  - Sets `ai_status = "failed"` with descriptive `ai_error`.
  - Sets submission status to `NEEDS_REVIEW`.
  - Injects a visible `WARNING` finding into the audit report: `"AI analysis incomplete: <reason>"`.
  - Blocks transition to `APPROVED` in `WorkflowService.change_status` unless the current revision has `ai_status == "ok"` (raises HTTP 409 Conflict).
- Removed default `palette_match_pct: 100.0` on failure, returning `None`.
- Removed fake transcript placeholders (`"(No speech or spoken content detected in audio recording)"`, `"(No spoken dialogue or meaningful on-screen text detected in video)"`). On transcription failure, the engine marks `ai_status = "failed"` and surfaces an incomplete analysis finding.
- The text audit path (`audit_content_semantic`) returns a structured result distinguishing "no findings" from "call failed".

## 5. Embeddings & RAG
- Truncated embedding vectors to 768 dimensions are explicitly L2-normalized.
- Configured appropriate task types:
  - `RETRIEVAL_DOCUMENT` for guideline chunk indexing
  - `RETRIEVAL_QUERY` for audit query retrieval
- Embedding failures are tracked in `embedding_failure_count` and logged; guideline upload routes raise HTTP 502 with a clear message rather than silently storing chunks with `embedding = None`.

## 6. Approved Facts Key Compatibility
- `audit_content_semantic` and `audit_image_semantic` accept both `"claim"` and `"fact"` keys in approved facts dictionaries, resolving the difference between the auto-seed format and prior schema.

## 7. Assumptions & Trade-offs
- In `WorkflowService.change_status`, legacy submissions or mock test submissions without explicit `ai_governance_metadata` or created before this phase are permitted to approve if no AI audit was conducted, but any submission that executed an AI audit MUST have `ai_status == "ok"`.
- Rate limiting (429 RESOURCE_EXHAUSTED) from live Gemini endpoints triggers the exponential backoff up to 3 times before cleanly failing closed to `NEEDS_REVIEW` with an informative warning finding.
