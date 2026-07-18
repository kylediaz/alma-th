from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_attorney
from app.config import Settings, get_settings
from app.db import get_db
from app.models.enums import AccountType
from app.models.session import Session as AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, UserOut
from app.services.password import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, session_id: uuid.UUID, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=str(session_id),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,  # type: ignore[arg-type]
        max_age=settings.session_ttl_seconds,
        path="/",
    )


def _clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,  # type: ignore[arg-type]
    )


@router.post("/login", response_model=UserOut)
def login(
    body: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    user = db.scalar(select(User).where(User.username == body.username))
    if (
        user is None
        or not verify_password(body.password, user.password_hash)
        or user.account_type != AccountType.ATTORNEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    now = datetime.now(timezone.utc)
    session = AuthSession(
        id=uuid.uuid4(),
        user_id=user.id,
        expires_at=now + timedelta(seconds=settings.session_ttl_seconds),
        created_at=now,
    )
    db.add(session)
    db.commit()

    _set_session_cookie(response, session.id, settings)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _user: User = Depends(require_attorney),
) -> None:
    raw = request.cookies.get(settings.session_cookie_name)
    if raw:
        try:
            session = db.get(AuthSession, uuid.UUID(raw))
            if session is not None:
                db.delete(session)
                db.commit()
        except ValueError:
            pass
    _clear_session_cookie(response, settings)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(require_attorney)) -> User:
    return user
