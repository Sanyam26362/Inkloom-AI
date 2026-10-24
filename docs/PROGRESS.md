# Autonomous Execution Progress Log

## Status Overview
- **Active Branch**: `inkloom-autonomous`
- **Current Phase**: Phase 2 (Data-driven rules, no client hardcoding)
- **Overall Goal**: End-to-end multi-modal brand governance engine with dynamic packs, robust chunking/retrieval, rubric-driven verdicts, audio/video pipelines, RBAC workflow, and redesigned frontend.

---

## Phase Status Summary

| Phase | Description | Status | Commit / Notes |
|---|---|---|---|
| **Phase 1** | Reliable AI calls (timeouts, retries, native async, fail-closed, single model) | ✅ Completed | `phase 1: reliable AI calls` (5626e74) |
| **Phase 2** | Data-driven rules, no client hardcoding (Campaign & RuleSet tables, extraction, no festival branches) | ✅ Completed | `phase 2: data-driven rules` (e150ef4) |
| **Phase 3** | Guideline ingestion & retrieval (PyMuPDF block chunker, markdown chunker, premade packs, deduplication) | ✅ Completed | `phase 3: ingestion and retrieval` (3248029) |
| **Phase 4** | Verdict logic & detector fixes (rubric verdict, word-boundaries, event cues, CIELAB deltaE) | ✅ Completed | `phase 4: verdicts and detectors` |
| **Phase 5** | Media pipelines (post upload, video frames + audio track, native audio, async polling) | ⏳ Pending | - |
| **Phase 6** | Auth, roles, approval workflow (JWT, deadlock resolution, status matrix, admin queue) | ⏳ Pending | - |
| **Phase 7** | Frontend flow (onboarding replacing marketing page, judge canvas, creator studio, admin queue) | ⏳ Pending | - |
| **Phase 8** | Tests, docs, wrap-up (e2e integration tests, README, deployment docs, demo script) | ⏳ Pending | - |

---

## Phase Details & Test Results

### Phase 1: Reliable AI Calls
- **Completed**:
  - Timeouts configurable (`30s` text, `60s` image, `180s` media, `20s` embeddings).
  - Tenacity retry loop (3 attempts, exponential backoff) replacing fallback model chain.
  - Full async conversion to `client.aio.models`.
  - Standardized on `gemini-3.5-flash` and `gemini-embedding-2`.
  - Startup check via `client.models.list()`; exposed in `/health`.
  - Fail-closed: `ai_status`, `ai_error`, approval refusal on `ai_status != "ok"`, default palette match `None`.
  - Embeddings L2-normalization for truncated vectors, `task_type` differentiation, 502 error on failure.
  - Approved facts accept both `"claim"` and `"fact"`.
- **Test Results**:
  - Backend acceptance tests: 5/5 passed.
  - Full backend test suite: 57/57 passed.
  - Frontend typecheck (`tsc --noEmit`): 0 errors.
  - Frontend lint (`npm run lint`): 0 errors.

### Phase 2: Data-Driven Rules, No Client Hardcoding
- **Completed**:
  - Additive Alembic migration `53d8aec9ad7b_add_campaign_and_ruleset.py` adding `campaigns` and `rulesets` tables, and `campaign_id`, `verdict`, `platform` on `submissions`.
  - `Campaign` and `RuleSet` SQLAlchemy models and Pydantic schemas. Added `REJECTED` status to workflow transitions.
  - Added RuleSet endpoints in `/api/v1/brands`: `POST /brands/{id}/rules/extract` (async structured JSON from guidelines), `POST /brands/{id}/rules` (confirm/save and sync deterministic fields to BrandProfile), `GET/PUT /brands/{id}/rules`.
  - Added Campaign CRUD endpoints: `POST/GET /brands/{id}/campaigns` and `GET/PUT /brands/{id}/campaigns/{id}`.
  - Removed all hardcoded client strings from audit pathways: zero default-to-Diwali, zero festival hardcoding, zero hardcoded superhero lists, zero hardcoded hex strings (`#F8C200`, `#1C1C1E`) or fake PDF filenames in citations.
  - Word boundary regex (`\b{re.escape(subject)}\b`) ensures "author" does not match "thor", and "marvelous" does not match "marvel".
  - Model explanations/summaries are excluded from keyword checks to prevent false positive violations on negated text.
  - Pure in-memory execution for `persist=False` without mutating submission/revision.
  - Resolved approval deadlock by recalculating compliance score when findings are overridden or resolved.
  - Second fictional client ("Acme Tea", Holi campaign) test asserts zero "Blinkit", "Diwali", "Spider-Man", or Blinkit hex string leakage.
