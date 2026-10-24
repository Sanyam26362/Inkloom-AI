from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class WorkflowEventResponse(BaseModel):
    id: int
    submission_id: int
    actor_id: str
    actor_name: str
    actor_role: str
    event_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    notes: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewCommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=2, max_length=2000)
    finding_id: Optional[int] = None


class ReviewCommentResponse(BaseModel):
    id: int
    submission_id: int
    finding_id: Optional[int] = None
    author_id: str
    author_name: str
    author_role: str
    comment_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StatusChangeRequest(BaseModel):
    target_status: str = Field(..., description="DRAFT, NEEDS_REVIEW, CHANGES_REQUESTED, APPROVED, or REJECTED")
    notes: Optional[str] = Field(None, max_length=1000)
