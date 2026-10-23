from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GuidelineChunkBase(BaseModel):
    source_document: str = Field(..., max_length=255, description="Document title or file name")
    page_number: int = Field(1, ge=1, description="Page number of the source chunk")
    section_reference: str = Field("General Guidelines", max_length=255)
    rule_category: str = Field("GENERAL", max_length=50, description="TONE, TERMINOLOGY, FACT, VISUAL, ACCESSIBILITY")
    content_text: str = Field(..., min_length=5, description="Excerpted rule or guideline content")


class GuidelineChunkCreate(GuidelineChunkBase):
    brand_id: int


class GuidelineChunkResponse(GuidelineChunkBase):
    id: int
    brand_id: int
    times_triggered: int
    times_overridden: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GuidelineSearchQuery(BaseModel):
    query: str = Field(..., min_length=2)
    brand_id: int
    limit: int = Field(5, ge=1, le=20)
    rule_category: Optional[str] = None


class GuidelineSearchResult(BaseModel):
    chunk: GuidelineChunkResponse
    similarity_score: float
