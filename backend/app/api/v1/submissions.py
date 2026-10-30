from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import CurrentUser, get_current_user
from app.models.submission import Submission, SubmissionRevision
from app.models.finding import AuditFinding
from app.models.workflow import WorkflowEvent, ReviewComment
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionRevisionCreate,
    SubmissionRevisionResponse,
    AuditExecutionResponse,
    AuditStatusResponse,
)
from app.schemas.finding import (
    AuditFindingResponse,
    AuditFindingOverrideRequest,
    AuditFindingResolveRequest,
)
from app.schemas.workflow import (
    ReviewCommentCreate,
    ReviewCommentResponse,
    WorkflowEventResponse,
    StatusChangeRequest,
)
from app.services.audit_service import AuditService
from app.services.document_service import DocumentService
from app.services.workflow_service import WorkflowService
from app.services.gemini_service import gemini_service
from app.services.cloudinary_service import (
    CloudinaryConfigurationError,
    CloudinaryUploadError,
    cloudinary_service,
)
from app.services.rule_engine import FindingDraft
from app.services.audit_job_manager import audit_job_manager
from app.core.media_validation import (
    validate_image_bytes,
    validate_audio_bytes,
    validate_video_bytes,
)

router = APIRouter(prefix="/submissions", tags=["Content Submissions & Governance Workflow"])



@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    payload: SubmissionCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """Creates a new content draft submission along with its initial version 1 revision."""
    submission = Submission(
        brand_id=payload.brand_id,
        campaign_id=payload.campaign_id,
        platform=payload.platform,
        title=payload.title,
        content_format=payload.content_format,
        status="DRAFT",
        current_version=1,
        creator_id=user.user_id,
        creator_name=user.user_name,
    )
    session.add(submission)
    await session.flush()

    # Create Initial Revision
    revision = SubmissionRevision(
        submission_id=submission.id,
        version_number=1,
        content_body=payload.initial_content,
        media_urls=payload.media_urls,
        alt_text=payload.alt_text,
        change_summary="Initial copy created",
        created_by=user.user_name,
    )
    session.add(revision)

    # Initial Workflow Event
    event = WorkflowEvent(
        submission_id=submission.id,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        event_type="CREATED",
        from_status=None,
        to_status="DRAFT",
        notes="Initial draft submission created.",
    )
    session.add(event)
    await session.commit()

    # Reload with relationships
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission.id)
    )
    res = await session.execute(stmt)
    return res.scalar_one()


@router.get("", response_model=List[SubmissionResponse])
async def list_submissions(
    brand_id: int,
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[Submission]:
    """Lists all submissions for a brand with optional status filtering."""
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.brand_id == brand_id)
        .order_by(Submission.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Submission.status == status_filter.upper())

    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """Retrieves full submission details including revisions and audit findings."""
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return submission


