from __future__ import annotations
"""KYC record persistence."""

from datetime import date, datetime, time, timezone
from typing import Any, Sequence

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc_record import KYCRecord


async def get_by_id(
    session: AsyncSession, kyc_id: str, include_deleted: bool = False
) -> KYCRecord | None:
    q = select(KYCRecord).where(KYCRecord.id == kyc_id)
    if not include_deleted:
        q = q.where(KYCRecord.soft_deleted_at.is_(None))
    result = await session.execute(q)
    return result.scalar_one_or_none()


async def list_kyc(
    session: AsyncSession,
    *,
    skip: int,
    limit: int,
    search: str | None = None,
    client_name: str | None = None,
    phone: str | None = None,
    service_type: str | None = None,
    status: str | None = None,
    created_by_id: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    sort_by: str | None = None,
    sort_order: str = "desc",
    include_deleted: bool = False,
) -> tuple[Sequence[KYCRecord], int]:
    conditions: list[Any] = []
    if not include_deleted:
        conditions.append(KYCRecord.soft_deleted_at.is_(None))
    if client_name and client_name.strip():
        cn = f"%{client_name.strip()}%"
        conditions.append(KYCRecord.client_full_name.ilike(cn))
    if phone and phone.strip():
        ph = f"%{phone.strip()}%"
        conditions.append(KYCRecord.phone_number.ilike(ph))
    if search:
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                KYCRecord.client_full_name.ilike(term),
                KYCRecord.phone_number.ilike(term),
                KYCRecord.email.ilike(term),
                KYCRecord.employee_name.ilike(term),
            )
        )
    if service_type:
        conditions.append(KYCRecord.service_type == service_type)
    if status:
        conditions.append(KYCRecord.status == status)
    if created_by_id:
        conditions.append(KYCRecord.created_by_id == created_by_id)
    if date_from:
        conditions.append(KYCRecord.created_at >= date_from)
    if date_to:
        conditions.append(KYCRecord.created_at <= date_to)

    where_clause = and_(*conditions) if conditions else True
    count_stmt = select(func.count()).select_from(KYCRecord).where(where_clause)
    total = (await session.execute(count_stmt)).scalar_one()

    sort_dir = "asc" if sort_order == "asc" else "desc"
    sort_map: dict[str, Any] = {
        "created_at": KYCRecord.created_at,
        "status": KYCRecord.status,
        "service_type": KYCRecord.service_type,
        "client_full_name": KYCRecord.client_full_name,
        "employee_name": KYCRecord.employee_name,
        "assigned_to": KYCRecord.assigned_to,
        "age": KYCRecord.age,
    }
    col = sort_map.get(sort_by or "created_at", KYCRecord.created_at)

    q = (
        select(KYCRecord)
        .where(where_clause)
        .order_by(col.asc() if sort_dir == "asc" else col.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = (await session.execute(q)).scalars().all()
    return rows, int(total or 0)


async def create_kyc(session: AsyncSession, row: KYCRecord) -> KYCRecord:
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return row


async def update_kyc(session: AsyncSession, row: KYCRecord) -> KYCRecord:
    await session.flush()
    await session.refresh(row)
    return row


async def soft_delete(session: AsyncSession, row: KYCRecord) -> None:
    row.soft_deleted_at = datetime.now(timezone.utc)
    await session.flush()


def to_utc_range(
    d_from: date | None, d_to: date | None
) -> tuple[datetime | None, datetime | None]:
    start = (
        datetime.combine(d_from, time.min, tzinfo=timezone.utc)
        if d_from
        else None
    )
    end = (
        datetime.combine(d_to, time.max, tzinfo=timezone.utc) if d_to else None
    )
    return start, end
