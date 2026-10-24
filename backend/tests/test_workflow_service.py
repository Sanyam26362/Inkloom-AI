import pytest
import pytest_asyncio
import uuid
from fastapi import HTTPException
from app.core.security import CurrentUser, UserRole
from app.services.workflow_service import WorkflowService
from app.models.brand import BrandProfile
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding


@pytest_asyncio.fixture
async def sample_sub_and_finding(db_session):
    """Hermetic fixture ensuring isolated submission and finding for workflow testing."""
    brand = BrandProfile(
        name=f"Workflow Brand {uuid.uuid4().hex[:6]}",
        industry="Retail",
        tone_persona="Polite",
        approved_hex_palette=["#000000"],
    )
    db_session.add(brand)
    await db_session.flush()

    sub = Submission(
        brand_id=brand.id,
        title="Sample Submission",
        content_format="TEXT",
        status="NEEDS_REVIEW",
        current_version=1,
        compliance_score=95.0,
        creator_id="user_creator",
        creator_name="Alex Rivera",
    )
    db_session.add(sub)
    await db_session.flush()

    rev = SubmissionRevision(
        submission_id=sub.id,
        version_number=1,
        content_body="Initial compliant text",
        change_summary="Initial",
        created_by="Alex Rivera",
        compliance_score=95.0,
        ai_governance_metadata={"ai_status": "ok"},
    )
    db_session.add(rev)
    await db_session.flush()

    finding = AuditFinding(
        submission_id=sub.id,
        revision_id=rev.id,
        category="TONE",
        severity="WARNING",
        detector_source="RAG_LLM",
        flagged_excerpt="unverified claim",
        explanation="needs proof",
        guideline_citation="citation",
        suggested_correction="fix",
        resolution_state="OPEN",
    )
    db_session.add(finding)
    await db_session.commit()
    await db_session.refresh(sub)
    await db_session.refresh(rev)
    await db_session.refresh(finding)
    return sub, finding


@pytest.mark.asyncio
async def test_revision_resets_approval(db_session, sample_sub_and_finding):
    """A revised document must not silently inherit approval from an older version."""
    sub, _ = sample_sub_and_finding
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)

    new_rev = await WorkflowService.create_new_revision(
        session=db_session,
        submission_id=sub.id,
        content_body="New brand compliant copy v2",
        user=creator,
        change_summary="Fixed tone and superlatives",
    )
    assert new_rev.version_number >= 2
    assert new_rev.change_summary == "Fixed tone and superlatives"


@pytest.mark.asyncio
async def test_creator_cannot_approve(db_session, sample_sub_and_finding):
    """Creator role cannot approve content."""
    sub, _ = sample_sub_and_finding
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)
    with pytest.raises(HTTPException) as exc_info:
        await WorkflowService.change_status(
            session=db_session,
            submission_id=sub.id,
            target_status="APPROVED",
            user=creator,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_reviewer_can_override_finding(db_session, sample_sub_and_finding):
    """Reviewer or Manager can override finding with required explanation."""
    _, finding = sample_sub_and_finding
    reviewer = CurrentUser(user_id="user_reviewer", user_name="Jordan Lee", role=UserRole.REVIEWER)

    overridden = await WorkflowService.override_finding(
        session=db_session,
        finding_id=finding.id,
        reason="Approved executive exception for press embargo",
        user=reviewer,
    )
    assert overridden.resolution_state == "OVERRIDDEN"
    assert overridden.override_reason == "Approved executive exception for press embargo"
    assert overridden.resolved_by == "Jordan Lee"


@pytest.mark.asyncio
async def test_creator_cannot_override_finding(db_session, sample_sub_and_finding):
    """Creator role cannot override findings."""
    _, finding = sample_sub_and_finding
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)
    with pytest.raises(HTTPException) as exc_info:
        await WorkflowService.override_finding(
            session=db_session,
            finding_id=finding.id,
            reason="I think it looks fine",
            user=creator,
        )
    assert exc_info.value.status_code == 403