### Phase 3: Guideline Ingestion and Retrieval
- **Completed**:
  - Rewrote PDF chunker in `DocumentService` using PyMuPDF blocks and text spans: detects font sizes and weights, extracts meaningful section references (zero occurrences of "Page N Section"), groups tables atomically without splitting rows, keeps bullet points intact, and guarantees all chunks <= 250 words across all 14 pages of `blinkit_guidelines.pdf` (producing 33 structured chunks).
  - Implemented heading-aware markdown chunker splitting on `##` and `###` headers, tracking heading hierarchies (`section_reference`) without blind character slicing.
  - Created premade pack infrastructure in `backend/packs/blinkit/` with `manifest.json`, `campaign.json`, `blinkit_guidelines.pdf`, `blinkit_diwali_2026_brand_guidelines.md`, and `blinkit_diwali_2026_design_system.md`.
  - Added `PackService` and `packs` router with `GET /api/v1/packs` and `POST /api/v1/packs/{name}/load`: indexes all pack documents without caps, creates/updates active `Campaign`, idempotently replaces old chunks, triggers RuleSet extraction, and syncs deterministic fields to `BrandProfile`.
  - Added additive Alembic migration `16f638f2fae9_add_guideline_chunk_hygiene_fields.py` adding `source_kind`, `document_id`, `content_hash`, `document_type`, and `embedding_status` columns and indexes to `guideline_chunks`.
  - Added multi-format upload endpoint `POST /api/v1/guidelines/upload` (.pdf, .md, .txt with `document_type`), `DELETE /api/v1/guidelines/{id}`, `DELETE /api/v1/guidelines/document/{doc_id}`, and `POST /api/v1/guidelines/reindex` with `asyncio.Semaphore(5)` batched concurrency limit.
  - Upgraded `AuditService.retrieve_relevant_guidelines`:
    - Checks for 0 retrievable chunks and raises a clear error at audit time.
    - Always includes hard-rule chunks (`PROHIBITED`, `EVENT`, `DECISION`) in every audit.
    - Adds top-k=8 semantic matches via query `content summary + media type + campaign`.
    - Implemented deterministic fallback ordering by `id ASC` when embeddings are unavailable.
    - Increments `times_triggered` governance counter once per audit.
  - Updated `main.py` auto-seed to load the Blinkit pack dynamically from `manifest.json`.
- **Test Results**:
  - Acceptance suite `test_phase3_ingestion_retrieval.py`: 6/6 passed.
  - Full backend test suite: 67/67 passed (100%).
  - Frontend typecheck (`tsc --noEmit`): 0 errors.
  - Frontend lint (`npm run lint`): 0 errors.

### Phase 4: Verdict Logic and Detector Fixes
- **Completed**:
  - Authoritative verdict calculation via `AuditService.evaluate_verdict_and_dimensions`: computes per-dimension `PASS`/`NEEDS_REVIEW`/`FAIL` across 6 dimensions (`visual_identity`, `prohibited_content`, `campaign_event`, `voice_and_terminology`, `accessibility`, `claims_and_facts`), returning authoritative `verdict` (`PASS`, `NEEDS_REVIEW`, `FAIL`) while compliance score remains a derived metric.
  - Word-boundary matching using `RuleEngine.build_boundary_pattern`: intelligently handles alphanumeric and punctuation-terminated terms (e.g. `100%`) without regex lookbehind crashes or missing symbol boundaries.
  - Model summary/explanation exclusion: deterministic guards scan structured model outputs (`detected_subjects`, `prohibited_elements_found`, `has_prohibited_elements`) and extracted `visible_text`, never free-form model explanations, eliminating false positives on negated text ("no superheroes found").
  - Generalised campaign cue evaluation: counts only structured `event_cues_detected` from model intersected with `campaign.required_cues`.
  - Deterministic checks for exaggeration terms (`100%`, `instant`, `guaranteed`, `always`), required phrases (`Blinkit app`), terminology rules (`(?<!\bblinkit\s)\bapp\b`), accessibility alt-text minimums (missing = CRITICAL, <5 words = WARNING), and platform post specs.
  - CIELAB DeltaE palette match: pixel-area weighted Euclidean CIE76 color distance in Lab color space without integer floor division (`//16*16`) bias; palette threshold dynamically sourced from RuleSet.
  - WCAG 2.1 AA text contrast calculator: `RuleEngine.calculate_wcag_contrast` computes foreground vs background contrast on text contrast pairs extracted by vision model.
  - PII scrubber enhancements: eliminates false-positive phone detections on order numbers (`Order #1002345678`), invoice numbers, and prices (`Rs. 999`, `₹1000`, `$1200`), and handles overlapping replacements safely.
  - Idempotent re-audit: automatically cleans up existing findings for the same revision before re-inserting fresh findings.
  - In-memory execution (`persist=False`): returns pure audit output without mutating submission or revision state.
- **Test Results**:
  - Regression and acceptance suite `test_phase4_verdicts_detectors.py`: 20/20 passed (covering BG-TC-01 through BG-TC-09, false positives, idempotency, and in-memory execution).
  - Full backend test suite: 87/87 passed (100%).
  - Frontend typecheck (`tsc --noEmit`): 0 errors.
  - Frontend lint (`npm run lint`): 0 errors.



