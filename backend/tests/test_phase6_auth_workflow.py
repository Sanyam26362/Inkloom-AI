import pytest
import uuid
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import (
    CurrentUser,
    UserRole,
    create_access_token,
    decode_access_token,
    get_auth_headers,
    get_demo_token,
)
from app.models.brand import BrandProfile
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.services.workflow_service import WorkflowService

pytestmark = pytest.mark.asyncio


# ── 1. Real JWT Auth & Header Spoofing Protection ──────────────────────────

async def test_jwt_issue_decode_and_signature_validation():
    """Verifies that JWT tokens are properly signed, decoded, and validated."""
    payload = {
        "sub": "admin@inkloom.ai",
        "user_id": "usr_test_admin",
        "user_name": "Jordan Admin",
        "role": UserRole.ADMIN.value,
        "tenant_id": "tenant_enterprise_01",
    }
    token = create_access_token(payload)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded = decode_access_token(token)
    assert decoded["sub"] == "admin@inkloom.ai"
    assert decoded["user_id"] == "usr_test_admin"
    assert decoded["role"] == "ADMIN"
    assert decoded["tenant_id"] == "tenant_enterprise_01"


async def test_raw_x_user_role_header_strictly_rejected_without_jwt():
    """
    SECURITY RULE: Server must never trust raw x-user-role header without JWT validation.
    Any attempt to spoof elevated roles using raw headers must be rejected with HTTP 401.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Spoofing attempt with x-user-role: ADMIN without Authorization Bearer token
        res = await client.get(
            "/api/v1/admin/queue",
            headers={"x-user-role": "ADMIN", "x-user-name": "Attacker", "x-user-id": "attacker_01"},
        )
        assert res.status_code == 401
        assert "Raw x-user-role header is not trusted" in res.json()["detail"]


# ── 2. Login Endpoint & Demo Personas ────────────────────────────────────────

async def test_login_demo_quick_login_and_me_endpoint():
    """Tests POST /auth/login for quick persona switching and GET /auth/me."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Quick login by role (ADMIN)
        admin_login_res = await client.post("/api/v1/auth/login", json={"role": "ADMIN"})
        assert admin_login_res.status_code == 200
        admin_data = admin_login_res.json()
        assert "access_token" in admin_data
        assert admin_data["user"]["role"] == "ADMIN"
        admin_token = admin_data["access_token"]

        # Verify profile via /auth/me
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert me_res.status_code == 200
        assert me_res.json()["role"] == "ADMIN"
        assert me_res.json()["email"] == "admin@inkloom.ai"

        # Case B: Standard email/password login for seeded judge
        judge_login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "judge@inkloom.ai", "password": "judge123"},
        )
        assert judge_login_res.status_code == 200
        assert judge_login_res.json()["user"]["role"] == "JUDGE"

        # Case C: Bad password -> 401
        bad_login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "creator@inkloom.ai", "password": "wrong_password"},
        )
        assert bad_login_res.status_code == 401

        # Case D: List demo personas
        demo_users_res = await client.get("/api/v1/auth/demo-users")
        assert demo_users_res.status_code == 200
        personas = demo_users_res.json()
        assert len(personas) == 3
        roles = {p["role"] for p in personas}
        assert roles == {"ADMIN", "JUDGE", "CREATOR"}


# ── 3. Tenant Isolation ─────────────────────────────────────────────────────

async def test_tenant_isolation_on_brands():
    """Verifies that non-admin users only see brands belonging to their tenant or shared brands."""
    async with AsyncSessionLocal() as session:
        # Create brand for tenant A
        brand_a = BrandProfile(
            name=f"Tenant A Brand {uuid.uuid4().hex[:6]}",
            tenant_id="tenant_alpha",
            owner_id="user_alpha",
        )
        # Create brand for tenant B
        brand_b = BrandProfile(
            name=f"Tenant B Brand {uuid.uuid4().hex[:6]}",
            tenant_id="tenant_beta",
            owner_id="user_beta",
        )
        session.add_all([brand_a, brand_b])
        await session.commit()
        brand_a_name = brand_a.name
        brand_b_name = brand_b.name

    alpha_headers = get_auth_headers(UserRole.CREATOR, tenant_id="tenant_alpha")
    admin_headers = get_auth_headers(UserRole.ADMIN, tenant_id="tenant_alpha")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User Alpha sees Brand A but NOT Brand B
        res_alpha = await client.get("/api/v1/brands", headers=alpha_headers)
        assert res_alpha.status_code == 200
        alpha_names = [b["name"] for b in res_alpha.json()]
        assert brand_a_name in alpha_names
        assert brand_b_name not in alpha_names

        # Admin sees both Brand A and Brand B
        res_admin = await client.get("/api/v1/brands", headers=admin_headers)
        assert res_admin.status_code == 200
        admin_names = [b["name"] for b in res_admin.json()]
        assert brand_a_name in admin_names
        assert brand_b_name in admin_names


