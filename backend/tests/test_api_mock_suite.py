import io
import uuid
import pytest
from httpx import AsyncClient
import fitz

from app.services.gemini_service import gemini_service
from app.core.database import redis_client

# Synthetic mock headers
CREATOR_HEADERS = {
    "x-user-id": "mock_creator_001",
    "x-user-name": "Alex Demo Creator",
    "x-user-role": "CREATOR",
}
REVIEWER_HEADERS = {
    "x-user-id": "mock_reviewer_001",
    "x-user-name": "Jordan Demo Reviewer",
    "x-user-role": "REVIEWER",
}
MANAGER_HEADERS = {
    "x-user-id": "mock_manager_001",
    "x-user-name": "Taylor Demo Manager",
    "x-user-role": "MANAGER",
}


@pytest.fixture(autouse=True)
def mock_external_ai(monkeypatch):
    """Network-boundary mock for Google Gemini API to ensure tests use 100% synthetic local mocks."""
    # Mock 768-dim embedding
    mock_vector = [0.02] * 768

    async def mock_embed(text: str, task_type: str = "RETRIEVAL_DOCUMENT"):
        return mock_vector

    async def mock_semantic(scrubbed_text, tone_persona, guidelines_context, approved_facts, *args, **kwargs):
        return {
            "ai_status": "ok",
            "findings": [
                {
                    "category": "TONE",
                    "severity": "WARNING",
                    "flagged_excerpt": "guarantees 100% uptime",
                    "explanation": "Absolute superlative contradicts verified empirical SLA guidelines.",
                    "suggested_correction": "offers a 99.9% uptime SLA",
                    "cited_guideline_id": None,
                }
            ],
            "ai_error": None,
            "overall_summary": "Semantic audit completed via mock.",
        }

    monkeypatch.setattr(gemini_service, "generate_embedding", mock_embed)
    monkeypatch.setattr(gemini_service, "audit_content_semantic", mock_semantic)


