"""add leads status + created_at index

Revision ID: 20260718_0002
Revises: 20260718_0001
Create Date: 2026-07-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260718_0002"
down_revision: Union[str, Sequence[str], None] = "20260718_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_leads_status_created_at",
        "leads",
        ["status", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_leads_status_created_at", table_name="leads")
