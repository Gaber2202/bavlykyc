"""Deployed API contract label (KYC body shape). Change when request schemas break clients.

Public `/health` exposes this so operators can confirm the running container matches the repo
(e.g. curl http://YOUR_IP/health — expect `api_contract` = KYC_V2).
"""

API_CONTRACT_LABEL = "KYC_V2_four_branches_assignee_kinship"
