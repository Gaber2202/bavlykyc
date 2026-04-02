from __future__ import annotations
"""Audit logging facade."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import audit_repository


async def log(
    session: AsyncSession,
    *,
    user_id: str | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    await audit_repository.log_event(
        session,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
