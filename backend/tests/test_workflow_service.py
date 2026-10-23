import pytest
from fastapi import HTTPException
from app.core.security import CurrentUser, UserRole
from app.services.workflow_service import WorkflowService


@pytest.mark.asyncio
async def test_revision_resets_approval(db_session):
    """A revised document must not silently inherit approval from an older version."""
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)

    # Submission 1 was created in seed
    new_rev = await WorkflowService.create_new_revision(
        session=db_session,
        submission_id=1,
        content_body="New brand compliant copy v2",
        user=creator,
        change_summary="Fixed tone and superlatives",
    )
    assert new_rev.version_number >= 2
    assert new_rev.change_summary == "Fixed tone and superlatives"


@pytest.mark.asyncio
async def test_creator_cannot_approve(db_session):
    """Creator role cannot approve content."""
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)
    with pytest.raises(HTTPException) as exc_info:
        await WorkflowService.change_status(
            session=db_session,
            submission_id=1,
            target_status="APPROVED",
            user=creator,
        )
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_reviewer_can_override_finding(db_session):
    """Reviewer or Manager can override finding with required explanation."""
    reviewer = CurrentUser(user_id="user_reviewer", user_name="Jordan Lee", role=UserRole.REVIEWER)

    # Finding 1 is seeded
    overridden = await WorkflowService.override_finding(
        session=db_session,
        finding_id=1,
        reason="Approved executive exception for press embargo",
        user=reviewer,
    )
    assert overridden.resolution_state == "OVERRIDDEN"
    assert overridden.override_reason == "Approved executive exception for press embargo"
    assert overridden.resolved_by == "Jordan Lee"


@pytest.mark.asyncio
async def test_creator_cannot_override_finding(db_session):
    """Creator role cannot override findings."""
    creator = CurrentUser(user_id="user_creator", user_name="Alex Rivera", role=UserRole.CREATOR)
    with pytest.raises(HTTPException) as exc_info:
        await WorkflowService.override_finding(
            session=db_session,
            finding_id=1,
            reason="I think it looks fine",
            user=creator,
        )
    assert exc_info.value.status_code == 403
