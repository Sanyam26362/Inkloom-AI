# Inkloom AI - 100% Free Production Deployment Guide

This guide provides a step-by-step walkthrough to deploy the entire **Inkloom AI** platform (FastAPI backend + Next.js frontend + pgvector PostgreSQL + Gemini AI) completely **for free** with zero hosting costs.

---

## 🏗️ Free Cloud Architecture

| Component | Free Provider | Free Tier Limits | Purpose |
| :--- | :--- | :--- | :--- |
| **Database** | [Neon.tech](https://neon.tech) / [Supabase](https://supabase.com) | 0.5 GB storage, serverless pgvector | PostgreSQL database with vector embeddings |
| **Backend API** | [Render.com](https://render.com) / [Koyeb.com](https://koyeb.com) | Free Web Service, 512 MB RAM, free SSL | FastAPI asynchronous governance engine |
| **Frontend UI** | [Vercel.com](https://vercel.com) | Unlimited static/edge bandwidth, custom domains | Next.js 16 App Router platform |
| **AI Auditing** | [Google AI Studio](https://aistudio.google.com/app/apikey) | Free Tier (Gemini 2.5 Flash & embeddings) | Vision, text, tone & semantic RAG auditing |
| **Media CDN** | [Cloudinary](https://cloudinary.com) | 25 GB monthly bandwidth & storage | Public CDN URLs for posters, images & video |

---

## 📋 Prerequisites
Before starting, ensure you have:
1. A **GitHub account** with the Inkloom AI repository pushed to your GitHub.
2. A free **Google Gemini API Key** from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
3. (Optional) Free **Cloudinary account** credentials for media hosting from [cloudinary.com](https://cloudinary.com).

---

## Step 1: Deploy Free PostgreSQL with `pgvector` (Neon)

1. Go to [https://neon.tech](https://neon.tech) and sign up with GitHub or Google.
2. Click **Create Project**:
   - **Name**: `inkloom-db`
   - **Region**: Choose the region closest to your users (e.g., `AWS US East (N. Virginia)` or `EU Frankfurt`).
3. Click **Create Project**.
4. In your Neon Project Dashboard, click on **SQL Editor** on the left menu, paste this SQL command, and click **Run**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. On the **Dashboard**, locate the **Connection Details** box:
   - Select **Connection string** format.
   - Copy the string. It will look like:
     ```text
     postgres://neondb_owner:npg_xxxxxx@ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   *(Note: The Inkloom backend automatically converts `postgres://` to `postgresql+asyncpg://` and fixes `sslmode=require` for asyncpg compatibility).*

---

## Step 2: Deploy Free FastAPI Backend (Render)

1. Go to [https://render.com](https://render.com) and log in with GitHub.
2. Click **New +** (top right) and select **Web Service**.
3. Select **Build and deploy from a Git repository**, choose your `hackathon-inkloomAI` repository, and click **Connect**.
4. Configure the service settings:
   - **Name**: `inkloom-ai-backend` (or your choice)
   - **Region**: Same or close to your Neon database region
   - **Branch**: `main` (or your active branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: Select **Free** ($0/month).

5. Scroll down to **Environment Variables** and add the following keys:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `<Your Neon Connection String from Step 1>` | Cloud PostgreSQL connection string |
   | `GEMINI_API_KEY` | `<Your Google Gemini API Key>` | For multi-modal brand governance & RAG |
   | `ENVIRONMENT` | `production` | Production environment flag |
   | `PYTHON_VERSION` | `3.12.0` | Ensures Python 3.12 runtime |
   | `CLOUDINARY_CLOUD_NAME` | *(Optional)* | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | *(Optional)* | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | *(Optional)* | Your Cloudinary API secret |

6. Click **Create Web Service**.
7. Render will build and deploy the backend.
8. Once the build finishes and status shows **Live**, copy your public service URL:
   `https://inkloom-ai-backend.onrender.com`
9. **Verify Deployment**:
   Open `https://<your-backend-subdomain>.onrender.com/api/v1/health` in your browser.
   You should see:
   ```json
   {
     "status": "healthy",
     "project": "Inkloom AI - Brand Governance Platform",
     "database": "healthy",
     "pgvector": "pgvector v0.8.x active",
     "ai_integration": { "configured": true, "client_ready": true }
   }
   ```
   *(Note: The database automatically initializes all tables and seeds the Blinkit brand profile on startup).*

---

## Step 3: Deploy Free Next.js Frontend (Vercel)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** -> **Project**.
3. Select your `hackathon-inkloomAI` GitHub repository and click **Import**.
4. In the **Configure Project** screen:
   - **Project Name**: `inkloom-ai`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select the `frontend` folder.
5. Expand **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://<your-backend-subdomain>.onrender.com/api/v1` |

   *(Important: Ensure the URL ends with `/api/v1` and uses `https://` without a trailing slash).*

6. Click **Deploy**.
7. In ~60 seconds, Vercel will build and assign a global production URL (e.g. `https://inkloom-ai.vercel.app`).

---

## Step 4: Verification & Live Demo Flow

Now that both backend and frontend are live:
1. Open your Vercel website: `https://<your-app>.vercel.app`
2. **Setup Canvas (`/setup`)**:
   - Verify Blinkit brand profile is pre-loaded.
   - Click **"⚡ Load Diwali 2026 Guidelines Preset"** to sync guidelines.
3. **Judge Canvas (`/judge`)**:
   - Click **"Load Compliant Blinkit Poster"** -> Run AI Governance Audit -> Verify high compliance score (90%+).
   - Click **"Load Spider-Man Violator"** -> Run AI Governance Audit -> Verify critical brand violation detection, WCAG contrast alerts, and automatic rejection recommendations.
4. **Admin Dashboard (`/dashboard`)**:
   - Review pending submissions and inline **✓ Approve** or **✕ Reject** workflows.

---

## 💡 Troubleshooting & Tips

- **Render Cold Starts**: On Render's free tier, backend instances spin down after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to wake up.
- **CORS Errors**: The backend CORS middleware has been preconfigured with `allow_origin_regex=r"https?://.*"`, allowing requests from your Vercel domain, local machines, and custom domains without CORS issues.
- **Database URL Formats**: The backend configuration dynamically converts both standard `postgres://` or `postgresql://` strings and handles SSL parameters automatically.
