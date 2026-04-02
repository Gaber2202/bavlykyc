from __future__ import annotations
"""Analytics aggregation — PostgreSQL-oriented, set-based joins (no ORM N+1)."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import String, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.expression import literal

from app.models.kyc_record import KYCRecord
from app.models.user import User, UserRole
from app.repositories.kyc_repository import to_utc_range


def _kyc_filter_conditions(
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> list[Any]:
    df, dt = to_utc_range(date_from, date_to)
    conds: list[Any] = [KYCRecord.soft_deleted_at.is_(None)]
    if df is not None:
        conds.append(KYCRecord.created_at >= df)
    if dt is not None:
        conds.append(KYCRecord.created_at <= dt)
    if employee_id:
        conds.append(KYCRecord.created_by_id == employee_id)
    if service_type:
        conds.append(KYCRecord.service_type == service_type)
    return conds


async def aggregate_kpis(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> dict[str, Any]:
    """Single round-trip: KPI counts + averages + active employees (scalar subquery)."""
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    base_where = and_(*conds)

    now = datetime.now(timezone.utc)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = start_day - timedelta(days=start_day.weekday())
    month_start = start_day.replace(day=1)

    active_employees_sq = (
        select(func.count())
        .select_from(User)
        .where(User.is_active.is_(True), User.role == UserRole.employee)
    ).scalar_subquery()

    stmt = select(
        func.count(KYCRecord.id).label("total_submissions"),
        func.avg(KYCRecord.age).label("average_age"),
        func.count(KYCRecord.id)
        .filter(KYCRecord.created_at >= literal(start_day))
        .label("submissions_today"),
        func.count(KYCRecord.id)
        .filter(KYCRecord.created_at >= literal(week_start))
        .label("submissions_this_week"),
        func.count(KYCRecord.id)
        .filter(KYCRecord.created_at >= literal(month_start))
        .label("submissions_this_month"),
        func.count(KYCRecord.id)
        .filter(KYCRecord.previous_rejected == "نعم")
        .label("prior_refusal_count"),
        func.count(KYCRecord.id)
        .filter(KYCRecord.status == "مرفوض")
        .label("status_rejected_count"),
        active_employees_sq.label("active_employees"),
    ).where(base_where)

    row = (await session.execute(stmt)).one()
    total = int(row.total_submissions or 0)
    denom = total if total else 1
    prior_refusal = int(row.prior_refusal_count or 0)
    status_rej = int(row.status_rejected_count or 0)
    avg_age = row.average_age
    return {
        "total_submissions": total,
        "submissions_today": int(row.submissions_today or 0),
        "submissions_this_week": int(row.submissions_this_week or 0),
        "submissions_this_month": int(row.submissions_this_month or 0),
        "active_employees": int(row.active_employees or 0),
        "average_age": float(avg_age) if avg_age is not None else None,
        "rejection_rate": (status_rej / float(denom) * 100) if total else None,
        "prior_refusal_rate": (prior_refusal / float(denom) * 100) if total else None,
    }


async def count_by_column(
    session: AsyncSession,
    column,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> list[tuple[str, int]]:
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    stmt = (
        select(column, func.count())
        .select_from(KYCRecord)
        .where(and_(*conds))
        .group_by(column)
        .order_by(func.count().desc())
    )
    rows = (await session.execute(stmt)).all()
    return [(str(r[0]), int(r[1])) for r in rows]


async def trend_daily(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> list[tuple[str, int]]:
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    day = func.date_trunc("day", KYCRecord.created_at)
    stmt = (
        select(cast(day, String), func.count())
        .select_from(KYCRecord)
        .where(and_(*conds))
        .group_by(day)
        .order_by(day)
    )
    rows = (await session.execute(stmt)).all()
    return [(str(r[0])[:10], int(r[1])) for r in rows]


async def trend_weekly(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> list[tuple[str, int]]:
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    week = func.date_trunc("week", KYCRecord.created_at)
    stmt = (
        select(cast(week, String), func.count())
        .select_from(KYCRecord)
        .where(and_(*conds))
        .group_by(week)
        .order_by(week)
    )
    rows = (await session.execute(stmt)).all()
    return [(str(r[0])[:10], int(r[1])) for r in rows]


async def trend_monthly(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> list[tuple[str, int]]:
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    month = func.date_trunc("month", KYCRecord.created_at)
    stmt = (
        select(cast(month, String), func.count())
        .select_from(KYCRecord)
        .where(and_(*conds))
        .group_by(month)
        .order_by(month)
    )
    rows = (await session.execute(stmt)).all()
    return [(str(r[0])[:7], int(r[1])) for r in rows]


async def previous_visa_ratio(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
) -> dict[str, float]:
    counts = dict(
        await count_by_column(
            session,
            KYCRecord.has_previous_visas,
            date_from=date_from,
            date_to=date_to,
            employee_id=employee_id,
            service_type=service_type,
        )
    )
    total = sum(counts.values()) or 1
    return {k: round(v / total * 100, 2) for k, v in counts.items()}


async def top_employees(
    session: AsyncSession,
    *,
    date_from: date | None,
    date_to: date | None,
    employee_id: str | None,
    service_type: str | None,
    limit: int = 10,
) -> list[tuple[str, str, int]]:
    """One grouped query: user id, display name (full_name), submission count."""
    conds = _kyc_filter_conditions(
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        service_type=service_type,
    )
    stmt = (
        select(
            User.id,
            User.full_name,
            func.count(),
        )
        .select_from(KYCRecord)
        .join(User, User.id == KYCRecord.created_by_id)
        .where(and_(*conds))
        .group_by(User.id, User.full_name)
        .order_by(func.count().desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).all()
    return [(str(r[0]), str(r[1]), int(r[2])) for r in rows]
