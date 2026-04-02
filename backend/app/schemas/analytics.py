from __future__ import annotations
"""Analytics API schemas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.schemas.common import APIModel


class AnalyticsFilters(APIModel):
    date_from: date | None = None
    date_to: date | None = None
    employee_id: str | None = None
    service_type: str | None = None


class KPISummary(APIModel):
    total_submissions: int
    submissions_today: int
    submissions_this_week: int
    submissions_this_month: int
    active_employees: int
    average_age: float | None
    rejection_rate: float | None = Field(
        description="Share (%) of records with status مرفوض in the filtered set."
    )
    prior_refusal_rate: float | None = Field(
        description="Share (%) with previous_rejected=نعم in the filtered set."
    )


class NamedCount(APIModel):
    name: str
    count: int


class TrendPoint(APIModel):
    period: str
    count: int


class FunnelStage(APIModel):
    status: str
    count: int


class AnalyticsSummaryResponse(APIModel):
    kpi: KPISummary
    by_service_type: list[NamedCount]
    by_status: list[NamedCount]
    previous_visa_ratio: dict[str, float]
    nationality_split: list[NamedCount]
    marital_split: list[NamedCount]
    top_employees: list[NamedCount]
    trend_daily: list[TrendPoint]
    trend_weekly: list[TrendPoint] = []
    trend_monthly: list[TrendPoint] = []
    funnel_by_status: list[FunnelStage]


class AnalyticsExportRow(APIModel):
    """Flat row for export clients."""

    id: str
    client_full_name: str
    service_type: str
    status: str
    created_at: datetime
    created_by_username: str | None
    age: int
    has_previous_visas: str
    previous_rejected: str
