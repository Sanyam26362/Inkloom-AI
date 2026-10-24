# Phase 1 Implementation Notes: Reliable AI Calls

## Overview
Phase 1 focuses exclusively on making the AI calling pipeline reliable, asynchronous, resilient, and fail-closed across all multi-modal channels (text, image, audio, video, and pgvector embeddings).

## 1. Single Model Architecture & Deprecation Cleanup
- **Primary LLM & Vision**: Standardized strictly on `gemini-3.5-flash` for all text, vision, audio, and video audits.
- **Embeddings**: Retained `gemini-embedding-2` producing 768-dimensional vectors matching the PostgreSQL `pgvector` column.
- **Removed Deprecated Models**: Removed `FAST_INLINE_MODEL` and multi-model fallback chain (`FALLBACK_MODELS`). Zero references remain in code, configuration, documentation, or `.env.example` to invalid or deprecated model names.
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

---

# Phase 3 Implementation Notes: Guideline Ingestion and Retrieval

## 1. PyMuPDF Block & Text Span Chunker
- Replaced the naive `page.get_text("text").split("\n\n")` implementation with PyMuPDF block layout and span analysis.
- Detects headings using font size (`>= 13.0` pt), bold flags (`flags & 2 != 0`), and section numbering patterns (`1.`, `4.1`, etc.).
- Produces clean hierarchical section references (e.g. `13. Compliance Test Cases (Brand Guidelines)`). Zero chunks are named `"Page N Section"`.
- Markdown tables (like the 12 compliance test cases on page 14) are chunked atomically by row with the table header retained, preventing table rows from being split across chunk boundaries.
- All 14 pages of `blinkit_guidelines.pdf` are parsed into 33 chunks, with a maximum of 136 words per chunk (well below the 250-word cap).

## 2. Heading-Aware Markdown Chunker
- Chunks markdown files along `##` and `###` headers while keeping heading hierarchy intact in `section_reference` (e.g. `1. Color Palette > 1.1 Approved Swatches`).
- Eliminates previous blind character slicing (which broke markdown syntax and cut words in half).
- `blinkit_diwali_2026_brand_guidelines.md` yields 37 chunks and `blinkit_diwali_2026_design_system.md` yields 40 chunks, all within 150 words.

## 3. Premade Pack Infrastructure
- Created `backend/packs/blinkit/` containing `manifest.json`, `campaign.json`, `blinkit_guidelines.pdf`, `blinkit_diwali_2026_brand_guidelines.md`, and `blinkit_diwali_2026_design_system.md`.
- Implemented `PackService` and `POST /api/v1/packs/{name}/load`:
  - Uses `Path(__file__)`-based absolute path resolution independent of working directory.
  - Indexes all documents completely without caps.
  - Creates or updates the associated `Campaign` (`Diwali 2026`).
  - Idempotently deletes prior premade chunks for the brand before re-inserting.
  - Triggers RuleSet extraction and syncs deterministic fields (`approved_hex_palette`, `banned_terms`, `preferred_terminology`, `approved_facts`) to `BrandProfile`.
- Exposed `GET /api/v1/packs` listing all discoverable packs.

## 4. Chunk Hygiene and Deduplication
- Added additive Alembic migration `16f638f2fae9_add_guideline_chunk_hygiene_fields.py` adding `source_kind`, `document_id`, `content_hash`, `document_type`, and `embedding_status` columns to `guideline_chunks`.
- Re-uploading a document replaces prior chunks from that same document for the brand.
- Added `DELETE /api/v1/guidelines/{id}` and `DELETE /api/v1/guidelines/document/{doc_id}`.
- Added `POST /api/v1/guidelines/reindex` with `asyncio.Semaphore(5)` batched concurrency limit.

