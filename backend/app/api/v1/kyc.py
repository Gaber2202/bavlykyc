from __future__ import annotations
"""KYC CRUD and listing."""

from typing import Annotated, Literal

from fastapi import APIRouter, Body, HTTPException, Query, Request, status
from starlette.responses import Response

from app.api.client_ip import client_ip
from app.api.deps import AdminUser, CurrentUser, SessionDep
from app.models.user import UserRole
from app.repositories import kyc_repository
from app.schemas.common import PaginatedMeta, PaginatedResponse
from app.schemas.kyc import KYCRead, KYCCreate, KYCUpdate
from app.services import kyc_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[KYCRead])
async def list_kyc_ep(
    db_session: SessionDep,
    current: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    search: str | None = Query(
        None, description="بحث عام في اسم العميل والهاتف والبريد والموظف"
    ),
    client_name: str | None = Query(None, description="تصفية باسم العميل (جزئي)"),
    phone: str | None = Query(None, description="تصفية برقم الهاتف (جزئي)"),
    service_type: str | None = None,
    status: str | None = None,
    created_by_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str | None = Query(None, description="created_at|status|service_type|client_full_name|employee_name|assigned_to|age"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    include_deleted: bool = False,
) -> PaginatedResponse[KYCRead]:
    from datetime import datetime, timezone

    if current.role != UserRole.admin:
        created_by_id = current.id
        include_deleted = False

    df = None
    dt = None
    if date_from:
        try:
            df = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError as e:
            raise HTTPException(422, "date_from غير صالح") from e
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError as e:
            raise HTTPException(422, "date_to غير صالح") from e

    skip = (page - 1) * page_size
    rows, total = await kyc_repository.list_kyc(
        db_session,
        skip=skip,
        limit=page_size,
        search=search,
        client_name=client_name,
        phone=phone,
        service_type=service_type,
        status=status,
        created_by_id=created_by_id,
        date_from=df,
        date_to=dt,
        sort_by=sort_by,
        sort_order=sort_order,
        include_deleted=include_deleted if current.role == UserRole.admin else False,
    )
    return PaginatedResponse(
        items=[KYCRead.model_validate(r) for r in rows],
        meta=PaginatedMeta(total=total, page=page, page_size=page_size),
    )


@router.post("", response_model=KYCRead, status_code=status.HTTP_201_CREATED)
async def create_kyc_ep(
    db_session: SessionDep,
    current: CurrentUser,
    payload: Annotated[KYCCreate, Body()],
    request: Request,
) -> KYCRead:
    row = await kyc_service.create_kyc(
        db_session,
        payload,
        user_id=current.id,
        role=current.role,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return KYCRead.model_validate(row)


@router.get("/{kyc_id}", response_model=KYCRead)
async def get_kyc(
    kyc_id: str,
    db_session: SessionDep,
    current: CurrentUser,
) -> KYCRead:
    row = await kyc_repository.get_by_id(
        db_session, kyc_id, include_deleted=current.role == UserRole.admin
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السجل غير موجود")
    if current.role != UserRole.admin and row.created_by_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السجل غير موجود")
    return KYCRead.model_validate(row)


@router.patch("/{kyc_id}", response_model=KYCRead)
async def update_kyc_ep(
    kyc_id: str,
    db_session: SessionDep,
    current: CurrentUser,
    payload: Annotated[KYCUpdate, Body()],
    request: Request,
) -> KYCRead:
    row = await kyc_service.update_kyc(
        db_session,
        kyc_id,
        payload,
        user_id=current.id,
        role=current.role,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return KYCRead.model_validate(row)


@router.delete("/{kyc_id}", response_class=Response)
async def delete_kyc_ep(
    kyc_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    request: Request,
) -> Response:
    await kyc_service.soft_delete_kyc(
        db_session,
        kyc_id,
        user_id=admin.id,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
