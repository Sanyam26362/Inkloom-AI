"""
Acceptance Test Suite for Phase 1: Reliable AI Calls.

Verifies:
1. Mocked timeout -> ai_status=failed, status=NEEDS_REVIEW, visible WARNING finding, approval blocked.
2. Concurrent audits run concurrently without blocking event loop.
3. Successful AI call returns ai_status=ok.
4. /health endpoint reports whether gemini-3.5-flash and gemini-embedding-2 are valid.
5. Zero occurrences of forbidden/deprecated models in the repository.
"""
import asyncio
import os
import re
import time
import uuid
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services.gemini_service import gemini_service
from app.core.security import get_auth_headers, UserRole

CREATOR_HEADERS = get_auth_headers(UserRole.CREATOR)
REVIEWER_HEADERS = get_auth_headers(UserRole.JUDGE)


async def _create_test_brand_and_submission(client: AsyncClient, text: str = "Our product launch announcement"):
    b_res = await client.post(
        "/api/v1/brands",
        json={"name": f"AI Reliability Brand {uuid.uuid4().hex[:6]}", "banned_terms": ["unbreakable"]},
        headers=CREATOR_HEADERS,
    )
    brand_id = b_res.json()["id"]

    sub_res = await client.post(
        "/api/v1/submissions",
        json={
            "brand_id": brand_id,
            "title": "AI Reliability Submission",
            "content_format": "TEXT",
            "initial_content": text,
        },
        headers=CREATOR_HEADERS,
    )
    sub_id = sub_res.json()["id"]

    # Seed guideline chunk so brand has retrievable guidelines for audit
    await client.post(
        "/api/v1/guidelines",
        json={
            "brand_id": brand_id,
            "source_document": "reliability_guidelines.txt",
            "section_reference": "General",
            "rule_category": "GENERAL",
            "content_text": "Announcements must be verifiable and adhere to brand voice.",
        },
        headers=CREATOR_HEADERS,
    )

    return brand_id, sub_id


@pytest.mark.asyncio
async def test_mocked_timeout_fails_closed(client: AsyncClient, monkeypatch):
    """
    Acceptance Criteria 1:
    A mocked timeout results in ai_status=failed, status NEEDS_REVIEW, a WARNING finding,
    and approval blocked.
    """
    async def mock_timeout(*args, **kwargs):
        raise TimeoutError("Simulated Gemini API timeout (read timeout=30.0)")

    monkeypatch.setattr(gemini_service, "audit_content_semantic", mock_timeout)

    _, sub_id = await _create_test_brand_and_submission(client, "Text to test timeout fail closed")

    # Run audit with timeout failure
    audit_res = await client.post(f"/api/v1/submissions/{sub_id}/audit", headers=CREATOR_HEADERS)
    assert audit_res.status_code == 200
    data = audit_res.json()

    # 1. ai_status is failed
    assert data["ai_status"] == "failed"
    assert data["ai_error"] is not None
    assert "timeout" in data["ai_error"].lower()

    # 2. status is NEEDS_REVIEW
    assert data["status"] == "NEEDS_REVIEW"

    # 3. A visible WARNING finding exists with explanation mentioning AI analysis incomplete
    warning_findings = [
        f for f in data["findings"]
        if f["severity"] == "WARNING" and "incomplete" in f["explanation"].lower()
    ]
    assert len(warning_findings) >= 1, "Expected at least one WARNING finding indicating incomplete AI analysis"

    # 4. Approval is blocked (refused with 409 Conflict)
    status_res = await client.post(
        f"/api/v1/submissions/{sub_id}/status",
        json={"target_status": "APPROVED", "notes": "Attempting approval on failed AI status"},
        headers=REVIEWER_HEADERS,
    )
    assert status_res.status_code == 409
    assert "cannot approve" in status_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_concurrent_audits_do_not_block_event_loop(client: AsyncClient, monkeypatch):
    """
    Acceptance Criteria 2:
    Two concurrent audits with a slow mocked client run concurrently (the event loop is not blocked).
    """
    async def mock_slow_semantic(*args, **kwargs):
        await asyncio.sleep(0.4)
        return {
            "ai_status": "ok",
            "findings": [],
            "ai_error": None,
            "overall_summary": "Slow mock audit completed.",
        }

    async def mock_embed(*args, **kwargs):
        return [0.02] * 768

    monkeypatch.setattr(gemini_service, "audit_content_semantic", mock_slow_semantic)
    monkeypatch.setattr(gemini_service, "generate_embedding", mock_embed)

    _, sub_id_1 = await _create_test_brand_and_submission(client, "Concurrent text 1")
    _, sub_id_2 = await _create_test_brand_and_submission(client, "Concurrent text 2")

    t0 = time.perf_counter()
    res1, res2 = await asyncio.gather(
        client.post(f"/api/v1/submissions/{sub_id_1}/audit", headers=CREATOR_HEADERS),
        client.post(f"/api/v1/submissions/{sub_id_2}/audit", headers=CREATOR_HEADERS),
    )
    duration = time.perf_counter() - t0

    assert res1.status_code == 200
    assert res2.status_code == 200
    # Sequential would take at least 0.8s. Concurrent must complete well under 0.75s.
    assert duration < 0.75, f"Expected concurrent execution in < 0.75s, took {duration:.2f}s"


