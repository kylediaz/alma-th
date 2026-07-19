from __future__ import annotations

import logging
from typing import Any

import resend

from app.config import get_settings

logger = logging.getLogger(__name__)

_TEMPLATE_SUBJECTS = {
    "request-received": "We received your request",
    "new-lead": "New lead submitted",
}


def configure_resend() -> None:
    api_key = (get_settings().resend_api_key or "").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY missing; outbound email will fail until configured")
        return
    resend.api_key = api_key


def send_template(*, to_email: str, template_id: str, template_data: dict[str, Any]) -> None:
    if not resend.api_key:
        raise RuntimeError("RESEND_API_KEY missing; cannot send")
    if not template_id.strip():
        raise RuntimeError("Resend template_id is empty; cannot send")

    settings = get_settings()
    result = resend.Emails.send(
        {
            "from": settings.from_email,
            "to": [to_email],
            "subject": _TEMPLATE_SUBJECTS.get(template_id, "Alma notification"),
            "template": {
                "id": template_id,
                "variables": template_data,
            },
        }
    )
    logger.info("Resend accepted email to=%s template=%s result=%s", to_email, template_id, result)
