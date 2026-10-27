import pytest
import uuid
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import CurrentUser, UserRole
from app.models.brand import BrandProfile
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.services.workflow_service import WorkflowService, _trigger_background_revision_audit
from app.services.audit_service import AuditService


@pytest.mark.asyncio
async def test_creator_gets_403_resolving_with_accepted():
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Workflow Test Brand 1 {uuid.uuid4().hex[:8]}")
        session.add(brand)
        await session.flush()

        sub = Submission(brand_id=brand.id, title="Test Sub", content_format="TEXT", creator_id="c1")
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(submission_id=sub.id, version_number=1, content_body="Body", created_by="Creator")
        session.add(rev)
        await session.flush()

        finding = AuditFinding(
            submission_id=sub.id,
            revision_id=rev.id,
            category="TERMINOLOGY",
            severity="WARNING",
            flagged_excerpt="test",
            explanation="exp",
            suggested_correction="fix",
            resolution_state="OPEN",
        )
        session.add(finding)
        await session.commit()
        await session.refresh(finding)
        finding_id = finding.id

        creator = CurrentUser(user_id="c1", user_name="Creator User", role=UserRole.CREATOR)
        reviewer = CurrentUser(user_id="r1", user_name="Reviewer User", role=UserRole.REVIEWER)

        # Creator resolving with ACCEPTED -> 403
        with pytest.raises(HTTPException) as exc_info:
            await WorkflowService.resolve_finding(session, finding_id=finding_id, resolution_state="ACCEPTED", user=creator)
        assert exc_info.value.status_code == 403

        # Reviewer resolving with ACCEPTED -> 200 / success
        resolved = await WorkflowService.resolve_finding(session, finding_id=finding_id, resolution_state="ACCEPTED", user=reviewer)
        assert resolved.resolution_state == "ACCEPTED"


@pytest.mark.asyncio
async def test_background_revision_audit_executes_and_records_failure():
    async with AsyncSessionLocal() as session:
        brand = BrandProfile(name=f"Workflow Test Brand 2 {uuid.uuid4().hex[:8]}")
        session.add(brand)
        await session.flush()

        sub = Submission(brand_id=brand.id, title="Test Sub 2", content_format="TEXT", creator_id="c1", status="DRAFT")
        session.add(sub)
        await session.flush()

        rev = SubmissionRevision(submission_id=sub.id, version_number=1, content_body="Valid body copy", created_by="Creator")
        session.add(rev)
        await session.commit()
        sub_id = sub.id
        rev_id = rev.id

    # Test 1: Successful audit call
    with patch.object(AuditService, "run_audit", new_callable=AsyncMock) as mock_run_audit:
        mock_run_audit.return_value = {"status": "ok"}
        await _trigger_background_revision_audit(sub_id, rev_id)
        assert mock_run_audit.called
        call_kwargs = mock_run_audit.call_args[1]
        assert "session" in call_kwargs
        assert "submission" in call_kwargs
        assert "revision" in call_kwargs
        assert call_kwargs["submission"].id == sub_id
        assert call_kwargs["revision"].id == rev_id

    # Test 2: When run_audit raises exception, records ai_status="failed" and preserves DRAFT
    with patch.object(AuditService, "run_audit", side_effect=RuntimeError("AI audit simulation crash")):
        await _trigger_background_revision_audit(sub_id, rev_id)

    async with AsyncSessionLocal() as session:
        sub_check = (await session.execute(select(Submission).where(Submission.id == sub_id))).scalar_one()
        rev_check = (await session.execute(select(SubmissionRevision).where(SubmissionRevision.id == rev_id))).scalar_one()
        assert sub_check.status == "DRAFT"
        assert rev_check.ai_governance_metadata.get("ai_status") == "failed"
        assert "AI audit simulation crash" in rev_check.ai_governance_metadata.get("ai_error", "")

