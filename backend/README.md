# Alma backend (FastAPI)

Lead intake API: public `POST /leads`, attorney session auth, Postgres + MinIO + Resend outbox.

## Prerequisites

1. Python 3.12+
2. [uv](https://github.com/astral-sh/uv) (recommended) or pip
3. From the **repo root**, start infra:

```bash
docker compose up -d
```

This starts Postgres (`localhost:5432`) and MinIO (`localhost:9000`, bucket `lead-files`).

## Setup

```bash
cd backend
uv sync
```

Or with pip:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Migrate + dev seed

```bash
# from backend/
uv run alembic upgrade head
uv run python scripts/dev_seed.py
```

`scripts/dev_seed.py` is **dev-only**. It upserts hardcoded local attorneys (see the script for usernames/passwords). Do not run against production.



## Run API

```bash
uv run uvicorn app.main:app --reload --port 8000
```

- Health: `GET http://localhost:8000/health`
- OpenAPI: `http://localhost:8000/docs`
- CORS allows `http://localhost:3000` with credentials (session cookie).



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
| `GET`   | `/leads/{id}/resume` | attorney (presigned URL JSON, not file)|




## Notes

- Resume: `.pdf` / `.docx` only, max 5MB (`RESUME_MAX_BYTES`).
- Object storage keys look like `leads/{uuid}/resume.pdf` — **key only** in DB; bucket from `S3_BUCKET`.
- Email uses a transactional outbox + same-process flush after commit. Missing `RESEND_API_KEY` logs a warning and marks outbox rows `FAILED`; the lead is kept.

