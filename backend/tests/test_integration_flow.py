import pytest
from httpx import AsyncClient
from app.services.gemini_service import gemini_service


@pytest.fixture(autouse=True)
def mock_external_ai(monkeypatch):
    """Network-boundary mock for Google Gemini API to ensure test runs hermetically."""
    mock_vector = [0.02] * 768

    async def mock_embed(text: str, task_type: str = "RETRIEVAL_DOCUMENT"):
        return mock_vector

    async def mock_semantic(scrubbed_text, tone_persona, guidelines_context, approved_facts):
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
            "overall_summary": "E2E Press Release processed.",
        }

    monkeypatch.setattr(gemini_service, "generate_embedding", mock_embed)
    monkeypatch.setattr(gemini_service, "audit_content_semantic", mock_semantic)


@pytest.mark.asyncio
async def test_full_governance_lifecycle_e2e(client: AsyncClient):
    """
    End-to-end workflow verification:
    1. Create submission as CREATOR
    2. Run full governance audit (PII scrubbing + deterministic rules + pgvector RAG + AI analysis)
    3. Verify findings and compliance score
    4. Post reviewer comment as REVIEWER
    5. Override finding as REVIEWER with mandatory explanation
    6. Transition submission to APPROVED
    7. Verify immutable workflow event history
    """
    # 1. Create submission
    sub_payload = {
        "brand_id": 1,
        "title": "E2E Cloud Platform Press Release",
        "content_format": "TEXT",
        "initial_content": (
            "ApexCloud provides an unbreakable data platform that guarantees 100% uptime. "
            "Our client-side storage is the cheapest option on the market. "
            "Reach security architect at sec@apexcloud.internal for PROJECT-TEST-KEY."
        ),
    }
    create_res = await client.post(
        "/api/v1/submissions",
        json=sub_payload,
        headers={"x-user-id": "creator_1", "x-user-name": "Alex Rivera", "x-user-role": "CREATOR"},
    )
    assert create_res.status_code == 201
    sub_data = create_res.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] == "DRAFT"
    assert sub_data["current_version"] == 1

    # 2. Run Audit
    audit_res = await client.post(
        f"/api/v1/submissions/{sub_id}/audit",
        headers={"x-user-id": "creator_1", "x-user-name": "Alex Rivera", "x-user-role": "CREATOR"},
    )
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert "compliance_score" in audit_data
    assert audit_data["total_findings"] > 0
    assert audit_data["confidentiality_report"]["confidentiality_guard_active"] is True
    # Verify PII was redacted from external leaks
    assert audit_data["confidentiality_report"]["total_redacted"] >= 2

    # 3. Add Reviewer Comment
    comment_res = await client.post(
        f"/api/v1/submissions/{sub_id}/comments",
        json={"comment_text": "Please fix the superlatives and deprecated terms before publication."},
        headers={"x-user-id": "reviewer_1", "x-user-name": "Jordan Lee", "x-user-role": "REVIEWER"},
    )
    assert comment_res.status_code == 201
    assert comment_res.json()["author_role"] == "REVIEWER"

    # 4. Override findings with valid reason
    findings = audit_data["findings"]
    for f in findings:
        override_res = await client.post(
            f"/api/v1/submissions/findings/{f['id']}/override",
            json={"reason": "Approved executive exception by CMO for launch embargo"},
            headers={"x-user-id": "reviewer_1", "x-user-name": "Jordan Lee", "x-user-role": "REVIEWER"},
        )
        assert override_res.status_code == 200
        assert override_res.json()["resolution_state"] == "OVERRIDDEN"

    # 5. Transition to APPROVED by Reviewer
    status_res = await client.post(
        f"/api/v1/submissions/{sub_id}/status",
        json={"target_status": "APPROVED", "notes": "Approved with executive override noted"},
        headers={"x-user-id": "reviewer_1", "x-user-name": "Jordan Lee", "x-user-role": "REVIEWER"},
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "APPROVED"

    # 6. Verify immutable workflow event history
    wf_res = await client.get(
        f"/api/v1/submissions/{sub_id}/workflow",
        headers={"x-user-id": "reviewer_1", "x-user-name": "Jordan Lee", "x-user-role": "REVIEWER"},
    )
    assert wf_res.status_code == 200
    events = wf_res.json()
    event_types = [e["event_type"] for e in events]
    assert "CREATED" in event_types
    assert "AUDIT_COMPLETED" in event_types
    assert "FINDING_OVERRIDDEN" in event_types
    assert "STATUS_CHANGED" in event_types
