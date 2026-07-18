from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from app.api.deps import require_attorney
from app.config import Settings, get_settings
from app.db import get_db
from app.models.enums import LeadStatus
from app.models.lead import Lead
from app.models.user import User
from app.schemas.leads import LeadCreateResponse, LeadListResponse, LeadOut, LeadStatusUpdate
from app.services import storage
from app.services.leads import LeadValidationError, create_lead, list_leads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["leads"])
_email_adapter = TypeAdapter(EmailStr)


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
    limit: int = Query(20, ge=1, le=100),
    cursor: datetime | None = Query(None),
    status_filter: LeadStatus | None = Query(None, alias="status"),
) -> LeadListResponse:
    leads, next_cursor, has_more = list_leads(
        db,
        limit=limit,
        cursor=cursor,
        status=status_filter,
    )
    return LeadListResponse(
        items=[LeadOut.model_validate(lead) for lead in leads],
        next_cursor=next_cursor,
        has_more=has_more,
    )


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


@router.get("/{lead_id}/resume")
def download_resume(
    lead_id: uuid.UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(require_attorney),
) -> StreamingResponse:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    try:
        body = storage.get_stream(lead.resume_storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found",
        ) from exc
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Resume fetch failed for lead=%s", lead_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch resume",
        ) from exc

    filename = lead.resume_original_filename
    disposition = f"attachment; filename*=UTF-8''{quote(filename)}"
    return StreamingResponse(
        body.iter_chunks(),
        media_type=lead.resume_content_type or "application/octet-stream",
        headers={"Content-Disposition": disposition},
    )
