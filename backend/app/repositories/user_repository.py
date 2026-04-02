from __future__ import annotations
"""User persistence."""

from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc_record import KYCRecord
from app.models.user import User, UserRole


async def get_by_id(session: AsyncSession, user_id: str) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_by_username(session: AsyncSession, username: str) -> User | None:
    result = await session.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def list_users(
    session: AsyncSession,
    *,
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 50,
) -> tuple[Sequence[User], int]:
    conditions: list = []
    if role is not None:
        conditions.append(User.role == role)
    if is_active is not None:
        conditions.append(User.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(User.username.ilike(term), User.full_name.ilike(term))
        )
    where_clause = and_(*conditions) if conditions else True
    total = (
        await session.execute(
            select(func.count()).select_from(User).where(where_clause)
        )
    ).scalar_one()

    sort_dir = "asc" if sort_order == "asc" else "desc"
    sort_map: dict[str, Any] = {
        "created_at": User.created_at,
        "username": User.username,
        "full_name": User.full_name,
        "role": User.role,
        "is_active": User.is_active,
        "last_login_at": User.last_login_at,
    }
    col = sort_map.get(sort_by or "created_at", User.created_at)

    q = (
        select(User)
        .where(where_clause)
        .order_by(col.asc() if sort_dir == "asc" else col.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = (await session.execute(q)).scalars().all()
    return rows, total


async def create_user(session: AsyncSession, user: User) -> User:
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def update_user(session: AsyncSession, user: User) -> User:
    await session.flush()
    await session.refresh(user)
    return user


async def user_activity_summary(
    session: AsyncSession, user_id: str
) -> tuple[int, int]:
    from app.models.audit_log import AuditLog

    since = datetime.now(timezone.utc)
    # last 30 days
    from datetime import timedelta

    since = since - timedelta(days=30)

    ac = (
        await session.execute(
            select(func.count())
            .select_from(AuditLog)
            .where(
                AuditLog.user_id == user_id,
                AuditLog.created_at >= since,
            )
        )
    ).scalar_one()
    kc = (
        await session.execute(
            select(func.count())
            .select_from(KYCRecord)
            .where(
                KYCRecord.created_by_id == user_id,
                KYCRecord.soft_deleted_at.is_(None),
            )
        )
    ).scalar_one()
    return int(ac or 0), int(kc or 0)
