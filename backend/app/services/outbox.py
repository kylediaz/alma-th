from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.email_outbox import EmailOutbox
from app.models.enums import EmailOutboxStatus
from app.services.email import send_template

logger = logging.getLogger(__name__)


def flush_outbox_for_lead(db: Session, lead_id: uuid.UUID) -> None:
    """Send PENDING outbox rows for a lead. Failures mark FAILED; never raise to caller."""
    rows = db.scalars(
        select(EmailOutbox)
        .where(
            EmailOutbox.lead_id == lead_id,
            EmailOutbox.status == EmailOutboxStatus.PENDING,
        )
        .order_by(EmailOutbox.created_at.asc())
    ).all()

    now = datetime.now(timezone.utc)
    for row in rows:
        row.attempts += 1
        row.updated_at = now
        try:
            send_template(
                to_email=row.to_email,
                template_id=row.template_id,
                template_data=dict(row.template_data or {}),
            )
            row.status = EmailOutboxStatus.SENT
            row.sent_at = now
            row.last_error = None
            logger.info("Outbox row %s SENT kind=%s", row.id, row.kind)
        except Exception as exc:  # noqa: BLE001 — provider/network; lead must remain
            row.status = EmailOutboxStatus.FAILED
            row.last_error = str(exc)[:4000]
            logger.warning("Outbox row %s FAILED kind=%s error=%s", row.id, row.kind, exc)
        db.add(row)

    db.commit()
