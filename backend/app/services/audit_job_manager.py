import asyncio
import logging
import time
from typing import Any, Callable, Coroutine, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AuditJobState(BaseModel):
    submission_id: int
    revision_id: Optional[int] = None
    version_number: Optional[int] = None
    status: str = Field("queued", description="queued | running | done | failed")
    progress: float = Field(0.0, description="0.0 to 1.0 progress")
    current_step: str = Field("Queued for audit", description="Current step description")
    verdict: Optional[str] = None
    compliance_score: Optional[float] = None
    ai_status: str = Field("ok", description="ok | partial | failed | skipped")
    ai_error: Optional[str] = None
    error: Optional[str] = None
    total_findings: int = 0
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    dimension_results: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    updated_at: float = Field(default_factory=time.time)


class AuditJobManager:
    """Manages asynchronous audit job execution and real-time polling state."""

    def __init__(self):
        self._jobs: Dict[int, AuditJobState] = {}
        self._lock = asyncio.Lock()

    def start_job(
        self,
        submission_id: int,
        revision_id: Optional[int] = None,
        version_number: Optional[int] = None,
        step_desc: str = "Queued for audit",
    ) -> AuditJobState:
        state = AuditJobState(
            submission_id=submission_id,
            revision_id=revision_id,
            version_number=version_number,
            status="queued",
            progress=0.05,
            current_step=step_desc,
            updated_at=time.time(),
        )
        self._jobs[submission_id] = state
        return state

    def update_progress(
        self,
        submission_id: int,
        progress: float,
        step_desc: str,
    ) -> None:
        job = self._jobs.get(submission_id)
        if job:
            job.status = "running"
            job.progress = max(0.0, min(1.0, progress))
            job.current_step = step_desc
            job.updated_at = time.time()

    def set_done(self, submission_id: int, result: Dict[str, Any]) -> None:
        job = self._jobs.get(submission_id)
        if not job:
            job = AuditJobState(submission_id=submission_id)
            self._jobs[submission_id] = job

        job.status = "done"
        job.progress = 1.0
        job.current_step = "Audit completed"
        job.verdict = result.get("verdict", "NEEDS_REVIEW")
        job.compliance_score = result.get("compliance_score", 0.0)
        job.ai_status = result.get("ai_status", "ok")
        job.ai_error = result.get("ai_error")
        job.total_findings = result.get("total_findings", len(result.get("findings", [])))
        job.dimension_results = result.get("dimension_results", {})
        job.result = result
        job.updated_at = time.time()

    def set_failed(self, submission_id: int, error_msg: str) -> None:
        job = self._jobs.get(submission_id)
        if not job:
            job = AuditJobState(submission_id=submission_id)
            self._jobs[submission_id] = job

        job.status = "failed"
        job.progress = 1.0
        job.current_step = f"Audit failed: {error_msg}"
        job.error = error_msg
        job.ai_status = "failed"
        job.ai_error = error_msg
        job.verdict = "NEEDS_REVIEW"
        job.compliance_score = 0.0
        job.updated_at = time.time()

    def get_status(self, submission_id: int) -> Optional[Dict[str, Any]]:
        job = self._jobs.get(submission_id)
        if not job:
            return None
        return job.model_dump()

    def spawn_background_audit(
        self,
        submission_id: int,
        coro_fn: Callable[..., Coroutine[Any, Any, Dict[str, Any]]],
        *args: Any,
        **kwargs: Any,
    ) -> asyncio.Task:
        """Schedules the audit coroutine as a detached background task with progress tracking."""
        async def _wrapper():
            try:
                self.update_progress(submission_id, 0.20, "Analyzing media and brand guidelines...")
                res = await coro_fn(*args, **kwargs)
                self.set_done(submission_id, res)
            except Exception as exc:
                logger.error(f"Background audit for submission {submission_id} failed: {exc}", exc_info=True)
                self.set_failed(submission_id, str(exc))

        task = asyncio.create_task(_wrapper())
        return task


audit_job_manager = AuditJobManager()
