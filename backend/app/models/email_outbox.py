from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import EmailOutboxKind, EmailOutboxStatus
from app.models.lead import Lead


class EmailOutbox(Base):
    __tablename__ = "email_outbox"
    __table_args__ = (Index("ix_email_outbox_pending", "status", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False
    )
    kind: Mapped[EmailOutboxKind] = mapped_column(
        Enum(EmailOutboxKind, name="email_outbox_kind", native_enum=True),
        nullable=False,
    )
    to_email: Mapped[str] = mapped_column(String(320), nullable=False)
    template_id: Mapped[str] = mapped_column(String(128), nullable=False)
    template_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[EmailOutboxStatus] = mapped_column(
        Enum(EmailOutboxStatus, name="email_outbox_status", native_enum=True),
        nullable=False,
        server_default=EmailOutboxStatus.PENDING.value,
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    lead: Mapped[Lead] = relationship(back_populates="email_outbox_rows")
