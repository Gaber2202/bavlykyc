from __future__ import annotations
"""Audit log persistence."""

from typing import Any, Sequence

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_event(
    session: AsyncSession,
    *,
    user_id: str | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    row = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    session.add(row)
    await session.flush()
    return row


async def list_logs(
    session: AsyncSession,
    *,
    skip: int,
    limit: int,
    action: str | None = None,
    user_id_filter: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "desc",
) -> tuple[Sequence[AuditLog], int]:
    conditions: list = []
    if action:
        conditions.append(AuditLog.action == action)
    if user_id_filter:
        conditions.append(AuditLog.user_id == user_id_filter)
    where_clause = and_(*conditions) if conditions else True
    total = (
        await session.execute(
            select(func.count()).select_from(AuditLog).where(where_clause)
        )
    ).scalar_one()
    sort_dir = "asc" if sort_order == "asc" else "desc"
    sort_map: dict[str, Any] = {
        "created_at": AuditLog.created_at,
        "action": AuditLog.action,
        "user_id": AuditLog.user_id,
        "resource_id": AuditLog.resource_id,
    }
    col = sort_map.get(sort_by or "created_at", AuditLog.created_at)

    q = (
        select(AuditLog)
        .where(and_(*conditions) if conditions else True)
        .order_by(col.asc() if sort_dir == "asc" else col.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = (await session.execute(q)).scalars().all()
    return rows, int(total or 0)
