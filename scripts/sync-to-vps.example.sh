#!/usr/bin/env bash
# Sync repo to the production VPS (example — run from your laptop).
# Usage:
#   ./scripts/sync-to-vps.example.sh
#
# Requires SSH access: ssh root@187.127.142.186
# Adjust REMOTE_DIR if you deploy elsewhere on the server.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VPS="root@187.127.142.186"
REMOTE_DIR="${REMOTE_DIR:-/opt/BavlyKYC}"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'backend/.venv' \
  --exclude 'frontend/node_modules' \
  --exclude 'public' \
  --exclude '.env' \
  --exclude 'backend/.env' \
  --exclude 'frontend/.env' \
  --exclude 'deploy/.env' \
  "$ROOT/" "${VPS}:${REMOTE_DIR}/"

echo "Synced to ${VPS}:${REMOTE_DIR}"
echo "On server: cd ${REMOTE_DIR}/deploy && ./vps-redeploy.sh"
