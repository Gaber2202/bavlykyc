from __future__ import annotations
"""Auth request/response schemas."""

from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel, StrictInputModel


class LoginRequest(StrictInputModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class TokenPair(APIModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(StrictInputModel):
    refresh_token: str


class UserBrief(APIModel):
    id: str
    username: str
    full_name: str
    role: str
    is_active: bool
    must_change_password: bool


class MeResponse(APIModel):
    """Includes KYC edit policy so clients can match server-side RBAC UX."""

    user: UserBrief
    kyc_employee_can_edit_others: bool


class LogoutRequest(StrictInputModel):
    refresh_token: str | None = None


class ChangePasswordRequest(StrictInputModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