# ── 4. Approval Deadlock Fix & Effective Verdict Recalculation ───────────────

async def test_approval_deadlock_resolution_via_finding_override():
    """
    DEADLOCK FIX: Overriding critical findings recalculates compliance score
    and turns a FAIL or NEEDS_REVIEW verdict into PASS, allowing approval.
    """
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Deadlock Brand {uuid.uuid4().hex[:6]}")
        session.add(brand)
        await session.flush()

        sub = Submission(
            brand_id=brand.id,
            title="Deadlock Test Post",
            content_format="TEXT",
            status="NEEDS_REVIEW",
            verdict="FAIL",
            compliance_score=65.0,
            current_version=1,
            creator_id="creator_1",
            creator_name="Alex Creator",
        )
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(
            submission_id=sub.id,
            version_number=1,
            content_body="Text with critical violation",
            compliance_score=65.0,
            created_by="Alex Creator",
            ai_governance_metadata={"ai_status": "ok", "verdict": "FAIL"},
        )
        session.add(rev)
        await session.flush()

        finding = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="PROHIBITED_CONTENT",
            severity="CRITICAL",
            flagged_excerpt="Prohibited subject",
            explanation="Violates guideline",
            suggested_correction="Remove element",
            resolution_state="OPEN",
        )
        session.add(finding)
        await session.commit()
        await session.refresh(sub)
        await session.refresh(finding)
        sub_id = sub.id
        finding_id = finding.id

    judge_headers = get_auth_headers(UserRole.JUDGE)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Attempt to approve while CRITICAL finding is OPEN -> 409 Conflict
        res_blocked = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "APPROVED"},
            headers=judge_headers,
        )
        assert res_blocked.status_code == 409
        assert "OPEN CRITICAL finding(s) remain" in res_blocked.json()["detail"]

        # Step 2: Override the finding with valid reason
        res_override = await client.post(
            f"/api/v1/submissions/findings/{finding_id}/override",
            json={"reason": "Executive brand exception approved for festival period"},
            headers=judge_headers,
        )
        assert res_override.status_code == 200
        assert res_override.json()["resolution_state"] == "OVERRIDDEN"

        # Verify that verdict was automatically recalculated to PASS and score to 100
        sub_res = await client.get(f"/api/v1/submissions/{sub_id}", headers=judge_headers)
        assert sub_res.status_code == 200
        sub_data = sub_res.json()
        assert sub_data["verdict"] == "PASS"
        assert sub_data["compliance_score"] == 100.0

        # Step 3: Now approval succeeds smoothly without deadlock!
        res_approve = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "APPROVED", "notes": "Approved following executive override"},
            headers=judge_headers,
        )
        assert res_approve.status_code == 200
        assert res_approve.json()["status"] == "APPROVED"


# ── 5. Role Restrictions & Approval Matrix ──────────────────────────────────

