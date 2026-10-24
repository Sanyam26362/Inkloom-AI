# Inkloom AI - Production Deployment & Operation Guide

This guide provides a comprehensive walkthrough for deploying the entire **Inkloom AI** brand governance platform (FastAPI backend + Next.js frontend + pgvector PostgreSQL + Redis + Gemini AI) into production, including 100% free hosting recipes.

---

## 🏗️ Production Architecture

| Component | Recommended Cloud / Free Tier | Specifications / Limits | Platform Role |
| :--- | :--- | :--- | :--- |
| **PostgreSQL DB** | [Neon.tech](https://neon.tech) / [Supabase](https://supabase.com) / Managed Postgres | Serverless PostgreSQL with `pgvector` | Relational tables, audit trails, and vector embeddings |
| **Backend API** | [Render.com](https://render.com) / [Railway](https://railway.app) / [Koyeb](https://koyeb.com) | Python 3.12, FastAPI, Asyncpg | Asynchronous governance engine and REST API |
| **Frontend UI** | [Vercel.com](https://vercel.com) / [Cloudflare Pages](https://pages.cloudflare.com) | Next.js 16 App Router | Responsive web application and judge studio |
| **Cache / Queue** | [Upstash Redis](https://upstash.com) / Local Redis | Redis 7+ | Distributed rate limiting and audit cache |
| **Primary AI Engine** | [Google AI Studio](https://aistudio.google.com/app/apikey) | `gemini-3.5-flash` | Text, image vision, native audio, and video audits |
| **Embeddings** | [Google AI Studio](https://aistudio.google.com/app/apikey) | `gemini-embedding-2` | 768-dimensional L2-normalized vector search |
| **Media CDN** | [Cloudinary](https://cloudinary.com) / Local Storage | Image, audio, video storage | Secure URLs for user uploads and media assets |

---

## 📋 Prerequisites
1. A **GitHub account** containing the `hackathon-inkloomAI` repository.
2. A free **Google Gemini API Key** from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
3. (Optional) Free **Cloudinary** credentials from [cloudinary.com](https://cloudinary.com).

---

## Step 1: Deploy PostgreSQL with `pgvector` (Neon)

1. Sign up at [https://neon.tech](https://neon.tech).
2. Create a new project:
   - **Name**: `inkloom-db`
   - **Region**: Choose closest to your API (e.g. `AWS US East (N. Virginia)`).
3. Open the **SQL Editor** in Neon and activate the vector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy your database connection string from the Neon dashboard:
   ```text
   postgres://neondb_owner:npg_xxxxxx@ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   *(Note: The Inkloom backend automatically adapts `postgres://` to `postgresql+asyncpg://` and sets compatible SSL parameters).*

---

## Step 2: Deploy FastAPI Backend (Render / Cloud)

1. Log in to [https://render.com](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `inkloom-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && alembic upgrade head
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: `Free` ($0/month) or standard web service.

4. Add the following **Environment Variables**:

| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `<Your Neon Connection String>` | PostgreSQL + pgvector connection string |
| `GEMINI_API_KEY` | `<Your Gemini API Key>` | Google AI Studio API key |
| `PRIMARY_LLM_MODEL` | `gemini-3.5-flash` | Standardized multimodal model for all text, vision, audio, video |
| `EMBEDDING_MODEL` | `gemini-embedding-2` | Standardized 768-dim embedding model |
| `EMBEDDING_DIMENSIONS` | `768` | Vector embedding dimension size |
| `JWT_SECRET` | `<Random 32-char string>` | Secret key for signing HS256 auth tokens |
| `ENVIRONMENT` | `production` | Environment flag |
| `PYTHON_VERSION` | `3.12.0` | Python runtime version |
| `CLOUDINARY_CLOUD_NAME` | *(Optional)* | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | *(Optional)* | Cloudinary access key |
| `CLOUDINARY_API_SECRET` | *(Optional)* | Cloudinary API secret |
| `CORS_ORIGINS` | `https://<your-frontend>.vercel.app` | Allowed CORS origins for browser security |

5. Deploy the web service. Once live, confirm health by browsing to:
   `https://<your-backend-url>/api/v1/health`

   Expected JSON response:
   ```json
   {
     "status": "healthy",
     "project": "Inkloom AI - Brand Governance Platform",
     "database": "healthy",
     "pgvector": "pgvector active",
     "ai_integration": {
       "configured": true,
       "client_ready": true,
       "primary_model": "gemini-3.5-flash"
     }
   }
   ```

---

## Step 3: Deploy Next.js Frontend (Vercel)

1. Sign in to [https://vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Select the `hackathon-inkloomAI` repository.
3. Configure the project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
4. Add the **Environment Variable**:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://<your-backend-url>/api/v1`
   *(Ensure no trailing slash)*
5. Click **Deploy**. Vercel will build and assign a global production URL (e.g. `https://inkloom-ai.vercel.app`).

---

## Step 4: Verification & 5-Minute Judge Demo Flow

Once both backend and frontend are live:

1. **Open Onboarding Wizard (`/`)**:
   - Step 1: Select **Blinkit** quick-commerce demo brand.
   - Step 2: Click **"⚡ Load Premade Blinkit Diwali Pack"** to index all brand guidelines and campaign rules.
   - Step 3: Review the extracted RuleSet (brand colors, zero-tolerance banned terms, preferred terminology).
   - Step 4: Click **"Launch Judge Canvas as Sasha Bloom (Judge)"**.

2. **Judge Canvas (`/judge`)**:
   - **Test Off-Brand Detection**: Click **"🕷️ Spider-Man Test"** preset -> Click **"Run Brand Audit"** -> Observe **CRITICAL** off-brand violation, color palette rejection, and **`FAIL`** verdict.
   - **Test Compliant Delivery**: Click **"🪔 Compliant Sweets"** preset -> Click **"Run Brand Audit"** -> Observe 95%+ score, festival cue verification, and **`PASS`** verdict.

3. **Admin Dashboard (`/dashboard`)**:
   - Switch persona in Header to **Jordan Vance (Admin)**.
   - Navigate to `/dashboard` to inspect the live audit queue, agreement rates, and policy violation distributions.

---

## 💡 Troubleshooting & Production Notes

- **Cold Starts**: Free hosting platforms spin down inactive instances. The initial wake-up request may take ~30 seconds.
- **Fail-Closed Guarantee**: In the event of network disruption or Gemini quota exhaustion, the engine fails closed with structured `ai_status: "failed"` and blocks unverified approvals.
- **Database Migrations**: Always execute `alembic upgrade head` before launching updated application instances. All schema migrations are additive.
