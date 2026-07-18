from __future__ import annotations

from functools import lru_cache
from typing import BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings


@lru_cache
def _client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
        ),
    )


def upload(*, key: str, body: BinaryIO | bytes, content_type: str) -> None:
    settings = get_settings()
    _client().put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def get_stream(key: str):
    settings = get_settings()
    try:
        response = _client().get_object(Bucket=settings.s3_bucket, Key=key)
    except ClientError as exc:
        raise FileNotFoundError(f"Object not found: {key}") from exc
    return response["Body"]
