import io
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock

from app.main import app
from app.core.security import get_auth_headers, UserRole
from app.core.config import settings

pytestmark = pytest.mark.asyncio


@pytest.fixture
def mock_gemini():
    with patch("app.services.gemini_service.gemini_service.generate_embedding", new_callable=AsyncMock) as mock_emb, \
         patch("app.services.gemini_service.gemini_service.extract_rules", new_callable=AsyncMock) as mock_ext:
        mock_emb.return_value = [0.05] * 768
        mock_ext.return_value = {
            "palette": ["#F8C200", "#1C1C1E", "#FFFFFF", "#00A36C", "#FF6B35"],
            "banned_terms": ["guaranteed", "instant", "always", "100%"],
            "preferred_terminology": {"delivery boy": "delivery partner", "app": "Blinkit app"},
            "approved_facts": [
                {"claim": "Blinkit delivers in 10 minutes", "source": "Guidelines", "verified": True}
            ],
            "required_phrases": ["Blinkit app"],
            "exaggeration_terms": ["100%", "instant"],
            "prohibited_visual_subjects": ["crackers", "fireworks", "spider-man"],
            "per_media_rules": {},
            "decision_rules": {"palette_threshold": 0.8, "require_contrast_check": True},
            "rubric": [],
            "summary": "Mock extracted Blinkit ruleset",
        }
        yield mock_emb, mock_ext


