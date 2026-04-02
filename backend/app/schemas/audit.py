from __future__ import annotations
"""Audit log schemas."""

from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import APIModel, StrictInputModel


class AuditLogRead(APIModel):
    id: str
    user_id: str | None
    action: str
    resource_type: str | None
    resource_id: str | None
    details: dict[str, Any] | None
    ip_address: str | None
    created_at: datetime


class AuditListQuery(StrictInputModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=200)
    action: str | None = None
    user_id: str | None = None
