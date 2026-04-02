from __future__ import annotations
"""User management (admin)."""

from typing import Annotated, Literal

from fastapi import APIRouter, Body, HTTPException, Query, Request, status

from app.api.deps import AdminUser, SessionDep
from app.models.user import UserRole
from app.repositories import user_repository
from app.schemas.common import PaginatedMeta, PaginatedResponse
from app.schemas.user import (
    AdminPasswordReset,
    AdminPasswordResetResponse,
    UserActivitySummary,
    UserCreate,
    UserRead,
    UserUpdate,
    UsernameUpdate,
)
from app.services import user_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UserRead])
async def list_users(
    db_session: SessionDep,
    _admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
    search: str | None = None,
    sort_by: str | None = Query(
        None,
        description="created_at|username|full_name|role|is_active|last_login_at",
    ),
    sort_order: Literal["asc", "desc"] = Query("desc"),
) -> PaginatedResponse[UserRead]:
    skip = (page - 1) * page_size
    rows, total = await user_repository.list_users(
        db_session,
        role=role,
        is_active=is_active,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=page_size,
    )
    await db_session.commit()
    return PaginatedResponse(
        items=[UserRead.model_validate(r) for r in rows],
        meta=PaginatedMeta(total=total, page=page, page_size=page_size),
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user_ep(
    db_session: SessionDep,
    admin: AdminUser,
    payload: Annotated[UserCreate, Body()],
    request: Request,
) -> UserRead:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    user = await user_service.create_user(
        db_session,
        payload,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    db_session: SessionDep,
    _admin: AdminUser,
) -> UserRead:
    u = await user_repository.get_by_id(db_session, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    await db_session.commit()
    return UserRead.model_validate(u)


@router.patch("/{user_id}", response_model=UserRead)
async def patch_user(
    request: Request,
    user_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    payload: Annotated[UserUpdate, Body()],
) -> UserRead:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    user = await user_service.update_user(
        db_session,
        user_id,
        payload,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )
    return UserRead.model_validate(user)


@router.patch("/{user_id}/username", response_model=UserRead)
async def patch_username(
    user_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    payload: Annotated[UsernameUpdate, Body()],
    request: Request,
) -> UserRead:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    user = await user_service.update_username(
        db_session,
        user_id,
        payload,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )
    return UserRead.model_validate(user)


@router.post("/{user_id}/reset-password", response_model=AdminPasswordResetResponse)
async def reset_password_ep(
    request: Request,
    user_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    payload: Annotated[AdminPasswordReset, Body()],
) -> AdminPasswordResetResponse:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    return await user_service.reset_password(
        db_session,
        user_id,
        payload,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/{user_id}/activate", response_model=UserRead)
async def activate_user(
    user_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    request: Request,
) -> UserRead:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    user = await user_service.set_active(
        db_session,
        user_id,
        True,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )
    return UserRead.model_validate(user)


@router.post("/{user_id}/deactivate", response_model=UserRead)
async def deactivate_user(
    user_id: str,
    db_session: SessionDep,
    admin: AdminUser,
    request: Request,
) -> UserRead:
    def _ip() -> str | None:
        if request.client:
            return request.client.host
        return None

    user = await user_service.set_active(
        db_session,
        user_id,
        False,
        actor_id=admin.id,
        ip_address=_ip(),
        user_agent=request.headers.get("user-agent"),
    )
    return UserRead.model_validate(user)


@router.get("/{user_id}/activity", response_model=UserActivitySummary)
async def user_activity(
    user_id: str,
    db_session: SessionDep,
    _admin: AdminUser,
) -> UserActivitySummary:
    u = await user_repository.get_by_id(db_session, user_id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    a_count, k_count = await user_repository.user_activity_summary(
        db_session, user_id
    )
    await db_session.commit()
    return UserActivitySummary(
        user_id=u.id,
        username=u.username,
        full_name=u.full_name,
        last_login_at=u.last_login_at,
        audit_events_last_30_days=a_count,
        kyc_created_count=k_count,
    )
