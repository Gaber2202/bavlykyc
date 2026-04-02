#!/usr/bin/env bash
# Open psql using DATABASE_URL from backend/.env (local PostgreSQL).
# Removes the +asyncpg driver suffix so libpq understands the URL.
#
# Usage:
#   ./scripts/psql-connect.sh
#   ./scripts/psql-connect.sh -c "SELECT current_database(), current_user;"
#
# Requires: psql (PostgreSQL client), and backend/.env with DATABASE_URL set.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: missing $ENV_FILE — copy backend/.env.example to backend/.env and set DATABASE_URL."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "error: DATABASE_URL is not set in backend/.env"
  exit 1
fi

# postgresql+asyncpg://... → postgresql://... (psql / libpq)
URI="${DATABASE_URL//+asyncpg/}"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found. Install PostgreSQL client tools or use:"
  echo "  docker run -it --rm -e PGPASSWORD=postgres postgres:16-alpine psql -h host.docker.internal -U postgres -d bavly_kyc"
  exit 1
fi

exec psql "$URI" "$@"
