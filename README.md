# Alma lead intake

Public prospect form + attorney console for immigration lead intake.

## Quick start

Prerequisites: Docker + Docker Compose.

```bash
cp .env.example .env
# optional: set RESEND_API_KEY in .env

docker compose up --build
```

This starts Postgres, MinIO, the API, and the web app. On boot the API runs migrations and seeds local attorney accounts.

Dev seed attorneys (local only):


| Username    | Password   |
| ----------- | ---------- |
| `attorney`  | `changeme` |
| `attorney2` | `changeme` |


Stop:

```bash
docker compose down
```