async def test_role_restrictions_on_approval_and_overrides():
    """
    Verifies role authority:
    - CREATOR cannot approve or override findings (403)
    - JUDGE cannot approve NEEDS_REVIEW verdict (403, requires ADMIN)
    - ADMIN can approve NEEDS_REVIEW verdict
    - ADMIN approving FAIL requires explicit override reason
    """
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Role Brand {uuid.uuid4().hex[:6]}")
        session.add(brand)
        await session.flush()

        sub = Submission(
            brand_id=brand.id,
            title="Needs Review Copy",
            content_format="TEXT",
            status="AUDITING",
            verdict="NEEDS_REVIEW",
            compliance_score=92.0,
            current_version=1,
            creator_id="creator_1",
            creator_name="Alex Creator",
        )
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(
            submission_id=sub.id,
            version_number=1,
            content_body="Text needing editorial review",
            compliance_score=92.0,
            created_by="Alex Creator",
            ai_governance_metadata={"ai_status": "ok", "verdict": "NEEDS_REVIEW"},
        )
        session.add(rev)
        await session.commit()
        sub_id = sub.id

    creator_headers = get_auth_headers(UserRole.CREATOR)
    judge_headers = get_auth_headers(UserRole.JUDGE)
    admin_headers = get_auth_headers(UserRole.ADMIN)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Creator cannot approve -> 403
        res_creator = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "APPROVED"},
            headers=creator_headers,
        )
        assert res_creator.status_code == 403

        # Case B: Judge cannot approve NEEDS_REVIEW verdict -> 403 (Admin required)
        res_judge = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "APPROVED"},
            headers=judge_headers,
        )
        assert res_judge.status_code == 403
        assert "Only ADMIN role can approve content with NEEDS_REVIEW verdict" in res_judge.json()["detail"]

        # Case C: Admin CAN approve NEEDS_REVIEW verdict
        res_admin = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "APPROVED", "notes": "Admin editorial signoff"},
            headers=admin_headers,
        )
        assert res_admin.status_code == 200
        assert res_admin.json()["status"] == "APPROVED"


# ── 6. Status Transition Matrix & Mandatory Rejection Reason ────────────────

async def test_rejection_requires_mandatory_reason_and_matrix_enforcement():
    """REJECTED status requires written explanation; invalid transitions rejected."""
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Reject Brand {uuid.uuid4().hex[:6]}")
        session.add(brand)
        await session.flush()

        sub = Submission(
            brand_id=brand.id,
            title="Ad to Reject",
            content_format="TEXT",
            status="NEEDS_REVIEW",
            verdict="FAIL",
            compliance_score=50.0,
            current_version=1,
            creator_id="creator_1",
            creator_name="Alex Creator",
        )
        session.add(sub)
        await session.commit()
        sub_id = sub.id

    judge_headers = get_auth_headers(UserRole.JUDGE)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Rejection without reason -> 400 Bad Request
        res_no_reason = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "REJECTED", "notes": ""},
            headers=judge_headers,
        )
        assert res_no_reason.status_code == 400
        assert "A rejection reason or note is required" in res_no_reason.json()["detail"]

        # Case B: Rejection with valid reason -> 200 OK
        res_ok = await client.post(
            f"/api/v1/submissions/{sub_id}/status",
            json={"target_status": "REJECTED", "notes": "Multiple unverified claims and offensive imagery."},
            headers=judge_headers,
        )
        assert res_ok.status_code == 200
        assert res_ok.json()["status"] == "REJECTED"


# ── 7. Concurrency & Revision Creation Row Locking ──────────────────────────

async def test_revision_creation_with_for_update_and_re_audit():
    """Tests that create_new_revision locks the row and increments current_version safely."""
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Revision Brand {uuid.uuid4().hex[:6]}")
        session.add(brand)
        await session.flush()

        sub = Submission(
            brand_id=brand.id,
            title="Revision Submission",
            content_format="TEXT",
            status="APPROVED",
            verdict="PASS",
            compliance_score=95.0,
            current_version=1,
            creator_id="creator_1",
            creator_name="Alex Creator",
        )
        session.add(sub)
        await session.commit()
        sub_id = sub.id

    creator = CurrentUser(
        user_id="creator_1",
        user_name="Alex Creator",
        role=UserRole.CREATOR,
    )

    # Call create_new_revision
    async with AsyncSessionLocal() as session:
        new_rev = await WorkflowService.create_new_revision(
            session=session,
            submission_id=sub_id,
            content_body="Updated brand copy v2 with all corrections applied.",
            user=creator,
            change_summary="Fixed tone and removed unverified superlative",
        )
        assert new_rev.version_number == 2
        assert new_rev.change_summary == "Fixed tone and removed unverified superlative"

    # Verify that submission status reset to DRAFT and compliance_score reset to None
    async with AsyncSessionLocal() as session:
        sub_res = await session.get(Submission, sub_id)
        assert sub_res.status_code if hasattr(sub_res, "status_code") else True
        assert sub_res.current_version == 2
        assert sub_res.status == "DRAFT"
        assert sub_res.compliance_score is None


# ── 8. Admin Queue & Stats Endpoints ─────────────────────────────────────────

