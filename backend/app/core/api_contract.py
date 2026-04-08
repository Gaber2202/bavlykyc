"""Deployed API contract label (KYC body shape). Change when request schemas break clients.

Public `/health` exposes this so operators can confirm the running container matches the repo
(e.g. curl http://YOUR_IP/health — expect `api_contract` matches `API_CONTRACT_LABEL` in this module).
"""

API_CONTRACT_LABEL = "KYC_V3_property_usd_bank_commercial_tax"