def create_mock_pdf_bytes(title: str = "Demo Brand Guidelines", body: str = "Rule 1: Be humble.") -> bytes:
    """Generates an in-memory synthetic PDF document."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), f"{title}\n\n{body}")
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# =====================================================================
# 1. System, Docs & Health Endpoints
# =====================================================================

@pytest.mark.asyncio
async def test_endpoint_root(client: AsyncClient):
    """GET / -> Root landing endpoint with metadata and documentation links."""
    res = await client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "project" in data
    assert data["docs"] == "/docs"
    assert data["health"] == "/api/v1/health"


@pytest.mark.asyncio
async def test_endpoint_docs(client: AsyncClient):
    """GET /docs -> Swagger UI documentation page."""
    res = await client.get("/docs")
    assert res.status_code == 200
    assert "swagger-ui" in res.text.lower()


@pytest.mark.asyncio
async def test_endpoint_redoc(client: AsyncClient):
    """GET /redoc -> ReDoc documentation page."""
    res = await client.get("/redoc")
    assert res.status_code == 200
    assert "redoc" in res.text.lower()


@pytest.mark.asyncio
async def test_endpoint_openapi_json(client: AsyncClient):
    """GET /api/v1/openapi.json -> OpenAPI schema with all registered endpoints."""
    res = await client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]
    assert "/api/v1/brands" in schema["paths"]


@pytest.mark.asyncio
async def test_endpoint_health_success(client: AsyncClient):
    """GET /api/v1/health -> Health status when dependencies are healthy."""
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"
    assert "pgvector" in data["pgvector"]


@pytest.mark.asyncio
async def test_endpoint_health_degraded(client: AsyncClient, monkeypatch):
    """GET /api/v1/health -> Graceful degradation report when Redis client fails."""
    async def mock_redis_fail():
        raise ConnectionError("Mocked Redis unreachable")

    monkeypatch.setattr(redis_client, "ping", mock_redis_fail)
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "degraded"
    assert "unhealthy" in data["redis"]


# =====================================================================
# 2. Brand Profiles Endpoints
# =====================================================================

@pytest.mark.asyncio
async def test_endpoint_brands_crud_flow(client: AsyncClient):
    """Full lifecycle testing for /api/v1/brands endpoints."""
    brand_name = f"Mock Brand {uuid.uuid4().hex[:8]}"
    create_payload = {
        "name": brand_name,
        "industry": "Enterprise Governance Software",
        "tone_persona": "Professional, empathetic, and evidence-backed.",
        "approved_hex_palette": ["#0F172A", "#2563EB", "#FFFFFF"],
        "banned_terms": ["unbreakable", "guaranteed", "cheapest"],
        "preferred_terminology": {"client-side": "on-device"},
        "approved_facts": [{"claim": "99.9% SLA", "source": "SOC2 Report", "verified": True}],
        "visual_guidelines_summary": "Use high contrast typography.",
        "min_wcag_contrast": 4.5,
    }

    # 1. POST /api/v1/brands -> Create
    res_create = await client.post("/api/v1/brands", json=create_payload, headers=CREATOR_HEADERS)
    assert res_create.status_code == 201
    created_brand = res_create.json()
    brand_id = created_brand["id"]
    assert created_brand["name"] == brand_name

    # 2. GET /api/v1/brands -> List
    res_list = await client.get("/api/v1/brands", headers=CREATOR_HEADERS)
    assert res_list.status_code == 200
    assert any(b["id"] == brand_id for b in res_list.json())

    # 3. GET /api/v1/brands/{brand_id} -> Get single
    res_get = await client.get(f"/api/v1/brands/{brand_id}", headers=CREATOR_HEADERS)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == brand_id

    # 4. PUT /api/v1/brands/{brand_id} -> Update
    update_payload = {"tone_persona": "Updated authoritative and modern tone."}
    res_put = await client.put(f"/api/v1/brands/{brand_id}", json=update_payload, headers=CREATOR_HEADERS)
    assert res_put.status_code == 200
    assert res_put.json()["tone_persona"] == "Updated authoritative and modern tone."

    # 5. DELETE /api/v1/brands/{brand_id} -> Delete
    res_del = await client.delete(f"/api/v1/brands/{brand_id}", headers=CREATOR_HEADERS)
    assert res_del.status_code == 204

    # 6. Verify 404 after deletion
    res_verify = await client.get(f"/api/v1/brands/{brand_id}", headers=CREATOR_HEADERS)
    assert res_verify.status_code == 404


@pytest.mark.asyncio
async def test_endpoint_brands_conflict(client: AsyncClient):
    """POST /api/v1/brands -> 409 Conflict when creating brand with duplicate name."""
    brand_name = f"Duplicate Brand {uuid.uuid4().hex[:8]}"
    payload = {"name": brand_name, "industry": "Testing"}
    res1 = await client.post("/api/v1/brands", json=payload, headers=CREATOR_HEADERS)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/brands", json=payload, headers=CREATOR_HEADERS)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_endpoint_brands_validation_error(client: AsyncClient):
    """POST /api/v1/brands -> 422 Unprocessable Entity on invalid contrast ratio."""
    payload = {
        "name": "Invalid Contrast Brand",
        "min_wcag_contrast": 0.5,  # min is 1.0
    }
    res = await client.post("/api/v1/brands", json=payload, headers=CREATOR_HEADERS)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_brands_not_found(client: AsyncClient):
    """GET /api/v1/brands/999999 -> 404 Not Found."""
    res = await client.get("/api/v1/brands/999999", headers=CREATOR_HEADERS)
    assert res.status_code == 404


# =====================================================================
# 3. Guidelines & Semantic Search Endpoints
# =====================================================================

@pytest.mark.asyncio
async def test_endpoint_guidelines_flow(client: AsyncClient):
    """Tests /api/v1/guidelines chunk creation, listing, search, and PDF ingestion."""
    # 1. Create a brand to attach guidelines
    b_res = await client.post(
        "/api/v1/brands",
        json={"name": f"Guideline Brand {uuid.uuid4().hex[:8]}"},
        headers=CREATOR_HEADERS,
    )
    brand_id = b_res.json()["id"]

    # 2. POST /api/v1/guidelines -> Create single chunk
    chunk_payload = {
        "brand_id": brand_id,
        "source_document": "Mock Guideline Manual v1.pdf",
        "page_number": 2,
        "section_reference": "Section 1.1: Tone",
        "rule_category": "TONE",
        "content_text": "Never promise absolute invincibility in marketing collateral.",
    }
    res_c = await client.post("/api/v1/guidelines", json=chunk_payload, headers=CREATOR_HEADERS)
    assert res_c.status_code == 201
    chunk = res_c.json()
    assert chunk["content_text"] == chunk_payload["content_text"]

    # 3. GET /api/v1/guidelines?brand_id=... -> List chunks
    res_list = await client.get(f"/api/v1/guidelines?brand_id={brand_id}", headers=CREATOR_HEADERS)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 4. POST /api/v1/guidelines/search -> Semantic pgvector search
    search_payload = {
        "brand_id": brand_id,
        "query": "invincibility promises",
        "limit": 3,
    }
    res_search = await client.post("/api/v1/guidelines/search", json=search_payload, headers=CREATOR_HEADERS)
    assert res_search.status_code == 200
    search_results = res_search.json()
    assert len(search_results) >= 1
    assert "similarity_score" in search_results[0]

    # 5. POST /api/v1/guidelines/upload-pdf -> Ingest in-memory synthetic PDF
    pdf_bytes = create_mock_pdf_bytes(
        title="Mock Brand Identity Spec",
        body="Section: Brand Colors\n\nAlways use high contrast text #FFFFFF on navy background #0F172A.",
    )
    files = {"file": ("mock_spec.pdf", pdf_bytes, "application/pdf")}
    data = {"brand_id": str(brand_id)}
    res_pdf = await client.post("/api/v1/guidelines/upload-pdf", data=data, files=files, headers=CREATOR_HEADERS)
    assert res_pdf.status_code == 201
    uploaded_chunks = res_pdf.json()
    assert len(uploaded_chunks) >= 1


@pytest.mark.asyncio
async def test_endpoint_guidelines_upload_non_pdf(client: AsyncClient):
    """POST /api/v1/guidelines/upload-pdf -> 400 Bad Request when uploading non-PDF."""
    files = {"file": ("notes.txt", b"Plain text file", "text/plain")}
    data = {"brand_id": "1"}
    res = await client.post("/api/v1/guidelines/upload-pdf", data=data, files=files, headers=CREATOR_HEADERS)
    assert res.status_code == 400
    assert "Only PDF documents are supported" in res.json()["detail"]


@pytest.mark.asyncio
async def test_endpoint_guidelines_validation_error(client: AsyncClient):
    """POST /api/v1/guidelines -> 422 on too-short content_text."""
    payload = {
        "brand_id": 1,
        "source_document": "doc.pdf",
        "content_text": "no",  # min is 5 chars
    }
    res = await client.post("/api/v1/guidelines", json=payload, headers=CREATOR_HEADERS)
    assert res.status_code == 422


# =====================================================================
# 4. Submissions, Audit & Governance Workflow Endpoints
# =====================================================================

@pytest.mark.asyncio
async def test_endpoint_submissions_full_workflow(client: AsyncClient):
    """Comprehensive test of submission, audit, comment, finding override, and status transitions."""
    # 1. Setup brand
    b_res = await client.post(
        "/api/v1/brands",
        json={
            "name": f"Workflow Brand {uuid.uuid4().hex[:8]}",
            "banned_terms": ["unbreakable", "cheapest"],
            "preferred_terminology": {"client-side": "on-device"},
        },
        headers=CREATOR_HEADERS,
    )
    brand_id = b_res.json()["id"]

    # 2. POST /api/v1/submissions -> Create draft
    sub_payload = {
        "brand_id": brand_id,
        "title": "Mock Product Launch Announcement",
        "content_format": "TEXT",
        "initial_content": (
            "Our new service is unbreakable and guarantees 100% uptime. "
            "It is the cheapest client-side storage option available. "
            "Contact team lead at qa.lead@example.test with PROJECT-MOCK-SECRET."
        ),
    }
    res_sub = await client.post("/api/v1/submissions", json=sub_payload, headers=CREATOR_HEADERS)
    assert res_sub.status_code == 201
    sub = res_sub.json()
    sub_id = sub["id"]
    assert sub["status"] == "DRAFT"
    assert sub["current_version"] == 1

    # 3. GET /api/v1/submissions -> List submissions for brand
    res_list = await client.get(f"/api/v1/submissions?brand_id={brand_id}", headers=CREATOR_HEADERS)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 4. GET /api/v1/submissions/{sub_id} -> Get details
    res_get = await client.get(f"/api/v1/submissions/{sub_id}", headers=CREATOR_HEADERS)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == sub_id

    # 5. POST /api/v1/submissions/{sub_id}/audit -> Run full audit
    res_audit = await client.post(f"/api/v1/submissions/{sub_id}/audit", headers=CREATOR_HEADERS)
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert audit_data["total_findings"] > 0
    assert audit_data["confidentiality_report"]["confidentiality_guard_active"] is True
    # Verify PII was redacted from external leaks
    assert audit_data["confidentiality_report"]["total_redacted"] >= 2
    findings = audit_data["findings"]
    first_finding_id = findings[0]["id"]

    # 6. POST /api/v1/submissions/{sub_id}/comments -> Post reviewer comment
    res_comment = await client.post(
        f"/api/v1/submissions/{sub_id}/comments",
        json={"comment_text": "Please address the banned term 'unbreakable' before review."},
        headers=REVIEWER_HEADERS,
    )
    assert res_comment.status_code == 201
    assert res_comment.json()["author_name"] == "Jordan Demo Reviewer"

    # 7. GET /api/v1/submissions/{sub_id}/comments -> List comments
    res_get_comments = await client.get(f"/api/v1/submissions/{sub_id}/comments", headers=CREATOR_HEADERS)
    assert res_get_comments.status_code == 200
    assert len(res_get_comments.json()) >= 1

    # 8. POST /api/v1/submissions/findings/{finding_id}/override -> Reviewer override
    res_override = await client.post(
        f"/api/v1/submissions/findings/{first_finding_id}/override",
        json={"reason": "Approved exception for confidential pre-announcement embargo."},
        headers=REVIEWER_HEADERS,
    )
    assert res_override.status_code == 200
    assert res_override.json()["resolution_state"] == "OVERRIDDEN"

    # 9. POST /api/v1/submissions/findings/{finding_id}/resolve -> Accept correction
    res_resolve = await client.post(
        f"/api/v1/submissions/findings/{first_finding_id}/resolve",
        json={"resolution_state": "ACCEPTED"},
        headers=CREATOR_HEADERS,
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["resolution_state"] == "ACCEPTED"

    # 10. POST /api/v1/submissions/{sub_id}/revisions -> Create new version
    rev_payload = {
        "content_body": "Our new cloud service is resilient and backed by a 99.9% uptime SLA.",
        "change_summary": "Replaced banned superlatives with empirical SLA metrics.",
    }
    res_rev = await client.post(f"/api/v1/submissions/{sub_id}/revisions", json=rev_payload, headers=CREATOR_HEADERS)
    assert res_rev.status_code == 201
    rev = res_rev.json()
    assert rev["version_number"] == 2

    # Audit v2 revision to establish compliance score and ai_status
    res_audit_v2 = await client.post(f"/api/v1/submissions/{sub_id}/audit", headers=CREATOR_HEADERS)
    assert res_audit_v2.status_code == 200
    for f in res_audit_v2.json().get("findings", []):
        await client.post(
            f"/api/v1/submissions/findings/{f['id']}/override",
            json={"reason": "Approved exception for v2 revision"},
            headers=REVIEWER_HEADERS,
        )

    # 11. POST /api/v1/submissions/{sub_id}/status -> Transition status to APPROVED by Reviewer
    res_status = await client.post(
        f"/api/v1/submissions/{sub_id}/status",
        json={"target_status": "APPROVED", "notes": "Approved for general publication."},
        headers=REVIEWER_HEADERS,
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "APPROVED"

    # 12. GET /api/v1/submissions/{sub_id}/workflow -> Verify immutable audit trail
    res_wf = await client.get(f"/api/v1/submissions/{sub_id}/workflow", headers=CREATOR_HEADERS)
    assert res_wf.status_code == 200
    events = res_wf.json()
    event_types = [e["event_type"] for e in events]
    assert "CREATED" in event_types
    assert "AUDIT_COMPLETED" in event_types
    assert "REVISION_CREATED" in event_types
    assert "STATUS_CHANGED" in event_types


@pytest.mark.asyncio
async def test_endpoint_submissions_rbac_enforcement(client: AsyncClient):
    """Verifies server-side RBAC guards on status approval and finding override."""
    # 1. Creator attempts to approve submission -> 403 Forbidden
    res_app = await client.post(
        "/api/v1/submissions/1/status",
        json={"target_status": "APPROVED"},
        headers=CREATOR_HEADERS,
    )
    assert res_app.status_code == 403
    assert "REVIEWER or MANAGER" in res_app.json()["detail"]

    # 2. Creator attempts to override finding -> 403 Forbidden
    res_ov = await client.post(
        "/api/v1/submissions/findings/1/override",
        json={"reason": "Self-approval without reviewer signoff"},
        headers=CREATOR_HEADERS,
    )
    assert res_ov.status_code == 403
    assert "Only REVIEWER or MANAGER" in res_ov.json()["detail"]


@pytest.mark.asyncio
async def test_endpoint_submissions_not_found(client: AsyncClient):
    """GET /api/v1/submissions/999999 -> 404 Not Found."""
    res = await client.get("/api/v1/submissions/999999", headers=CREATOR_HEADERS)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_endpoint_submissions_invalid_status(client: AsyncClient):
    """POST /api/v1/submissions/1/status -> 400 Bad Request on unknown status."""
    res = await client.post(
        "/api/v1/submissions/1/status",
        json={"target_status": "UNKNOWN_STATUS"},
        headers=REVIEWER_HEADERS,
    )
    assert res.status_code == 400
    assert "Invalid status" in res.json()["detail"]


# =====================================================================
# 5. Governance Analytics Endpoints
# =====================================================================

@pytest.mark.asyncio
async def test_endpoint_analytics_success(client: AsyncClient):
    """GET /api/v1/analytics/{brand_id} -> Governance metrics and ambiguous guideline indicators."""
    res = await client.get("/api/v1/analytics/1", headers=CREATOR_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total_submissions" in data
    assert "avg_compliance_score" in data
    assert "status_breakdown" in data
    assert "findings_by_severity" in data
    assert "findings_by_category" in data
    assert "findings_by_source" in data
    assert "resolution_breakdown" in data
    assert "ambiguous_guidelines" in data
    assert isinstance(data["ambiguous_guidelines"], list)


@pytest.mark.asyncio
async def test_endpoint_analytics_not_found(client: AsyncClient):
    """GET /api/v1/analytics/999999 -> 404 Not Found for non-existent brand."""
    res = await client.get("/api/v1/analytics/999999", headers=CREATOR_HEADERS)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_endpoint_docs_oauth2_redirect(client: AsyncClient):
    """GET /docs/oauth2-redirect -> OAuth2 redirect page for Swagger UI."""
    res = await client.get("/docs/oauth2-redirect")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_endpoint_submissions_status_filter(client: AsyncClient):
    """GET /api/v1/submissions?brand_id=1&status_filter=APPROVED -> Filters results by status."""
    res = await client.get("/api/v1/submissions?brand_id=1&status_filter=APPROVED", headers=CREATOR_HEADERS)
    assert res.status_code == 200
    for sub in res.json():
        assert sub["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_endpoint_comment_validation_error(client: AsyncClient):
    """POST /api/v1/submissions/1/comments -> 422 on too-short comment text (< 2 chars)."""
    res = await client.post(
        "/api/v1/submissions/1/comments",
        json={"comment_text": "a"},
        headers=REVIEWER_HEADERS,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_override_validation_error(client: AsyncClient):
    """POST /api/v1/submissions/findings/1/override -> 422 on reason too short (< 5 chars)."""
    res = await client.post(
        "/api/v1/submissions/findings/1/override",
        json={"reason": "bad"},
        headers=REVIEWER_HEADERS,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_guidelines_search_validation(client: AsyncClient):
    """POST /api/v1/guidelines/search -> 422 when query string is too short (< 2 chars)."""
    res = await client.post(
        "/api/v1/guidelines/search",
        json={"brand_id": 1, "query": "x"},
        headers=CREATOR_HEADERS,
    )
    assert res.status_code == 422