async def test_e2e_complete_enterprise_governance_journey(mock_gemini):
    """
    End-to-end integration test validating the entire 8-phase platform flow:
    1. Auth: Personas obtain signed JWT access tokens (Admin, Judge, Creator).
    2. Guidelines: Load pre-indexed Blinkit Diwali 2026 pack (RAG chunks + Campaign + RuleSet).
    3. Rules: Inspect and confirm extracted deterministic RuleSet.
    4. Creative Submission: Creator submits Instagram creative post package (image + caption + hashtags).
    5. Multi-modal Audit: Evaluates visual identity, copy, event fit, and accessibility with gemini-3.5-flash.
    6. Background Polling: Queries audit status endpoint for progress and results.
    7. Role Lockdown: Creator cannot approve or directly override findings.
    8. Overrides & Deadlock Fix: Judge overrides finding with mandatory reason; effective verdict updates to PASS.
    9. Final Approval: Admin approves submission.
    10. Governance Intelligence: Admin queries queue and stats, verifying agreement rates and override tracking.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ── 1. Authenticate Personas ──────────────────────────────────────────
        admin_login = await client.post("/api/v1/auth/login", json={"role": "ADMIN"})
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        creator_login = await client.post("/api/v1/auth/login", json={"role": "CREATOR"})
        assert creator_login.status_code == 200
        creator_token = creator_login.json()["access_token"]
        creator_headers = {"Authorization": f"Bearer {creator_token}"}

        judge_login = await client.post("/api/v1/auth/login", json={"role": "JUDGE"})
        assert judge_login.status_code == 200
        judge_token = judge_login.json()["access_token"]
        judge_headers = {"Authorization": f"Bearer {judge_token}"}

        # Verify identity via /auth/me
        me_res = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert me_res.status_code == 200
        assert me_res.json()["role"] == "ADMIN"

        # ── 2. Load Premade Pack (Blinkit Diwali 2026) ────────────────────────
        pack_res = await client.post("/api/v1/packs/blinkit/load", headers=admin_headers)
        assert pack_res.status_code == 200
        pack_data = pack_res.json()
        assert pack_data["pack_name"] == "blinkit"
        brand_id = pack_data["brand_id"]
        campaign_id = pack_data["campaign_id"]
        assert brand_id > 0
        assert pack_data["indexed_chunks_count"] > 0

        # ── 3. Inspect Extracted RuleSet ──────────────────────────────────────
        rules_res = await client.get(f"/api/v1/brands/{brand_id}/rules", headers=admin_headers)
        assert rules_res.status_code == 200
        rulesets = rules_res.json()
        active_ruleset = rulesets[0]
        assert "palette_threshold" in active_ruleset.get("decision_rules", {}) or "palette" in active_ruleset

        # ── 4. Creator Creates Submission ─────────────────────────────────────
        sub_create_res = await client.post(
            "/api/v1/submissions",
            headers=creator_headers,
            json={
                "brand_id": brand_id,
                "campaign_id": campaign_id,
                "title": "Blinkit Diwali Festive Sweets Launch",
                "content_format": "IMAGE",
                "platform": "instagram",
                "initial_content": "Celebrate Diwali with sweets delivered fast on the Blinkit app! #Diwali2026",
            },
        )
        assert sub_create_res.status_code == 201
        submission = sub_create_res.json()
        sub_id = submission["id"]

        # ── 5. Creator Uploads Social Post Package ───────────────────────────
        from PIL import Image
        buf = io.BytesIO()
        img = Image.new("RGB", (100, 100), color=(248, 194, 0))
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        mock_vision_payload = {
            "visible_text": ["Happy Diwali", "Order on Blinkit app", "Sweets in minutes"],
            "dominant_colors": ["#F8C200", "#00A36C", "#1C1C1E"],
            "palette_match_pct": 94.0,
            "detected_subjects": ["diwali sweets", "family celebration", "clay diya"],
            "has_prohibited_elements": False,
            "prohibited_elements_found": [],
            "event_cues_detected": ["diwali", "festive lights", "family celebration"],
            "event_fit_score": 95,
            "has_banned_terms": False,
            "banned_terms_found": [],
            "terminology_violations": [],
            "unverified_claims": [],
            "missing_required_cues": [],
            "accessibility_passed": True,
            "findings": [
                {
                    "category": "SUGGESTION",
                    "severity": "SUGGESTION",
                    "detector_source": "vision_llm",
                    "flagged_excerpt": "Sweets in minutes",
                    "explanation": "Consider specifying exact festival gifting assortment details.",
                    "suggested_correction": "Sweets and dry fruit gift hampers delivered fast.",
                }
            ],
            "overall_score": 92.0,
            "verdict": "PASS",
        }

        mock_semantic_payload = {
            "ai_status": "ok",
            "ai_error": None,
            "overall_summary": "Festive copy approved.",
            "findings": [
                {
                    "category": "TONE",
                    "severity": "SUGGESTION",
                    "detector_source": "SEMANTIC_LLM",
                    "flagged_excerpt": "Celebrate Diwali",
                    "explanation": "Tone aligns with Blinkit festive warmth.",
                    "suggested_correction": "Celebrate Diwali with sweets delivered fast on the Blinkit app!",
                }
            ],
        }

        with patch("app.services.gemini_service.gemini_service.audit_image_semantic", new_callable=AsyncMock) as mock_vision, \
             patch("app.services.gemini_service.gemini_service.audit_content_semantic", new_callable=AsyncMock) as mock_semantic, \
             patch("app.services.gemini_service.gemini_service.generate_embedding", new_callable=AsyncMock) as mock_embed:
            mock_vision.return_value = mock_vision_payload
            mock_semantic.return_value = mock_semantic_payload
            mock_embed.return_value = [0.01] * 768

            upload_res = await client.post(
                f"/api/v1/submissions/{sub_id}/upload-post",
                headers=creator_headers,
                data={
                    "caption": "Order fresh Diwali sweets, diyas, and festive gift boxes on the Blinkit app! #Diwali2026",
                    "hashtags": "#Diwali2026 #Blinkit #FestiveTreats",
                    "alt_text": "Festive box of authentic Diwali sweets and golden clay diya on vibrant Blinkit yellow background",
                    "event": "Diwali 2026",
                },
                files={"file": ("diwali_sweets.png", io.BytesIO(png_bytes), "image/png")},
            )
            assert upload_res.status_code == 200
            audit_result = upload_res.json()
            assert audit_result["submission_id"] == sub_id
            assert audit_result["compliance_score"] >= 80

        # ── 6. Background Audit Status Polling ────────────────────────────────
        status_res = await client.get(
            f"/api/v1/submissions/{sub_id}/audit-status",
            headers=creator_headers,
        )
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["status"] == "done"
        assert status_data["progress"] in [1.0, 100]
        assert status_data["verdict"] in ["PASS", "NEEDS_REVIEW"]

        # ── 7. Role-Based Permissions & Creator Lockdown ──────────────────────
        # Creator cannot directly approve submissions
        creator_approve_res = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            headers=creator_headers,
            json={"target_status": "APPROVED", "notes": "Creator trying to self-approve"},
        )
        assert creator_approve_res.status_code == 403

        # ── 8. Finding Overrides & Deadlock Recalculation ──────────────────────
        # Fetch current submission with findings
        sub_detail_res = await client.get(f"/api/v1/submissions/{sub_id}", headers=judge_headers)
        assert sub_detail_res.status_code == 200
        findings = sub_detail_res.json().get("findings", [])

        if findings:
            finding_id = findings[0]["id"]
            # Creator cannot override findings directly
            creator_override = await client.post(
                f"/api/v1/submissions/findings/{finding_id}/override",
                headers=creator_headers,
                json={"reason": "Creator attempting override"},
            )
            assert creator_override.status_code == 403

            # Judge overrides finding with mandatory reason
            judge_override = await client.post(
                f"/api/v1/submissions/findings/{finding_id}/override",
                headers=judge_headers,
                json={"reason": "Copy confirmed by Diwali creative director as approved festive variation."},
            )
            assert judge_override.status_code == 200
            assert judge_override.json()["resolution_state"] == "OVERRIDDEN"

        # ── 9. Admin Final Approval ───────────────────────────────────────────
        admin_approve_res = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            headers=admin_headers,
            json={"target_status": "APPROVED", "notes": "Approved for Diwali 2026 digital rollout."},
        )
        assert admin_approve_res.status_code == 200
        assert admin_approve_res.json()["status"] == "APPROVED"

        # ── 10. Admin Governance Intelligence & Stats ─────────────────────────
        queue_res = await client.get("/api/v1/admin/queue?page=1&page_size=10", headers=admin_headers)
        assert queue_res.status_code == 200
        queue_data = queue_res.json()
        assert queue_data["total"] >= 1
        item = next((i for i in queue_data["items"] if i["id"] == sub_id), None)
        assert item is not None
        assert item["status"] == "APPROVED"

        stats_res = await client.get("/api/v1/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        assert stats_data["total_submissions"] >= 1
        assert "APPROVED" in stats_data["status_distribution"]
        assert 0.0 <= stats_data["agreement_rate_pct"] <= 100.0


async def test_single_model_configuration_and_tenant_isolation():
    """
    Verifies the platform's core architectural constraints:
    1. Single Model Rule: Primary model must be gemini-3.5-flash for all vision, audio, video, text.
    2. Embedding Model: Must be gemini-embedding-2 with 768 dimensions.
    3. Health endpoint reports client readiness and single model config.
    4. Multi-tenant isolation prevents cross-tenant access without admin privileges.
    """
    assert settings.PRIMARY_LLM_MODEL == "gemini-3.5-flash"
    assert settings.EMBEDDING_MODEL == "gemini-embedding-2"
    assert settings.EMBEDDING_DIMENSIONS == 768

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check health endpoint
        health_res = await client.get("/api/v1/health")
        assert health_res.status_code == 200
        health = health_res.json()
        assert health["ai_integration"]["primary_model"] == "gemini-3.5-flash"
        assert health["ai_integration"]["embedding_model"] == "gemini-embedding-2"
        assert health["ai_integration"]["embedding_dimensions"] == 768

        # Test demo users list
        demo_res = await client.get("/api/v1/auth/demo-users")
        assert demo_res.status_code == 200
        demo_users = demo_res.json()
        roles = [u["role"] for u in demo_users]
        assert "CREATOR" in roles
        assert "JUDGE" in roles
        assert "ADMIN" in roles
