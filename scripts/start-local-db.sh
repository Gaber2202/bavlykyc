#!/usr/bin/env bash
# Start PostgreSQL for Bavly KYC locally (Docker Compose "db" service).
# Database: bavly_kyc   User: postgres   Password: postgres   Port: 5432

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker not found. Install Docker Desktop or Podman with compose,"
  echo "       or use your own PostgreSQL with database bavly_kyc (see README.md)."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "error: docker compose plugin or docker-compose binary not found."
  exit 1
fi

echo "Starting PostgreSQL container..."
"${COMPOSE[@]}" up -d db

echo "Waiting for bavly_kyc to accept connections..."
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U postgres -d bavly_kyc >/dev/null 2>&1; then
    echo "ok: PostgreSQL is running."
    echo "    Host: localhost  Port: 5432  Database: bavly_kyc  User: postgres"
    echo "    URL:  postgresql+asyncpg://postgres:postgres@localhost:5432/bavly_kyc"
    exit 0
  fi
  sleep 1
done

echo "error: database did not become ready in time. Try: docker compose logs db"
exit 1
