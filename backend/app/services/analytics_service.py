from __future__ import annotations
"""Analytics aggregation for admin dashboard."""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc_record import KYCRecord
from app.models.user import User
from app.repositories import analytics_repository
from app.repositories.kyc_repository import to_utc_range
from app.schemas.analytics import (
    AnalyticsExportRow,
    AnalyticsFilters,
    AnalyticsSummaryResponse,
    FunnelStage,
    KPISummary,
    NamedCount,
    TrendPoint,
)


async def build_summary(
    session: AsyncSession, filters: AnalyticsFilters
) -> AnalyticsSummaryResponse:
    """Parallel DB round-trips for independent aggregates (no N+1)."""
    f = filters
    common = dict(
        date_from=f.date_from,
        date_to=f.date_to,
        employee_id=f.employee_id,
        service_type=f.service_type,
    )

    (
        kpi_raw,
        by_service,
        by_status,
        prev_visa,
        nationality_split,
        marital_split,
        top,
        trend_raw_d,
        trend_raw_w,
        trend_raw_m,
    ) = await asyncio.gather(
        analytics_repository.aggregate_kpis(session, **common),
        analytics_repository.count_by_column(
            session, KYCRecord.service_type, **common
        ),
        analytics_repository.count_by_column(session, KYCRecord.status, **common),
        analytics_repository.previous_visa_ratio(session, **common),
        analytics_repository.count_by_column(
            session, KYCRecord.nationality_type, **common
        ),
        analytics_repository.count_by_column(
            session, KYCRecord.marital_status, **common
        ),
        analytics_repository.top_employees(
            session,
            date_from=f.date_from,
            date_to=f.date_to,
            employee_id=f.employee_id,
            service_type=f.service_type,
            limit=10,
        ),
        analytics_repository.trend_daily(session, **common),
        analytics_repository.trend_weekly(session, **common),
        analytics_repository.trend_monthly(session, **common),
    )

    kpi = KPISummary(
        total_submissions=kpi_raw["total_submissions"],
        submissions_today=kpi_raw["submissions_today"],
        submissions_this_week=kpi_raw["submissions_this_week"],
        submissions_this_month=kpi_raw["submissions_this_month"],
        active_employees=kpi_raw["active_employees"],
        average_age=kpi_raw["average_age"],
        rejection_rate=kpi_raw["rejection_rate"],
        prior_refusal_rate=kpi_raw["prior_refusal_rate"],
    )

    top_employees = [NamedCount(name=r[1], count=r[2]) for r in top]

    trend_daily = [TrendPoint(period=p, count=c) for p, c in trend_raw_d]
    trend_weekly = [TrendPoint(period=p, count=c) for p, c in trend_raw_w]
    trend_monthly = [TrendPoint(period=p, count=c) for p, c in trend_raw_m]

    funnel = [
        FunnelStage(status=x.name, count=x.count)
        for x in sorted(
            (NamedCount(name=a, count=b) for a, b in by_status),
            key=lambda z: z.count,
            reverse=True,
        )
    ]

    return AnalyticsSummaryResponse(
        kpi=kpi,
        by_service_type=[NamedCount(name=a, count=b) for a, b in by_service],
        by_status=[NamedCount(name=a, count=b) for a, b in by_status],
        previous_visa_ratio=prev_visa,
        nationality_split=[NamedCount(name=a, count=b) for a, b in nationality_split],
        marital_split=[NamedCount(name=a, count=b) for a, b in marital_split],
        top_employees=top_employees,
        trend_daily=trend_daily,
        trend_weekly=trend_weekly,
        trend_monthly=trend_monthly,
        funnel_by_status=funnel,
    )


async def export_rows(
    session: AsyncSession, filters: AnalyticsFilters
) -> list[AnalyticsExportRow]:
    df, dt = to_utc_range(filters.date_from, filters.date_to)
    stmt = (
        select(
            KYCRecord.id,
            KYCRecord.client_full_name,
            KYCRecord.service_type,
            KYCRecord.status,
            KYCRecord.created_at,
            User.username,
            KYCRecord.age,
            KYCRecord.has_previous_visas,
            KYCRecord.previous_rejected,
        )
        .join(User, User.id == KYCRecord.created_by_id)
        .where(KYCRecord.soft_deleted_at.is_(None))
    )
    if df:
        stmt = stmt.where(KYCRecord.created_at >= df)
    if dt:
        stmt = stmt.where(KYCRecord.created_at <= dt)
    if filters.employee_id:
        stmt = stmt.where(KYCRecord.created_by_id == filters.employee_id)
    if filters.service_type:
        stmt = stmt.where(KYCRecord.service_type == filters.service_type)
    stmt = stmt.order_by(KYCRecord.created_at.desc()).limit(5000)

    rows = (await session.execute(stmt)).all()
    return [
        AnalyticsExportRow(
            id=str(r[0]),
            client_full_name=r[1],
            service_type=r[2],
            status=r[3],
            created_at=r[4],
            created_by_username=r[5],
            age=r[6],
            has_previous_visas=r[7],
            previous_rejected=r[8],
        )
        for r in rows
    ]


async def trend_daily_series(
    session: AsyncSession, filters: AnalyticsFilters
) -> list[TrendPoint]:
    f = filters
    raw = await analytics_repository.trend_daily(
        session,
        date_from=f.date_from,
        date_to=f.date_to,
        employee_id=f.employee_id,
        service_type=f.service_type,
    )
    return [TrendPoint(period=p, count=c) for p, c in raw]


async def trend_weekly_series(
    session: AsyncSession, filters: AnalyticsFilters
) -> list[TrendPoint]:
    f = filters
    raw = await analytics_repository.trend_weekly(
        session,
        date_from=f.date_from,
        date_to=f.date_to,
        employee_id=f.employee_id,
        service_type=f.service_type,
    )
    return [TrendPoint(period=p, count=c) for p, c in raw]


async def trend_monthly_series(
    session: AsyncSession, filters: AnalyticsFilters
) -> list[TrendPoint]:
    f = filters
    raw = await analytics_repository.trend_monthly(
        session,
        date_from=f.date_from,
        date_to=f.date_to,
        employee_id=f.employee_id,
        service_type=f.service_type,
    )
    return [TrendPoint(period=p, count=c) for p, c in raw]
