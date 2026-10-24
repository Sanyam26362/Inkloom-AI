# Inkloom AI - Enterprise Brand Governance Platform

Inkloom AI is an autonomous, multi-modal brand governance platform designed for fast-moving marketing, creative, and legal teams. It acts as an automated brand guardian, continuously auditing copy, social carousels, image posters, audio voiceovers, and promotional video reels against data-driven brand guidelines before public release.

---

## ⚡ Key Highlights & Architecture

- **Single Model Rule**: Standardized exclusively on Google Gemini:
  - **`gemini-3.5-flash`**: High-performance multi-modal auditor for all text copy, high-resolution imagery, audio voiceovers, and video frame extraction.
  - **`gemini-embedding-2`**: 768-dimensional L2-normalized vector embeddings for high-precision semantic guideline retrieval.
- **Data-Driven Rules**: Zero hardcoded client strings or festival branches. Every brand profile, campaign, and ruleset is dynamically extracted and synchronized into Postgres.
- **Multi-Modal Media Pipelines**:
  - **Social Posts**: Validates Instagram/X dimensions (1:1, 4:5, 9:16), caption lengths, hashtag quotas, and WCAG 1.1.1 alt-text compliance.
  - **Images & Posters**: Color extraction with weighted CIELAB $\Delta E$ palette matching against brand hex tokens and WCAG 4.5:1 text-background contrast analysis.
  - **Audio Voiceovers**: Native audio ingestion analyzing voiceover cadence, background music levels, mandatory phrases, and prohibited SFX.
  - **Video Reels**: Frame extraction with semaphore concurrency limits, dialogue transcription, and visual brand end-card verification.
- **Fail-Closed Governance**: If external AI services encounter timeouts or rate limits, the system preserves integrity by reporting explicit AI statuses and refusing unverified automated approvals.
- **Enterprise RBAC & Approval Workflows**: Role-based access control with secure JWT tokens (`CREATOR`, `JUDGE`, `ADMIN`), deadlock resolution on finding overrides, and concurrency-safe revision locking (`select for update`).

---

## 👥 Seeded Demo Accounts

On startup, Inkloom AI automatically seeds enterprise demo accounts for zero-friction evaluation:

| Persona | Role | Email | Password | Primary Workspace |
| :--- | :--- | :--- | :--- | :--- |
| **Jordan Vance** | `ADMIN` | `admin@inkloom.ai` | `InkloomDemo2026!` | Admin Governance Dashboard (`/dashboard`) |
| **Sasha Bloom** | `JUDGE` / `REVIEWER` | `judge@inkloom.ai` | `InkloomDemo2026!` | Real-time Audit & Judge Canvas (`/judge`) |
| **Alex Rivera** | `CREATOR` | `creator@inkloom.ai` | `InkloomDemo2026!` | Creative Studio & Revisions (`/studio`) |

*(Default credentials for all seeded demo accounts: `InkloomDemo2026!`)*

---

## ⏱️ 5-Minute Judge Demo Script

Experience the complete end-to-end brand governance workflow in under 5 minutes:

### Step 1: Client Onboarding Wizard
1. Open [`http://localhost:3000/`](http://localhost:3000/) in your browser.
2. Under **Step 1 (Select Client)**, select the **Blinkit** quick-commerce demo card.
3. Under **Step 2 (Ingest Guidelines)**, click **"⚡ Load Premade Blinkit Diwali Pack"** to load and index the full brand guidelines and campaign specification.
4. Under **Step 3 (Review RuleSet)**, review the extracted brand colors (`#F8C200`, `#00A36C`, `#1C1C1E`), zero-tolerance banned terms (`instant`, `guaranteed`, `100%`), and required campaign cues.
5. Under **Step 4 (Launch Demo Persona)**, click **"Launch Judge Canvas as Sasha Bloom (Judge)"**.

### Step 2: Test Critical Off-Brand Detection ("Spider-Man Test")
1. In the **Judge Canvas** (`/judge`), click the **"🕷️ Spider-Man Test"** preset button.
2. Click **"Run Brand Audit"**.
3. **Observe the Verdict**: The system immediately flags a **CRITICAL** off-brand violation for unauthorized superhero imagery, detects color palette mismatch, and issues a decisive **`FAIL`** verdict.

### Step 3: Test Compliant Campaign Rollout
1. In the **Judge Canvas**, click the **"🪔 Compliant Sweets"** preset button.
2. Click **"Run Brand Audit"**.
3. **Observe the Score**: Compliance score reaches **95%+**, verified against all Diwali festive cues, WCAG accessibility standards, and Blinkit brand voice, resulting in a **`PASS`** verdict.

### Step 4: Admin Governance Intelligence & Approval
1. Use the persona switcher in the top navigation bar to switch to **Jordan Vance (Admin)**.
2. Navigate to [`http://localhost:3000/dashboard`](http://localhost:3000/dashboard).
3. Inspect the **Live Admin Queue**, **Policy Violation Breakdown**, and the **AI Agreement Rate** metric tracking human auditor consensus with AI recommendations.

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 18+

### 1. Start Infrastructure
Start PostgreSQL with `pgvector` and Redis:
```powershell
docker compose up -d
```
*(Postgres runs on port `5433`, Redis runs on port `6379`)*

### 2. Backend Setup
```powershell
cd backend
python -m venv .venv312
.\.venv312\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```
API Documentation is available at [`http://localhost:8000/docs`](http://localhost:8000/docs).

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Open [`http://localhost:3000`](http://localhost:3000) to access the web application.

---

## 🧪 Testing & Quality Assurance

Run the comprehensive automated test suite:

```powershell
# Backend Test Suite (100+ tests including unit, integration, and E2E)
cd backend
.\.venv312\Scripts\python -m pytest -v

# Frontend Typecheck and Lint
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## 📜 License & Compliance

Built for autonomous enterprise brand governance. All external AI calls strictly adhere to tenant isolation boundaries and scrub confidential PII data prior to evaluation.
