from __future__ import annotations
"""Analytics (admin)."""

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, SessionDep
from app.utils.dates_http import parse_optional_iso_date
from app.schemas.analytics import (
    AnalyticsExportRow,
    AnalyticsFilters,
    AnalyticsSummaryResponse,
    TrendPoint,
)
from app.services import analytics_service

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def analytics_summary(
    db_session: SessionDep,
    _admin: AdminUser,
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    employee_id: str | None = None,
    service_type: str | None = None,
) -> AnalyticsSummaryResponse:
    df = parse_optional_iso_date(date_from, label_ar="date_from")
    dt = parse_optional_iso_date(date_to, label_ar="date_to")
    filters = AnalyticsFilters(
        date_from=df,
        date_to=dt,
        employee_id=employee_id,
        service_type=service_type,
    )
    out = await analytics_service.build_summary(db_session, filters)
    await db_session.commit()
    return out


@router.get("/export", response_model=list[AnalyticsExportRow])
async def analytics_export(
    db_session: SessionDep,
    _admin: AdminUser,
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    employee_id: str | None = None,
    service_type: str | None = None,
) -> list[AnalyticsExportRow]:
    df = parse_optional_iso_date(date_from, label_ar="date_from")
    dt = parse_optional_iso_date(date_to, label_ar="date_to")
    filters = AnalyticsFilters(
        date_from=df,
        date_to=dt,
        employee_id=employee_id,
        service_type=service_type,
    )
    rows = await analytics_service.export_rows(db_session, filters)
    await db_session.commit()
    return rows


@router.get("/trend/daily", response_model=list[TrendPoint])
async def trend_daily(
    db_session: SessionDep,
    _admin: AdminUser,
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    employee_id: str | None = None,
    service_type: str | None = None,
) -> list[TrendPoint]:
    df = parse_optional_iso_date(date_from, label_ar="date_from")
    dt = parse_optional_iso_date(date_to, label_ar="date_to")
    filters = AnalyticsFilters(
        date_from=df,
        date_to=dt,
        employee_id=employee_id,
        service_type=service_type,
    )
    series = await analytics_service.trend_daily_series(db_session, filters)
    await db_session.commit()
    return series


@router.get("/trend/weekly", response_model=list[TrendPoint])
async def trend_weekly(
    db_session: SessionDep,
    _admin: AdminUser,
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    employee_id: str | None = None,
    service_type: str | None = None,
) -> list[TrendPoint]:
    df = parse_optional_iso_date(date_from, label_ar="date_from")
    dt = parse_optional_iso_date(date_to, label_ar="date_to")
    filters = AnalyticsFilters(
        date_from=df,
        date_to=dt,
        employee_id=employee_id,
        service_type=service_type,
    )
    series = await analytics_service.trend_weekly_series(db_session, filters)
    await db_session.commit()
    return series


@router.get("/trend/monthly", response_model=list[TrendPoint])
async def trend_monthly(
    db_session: SessionDep,
    _admin: AdminUser,
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    employee_id: str | None = None,
    service_type: str | None = None,
) -> list[TrendPoint]:
    df = parse_optional_iso_date(date_from, label_ar="date_from")
    dt = parse_optional_iso_date(date_to, label_ar="date_to")
    filters = AnalyticsFilters(
        date_from=df,
        date_to=dt,
        employee_id=employee_id,
        service_type=service_type,
    )
    series = await analytics_service.trend_monthly_series(db_session, filters)
    await db_session.commit()
    return series
