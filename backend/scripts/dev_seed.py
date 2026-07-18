"""Dev-only: upsert local attorney accounts.

Do not run against production. Passwords are hardcoded for local development.

Usage (from backend/):
  uv run python scripts/dev_seed.py
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.db import SessionLocal
from app.models.enums import AccountType
from app.models.user import User
from app.services.password import hash_password

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Local/dev credentials only — not for production.
DEV_USERS = [
    {
        "username": "attorney",
        "password": "changeme",
        "display_name": "Alex Attorney",
        "account_type": AccountType.ATTORNEY,
    },
    {
        "username": "attorney2",
        "password": "changeme",
        "display_name": "Blake Attorney",
        "account_type": AccountType.ATTORNEY,
    },
]


def seed_dev_users() -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        for entry in DEV_USERS:
            username = entry["username"]
            existing = db.scalar(select(User).where(User.username == username))
            if existing is not None:
                existing.password_hash = hash_password(entry["password"])
                existing.display_name = entry["display_name"]
                existing.account_type = entry["account_type"]
                db.add(existing)
                logger.info("Updated dev user username=%s id=%s", username, existing.id)
                continue

            user = User(
                id=uuid.uuid4(),
                username=username,
                password_hash=hash_password(entry["password"]),
                display_name=entry["display_name"],
                account_type=entry["account_type"],
                created_at=now,
            )
            db.add(user)
            logger.info("Created dev user username=%s", username)

        db.commit()


if __name__ == "__main__":
    seed_dev_users()
