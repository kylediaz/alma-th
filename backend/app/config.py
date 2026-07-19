from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://alma:alma@localhost:5432/alma"

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "lead-files"
    s3_region: str = "us-east-1"
    s3_force_path_style: bool = True

    resend_api_key: str = ""
    from_email: str = "alma@resend.kylediaz.com"
    attorney_notify_email: str = "shared-inbox@alma.kylediaz.com"

    public_url: str = "http://localhost:3000"

    session_cookie_name: str = "session_id"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_ttl_seconds: int = 60 * 60 * 24 * 7

    cors_origins: str = "http://localhost:3000"

    resume_max_bytes: int = 5 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            return "postgresql+psycopg://" + url.removeprefix("postgresql://")
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url.removeprefix("postgres://")
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