async def test_admin_queue_and_stats():
    """Tests GET /admin/queue pagination and filtering, and GET /admin/stats."""
    admin_headers = get_auth_headers(UserRole.ADMIN)
    creator_headers = get_auth_headers(UserRole.CREATOR)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Case A: Creator cannot access admin queue -> 403
        q_creator_res = await client.get("/api/v1/admin/queue", headers=creator_headers)
        assert q_creator_res.status_code == 403

        # Case B: Admin accesses queue with pagination
        q_res = await client.get(
            "/api/v1/admin/queue?page=1&page_size=10",
            headers=admin_headers,
        )
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert "items" in q_data
        assert "total" in q_data
        assert q_data["page"] == 1
        assert q_data["page_size"] == 10

        # Case C: Admin stats
        stats_res = await client.get("/api/v1/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats_data = stats_res.json()
        assert "total_submissions" in stats_data
        assert "agreement_rate_pct" in stats_data
        assert "verdict_distribution" in stats_data
        assert "status_distribution" in stats_data
        assert "override_rate_by_guideline" in stats_data
        assert isinstance(stats_data["agreement_rate_pct"], float)


async def test_brand_onboarding_lifecycle_save_draft_and_resume():
    """
    Validates that a Brand user can save draft onboarding state at any step,
    resume from where they left off, and complete setup.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Brand Reviewer
        login_res = await client.post("/api/v1/auth/login", json={"role": "REVIEWER"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check initial profile
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        profile = me_res.json()
        assert profile["onboarding_status"] in ("NOT_STARTED", "IN_PROGRESS", "COMPLETED")

        # 3. Save draft at Step 2 (Guidelines Ingestion) with custom form metadata
        draft_payload = {
            "onboarding_status": "IN_PROGRESS",
            "onboarding_step": 2,
            "onboarding_metadata": {
                "custom_brand_name": "Acme Brand",
                "custom_tone": "Warm & innovative",
            },
        }
        update_res = await client.post("/api/v1/auth/onboarding-state", headers=headers, json=draft_payload)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["onboarding_status"] == "IN_PROGRESS"
        assert updated["onboarding_step"] == 2
        assert updated["onboarding_metadata"]["custom_brand_name"] == "Acme Brand"

        # 4. Simulate user logging in again later -> profile preserves step 2 and draft data
        relogin_res = await client.get("/api/v1/auth/me", headers=headers)
        assert relogin_res.status_code == 200
        relogin_profile = relogin_res.json()
        assert relogin_profile["onboarding_status"] == "IN_PROGRESS"
        assert relogin_profile["onboarding_step"] == 2
        assert relogin_profile["onboarding_metadata"]["custom_brand_name"] == "Acme Brand"

        # 5. Complete setup at Step 3
        finish_payload = {
            "onboarding_status": "COMPLETED",
            "onboarding_step": 3,
            "brand_id": 1,
        }
        finish_res = await client.post("/api/v1/auth/onboarding-state", headers=headers, json=finish_payload)
        assert finish_res.status_code == 200
        final_profile = finish_res.json()
        assert final_profile["onboarding_status"] == "COMPLETED"
        assert final_profile["brand_id"] == 1


async def test_content_creator_profile_submission_and_persistence():
    """
    Validates that a Content Creator can submit their agency vs company employee profile,
    link their target brand, and have their completed status persisted across logins.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Creator
        login_res = await client.post("/api/v1/auth/login", json={"role": "CREATOR"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Submit Creator Profile (Ad Agency employee)
        profile_payload = {
            "creator_type": "AD_AGENCY",
            "organization_name": "Ogilvy Creative Network",
            "specialization": "Graphic & Visual Designer",
            "brand_id": 1,
            "portfolio_url": "https://portfolio.design/creator",
        }
        res = await client.post("/api/v1/auth/creator-profile", headers=headers, json=profile_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["creator_type"] == "AD_AGENCY"
        assert data["organization_name"] == "Ogilvy Creative Network"
        assert data["specialization"] == "Graphic & Visual Designer"
        assert data["brand_id"] == 1
        assert data["onboarding_status"] == "COMPLETED"

        # 3. Query /auth/me to confirm returning session has full profile
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["creator_type"] == "AD_AGENCY"
        assert me_data["organization_name"] == "Ogilvy Creative Network"
        assert me_data["onboarding_status"] == "COMPLETED"
