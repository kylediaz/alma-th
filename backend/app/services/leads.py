from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import PurePosixPath

from fastapi import UploadFile
from sqlalchemy import func, select
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


def list_leads(
    db: Session,
    *,
    page: int,
    page_size: int,
    status: LeadStatus | None = None,
) -> tuple[list[Lead], int]:
    count_stmt = select(func.count()).select_from(Lead)
    if status is not None:
        count_stmt = count_stmt.where(Lead.status == status)
    total = db.scalar(count_stmt) or 0

    stmt = select(Lead)
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    stmt = (
        stmt.order_by(Lead.created_at.desc(), Lead.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.scalars(stmt).all())
    return items, total


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

    outbox_rows = [
        EmailOutbox(
            id=uuid.uuid4(),
            lead_id=lead_id,
            kind=EmailOutboxKind.PROSPECT_CONFIRMATION,
            to_email=email,
            template_id="request-received",
            template_data={"LEAD_FIRST_NAME": first_name},
            status=EmailOutboxStatus.PENDING,
            attempts=0,
            created_at=now,
            updated_at=now,
        ),
    ]

    attorney_notify = (settings.attorney_notify_email or "").strip()
    if attorney_notify:
        outbox_rows.append(
            EmailOutbox(
                id=uuid.uuid4(),
                lead_id=lead_id,
                kind=EmailOutboxKind.ATTORNEY_NEW_LEAD,
                to_email=attorney_notify,
                template_id="new-lead",
                template_data={
                    "first_name": first_name,
                    "last_name": last_name,
                    "email": email,
                    "dashboard_url": (
                        f"{settings.public_url.rstrip('/')}"
                        f"/admin/dashboard/leads/{lead_id}"
                    ),
                },
                status=EmailOutboxStatus.PENDING,
                attempts=0,
                created_at=now,
                updated_at=now,
            ),
        )
    else:
        logger.warning(
            "ATTORNEY_NOTIFY_EMAIL empty; skipping attorney new-lead email for lead=%s",
            lead_id,
        )

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
