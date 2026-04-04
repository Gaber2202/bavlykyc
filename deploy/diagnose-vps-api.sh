#!/usr/bin/env bash
# Run on the VPS as root (or with docker + curl). Shows what actually serves :8000 and /health.
#
#   cd /opt/BavlyKYC/deploy && chmod +x diagnose-vps-api.sh && ./diagnose-vps-api.sh

set -euo pipefail

echo "========== 1) Processes listening on 8000 (host) =========="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep ':8000' || echo "(none or need sudo for -p)"
else
  echo "ss not installed"
fi

echo ""
echo "========== 2) Docker containers (any port containing 8000) =========="
docker ps -a --format 'table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | head -20 || true
docker ps -a --format '{{.ID}} {{.Image}} {{.Names}} {{.Ports}}' 2>/dev/null | grep 8000 || echo "(no container shows 8000 in ps output)"

echo ""
echo "========== 3) GET http://127.0.0.1:8000/health (JSON body) =========="
curl -sS --max-time 5 http://127.0.0.1:8000/health || echo "curl failed"

echo ""
echo ""
echo "========== 4) Response headers for /api/v1 (expect X-BavlyKYC-Contract on NEW api) =========="
curl -sSI --max-time 5 http://127.0.0.1:8000/api/v1/auth/me 2>/dev/null | tr -d '\r' || true

echo ""
echo "Interpretation:"
echo "  - If /health JSON has NO \"api_contract\", this is NOT the current BavlyKYC FastAPI image."
echo "  - If /api/v1/* response has NO X-BavlyKYC-Contract header, same — old or wrong process."
echo "  - If TWO listeners on 8000, stop the non-Docker one or fix nginx upstream."
echo "  - Run: ./vps-redeploy.sh  (rebuilds bavlykyc-stack-api / bavlykyc-stack-web from this repo)"
