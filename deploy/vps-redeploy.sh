#!/usr/bin/env bash
# Hard rebuild api + web on the VPS so you never keep a stale pre-v2 KYC image.
# Run from: /opt/BavlyKYC/deploy  (after: git pull)
#
#   chmod +x vps-redeploy.sh && ./vps-redeploy.sh

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.vps.yml}"
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file .env)

echo ">>> Stopping api & web (db stays up)"
"${COMPOSE[@]}" stop api web 2>/dev/null || true

echo ">>> Removing old api/web containers (compose v2+)"
"${COMPOSE[@]}" rm -f api web 2>/dev/null || true

echo ">>> Build with no cache (forces fresh app/ + dist)"
"${COMPOSE[@]}" build --no-cache api web

echo ">>> Start api + web"
"${COMPOSE[@]}" up -d api web

echo ">>> Alembic migrations"
"${COMPOSE[@]}" run --rm api sh -c 'cd /app && alembic upgrade head'

echo ">>> Health (expect api_contract in JSON)"
curl -sS http://127.0.0.1:8000/health || true
echo ""

echo ">>> Optional: verify Python imports inside container"
"${COMPOSE[@]}" exec -T api python -c "
from app.constants.kyc_field_options import SERVICE_BRANCH_OPTIONS
assert 'بافلي الاسكندرية' in SERVICE_BRANCH_OPTIONS
from app.schemas.kyc import KYCCreate
assert 'assigned_to' in KYCCreate.model_fields
print('OK: container has v2 KYC schema')
"
