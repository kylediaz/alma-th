from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import LeadStatus


class LeadOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    status: LeadStatus
    resume_original_filename: str
    resume_content_type: str
    resume_size_bytes: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadCreateResponse(BaseModel):
    id: UUID
    status: LeadStatus


class LeadStatusUpdate(BaseModel):
    status: LeadStatus = Field(description="Only REACHED_OUT is accepted")


class LeadListResponse(BaseModel):
    items: list[LeadOut]
    total: int
    page: int
    page_size: int


class LeadDetailOut(LeadOut):
    resume_url: str


class ResumeLinkOut(BaseModel):
    url: str
    filename: str
    content_type: str
    expires_in: int
