from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GuidelineChunkBase(BaseModel):
    source_document: str = Field(..., max_length=255, description="Document title or file name")
    page_number: int = Field(1, ge=1, description="Page number of the source chunk")
    section_reference: str = Field("General Guidelines", max_length=255)
    rule_category: str = Field("GENERAL", max_length=50, description="TONE, TERMINOLOGY, FACT, VISUAL, ACCESSIBILITY, PROHIBITED, EVENT, DECISION")
    content_text: str = Field(..., min_length=5, description="Excerpted rule or guideline content")
    source_kind: str = Field("custom", max_length=50, description="premade | custom")
    document_id: Optional[str] = Field(None, max_length=100)
    content_hash: Optional[str] = Field(None, max_length=64)
    document_type: str = Field("guidelines", max_length=50, description="guidelines | design | event | other")
    embedding_status: str = Field("completed", max_length=50, description="pending | completed | failed")


class GuidelineChunkCreate(GuidelineChunkBase):
    brand_id: int


class GuidelineChunkResponse(GuidelineChunkBase):
    id: int
    brand_id: int
    times_triggered: int
    times_overridden: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuidelineReindexResponse(BaseModel):
    total_chunks: int
    reindexed: int
    failed: int


class GuidelineDeleteResponse(BaseModel):
    deleted_count: int
    message: str



class GuidelineSearchQuery(BaseModel):
    query: str = Field(..., min_length=2)
    brand_id: int
    limit: int = Field(5, ge=1, le=20)
    rule_category: Optional[str] = None


class GuidelineSearchResult(BaseModel):
    chunk: GuidelineChunkResponse
    similarity_score: float
