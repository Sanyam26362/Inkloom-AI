# Inkloom AI — Autonomous Multi-Modal Brand Governance Platform

<div align="center">

![Inkloom AI Banner](https://img.shields.io/badge/Inkloom%20AI-Brand%20Governance-F8C200?style=for-the-badge&logo=shield&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Next.js 16](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL%2016-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini%203.5-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Clerk Auth](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)

**Continuous, automated pre-flight brand compliance auditing for marketing copy, social posters, audio voiceovers, and video reels before publication.**

[Features](#-key-capabilities) • [Architecture](#-system-architecture) • [Installation Guide](#-installation--setup-instructions) • [Environment Setup](#-environment-variables) • [Demo Walkthrough](#-demo-walkthrough) • [API Reference](#-api-endpoints)

</div>

---

## 📖 Overview

**Inkloom AI** is an enterprise-grade AI governance engine engineered for brand managers, creative agencies, and compliance officers. It automates manual creative review cycles by auditing incoming creative assets against data-driven brand guidelines in milliseconds.

Using **Google Gemini 3.5 Flash** paired with deterministic image/color processing engines (**CIELAB $\Delta E76$** color palette matching and **WCAG AA 4.5:1** contrast analysis), Inkloom AI eliminates off-brand marketing collateral, ungrounded claims, and regulatory violations before assets enter production queues.

---

## ⚡ Key Capabilities

* **Deterministic CIELAB $\Delta E76$ Color Analysis**: Pixel-area weighted Euclidean distance in CIELAB color space measuring conformity against official brand hex palettes (e.g. Blinkit Sunflower Yellow `#F8C200` & Forest Green `#00A36C`).
* **WCAG AA 4.5:1 Accessibility Enforcement**: Automated text-background luminosity contrast calculation across all visual collateral.
* **Autonomous Multimodal Pre-Flight Audits**:
  * **Images & Posters**: Optical Character Recognition (OCR), prohibited imagery detection (e.g. firecracker/smoke guardrails during eco-friendly Diwali campaigns), and logo safety zones.
  * **Copy & Social Captions**: Real-time banned terminology detection, mandatory disclaimers, platform character limits, and hashtag quotas.
  * **Audio Voiceovers**: Transcription analysis, cadence checking, mandatory nomenclature validation, and prohibited sound effect checks.
  * **Video Reels**: Synchronous frame extraction with semaphore concurrency limits, dialogue transcription, and visual brand end-card verification.
* **Fail-Closed Governance Safety**: Fail-closed reliability architecture that handles rate limits (429) gracefully, logs clear telemetry, and flags incomplete checks for manual human sign-off.
* **Dual Persona Role-Based Workflows**:
  * **Agency Creators**: Upload creative assets, preview benchmark brand samples, receive instant multi-dimensional AI feedback, and submit directly to brand review queues.
  * **Brand Reviewers & Judges**: Inspect queued collateral with full poster previews, copy excerpts, and AI dimension breakdowns; approve compliant work or request revisions with structured feedback.
* **Database Reset & Recovery**: One-click database purge and re-seeding tool that refreshes tenant guidelines and restores a pristine demo state instantly.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Next.js 16 Frontend (App Router + Turbopack)"]
        UI_Studio["Creator Studio (/content)"]
        UI_Dash["Brand Governance Dashboard (/dashboard)"]
        UI_Audit["Audit Inspector Workspace (/audit)"]
        UI_Auth["Clerk OAuth & SSO Handshake (/sso-callback)"]
    end

    subgraph Server["FastAPI Backend (Python 3.12)"]
        API_Gateway["API Gateway (/api/v1)"]
        Auth_Service["Auth & RBAC Resolver"]
        Rule_Engine["Deterministic Rule Engine (CIELAB ΔE, WCAG AA, RegEx)"]
        Workflow_Service["State Machine Workflow Engine"]
        Admin_Service["Admin & Database Purge Service"]
    end

    subgraph AI_Services["AI Intelligence Layer"]
        Gemini_Vision["Gemini 3.5 Flash (Vision & OCR)"]
        Gemini_Embedding["Gemini Embedding 2 (Vector Chunks)"]
    end

    subgraph Storage["Data & Asset Layer"]
        PG[("PostgreSQL 16 + pgvector")]
        Redis[("Redis Cache")]
        Cloudinary[("Cloudinary Media CDN")]
    end

    Client -->|REST & JSON API| API_Gateway
    API_Gateway --> Auth_Service
    API_Gateway --> Rule_Engine
    API_Gateway --> Workflow_Service
    API_Gateway --> Admin_Service

    Rule_Engine --> PG
    Workflow_Service --> PG
    Admin_Service --> PG

    API_Gateway -->|Multimodal Image & Copy| Gemini_Vision
    API_Gateway -->|Semantic Guideline Retrieval| Gemini_Embedding
    API_Gateway -->|Asset Uploads| Cloudinary
```

---

## 📁 Repository Structure

```
hackathon-inkloomAI/
├── backend/
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (auth, audit, submissions, guidelines, admin)
│   │   ├── core/               # Database engine, config, security, and logging
│   │   ├── models/             # SQLAlchemy ORM models (Submission, Finding, Revision, Brand)
│   │   ├── schemas/            # Pydantic validation schemas
│   │   └── services/           # Business logic (AuditService, RuleEngine, WorkflowService)
│   ├── alembic/                # Database migration scripts
│   ├── packs/blinkit/          # Pre-packaged Blinkit brand guidelines manifest & chunks
│   ├── tests/                  # Automated pytest test suite
│   ├── reset_db.py             # One-transaction database purge and auto-seeder
│   ├── requirements.txt        # Python backend dependencies
│   └── Dockerfile              # Containerized backend build
├── frontend/
│   ├── public/                 # Static assets, branding icons, and curated samples
│   ├── src/
│   │   ├── app/                # Next.js 16 App Router pages
│   │   │   ├── content/        # Creator Content Studio & benchmark samples
│   │   │   ├── dashboard/      # Unified Creator & Brand Reviewer dashboard
│   │   │   ├── audit/          # Real-time multi-dimensional audit inspector
│   │   │   ├── guidelines/     # Brand ruleset viewer & pack manager
│   │   │   └── sso-callback/   # Clerk SSO OAuth redirect handler
│   │   ├── components/         # Neo-Brutalist UI design system components
│   │   ├── context/            # Global AppContext (persona switcher, active brand)
│   │   └── lib/                # API client SDK and TypeScript interfaces
│   ├── package.json            # Node.js dependencies
│   └── Dockerfile              # Next.js production container build
├── docker-compose.yml          # Local PostgreSQL 16 (pgvector) & Redis orchestration
└── README.md                   # Project documentation
```

---

## 🛠️ Installation & Setup Instructions

Follow these steps to set up and run Inkloom AI on your local machine:

### 1. Prerequisites
Ensure you have the following installed:
* **Node.js**: v18.18.0 or v20+ (`node -v`)
* **Python**: v3.12+ (`python --version`)
* **Docker & Docker Compose**: For PostgreSQL with `pgvector` and Redis (`docker compose version`)
* **Google Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 2. Clone the Repository
```bash
git clone https://github.com/Sanyam26362/Inkloom-AI.git
cd Inkloom-AI
```

---

### 3. Start Database Infrastructure (Docker Compose)
Launch PostgreSQL 16 with `pgvector` enabled and Redis:
```bash
docker compose up -d
```
* **PostgreSQL (pgvector)**: Running on `localhost:5433` (Username: `inkloom`, Password: `inkloom_password`, DB: `inkloom_db`)
* **Redis**: Running on `localhost:6379`

> *Note: If you run native PostgreSQL, create a database named `inkloom_db` on port `5433` and enable `CREATE EXTENSION IF NOT EXISTS vector;`.*

---

### 4. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv312
     .\.venv312\Scripts\activate
     ```
   * **macOS / Linux (Bash)**:
     ```bash
     python3 -m venv .venv312
     source .venv312/bin/activate
     ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` (or create `.env`):
   ```ini
   PROJECT_NAME="Inkloom AI - Brand Governance Platform"
   API_V1_STR="/api/v1"
   ENVIRONMENT="development"

   # PostgreSQL on Port 5433
   DATABASE_URL="postgresql+asyncpg://inkloom:inkloom_password@localhost:5433/inkloom_db"
   SYNC_DATABASE_URL="postgresql+psycopg2://inkloom:inkloom_password@localhost:5433/inkloom_db"
   REDIS_URL="redis://localhost:6379/0"

   # Google Gemini API Key
   GEMINI_API_KEY="your_gemini_api_key_here"

   # Gemini Models
   PRIMARY_LLM_MODEL="gemini-3.5-flash"
   VISION_MODEL="gemini-3.5-flash"
   EMBEDDING_MODEL="gemini-embedding-2"
   EMBEDDING_DIMENSIONS=768

   # Cloudinary Media Storage (Optional for local testing, fallback uses local uploads)
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"

   # Clerk Authentication
   CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Seed initial Blinkit brand pack and demo user accounts:
   ```bash
   python reset_db.py
   ```

7. Start the FastAPI development server:
   * **Windows (PowerShell)**:
     ```powershell
     $env:PYTHONPATH="."
     uvicorn app.main:app --reload --port 8000
     ```
   * **macOS / Linux (Bash)**:
     ```bash
     PYTHONPATH=. uvicorn app.main:app --reload --port 8000
     ```
   * Interactive API docs: [`http://localhost:8000/docs`](http://localhost:8000/docs)
   * Health check: [`http://localhost:8000/health`](http://localhost:8000/health)

---

### 5. Frontend Setup (Next.js 16)

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create `frontend/.env.local`:
   ```ini
   # Backend API Endpoint
   NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/api/v1"

   # Clerk Authentication Keys
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"

   # Clerk Redirect Routes
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"
   ```

4. Start the Turbopack development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🧪 Running Automated Tests

Run the test suites to verify backend logic and frontend compilation:

### Backend Pytest Suite
```powershell
cd backend
$env:PYTHONPATH="."
python -m pytest -v tests/test_workflow_service.py tests/test_r3_workflow.py
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 👥 Seeded Demo Personas

When running locally, Inkloom AI seeds demo accounts for immediate testing:

| Persona | Role | Email | Password | Primary Workspace |
| :--- | :--- | :--- | :--- | :--- |
| **Jordan Vance** | `ADMIN` | `admin@inkloom.ai` | `InkloomDemo2026!` | Admin Governance Control & Stats (`/dashboard`) |
| **Sasha Bloom** | `REVIEWER` / `JUDGE` | `judge@inkloom.ai` | `InkloomDemo2026!` | Brand Review Queue & Decisions (`/dashboard`) |
| **Alex Rivera** | `CREATOR` | `creator@inkloom.ai` | `InkloomDemo2026!` | Creative Studio & Submissions (`/content`) |

*(Alternatively, sign in with your own Google/Clerk OAuth account to test dynamic personal profiles).*

---

## 🎮 Demo Walkthrough (3-Minute Tour)

1. **Visit Creator Content Studio (`/content`)**:
   * Under **Step 03 // Multimodal Payload Attachment**, click on either of the two curated benchmark posters:
     * `Diwali Sorted with Blinkit`
     * `Blinkit Diwali: Brighter in Minutes`
   * Click **"Run Autonomous AI Governance Audit ⚡"**.
   * Observe the real-time CIELAB palette score, WCAG contrast verification, and Gemini policy findings.

2. **Submit Asset to Brand Review Queue**:
   * Click **"Submit to Queue"** on the audit results card.
   * The asset is assigned to the Brand Governance Review Queue and transitions status to `NEEDS_REVIEW`.

3. **Inspect in Brand Review Dashboard (`/dashboard`)**:
   * Switch persona to **Brand Reviewer**.
   * Inspect the asset in the submissions table with its thumbnail preview.
   * Click **"▼ Details"** to view the full poster, submitted caption, and all AI findings.
   * Click **"✓ Approve"** to clear the creative for publication or **"✕ Reject"** to request revisions.

4. **1-Click Database Reset**:
   * In the Brand Governance panel header, click the red **"Reset Database"** button to purge all submissions and restore a pristine demo state.

---

## 🌐 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/submissions/` | Create a new content draft submission |
| `POST` | `/api/v1/submissions/{id}/upload-image` | Upload creative poster & execute multimodal audit |
| `POST` | `/api/v1/submissions/{id}/audit` | Execute text-only audit against active brand ruleset |
| `POST` | `/api/v1/submissions/{id}/status` | Transition submission lifecycle status (`NEEDS_REVIEW`, `APPROVED`, `CHANGES_REQUESTED`) |
| `GET` | `/api/v1/submissions/` | List all brand submissions with revision and finding relationships |
| `POST` | `/api/v1/admin/reset-database` | Purge database and auto-seed default brand pack |
| `GET` | `/api/v1/analytics/{brand_id}` | Fetch governance KPI telemetry, average score, and violation counts |
| `GET` | `/health` | Service health check |

---

## 🚢 Deployment Guide

### Deploying Frontend to Vercel
1. Link your GitHub repository in the Vercel dashboard.
2. Set root directory to `frontend`.
3. Add environment variables:
   * `NEXT_PUBLIC_API_BASE_URL`: Your deployed backend URL (e.g. `https://inkloom-backend.onrender.com/api/v1`)
   * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
   * `CLERK_SECRET_KEY`: Your Clerk secret key
4. Deploy! Next.js 16 with Turbopack will build and serve the application automatically.

### Deploying Backend to Render / Railway
1. Use the provided Dockerfile in `backend/Dockerfile` or configure a Python 3.12 Web Service.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Attach a PostgreSQL instance with `pgvector` enabled.

---

## 📄 License & Attribution

Developed for the **Google DeepMind / Gemini AI Hackathon 2026**. Built with **Google Gemini 3.5**, **FastAPI**, **Next.js 16**, **Tailwind CSS**, and **PostgreSQL**.
