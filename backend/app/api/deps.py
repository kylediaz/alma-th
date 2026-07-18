from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.models.enums import AccountType
from app.models.session import Session as AuthSession
from app.models.user import User


def require_attorney(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    raw = request.cookies.get(settings.session_cookie_name)
    try:
        session_id = uuid.UUID(raw) if raw else None
    except ValueError:
        session_id = None

    if session_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    session = db.get(AuthSession, session_id)
    if session is None or session.expires_at <= datetime.now(timezone.utc):
        if session is not None:
            db.delete(session)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user = db.get(User, session.user_id)
    if user is None or user.account_type != AccountType.ATTORNEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return user