## 5. Retrieval Logic
- `AuditService.retrieve_relevant_guidelines`:
  - Raises a clear error (`ValueError`) if a brand has 0 indexed chunks at audit time.
  - Always retrieves hard-rule chunks (`PROHIBITED`, `EVENT`, `DECISION`) to guarantee that safety, copyright (e.g. Spider-Man), and firecracker rules are present in every audit prompt.
  - Adds top-k=8 semantic matches via query `content summary + media type + campaign`.
  - Fallback ordering is deterministic by `id ASC` when vector embeddings are unavailable.
  - Increments `times_triggered` once per audit across all retrieved chunks.

---

# Phase 4 Implementation Notes: Verdict Logic and Detector Fixes

## 1. Authoritative Verdict & Rubric Scoring
- Introduced `AuditService.evaluate_verdict_and_dimensions`:
  - Partitions findings into 6 standardized governance dimensions: `visual_identity`, `prohibited_content`, `campaign_event`, `voice_and_terminology`, `accessibility`, `claims_and_facts`.
  - Calculates per-dimension status (`PASS`, `NEEDS_REVIEW`, `FAIL`) and dimension scores.
  - Overall verdict logic is authoritative:
    - Overall `FAIL` if any dimension fails or any `CRITICAL` finding is present.
    - Overall `NEEDS_REVIEW` if any dimension needs review, any `WARNING` finding is present, or `ai_status != "ok"`.
    - Overall `PASS` if all dimensions pass with 0 critical or warning findings and `ai_status == "ok"`.
  - Stored inside `SubmissionRevision.ai_governance_metadata["dimension_results"]` and exposed on `Submission.verdict`.

## 2. Word Boundary Matching with Symbol Boundaries
- Implemented `RuleEngine.build_boundary_pattern`:
  - Standard regex `\b` fails on non-word characters (e.g. trailing `%` in `"100%"`), which caused false negatives in term detection.
  - Inspects first and last characters of terms: uses `\b` for alphanumeric/underscore characters and `(?<!\w)` / `(?!\w)` for punctuation-adjacent boundaries.
  - Completely prevents substring false matches (e.g. "thor" matching inside "author", or "marvel" matching inside "marvelous").

## 3. Structured Event Cue Counting & Prohibited Guardrails
- Count only structured `event_cues_detected` from the vision model intersected with `campaign.required_cues`.
- Eliminated loose keyword scanning on image metadata and text descriptions which previously matched "lamp-post" as festive Diwali "lamp".
- Prohibited visual subject guards inspect only structured fields (`detected_subjects`, `prohibited_elements_found`, `has_prohibited_elements`) and extracted `visible_text`. Model explanations/summaries are not scanned, preventing false alarms when the model states that no prohibited elements were found.

## 4. CIELAB DeltaE Palette Matching
- Replaced the unweighted `//16*16` integer quantisation logic with standard CIELAB CIE76 DeltaE distance:
  - Converts sRGB pixels to linear RGB, D65 XYZ, and CIELAB space.
  - Evaluates pixel-area match against approved brand swatches using Euclidean distance in Lab color space.
  - Matches under the dynamic palette threshold (from `RuleSet.decision_rules["palette_threshold"]` or default 75.0%) generate a `WARNING`, or `CRITICAL` if severely misaligned (< threshold - 25%).

## 5. WCAG 2.1 AA Contrast Calculation
- `RuleEngine.calculate_wcag_contrast(fg_hex, bg_hex)` calculates standard relative luminance contrast ratio (1.0 to 21.0).
- Text/background color pairs extracted by the vision model (`text_contrast_pairs`) are evaluated; ratios below 4.5:1 generate an accessibility finding (`CRITICAL` if < 3.0:1, `WARNING` if < 4.5:1).

## 6. PII Scrubber Fixes
- Added context-aware lookahead: order numbers (`Order #...`), invoices (`Invoice #...`), transaction receipts, and prices (`Rs.`, `₹`, `$`, `INR`) are excluded from phone number regex matching.
- Sorted PII spans by `(start, -length)` to safely discard overlapping candidate matches and prevent corrupted replacement string slicing.

