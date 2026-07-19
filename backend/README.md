# Alma backend (FastAPI)

Lead intake API: public `POST /leads`, attorney session auth, Postgres + MinIO + Resend outbox.

For the full stack, prefer the root [`README.md`](../README.md) (`docker compose up --build`).

## Run with Docker Compose (recommended)

From the repo root:

```bash
cp .env.example .env
docker compose up --build
```

The `backend` service migrates, seeds, and serves on http://localhost:8000.

## Run on the host

1. Python 3.12+ and [uv](https://github.com/astral-sh/uv)
2. Start infra: `docker compose up -d postgres minio minio-init`

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run python scripts/dev_seed.py
uv run uvicorn app.main:app --reload --port 8000
```

`scripts/dev_seed.py` is **dev-only** (hardcoded local attorneys). Do not run against production.

## Useful endpoints

| Method  | Path                 | Auth                                   |
| ------- | -------------------- | -------------------------------------- |
| `POST`  | `/leads`             | public (multipart)                     |
| `POST`  | `/auth/login`        | public → sets HTTP-only session cookie |
| `POST`  | `/auth/logout`       | attorney                               |
| `GET`   | `/auth/me`           | attorney                               |
| `GET`   | `/leads`             | attorney                               |
| `GET`   | `/leads/{id}`        | attorney (includes `resume_url`)       |
| `PATCH` | `/leads/{id}`        | attorney (`{"status":"REACHED_OUT"}`)  |
| `GET`   | `/leads/{id}/resume` | attorney (presigned URL JSON)          |

## Notes

- Resume: `.pdf` / `.docx` only, max 5MB (`RESUME_MAX_BYTES`).
- Object keys look like `leads/{uuid}/resume.pdf` — key only in DB; bucket from `S3_BUCKET`.
- Presigned URLs use `S3_PUBLIC_ENDPOINT` when set (browser-reachable), otherwise `S3_ENDPOINT`.
- Email uses a transactional outbox + same-process flush after commit. Missing `RESEND_API_KEY` marks outbox rows `FAILED`; the lead is kept.