@pytest.mark.asyncio
async def test_mocked_successful_call_returns_ai_status_ok(client: AsyncClient, monkeypatch):
    """
    Acceptance Criteria 3:
    A mocked successful call returns ai_status=ok.
    """
    async def mock_success(*args, **kwargs):
        return {
            "ai_status": "ok",
            "findings": [],
            "ai_error": None,
            "overall_summary": "Brand compliant copy.",
        }

    monkeypatch.setattr(gemini_service, "audit_content_semantic", mock_success)

    _, sub_id = await _create_test_brand_and_submission(client, "Compliant text with no violations")

    audit_res = await client.post(f"/api/v1/submissions/{sub_id}/audit", headers=CREATOR_HEADERS)
    assert audit_res.status_code == 200
    data = audit_res.json()

    assert data["ai_status"] == "ok"
    assert data["ai_error"] is None

    # Check revision metadata
    get_res = await client.get(f"/api/v1/submissions/{sub_id}", headers=CREATOR_HEADERS)
    assert get_res.status_code == 200
    latest_rev = get_res.json()["revisions"][-1]
    assert latest_rev["ai_governance_metadata"].get("ai_status") == "ok"


@pytest.mark.asyncio
async def test_health_reports_configured_models_validity(client: AsyncClient, monkeypatch):
    """
    Acceptance Criteria 4:
    The /health response reports whether gemini-3.5-flash and gemini-embedding-2 are valid.
    """
    async def mock_verify():
        return {
            "gemini-3.5-flash": {"valid": True},
            "gemini-embedding-2": {"valid": True},
        }

    monkeypatch.setattr(gemini_service, "verify_configured_models", mock_verify)
    monkeypatch.setattr(gemini_service, "model_validation_status", {
        "gemini-3.5-flash": {"valid": True},
        "gemini-embedding-2": {"valid": True},
    })

    health_res = await client.get("/api/v1/health")
    assert health_res.status_code == 200
    data = health_res.json()

    ai_integration = data.get("ai_integration", {})
    models = ai_integration.get("models", {})
    assert "gemini-3.5-flash" in models
    assert models["gemini-3.5-flash"]["valid"] is True
    assert "gemini-embedding-2" in models
    assert models["gemini-embedding-2"]["valid"] is True


def test_no_forbidden_model_names_in_repo():
    """
    Acceptance Criteria 5:
    No file in the repo mentions gemini-3.8-flash, gemini-3.8-flash-lite,
    gemini-3.5-flash-lite or gemini-2.5-flash.
    """
    forbidden_pattern = re.compile(
        r"gemini-(3\.8-flash(?:-lite)?|3\.5-flash-lite|2\.5-flash)", re.IGNORECASE
    )
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    matches = []
    ignored_dirs = {".git", "__pycache__", ".venv312", "node_modules", ".next"}

    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            if file in {".env", "test_phase1_ai_reliability.py"}:
                continue  # Local developer env file or this test validator
            if file.endswith((".py", ".md", ".txt", ".example", ".json", ".ts", ".tsx")):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    found = forbidden_pattern.findall(content)
                    if found:
                        matches.append((os.path.relpath(filepath, repo_root), found))

    assert len(matches) == 0, f"Found forbidden model references in repo: {matches}"
