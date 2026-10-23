# Inkloom AI

Inkloom AI is a brand-governance workspace for reviewing copy and media before publication. The demo is configured around a synthetic Blinkit brand profile with approved facts, terminology, visual rules, accessibility requirements, and reusable review data.

## Demo setup

Start PostgreSQL with pgvector and Redis:

```powershell
docker compose up -d
```

Seed the Blinkit customer profile and mock content:

The Blinkit seed resets existing brand profiles so the demo starts with Blinkit as the active customer.

```powershell
cd backend
.\.venv312\Scripts\python.exe -m app.seed.seed_blinkit
```

Run the API and web app in separate terminals:

```powershell
# backend
cd backend
.\.venv312\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm run dev
```

Open `http://localhost:3000` and use the Audit workspace. The Blinkit seed includes:

- text submissions for an Instagram caption, press release, and Diwali email;
- a synthetic audio voiceover transcript with terminology findings;
- a synthetic video reel transcript with captions and an approval trail;
- seven guideline chunks covering voice, terminology, claims, colour contrast, social tone, audio/video voiceover, and captions.

## Supported review flows

- Text, Markdown, and HTML copy can be edited and audited directly.
- MP3, WAV, M4A, OGG, AAC, and FLAC uploads are transcribed and audited.
- MP4, MOV, WEBM, M4V, MKV, and AVI uploads are transcribed for spoken dialogue and meaningful on-screen text, then audited as an editable revision.
- Findings include severity, explanation, guideline citation, suggested correction, resolution, comments, overrides, and workflow history.

The media transcription and semantic review calls use Gemini when configured. Deterministic terminology and claim rules remain active independently, and confidential text is scrubbed before external AI review.

## Validation

```powershell
cd frontend
npm run lint
npx tsc --noEmit
npx next build --webpack
```

The backend test suite expects PostgreSQL with pgvector at `localhost:5433` and Redis at `localhost:6379`.