@router.post("/{submission_id}/audit", response_model=AuditExecutionResponse)
async def execute_audit(
    submission_id: int,
    campaign_id: Optional[int] = None,
    event: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Executes brand governance audit on current submission revision:
    Scrubs PII, runs deterministic rules, retrieves RAG guidelines via pgvector,
    calls Gemini structured analysis, computes compliance score, and logs audit events.
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if not submission.revisions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No revision found to audit")

    # Get latest revision
    latest_rev = max(submission.revisions, key=lambda r: r.version_number)

    audit_metadata = {"campaign_event": event} if event else None
    audit_result = await AuditService.run_audit(
        session=session,
        submission=submission,
        revision=latest_rev,
        campaign_id=campaign_id,
        event=event,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_metadata=audit_metadata,
    )
    return audit_result


@router.get("/{submission_id}/audit-status", response_model=AuditStatusResponse)
async def get_audit_status(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Returns the real-time polling state of an active or completed governance audit:
    - Status: queued | running | done | failed
    - Progress: 0.0 to 1.0
    - Current step description
    - Authoritative verdict, compliance score, and findings breakdown when completed
    """
    job = audit_job_manager.get_status(submission_id)
    if job:
        return job

    # Fallback to database for existing submissions
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    latest_rev = max(sub.revisions, key=lambda r: r.version_number) if sub.revisions else None
    gov_meta = (latest_rev.ai_governance_metadata or {}) if latest_rev else {}

    is_auditing = sub.status == "AUDITING"
    st = "running" if is_auditing else ("queued" if sub.status == "DRAFT" else "done")
    prog = 0.5 if is_auditing else (0.0 if sub.status == "DRAFT" else 1.0)
    step = "Audit in progress..." if is_auditing else ("Draft submission" if sub.status == "DRAFT" else "Audit completed")

    return {
        "submission_id": sub.id,
        "revision_id": latest_rev.id if latest_rev else None,
        "version_number": latest_rev.version_number if latest_rev else None,
        "status": st,
        "progress": prog,
        "current_step": step,
        "verdict": sub.verdict,
        "compliance_score": sub.compliance_score,
        "ai_status": gov_meta.get("ai_status", "ok"),
        "ai_error": gov_meta.get("ai_error"),
        "total_findings": len(sub.findings) if sub.findings else 0,
        "findings": sub.findings or [],
        "dimension_results": gov_meta.get("dimension_results", {}),
    }


@router.post("/{submission_id}/upload-post", response_model=AuditExecutionResponse)
async def upload_post_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    caption: str = Form(...),
    hashtags: Optional[str] = Form(None),
    alt_text: Optional[str] = Form(None),
    platform: str = Form("instagram"),
    campaign_id: Optional[int] = Form(None),
    event: Optional[str] = Form(None),
    background: bool = Query(False, description="Run audit in background and return immediately"),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads a post creative (image + caption + hashtags + alt_text) and audits it:
    - Enforces platform specifications (aspect ratios: 1:1, 4:5, 9:16; caption max length 2,200; hashtag limits)
    - Validates image magic bytes (PNG, JPEG, WEBP) and 10MB size limit
    - Uploads image to Cloudinary/local storage with explicit provider tracking
    - Evaluates visual identity, copy governance, accessibility, and campaign fit together
    - If background=True, returns immediately and allows polling via GET /submissions/{id}/audit-status
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    image_bytes = await file.read()
    content_type, _, _ = validate_image_bytes(image_bytes, file.filename or "")

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=image_bytes,
            filename=file.filename or "upload.png",
            mime_type=content_type,
            resource_type="image",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    file_ref = cloudinary_asset.get("secure_url")
    if not file_ref:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Media provider did not return a secure URL.")

    submission.content_format = "POST"
    submission.platform = platform
    submission.status = "AUDITING"
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version

    full_body = f"{caption}\n\n{hashtags}".strip() if hashtags else caption
    current_rev = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=full_body,
        media_urls=[file_ref],
        alt_text=alt_text,
        change_summary=f"Uploaded {platform} post creative for brand audit",
        created_by=user.user_name,
        ai_governance_metadata={"storage": cloudinary_asset, "campaign_event": event},
    )
    session.add(current_rev)
    await session.commit()
    await session.refresh(current_rev)

    if background:
        audit_job_manager.start_job(
            submission_id=submission.id,
            revision_id=current_rev.id,
            version_number=new_version,
            step_desc="Queued for post audit",
        )

        async def _bg_worker():
            async with AsyncSessionLocal() as bg_sess:
                sub_res = await bg_sess.execute(
                    select(Submission).options(selectinload(Submission.revisions)).where(Submission.id == submission_id)
                )
                sub_obj = sub_res.scalar_one()
                rev_obj = max(sub_obj.revisions, key=lambda r: r.version_number)
                return await AuditService.run_post_audit(
                    session=bg_sess,
                    submission=sub_obj,
                    revision=rev_obj,
                    image_bytes=image_bytes,
                    mime_type=content_type,
                    caption=caption,
                    hashtags=hashtags,
                    alt_text=alt_text,
                    platform=platform,
                    actor_id=user.user_id,
                    actor_name=user.user_name,
                    actor_role=user.role.value,
                    additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
                    campaign_event=event,
                    campaign_id=campaign_id,
                )

        audit_job_manager.spawn_background_audit(submission.id, _bg_worker)

        return {
            "submission_id": submission.id,
            "revision_id": current_rev.id,
            "version_number": new_version,
            "status": "queued",
            "progress": 0.05,
            "current_step": "Queued for post audit",
            "compliance_score": 0.0,
            "verdict": "NEEDS_REVIEW",
            "total_findings": 0,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0},
            "findings": [],
            "ai_status": "ok",
        }

    # Synchronous execution
    audit_result = await AuditService.run_post_audit(
        session=session,
        submission=submission,
        revision=current_rev,
        image_bytes=image_bytes,
        mime_type=content_type,
        caption=caption,
        hashtags=hashtags,
        alt_text=alt_text,
        platform=platform,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
        campaign_event=event,
        campaign_id=campaign_id,
    )
    audit_job_manager.set_done(submission.id, audit_result)
    return audit_result


@router.post("/{submission_id}/upload-image", response_model=AuditExecutionResponse)
async def upload_image_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    campaign_id: Optional[int] = None,
    event: Optional[str] = None,
    background: bool = Query(False, description="Run audit in background and return immediately"),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an image (PNG, JPG, WEBP, max 10MB) to the configured media provider:
    - Uses Cloudinary when configured, otherwise local storage with provider and fallback_reason logged
    - Validates image magic byte signatures (PNG, JPEG, WEBP)
    - Audits visual palette compliance, text contrast (WCAG AA 4.5:1), visible copy against banned terms
    - Supports background execution with live status polling via GET /submissions/{id}/audit-status
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    image_bytes = await file.read()
    content_type, _, _ = validate_image_bytes(image_bytes, file.filename or "")

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=image_bytes,
            filename=file.filename or "upload.png",
            mime_type=content_type,
            resource_type="image",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    file_ref = cloudinary_asset.get("secure_url")
    if not file_ref:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Media provider did not return a secure media URL.")

    submission.content_format = "IMAGE"
    submission.status = "AUDITING"
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version
    prev_rev = max(submission.revisions, key=lambda r: r.version_number) if submission.revisions else None
    inherited_alt_text = prev_rev.alt_text if prev_rev else None
    current_rev = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body=(submission.revisions[0].content_body if submission.revisions and submission.revisions[0].content_body and submission.revisions[0].content_body != "Visual Image Asset" else "Visual Image Asset"),
        media_urls=[file_ref],
        alt_text=inherited_alt_text,
        change_summary="Uploaded image for visual audit",
        created_by=user.user_name,
        ai_governance_metadata={"storage": cloudinary_asset, "campaign_event": event},
    )
    session.add(current_rev)
    await session.commit()
    await session.refresh(current_rev)

    if background:
        audit_job_manager.start_job(
            submission_id=submission.id,
            revision_id=current_rev.id,
            version_number=new_version,
            step_desc="Queued for image audit",
        )

        async def _bg_worker():
            async with AsyncSessionLocal() as bg_sess:
                sub_res = await bg_sess.execute(
                    select(Submission).options(selectinload(Submission.revisions)).where(Submission.id == submission_id)
                )
                sub_obj = sub_res.scalar_one()
                rev_obj = max(sub_obj.revisions, key=lambda r: r.version_number)
                return await AuditService.run_image_audit(
                    session=bg_sess,
                    submission=sub_obj,
                    revision=rev_obj,
                    image_bytes=image_bytes,
                    mime_type=content_type,
                    actor_id=user.user_id,
                    actor_name=user.user_name,
                    actor_role=user.role.value,
                    additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
                    campaign_event=event,
                    campaign_id=campaign_id,
                )

        audit_job_manager.spawn_background_audit(submission.id, _bg_worker)

        return {
            "submission_id": submission.id,
            "revision_id": current_rev.id,
            "version_number": new_version,
            "status": "queued",
            "progress": 0.05,
            "current_step": "Queued for image audit",
            "compliance_score": 0.0,
            "verdict": "NEEDS_REVIEW",
            "total_findings": 0,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0},
            "findings": [],
            "ai_status": "ok",
        }

    # Synchronous
    try:
        audit_result = await AuditService.run_image_audit(
            session=session,
            submission=submission,
            revision=current_rev,
            image_bytes=image_bytes,
            mime_type=content_type,
            actor_id=user.user_id,
            actor_name=user.user_name,
            actor_role=user.role.value,
            additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
            campaign_event=event,
            campaign_id=campaign_id,
        )
        audit_job_manager.set_done(submission.id, audit_result)
        return audit_result
    except ValueError as val_err:
        submission.status = "NEEDS_REVIEW"
        await session.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err)) from val_err


@router.post("/{submission_id}/upload-audio", response_model=AuditExecutionResponse)
async def upload_audio_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    campaign_id: Optional[int] = None,
    event: Optional[str] = None,
    background: bool = Query(False, description="Run audit in background and return immediately"),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads an audio file (MP3, WAV, M4A, max 25MB) to the configured media provider:
    - Stores the media with explicit provider and fallback_reason tracking
    - Validates audio magic byte signatures (MP3, WAV, OGG, FLAC, M4A)
    - Performs native Gemini audio governance analysis (voiceover tone, prohibited SFX, mandatory phrases, music balance)
    - Generates timestamped findings and full speech transcript
    - Supports background execution and live status polling
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    audio_bytes = await file.read()
    content_type = validate_audio_bytes(audio_bytes, file.filename or "")

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=audio_bytes,
            filename=file.filename or "upload.mp3",
            mime_type=content_type,
            resource_type="video",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    audio_url = cloudinary_asset.get("secure_url")
    if not audio_url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Media provider did not return a secure audio URL.")

    submission.content_format = "AUDIO"
    submission.status = "AUDITING"
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version

    current_rev = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body="Audio voiceover draft",
        media_urls=[audio_url],
        change_summary="Uploaded audio for native brand audit",
        created_by=user.user_name,
        ai_governance_metadata={"storage": cloudinary_asset, "campaign_event": event},
    )
    session.add(current_rev)
    await session.commit()
    await session.refresh(current_rev)

    if background:
        audit_job_manager.start_job(
            submission_id=submission.id,
            revision_id=current_rev.id,
            version_number=new_version,
            step_desc="Queued for audio audit",
        )

        async def _bg_worker():
            async with AsyncSessionLocal() as bg_sess:
                sub_res = await bg_sess.execute(
                    select(Submission).options(selectinload(Submission.revisions)).where(Submission.id == submission_id)
                )
                sub_obj = sub_res.scalar_one()
                rev_obj = max(sub_obj.revisions, key=lambda r: r.version_number)
                return await AuditService.run_audio_audit(
                    session=bg_sess,
                    submission=sub_obj,
                    revision=rev_obj,
                    audio_bytes=audio_bytes,
                    mime_type=content_type,
                    actor_id=user.user_id,
                    actor_name=user.user_name,
                    actor_role=user.role.value,
                    additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
                    campaign_event=event,
                    campaign_id=campaign_id,
                )

        audit_job_manager.spawn_background_audit(submission.id, _bg_worker)

        return {
            "submission_id": submission.id,
            "revision_id": current_rev.id,
            "version_number": new_version,
            "status": "queued",
            "progress": 0.05,
            "current_step": "Queued for audio audit",
            "compliance_score": 0.0,
            "verdict": "NEEDS_REVIEW",
            "total_findings": 0,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0},
            "findings": [],
            "ai_status": "ok",
        }

    # Synchronous
    audit_result = await AuditService.run_audio_audit(
        session=session,
        submission=submission,
        revision=current_rev,
        audio_bytes=audio_bytes,
        mime_type=content_type,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
        campaign_event=event,
        campaign_id=campaign_id,
    )
    audit_job_manager.set_done(submission.id, audit_result)
    return audit_result


@router.post("/{submission_id}/upload-video", response_model=AuditExecutionResponse)
async def upload_video_and_audit(
    submission_id: int,
    file: UploadFile = File(...),
    campaign_id: Optional[int] = None,
    event: Optional[str] = None,
    background: bool = Query(False, description="Run audit in background and return immediately"),
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Uploads a video (MP4, MOV, WEBM, max 100MB) to the configured media provider:
    - Validates video magic byte signatures (MP4, MOV, WEBM, MKV, AVI)
    - Stores media with provider and fallback_reason tracking
    - Extracts up to ~8 frames per verified order: Cloudinary transformations first -> ffmpeg if available -> empty
    - Audits visual frames in parallel with concurrency limit (4)
    - Verifies end-card brand palette compliance on final frame
    - Transcribes audio track via Gemini and checks dialogue for banned terms and burnt-in captions
    - Supports background execution and live status polling
    """
    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    video_bytes = await file.read()
    content_type = validate_video_bytes(video_bytes, file.filename or "")

    try:
        cloudinary_asset = await cloudinary_service.upload(
            data=video_bytes,
            filename=file.filename or "upload.mp4",
            mime_type=content_type,
            resource_type="video",
            submission_id=submission_id,
        )
    except CloudinaryConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except CloudinaryUploadError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    video_url = cloudinary_asset.get("secure_url")
    public_id = cloudinary_asset.get("public_id")
    duration = cloudinary_asset.get("duration")

    if not video_url:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Media provider did not return a playable video URL.")

    submission.content_format = "VIDEO"
    submission.status = "AUDITING"
    new_version = (submission.current_version or 0) + 1
    submission.current_version = new_version

    current_rev = SubmissionRevision(
        submission_id=submission.id,
        version_number=new_version,
        content_body="Video content uploaded",
        media_urls=[video_url],
        change_summary="Uploaded video for multi-modal audit",
        created_by=user.user_name,
        ai_governance_metadata={"storage": cloudinary_asset, "campaign_event": event},
    )
    session.add(current_rev)
    await session.commit()
    await session.refresh(current_rev)

    if background:
        audit_job_manager.start_job(
            submission_id=submission.id,
            revision_id=current_rev.id,
            version_number=new_version,
            step_desc="Queued for video audit",
        )

        async def _bg_worker():
            async with AsyncSessionLocal() as bg_sess:
                sub_res = await bg_sess.execute(
                    select(Submission).options(selectinload(Submission.revisions)).where(Submission.id == submission_id)
                )
                sub_obj = sub_res.scalar_one()
                rev_obj = max(sub_obj.revisions, key=lambda r: r.version_number)
                return await AuditService.run_video_audit(
                    session=bg_sess,
                    submission=sub_obj,
                    revision=rev_obj,
                    video_bytes=video_bytes,
                    mime_type=content_type,
                    public_id=public_id,
                    duration_seconds=duration,
                    actor_id=user.user_id,
                    actor_name=user.user_name,
                    actor_role=user.role.value,
                    additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
                    campaign_event=event,
                    campaign_id=campaign_id,
                )

        audit_job_manager.spawn_background_audit(submission.id, _bg_worker)

        return {
            "submission_id": submission.id,
            "revision_id": current_rev.id,
            "version_number": new_version,
            "status": "queued",
            "progress": 0.05,
            "current_step": "Queued for video audit",
            "compliance_score": 0.0,
            "verdict": "NEEDS_REVIEW",
            "total_findings": 0,
            "findings_by_severity": {"CRITICAL": 0, "WARNING": 0, "SUGGESTION": 0},
            "findings": [],
            "ai_status": "ok",
        }

    # Synchronous
    audit_result = await AuditService.run_video_audit(
        session=session,
        submission=submission,
        revision=current_rev,
        video_bytes=video_bytes,
        mime_type=content_type,
        public_id=public_id,
        duration_seconds=duration,
        actor_id=user.user_id,
        actor_name=user.user_name,
        actor_role=user.role.value,
        additional_metadata={"storage": cloudinary_asset, "campaign_event": event},
        campaign_event=event,
        campaign_id=campaign_id,
    )
    audit_job_manager.set_done(submission.id, audit_result)
    return audit_result



@router.post("/{submission_id}/revisions", response_model=SubmissionRevisionResponse, status_code=status.HTTP_201_CREATED)
async def create_revision(
    submission_id: int,
    payload: SubmissionRevisionCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SubmissionRevision:
    """
    Creates a new revision with modified copy.
    Resets status to DRAFT to prevent silent inheritance of approvals.
    """
    return await WorkflowService.create_new_revision(
        session=session,
        submission_id=submission_id,
        content_body=payload.content_body,
        change_summary=payload.change_summary,
        media_urls=payload.media_urls,
        alt_text=payload.alt_text,
        user=user,
    )


@router.post("/{submission_id}/status", response_model=SubmissionResponse)
async def update_status(
    submission_id: int,
    payload: StatusChangeRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Submission:
    """
    Updates submission status (NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED).
    Requires REVIEWER or MANAGER role for approval.
    """
    await WorkflowService.change_status(
        session=session,
        submission_id=submission_id,
        target_status=payload.target_status,
        notes=payload.notes,
        user=user,
    )

    stmt = (
        select(Submission)
        .options(selectinload(Submission.revisions), selectinload(Submission.findings))
        .where(Submission.id == submission_id)
    )
    res = await session.execute(stmt)
    return res.scalar_one()


@router.post("/{submission_id}/comments", response_model=ReviewCommentResponse, status_code=status.HTTP_201_CREATED)
async def post_comment(
    submission_id: int,
    payload: ReviewCommentCreate,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> ReviewComment:
    """Posts a human review comment attached to a submission or specific finding."""
    return await WorkflowService.add_comment(
        session=session,
        submission_id=submission_id,
        comment_text=payload.comment_text,
        finding_id=payload.finding_id,
        user=user,
    )


@router.get("/{submission_id}/comments", response_model=List[ReviewCommentResponse])
async def list_comments(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[ReviewComment]:
    """Lists all review comments on a submission."""
    stmt = (
        select(ReviewComment)
        .where(ReviewComment.submission_id == submission_id)
        .order_by(ReviewComment.created_at.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.get("/{submission_id}/workflow", response_model=List[WorkflowEventResponse])
async def list_workflow_history(
    submission_id: int,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> List[WorkflowEvent]:
    """Retrieves full immutable audit trail of workflow events for compliance tracking."""
    stmt = (
        select(WorkflowEvent)
        .where(WorkflowEvent.submission_id == submission_id)
        .order_by(WorkflowEvent.created_at.desc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("/findings/{finding_id}/override", response_model=AuditFindingResponse)
async def override_finding(
    finding_id: int,
    payload: AuditFindingOverrideRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AuditFinding:
    """
    Allows REVIEWER or MANAGER to override an audit finding with written justification.
    Updates governance statistics for ambiguous guideline detection.
    """
    return await WorkflowService.override_finding(
        session=session,
        finding_id=finding_id,
        reason=payload.reason,
        user=user,
    )


@router.post("/findings/{finding_id}/resolve", response_model=AuditFindingResponse)
async def resolve_finding(
    finding_id: int,
    payload: AuditFindingResolveRequest,
    session: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> AuditFinding:
    return await WorkflowService.resolve_finding(
        session=session,
        finding_id=finding_id,
        resolution_state=payload.resolution_state.upper(),
        user=user,
        resolution_notes=payload.notes or payload.override_reason,
    )

