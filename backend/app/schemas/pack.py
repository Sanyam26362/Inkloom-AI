from typing import List, Optional
from pydantic import BaseModel, Field


class PackDocumentInfo(BaseModel):
    filename: str
    document_type: str
    title: str


class PackSummary(BaseModel):
    name: str
    display_name: str
    description: str
    client: str
    documents: List[PackDocumentInfo]
    campaign_name: Optional[str] = None


class PackLoadRequest(BaseModel):
    brand_id: Optional[int] = None


class PackLoadResponse(BaseModel):
    pack_name: str
    brand_id: int
    campaign_id: Optional[int] = None
    ruleset_id: Optional[int] = None
    indexed_chunks_count: int
    documents_indexed: int = 0
    chunks_created: int = 0
    message: str