## 7. Idempotent Audits & In-Memory Execution
- In `run_audit` and `run_image_audit`, existing findings for the targeted revision are automatically deleted via `delete(AuditFinding).where(AuditFinding.revision_id == revision.id)` prior to inserting new findings.
---

# Phase 5 Implementation Notes: Media Pipelines

## 1. Magic Byte Validation & File Size Enforcements
- Implemented `app.core.media_validation.py` verifying raw file headers (magic bytes) to prevent extension spoofing (e.g., text files renamed to `.wav` or `.mp4`):
  - **Images**: Max 10MB; PNG (`\x89PNG`), JPEG (`\xFF\xD8\xFF`), WEBP (`RIFF....WEBP`).
  - **Audio**: Max 25MB; MP3 (ID3 or frame sync `\xFF\xFB/\xF3/\xF2`), WAV (`RIFF....WAVE`), OGG (`OggS`), FLAC (`fLaC`), M4A (`....ftypM4A/mp42/isom`).
  - **Video**: Max 100MB; MP4/MOV (`....ftyp`), WEBM/MKV (`\x1A\x45\xDF\xA3`), AVI (`RIFF....AVI`).
- Rejects invalid formats or oversize payloads with HTTP 400.

## 2. Cloudinary & Storage Provider Transparency
- Eliminated silent Cloudinary fallback in `CloudinaryService`:
  - `upload_file` returns `storage_provider` (`"cloudinary"` or `"local"`) and explicit `fallback_reason` (e.g. `"cloudinary_not_configured"`, `"cloudinary_upload_error"`).
  - Tracked in `SubmissionRevision.ai_governance_metadata["storage"]`.
- `extract_video_frames` follows verified fallback order:
  - Cloudinary transformation URLs first (when Cloudinary is configured).
  - Local `ffmpeg` subprocess fallback when binary is available on system `PATH`.
  - Graceful empty frame list if neither is available (never crashes video audit pipeline).

## 3. Native Audio Audit Pipeline
- Added `TimestampedAudioFinding` and `GeminiAudioAuditOutput` schemas to `gemini_service.py`.
- `GeminiService.audit_audio`:
  - Directly analyzes raw audio using `gemini-3.5-flash` with MIME types (`audio/mp3`, `audio/wav`, etc.).
  - Evaluates voiceover tone against `BrandProfile.tone_persona` (e.g. friendly, punchy).
  - Checks for mandatory campaign phrases.
  - Checks background music vs speech balance.
  - Prohibited SFX detector flags explosive sounds (firecrackers, sirens, loud bangs) with exact start/end timestamps.
- `AuditService.run_audio_audit`:
  - Maps timestamped findings into standardized `AuditFinding` records linked to retrieval chunks.
  - Re-runs `RuleEngine.evaluate_content_text` on speech transcript to catch banned terms and PII.

## 4. Video Frame Parallel Auditing with Isolated Sessions
- `AuditService.run_video_audit`:
  - Extracts keyframes (0%, 25%, 50%, 75%, 100%).
  - Executes parallel frame vision audits with `asyncio.Semaphore(4)`.
  - Uses an isolated `AsyncSessionLocal()` per frame to eliminate SQLAlchemy `Session is already flushing` concurrency conflicts.
  - Verifies end-card brand palette match on final frame (100%).
  - Checks dialogue transcription and burnt-in captions accessibility.

## 5. Combined Instagram Post Creative Auditing
- `POST /api/v1/submissions/{id}/upload-post`:
  - Uploads creative image and caption/hashtags together.
  - Audits image (palette, subjects, contrast) and copy (terms, PII, tone) in tandem.
  - Enforces Instagram platform specs:
    - Supported aspect ratios: 1:1, 4:5, 9:16, 1.91:1 (tolerance ±0.05).
    - Caption length cap: max 2,200 characters.
    - Hashtags cap: max 30 hashtags.
    - Accessibility: alt text mandatory and must be >= 5 words.

