from __future__ import annotations
"""Aggregate v1 routes."""

from fastapi import APIRouter

from app.api.v1 import analytics, audit, auth, kyc, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(kyc.router, prefix="/kyc", tags=["kyc"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(audit.router, prefix="/audit-logs", tags=["audit"])
