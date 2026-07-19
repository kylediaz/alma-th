from __future__ import annotations

from functools import lru_cache
from typing import BinaryIO
from urllib.parse import quote

import boto3
from botocore.client import Config

from app.config import get_settings


@lru_cache
def _client(endpoint_url: str):
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
        ),
    )


def _internal_client():
    return _client(get_settings().s3_endpoint)


def _presign_client():
    settings = get_settings()
    endpoint = (settings.s3_public_endpoint or "").strip() or settings.s3_endpoint
    return _client(endpoint)


def upload(*, key: str, body: BinaryIO | bytes, content_type: str) -> None:
    settings = get_settings()
    _internal_client().put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def presign_get(
    key: str,
    *,
    expires_in: int = 300,
    filename: str | None = None,
    content_type: str | None = None,
) -> str:
    settings = get_settings()
    params: dict[str, str] = {
        "Bucket": settings.s3_bucket,
        "Key": key,
    }
    if filename:
        params["ResponseContentDisposition"] = (
            f"inline; filename*=UTF-8''{quote(filename)}"
        )
    if content_type:
        params["ResponseContentType"] = content_type
    return _presign_client().generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_in,
    )