## 6. Asynchronous Audit Job Polling
- Implemented `AuditJobManager` (`app.services.audit_job_manager.py`) tracking background audit executions (`queued`, `running`, `done`, `failed`) with progress float (0.0 to 1.0) and human-readable step descriptions.
- `GET /api/v1/submissions/{id}/audit-status`: Polling endpoint returning live progress or final audit verdict.
- Upload endpoints support `?background=true`, returning HTTP 202 immediately with job details.

---

# Phase 6 Implementation Notes: Auth, Roles & Approval Workflow

## 1. Real JWT Authentication & Role-Based Access Control
- Integrated `PyJWT` for signed token issuance and signature verification (`HS256`, 24h expiration) in `app.core.security`.
- Strict Security Rule: Never trust raw `x-user-role` headers without a valid JWT Bearer token. Any request with `x-user-role` lacking a valid Bearer token is rejected with HTTP 401 Unauthorized.
- Enforced roles: `CREATOR`, `JUDGE`, `ADMIN` (with backward compatibility aliases `REVIEWER` and `MANAGER`).
- Added authentication endpoints in `app/api/v1/auth.py`:
  - `POST /api/v1/auth/login`: Quick persona login via `{"role": "..."}` or verified email/password.
  - `GET /api/v1/auth/me`: Decoded JWT identity and tenant profile.
  - `GET /api/v1/auth/demo-users`: Seeded personas (`admin@inkloom.ai`, `judge@inkloom.ai`, `creator@inkloom.ai`).

## 2. Multi-Tenant Isolation
- Additive Alembic migration `27e8a94b301c_add_users_and_tenant_isolation.py`:
  - Created `user_accounts` table.
  - Added indexed `tenant_id` and `owner_id` columns to `brand_profiles`.
- Scoped `GET /api/v1/brands` by `user.tenant_id` + shared demo brands (`tenant_default`), while granting `ADMIN` visibility across all tenant brands.
- Auto-seeded demo accounts in application startup (`lifespan`).

## 3. Approval Deadlock Resolution & Effective Verdict Recalculation
- Overriding or resolving audit findings automatically triggers `WorkflowService._recalculate_revision_and_verdict`:
  - Recalculates effective compliance score (subtracting only remaining `OPEN` findings).
  - Authoritatively recalculates effective verdict (`FAIL` if open critical findings remain, `NEEDS_REVIEW` if open warnings remain, `PASS` when all critical and warning findings are resolved/overridden).
  - Updates `submission.verdict`, `submission.compliance_score`, and revision metadata.
- Approval rules:
  - Blocked if any `OPEN` `CRITICAL` findings remain (must be resolved by new revision or overridden with reason).
  - Blocked if current revision `ai_status != "ok"`.
  - `JUDGE` / `REVIEWER` can approve `PASS` verdicts.
  - Only `ADMIN` can approve `NEEDS_REVIEW` verdicts.
  - Only `ADMIN` can approve `FAIL` verdicts, requiring an explicit written administrative override note.

## 4. Status Transition Matrix & Finding Lockdown
- Strict transition matrix enforced in `WorkflowService.change_status`:
  - `DRAFT -> AUDITING`
  - `AUDITING -> NEEDS_REVIEW | CHANGES_REQUESTED | REJECTED | APPROVED`
  - `NEEDS_REVIEW -> APPROVED | CHANGES_REQUESTED | REJECTED | AUDITING`
  - `CHANGES_REQUESTED -> DRAFT | AUDITING | REJECTED`
  - `REJECTED -> DRAFT`
  - `APPROVED -> DRAFT` (only via new revision).
