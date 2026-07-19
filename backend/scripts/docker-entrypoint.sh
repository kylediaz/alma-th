#!/bin/sh
set -e

echo "Running migrations..."
uv run alembic upgrade head

echo "Seeding dev users..."
uv run python scripts/dev_seed.py

echo "Starting API..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
