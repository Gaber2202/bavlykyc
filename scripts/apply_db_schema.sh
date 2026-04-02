#!/usr/bin/env bash
# Apply the full KYC database schema using Alembic migrations (creates/updates tables,
# indexes, constraints). Safe to re-run: upgrades only to "head".
#
# Prerequisites:
#   - PostgreSQL running
#   - Database exists (see scripts/create_database.sql — bavly_kyc)
#   - backend/.env has DATABASE_URL or DATABASE_URL_SYNC pointing at that database
#     (async +asyncpg URLs are rewritten to psycopg for Alembic automatically)
#
# Usage:
#   ./scripts/apply_db_schema.sh
#   DATABASE_URL_SYNC=postgresql+psycopg://postgres:postgres@localhost:5432/bavly_kyc ./scripts/apply_db_schema.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
cd "$BACKEND"

if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DATABASE_URL_SYNC:-}" ] && [ -z "${DATABASE_URL:-}" ]; then
  echo "error: set DATABASE_URL or DATABASE_URL_SYNC in backend/.env (or export it)."
  echo "example: DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bavly_kyc"
  exit 1
fi

echo "Running: alembic upgrade head"
alembic upgrade head
echo "done: schema is at Alembic head."
