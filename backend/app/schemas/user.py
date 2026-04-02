from __future__ import annotations
"""User CRUD schemas."""

from datetime import datetime

from pydantic import Field

from app.models.user import UserRole
from app.schemas.common import APIModel, StrictInputModel


class UserCreate(StrictInputModel):
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: UserRole


class UserUpdate(StrictInputModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    role: UserRole | None = None


class UsernameUpdate(StrictInputModel):
    username: str = Field(..., min_length=2, max_length=100)


class AdminPasswordReset(StrictInputModel):
    """Leave `new_password` empty to generate a secure one-time temporary password (returned in response)."""

    new_password: str | None = Field(
        None,
        min_length=8,
        max_length=128,
    )


class AdminPasswordResetResponse(APIModel):
    message: str
    temporary_password: str | None = Field(
        None,
        description="Present only when the API generated a password; share with the user securely.",
    )


class UserRead(APIModel):
    id: str
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    must_change_password: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserActivitySummary(APIModel):
    user_id: str
    username: str
    full_name: str
    last_login_at: datetime | None
    audit_events_last_30_days: int
    kyc_created_count: int


class UserListFilters(StrictInputModel):
    role: UserRole | None = None
    is_active: bool | None = None
    search: str | None = Field(None, max_length=100)
