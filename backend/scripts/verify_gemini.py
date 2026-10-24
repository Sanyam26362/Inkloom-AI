"""
verify_gemini.py
Verification script for Google Gemini API, model availability, and infrastructure readiness.
VERIFY ONLY - Read-only checks. Does not modify any code, database, or existing configuration.
"""
import io
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from google import genai
from google.genai import types
from PIL import Image


def log(msg: str = ""):
    print(msg, flush=True)


def check_env_file() -> bool:
    env_path = backend_dir / ".env"
    return env_path.is_file()


def check_api_key_status(key: str) -> str:
    placeholders = {"grok_ai_key", "gemini_api_key", "your_gemini_api_key_here", ""}
    cleaned = (key or "").strip()
    if not cleaned or cleaned in placeholders:
        return "missing/placeholder"
    return f"set, length {len(cleaned)}"


def check_postgres_and_pgvector():
    """Read-only check for PostgreSQL connection and pgvector extension."""
    try:
        import psycopg2

        raw_url = settings.SYNC_DATABASE_URL or settings.DATABASE_URL
        if "+psycopg2" in raw_url:
            conn_url = raw_url.replace("postgresql+psycopg2://", "postgresql://")
        elif "+asyncpg" in raw_url:
            conn_url = raw_url.replace("postgresql+asyncpg://", "postgresql://")
        else:
            conn_url = raw_url

        conn = psycopg2.connect(conn_url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT extname FROM pg_extension WHERE extname='vector';")
        rows = cur.fetchall()
        conn.close()

        if rows and len(rows) > 0 and rows[0][0] == "vector":
            return "OK", "Connected to PostgreSQL and pgvector extension is installed."
        else:
            return "FAILED", "Connected to PostgreSQL, but pgvector extension is NOT installed."
    except Exception as e:
        return "FAILED", f"{type(e).__name__}: {str(e)}"


def check_redis():
    """Read-only check for Redis reachable."""
    try:
        import redis

        r = redis.Redis.from_url(
            settings.REDIS_URL,
            socket_timeout=3.0,
            socket_connect_timeout=3.0,
        )
        ping_res = r.ping()
        if ping_res:
            return "OK", "Connected (ping responded PONG)."
        return "FAILED", "Ping did not return True."
    except Exception as e:
        return "FAILED", f"{type(e).__name__}: {str(e)}"


def check_ffmpeg():
    """Read-only check for ffmpeg installed."""
    ffmpeg_exe = shutil.which("ffmpeg")
    if not ffmpeg_exe:
        return "FAILED", "'ffmpeg' executable was not found in PATH."
    try:
        res = subprocess.run(
            ["ffmpeg", "-version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        if res.returncode == 0:
            first_line = res.stdout.splitlines()[0] if res.stdout else "Installed"
            return "OK", first_line
        return "FAILED", f"ffmpeg exited with return code {res.returncode}: {res.stderr[:200]}"
    except Exception as e:
        return "FAILED", f"{type(e).__name__}: {str(e)}"


def check_cloudinary():
    """Read-only check for Cloudinary configuration."""
    name = (settings.CLOUDINARY_CLOUD_NAME or "").strip()
    key = (settings.CLOUDINARY_API_KEY or "").strip()
    secret = (settings.CLOUDINARY_API_SECRET or "").strip()

    if name and key and secret:
        return "OK", f"All 3 variables configured (cloud_name: {name}, api_key length: {len(key)}, secret length: {len(secret)})."
    missing = []
    if not name:
        missing.append("CLOUDINARY_CLOUD_NAME")
    if not key:
        missing.append("CLOUDINARY_API_KEY")
    if not secret:
        missing.append("CLOUDINARY_API_SECRET")
    return "BLANK / INCOMPLETE", f"Missing or blank: {', '.join(missing)}."


def create_test_image_part() -> types.Part:
    """Generates a tiny in-memory 64x64 PNG using Pillow."""
    img = Image.new("RGB", (64, 64), color=(220, 50, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")


def run_verification():
    log("=" * 70)
    log(" INKLOOM AI — GEMINI API & INFRASTRUCTURE VERIFICATION")
    log("=" * 70)

    # -------------------------------------------------------------
    # STEP 1: Environment Check
    # -------------------------------------------------------------
    log("\n[STEP 1] Environment Check:")
    env_exists = check_env_file()
    log(f"  • backend/.env exists: {'YES' if env_exists else 'NO'}")
    if not env_exists:
        log("  [ERROR] backend/.env does not exist. Aborting verification.")
        return

    key_status = check_api_key_status(settings.GEMINI_API_KEY)
    log(f"  • GEMINI_API_KEY: {key_status}")
    if key_status == "missing/placeholder":
        log("  [ERROR] GEMINI_API_KEY is missing or placeholder. Aborting verification.")
        return

    try:
        import google.genai
        version = getattr(google.genai, "__version__", "installed")
        log(f"  • google-genai library: INSTALLED (version {version})")
    except ImportError:
        log("  [ERROR] google-genai library is NOT installed in Python environment.")
        return

    # -------------------------------------------------------------
    # STEP 2: Model Listing & Comparison
    # -------------------------------------------------------------
    log("\n[STEP 2] Google Gemini API Client Initialization & Model Listing:")
    try:
        # Initialized with timeout=10000ms matching backend/app/services/gemini_service.py
        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=10000),
        )
        models_iterator = client.models.list()
        all_models = list(models_iterator)
        log(f"  • Successfully connected to Gemini API and retrieved {len(all_models)} models.")
    except Exception as e:
        log(f"  [ERROR] Failed to initialize client or list models: {type(e).__name__}: {e}")
        return

    generate_content_models = set()
    embed_content_models = set()

    for m in all_models:
        m_name = getattr(m, "name", "")
        short_name = m_name.replace("models/", "")
        actions = getattr(m, "supported_actions", []) or []

        if "generateContent" in actions:
            generate_content_models.add(short_name)
            generate_content_models.add(m_name)
        if "embedContent" in actions:
            embed_content_models.add(short_name)
            embed_content_models.add(m_name)

    log("\n  --- Models supporting 'generateContent' ---")
    sorted_gen = sorted([k for k in generate_content_models if not k.startswith("models/")])
    for name in sorted_gen:
        log(f"    - {name}")

    log("\n  --- Models supporting 'embedContent' ---")
    sorted_emb = sorted([k for k in embed_content_models if not k.startswith("models/")])
    for name in sorted_emb:
        log(f"    - {name}")

    # Check configured models against listing
    configured_targets = [
        ("PRIMARY_LLM_MODEL", settings.PRIMARY_LLM_MODEL, "text"),
        ("VISION_MODEL", settings.VISION_MODEL, "vision"),
        ("EMBEDDING_MODEL", settings.EMBEDDING_MODEL, "embedding"),
    ]

    log("\n  --- Configured Models Comparison ---")
    model_validity = {}
    for label, model_name, modality in configured_targets:
        clean_name = model_name.replace("models/", "")
        if modality == "embedding":
            is_valid = clean_name in embed_content_models or model_name in embed_content_models
        else:
            is_valid = clean_name in generate_content_models or model_name in generate_content_models

        status_str = "VALID" if is_valid else "NOT FOUND"
        model_validity[(label, model_name, modality)] = is_valid
        log(f"    • {label:20} : {model_name:24} [{modality:9}] -> {status_str}")

    # -------------------------------------------------------------
    # STEP 3: Real Functional Test Calls
    # -------------------------------------------------------------
    log("\n[STEP 3] Real Functional Test Calls on Configured Models:")
    test_results = []
    test_image_part = create_test_image_part()

    for (label, model_name, modality), is_valid in model_validity.items():
        if not is_valid:
            test_results.append({
                "label": label,
                "model": model_name,
                "modality": modality,
                "valid": False,
                "status": "NOT FOUND",
                "latency": 0.0,
                "flagged_slow": False,
                "detail": "Model name not present in client.models.list()",
                "returned_dim": None,
            })
            log(f"\n  Skipping test for {label} ({model_name}): NOT FOUND in model catalog.")
            continue

        log(f"\n  Testing {label} ({model_name}) [{modality}]...")
        t0 = time.perf_counter()
        flagged_slow = False
        status = "FAILED"
        detail = ""
        returned_dim = None

        try:
            if modality == "text":
                resp = client.models.generate_content(
                    model=model_name,
                    contents="Reply with the single word: ready",
                )
                latency = time.perf_counter() - t0
                if latency > 10.0:
                    flagged_slow = True
                reply = (resp.text or "").strip()
                status = "OK"
                detail = f"Response: '{reply}'"

            elif modality == "vision":
                resp = client.models.generate_content(
                    model=model_name,
                    contents=[test_image_part, "Describe this image in 5 words"],
                )
                latency = time.perf_counter() - t0
                if latency > 10.0:
                    flagged_slow = True
                reply = (resp.text or "").strip()
                status = "OK"
                detail = f"Response: '{reply}'"

            elif modality == "embedding":
                emb_config = types.EmbedContentConfig(
                    output_dimensionality=settings.EMBEDDING_DIMENSIONS
                )
                resp = client.models.embed_content(
                    model=model_name,
                    contents="test",
                    config=emb_config,
                )
                latency = time.perf_counter() - t0
                if latency > 10.0:
                    flagged_slow = True
                if hasattr(resp, "embeddings") and resp.embeddings:
                    values = resp.embeddings[0].values
                    returned_dim = len(values)
                    status = "OK"
                    detail = f"Vector dimension: {returned_dim} (expected: {settings.EMBEDDING_DIMENSIONS})"
                else:
                    status = "FAILED"
                    detail = "No embeddings returned in response."

        except Exception as e:
            latency = time.perf_counter() - t0
            if latency > 10.0:
                flagged_slow = True
            status = "FAILED"
            detail = f"{type(e).__name__}: {str(e)}"

        log(f"    Status  : {status}")
        log(f"    Latency : {latency:.2f}s {'(TIMEOUT RISK > 10s)' if flagged_slow else ''}")
        log(f"    Details : {detail}")

        test_results.append({
            "label": label,
            "model": model_name,
            "modality": modality,
            "valid": True,
            "status": status,
            "latency": latency,
            "flagged_slow": flagged_slow,
            "detail": detail,
            "returned_dim": returned_dim,
        })

    # -------------------------------------------------------------
    # STEP 4: External Services Read-Only Checks
    # -------------------------------------------------------------
    log("\n[STEP 4] External Services Read-Only Checks:")
    pg_status, pg_detail = check_postgres_and_pgvector()
    log(f"  • PostgreSQL + pgvector : {pg_status} - {pg_detail}")

    redis_status, redis_detail = check_redis()
    log(f"  • Redis                 : {redis_status} - {redis_detail}")

    ffmpeg_status, ffmpeg_detail = check_ffmpeg()
    log(f"  • ffmpeg                : {ffmpeg_status} - {ffmpeg_detail}")

    cloud_status, cloud_detail = check_cloudinary()
    log(f"  • Cloudinary            : {cloud_status} - {cloud_detail}")

    # -------------------------------------------------------------
    # STEP 5: Verification Table & Summary
    # -------------------------------------------------------------
    log("\n" + "=" * 70)
    log(" VERIFICATION SUMMARY REPORT")
    log("=" * 70)

    log("\n1. Infrastructure & Services:")
    log(f"  • API Key:           {key_status}")
    log(f"  • Postgres + vector: {pg_status} ({pg_detail})")
    log(f"  • Redis:             {redis_status} ({redis_detail})")
    log(f"  • ffmpeg:            {ffmpeg_status} ({ffmpeg_detail})")
    log(f"  • Cloudinary:        {cloud_status} ({cloud_detail})")

    log("\n2. Model Test Summary Table:")
    log(f"  {'Configuration':<20} | {'Model Name':<25} | {'Catalog':<10} | {'Call Result':<10} | {'Latency':<8} | {'Slow (>10s)'}")
    log("  " + "-" * 90)
    for r in test_results:
        cat_str = "VALID" if r["valid"] else "NOT FOUND"
        slow_str = "YES (>10s)" if r["flagged_slow"] else "NO"
        lat_str = f"{r['latency']:.2f}s" if r["valid"] else "N/A"
        log(f"  {r['label']:<20} | {r['model']:<25} | {cat_str:<10} | {r['status']:<10} | {lat_str:<8} | {slow_str}")

    log("\n3. Detailed Exceptions / Call Messages:")
    for r in test_results:
        log(f"  • {r['label']} ({r['model']}): [{r['status']}] {r['detail']}")

    return test_results, (pg_status, pg_detail), (redis_status, redis_detail), (ffmpeg_status, ffmpeg_detail), (cloud_status, cloud_detail)


if __name__ == "__main__":
    run_verification()
