#!/usr/bin/env bash
# Run on the VPS from deploy/ after `docker compose ... up`:
#   cd /opt/BavlyKYC/deploy && chmod +x verify-vps-api-image.sh && ./verify-vps-api-image.sh
#
# Passes if the *running* api container imports the current KYC constants (v2 schema).
# If this fails but local works, the container image is stale — rebuild api with --no-cache.

set -euo pipefail
cd "$(dirname "$0")"

COMPOSE=(docker compose -f docker-compose.vps.example.yml --env-file .env)

echo "=== GET /health (via published port on host) ==="
curl -sS "http://127.0.0.1:8000/health" || true
echo ""
echo ""

echo "=== Schema check inside api container ==="
"${COMPOSE[@]}" exec -T api python -c "
from app.constants.kyc_field_options import ASSIGNEE_OPTIONS, SERVICE_BRANCH_OPTIONS
from app.core.api_contract import API_CONTRACT_LABEL

assert API_CONTRACT_LABEL == 'KYC_V2_four_branches_assignee_kinship', API_CONTRACT_LABEL
assert 'بافلي الاسكندرية' in SERVICE_BRANCH_OPTIONS, SERVICE_BRANCH_OPTIONS
assert 'أحمد الشيخ' in ASSIGNEE_OPTIONS, ASSIGNEE_OPTIONS
from app.schemas.kyc import KYCCreate
fields = set(KYCCreate.model_fields)
assert 'assigned_to' in fields and 'relatives_kinship' in fields, fields
print('OK: api container matches v2 KYC contract')
"
