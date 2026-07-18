from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import PurePosixPath

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.models.email_outbox import EmailOutbox
from app.models.enums import EmailOutboxKind, EmailOutboxStatus, LeadStatus
from app.models.lead import Lead
from app.services import storage
from app.services.outbox import flush_outbox_for_lead

logger = logging.getLogger(__name__)

ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}


class LeadValidationError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def create_lead(
    db: Session,
    *,
    first_name: str,
    last_name: str,
    email: str,
    resume: UploadFile,
    settings: Settings | None = None,
) -> Lead:
    settings = settings or get_settings()

    first_name = first_name.strip()
    last_name = last_name.strip()
    email = email.strip()

    if not first_name:
        raise LeadValidationError("first_name is required")
    if len(first_name) > 100:
        raise LeadValidationError("first_name must be at most 100 characters")
    if not last_name:
        raise LeadValidationError("last_name is required")
    if len(last_name) > 100:
        raise LeadValidationError("last_name must be at most 100 characters")
    if not email:
        raise LeadValidationError("email is required")
    if len(email) > 320:
        raise LeadValidationError("email must be at most 320 characters")

    data = resume.file.read()
    if not data:
        raise LeadValidationError("Resume file is empty")
    if len(data) > settings.resume_max_bytes:
        mb = settings.resume_max_bytes // (1024 * 1024)
        raise LeadValidationError(f"Resume exceeds maximum size of {mb}MB")

    original_filename = PurePosixPath(resume.filename or "resume.pdf").name
    ext = PurePosixPath(original_filename).suffix.lower()
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        raise LeadValidationError("Resume must be a PDF or Word document (.pdf, .docx)")

    lead_id = uuid.uuid4()
    content_type = (resume.content_type or "application/octet-stream").strip()
    key = f"leads/{lead_id}/resume{ext}"

    storage.upload(key=key, body=data, content_type=content_type)

    now = datetime.now(timezone.utc)
    lead = Lead(
        id=lead_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        status=LeadStatus.PENDING,
        resume_storage_key=key,
        resume_original_filename=original_filename,
        resume_content_type=content_type,
        resume_size_bytes=len(data),
        created_at=now,
        updated_at=now,
    )

    common_data = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "lead_id": str(lead_id),
    }

    outbox_rows = [
        EmailOutbox(
            id=uuid.uuid4(),
            lead_id=lead_id,
            kind=EmailOutboxKind.PROSPECT_CONFIRMATION,
            to_email=email,
            template_id=settings.resend_template_prospect_confirmation,
            template_data=common_data,
            status=EmailOutboxStatus.PENDING,
            attempts=0,
            created_at=now,
            updated_at=now,
        ),
        EmailOutbox(
            id=uuid.uuid4(),
            lead_id=lead_id,
            kind=EmailOutboxKind.ATTORNEY_NEW_LEAD,
            to_email=(settings.attorney_notify_email or "").strip() or email,
            template_id=settings.resend_template_attorney_new_lead,
            template_data={
                **common_data,
                "resume_original_filename": original_filename,
            },
            status=EmailOutboxStatus.PENDING,
            attempts=0,
            created_at=now,
            updated_at=now,
        ),
    ]

    try:
        db.add(lead)
        db.add_all(outbox_rows)
        db.commit()
        db.refresh(lead)
    except Exception:
        db.rollback()
        logger.exception("DB transaction failed after upload; orphan key=%s may remain", key)
        raise

    flush_outbox_for_lead(db, lead.id)
    return lead