- `REJECTED` status strictly requires a non-empty written reason (HTTP 400).
- `NEEDS_REVIEW` cannot be set manually without a completed audit of current revision.
- Locked down `/findings/{id}/override` and `/findings/{id}/resolve`:
  - Enum validation: `OPEN`, `RESOLVED`, `OVERRIDDEN`, `ACCEPTED`.
  - `OVERRIDDEN` requires a mandatory justification string.
  - Role check: Only `JUDGE` or `ADMIN` can override or resolve (creators can accept corrections; direct overrides by creator return HTTP 403).
  - Audit trail recorded in `WorkflowEvent`.

## 5. Concurrency Protection & Automatic Re-Audits
- `WorkflowService.create_new_revision`:
  - Uses `select(Submission).with_for_update()` to prevent race conditions on `current_version` increments.
  - Automatically schedules a background re-audit task for the newly created revision.

# Phase 7 Implementation Notes: Frontend Flow

## 1. Asset & Section Cleanup
- Cleaned 48 legacy Filestage webp marketing screenshots from `frontend/public/images/`.
- Removed 22 duplicate static marketing sections from `frontend/src/components/sections/`.
- Transformed the home route (`/`) from a static marketing clone into an interactive, 4-step onboarding wizard.

## 2. Interactive Onboarding Wizard (`/`)
- Step 1: Select Enterprise Brand (Turnkey Blinkit Quick-Commerce demo with pre-configured tone, approved hex palette, and banned terms vs. custom brand onboarding).
- Step 2: Guidelines Ingestion (1-click load of Blinkit Diwali 2026 pack calling `/packs/blinkit/load` or drag-and-drop custom PDF/Markdown upload).
- Step 3: Review & Edit Extracted RuleSet (Interactive palette color swatches with hex input and delete, zero-tolerance banned terms badges, preferred terminology replacement mappings, and decision rules).
- Step 4: Persona Selection & Direct Launch:
  - Alex Rivera (Creator) -> `/content` (Creator Studio)
  - Sasha Bloom (Judge) -> `/judge` (Judge Canvas)
  - Jordan Vance (Admin) -> `/dashboard` (Admin Governance Queue)

## 3. JWT Authentication & Persona Switcher
- AppContext and Header automatically sync user persona with backend JWT authentication (`POST /api/v1/auth/login`).
- All requests through `frontend/src/lib/api.ts` automatically attach `Authorization: Bearer <token>` from `localStorage.getItem("inkloom_token")`.
- Header role dropdown supports all roles: `CREATOR`, `JUDGE`, `ADMIN`, `REVIEWER`, `MANAGER` with visual role dots and instant persona switching.

## 4. Judge Canvas & Demo Presets (`/judge`)
- Prominent source toggle: "Preloaded Blinkit Guidelines" vs "Upload Custom Guidelines".
- 1-Click Judge presets:
  - Spider-Man superhero test (violates prohibited visual elements, triggers `CRITICAL` finding and `FAIL` verdict).
  - Compliant Diwali sweets test (matches approved `#F8C200` palette, Diwali event cues, triggers `PASS` verdict).
  - Instant delivery claims test (violates banned terminology "instant delivery guaranteed", triggers `WARNING`).
- Multi-modal audit runner supports Instagram Post, Poster/Banner, Video, Audio, and Text Copy.
- Authoritative verdict badges (`PASS`, `NEEDS_REVIEW`, `FAIL`), compliance progress gauge, severity distribution cards, category icons, flagged excerpt snippets, and suggested corrections.

## 5. Admin Governance Dashboard (`/dashboard`)
- KPI grid: Total submissions, Average compliance score, Auto-remediation rate, Flagged ambiguous guidelines.
- Submissions review table with quick approve and reject actions passing mandatory administrative explanation notes.
- Non-swallowed error handling: errors (e.g. HTTP 409 from unresolved critical findings) surface in visible toast banners with 8-second auto-dismiss.
- Intelligence widgets: Top recurring policy violations progress bars and flagged ambiguous guidelines override rate table.




