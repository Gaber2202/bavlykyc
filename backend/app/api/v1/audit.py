from __future__ import annotations
"""Audit log listing (admin)."""

from fastapi import APIRouter, Query
from typing import Literal

from app.api.deps import AdminUser, SessionDep
from app.repositories import audit_repository
from app.schemas.audit import AuditLogRead
from app.schemas.common import PaginatedMeta, PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[AuditLogRead])
async def list_audit(
    db_session: SessionDep,
    _admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: str | None = None,
    user_id: str | None = None,
    sort_by: str | None = Query(
        None,
        description="created_at|action|user_id|resource_id",
    ),
    sort_order: Literal["asc", "desc"] = Query("desc"),
) -> PaginatedResponse[AuditLogRead]:
    skip = (page - 1) * page_size
    rows, total = await audit_repository.list_logs(
        db_session,
        skip=skip,
        limit=page_size,
        action=action,
        user_id_filter=user_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return PaginatedResponse(
        items=[AuditLogRead.model_validate(r) for r in rows],
        meta=PaginatedMeta(total=total, page=page, page_size=page_size),
    )
