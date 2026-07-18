from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.api.deps import require_attorney
from app.config import Settings, get_settings
from app.db import get_db
from app.models.enums import LeadStatus
from app.models.lead import Lead
from app.models.user import User
from app.schemas.leads import (
    LeadCreateResponse,
    LeadDetailOut,
    LeadListResponse,
    LeadOut,
    LeadStatusUpdate,
    ResumeLinkOut,
)
from app.services import storage
from app.services.leads import LeadValidationError, create_lead, list_leads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["leads"])
_email_adapter = TypeAdapter(EmailStr)

RESUME_URL_TTL_SECONDS = 3600


def _resume_url(lead: Lead) -> str:
    return storage.presign_get(
        lead.resume_storage_key,
        expires_in=RESUME_URL_TTL_SECONDS,
        filename=lead.resume_original_filename,
        content_type=lead.resume_content_type or None,
    )


def _lead_detail(lead: Lead) -> LeadDetailOut:
    base = LeadOut.model_validate(lead)
    return LeadDetailOut(**base.model_dump(), resume_url=_resume_url(lead))


@router.post("", response_model=LeadCreateResponse, status_code=status.HTTP_201_CREATED)
def submit_lead(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> LeadCreateResponse:
    try:
        email = _email_adapter.validate_python(email)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        ) from exc

    try:
        lead = create_lead(
            db,
            first_name=first_name,
            last_name=last_name,
            email=email,
            resume=resume,
            settings=settings,
        )
    except LeadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        ) from exc
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Resume upload failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to store resume",
        ) from exc

    return LeadCreateResponse(id=lead.id, status=lead.status)


@router.get("", response_model=LeadListResponse)
def get_leads(
    db: Session = Depends(get_db),
    _user: User = Depends(require_attorney),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: LeadStatus | None = Query(None, alias="status"),
) -> LeadListResponse:
    leads, total = list_leads(
        db,
        page=page,
        page_size=page_size,
        status=status_filter,
    )
    return LeadListResponse(
        items=[LeadOut.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{lead_id}", response_model=LeadDetailOut)
def get_lead(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_attorney),
) -> LeadDetailOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    try:
        return _lead_detail(lead)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Resume URL failed for lead=%s", lead_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create resume link",
        ) from exc


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead_status(
    lead_id: uuid.UUID,
    body: LeadStatusUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_attorney),
) -> LeadOut:
    if body.status != LeadStatus.REACHED_OUT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only status REACHED_OUT is supported",
        )

    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if lead.status != LeadStatus.REACHED_OUT:
        lead.status = LeadStatus.REACHED_OUT
        lead.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(lead)

    return LeadOut.model_validate(lead)


@router.get("/{lead_id}/resume", response_model=ResumeLinkOut)
def get_resume_link(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_attorney),
) -> ResumeLinkOut:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    try:
        url = _resume_url(lead)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Resume URL failed for lead=%s", lead_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create resume link",
        ) from exc

    return ResumeLinkOut(
        url=url,
        filename=lead.resume_original_filename,
        content_type=lead.resume_content_type,
        expires_in=RESUME_URL_TTL_SECONDS,
    )
