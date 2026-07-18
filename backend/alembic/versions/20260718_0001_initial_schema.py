"""initial schema

Revision ID: 20260718_0001
Revises:
Create Date: 2026-07-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260718_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

account_type = postgresql.ENUM("ATTORNEY", name="account_type", create_type=False)
lead_status = postgresql.ENUM("PENDING", "REACHED_OUT", name="lead_status", create_type=False)
email_outbox_kind = postgresql.ENUM(
    "PROSPECT_CONFIRMATION",
    "ATTORNEY_NEW_LEAD",
    name="email_outbox_kind",
    create_type=False,
)
email_outbox_status = postgresql.ENUM(
    "PENDING",
    "SENT",
    "FAILED",
    name="email_outbox_status",
    create_type=False,
)


def upgrade() -> None:
    op.execute("CREATE TYPE account_type AS ENUM ('ATTORNEY')")
    op.execute("CREATE TYPE lead_status AS ENUM ('PENDING', 'REACHED_OUT')")
    op.execute(
        "CREATE TYPE email_outbox_kind AS ENUM ('PROSPECT_CONFIRMATION', 'ATTORNEY_NEW_LEAD')"
    )
    op.execute("CREATE TYPE email_outbox_status AS ENUM ('PENDING', 'SENT', 'FAILED')")

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("account_type", account_type, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"])

    op.create_table(
        "leads",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column(
            "status",
            lead_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("resume_storage_key", sa.String(length=512), nullable=False),
        sa.Column("resume_original_filename", sa.String(length=255), nullable=False),
        sa.Column("resume_content_type", sa.String(length=127), nullable=False),
        sa.Column("resume_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leads_created_at", "leads", [sa.text("created_at DESC")])

    op.create_table(
        "email_outbox",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", email_outbox_kind, nullable=False),
        sa.Column("to_email", sa.String(length=320), nullable=False),
        sa.Column("template_id", sa.String(length=128), nullable=False),
        sa.Column("template_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status",
            email_outbox_status,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_outbox_pending", "email_outbox", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_email_outbox_pending", table_name="email_outbox")
    op.drop_table("email_outbox")
    op.drop_index("ix_leads_created_at", table_name="leads")
    op.drop_table("leads")
    op.drop_index("ix_sessions_expires_at", table_name="sessions")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_table("users")
    op.execute("DROP TYPE email_outbox_status")
    op.execute("DROP TYPE email_outbox_kind")
    op.execute("DROP TYPE lead_status")
    op.execute("DROP TYPE account_type")
