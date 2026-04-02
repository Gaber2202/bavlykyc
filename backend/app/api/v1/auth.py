"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Body, Request

from app.api.client_ip import client_ip
from app.api.deps import CurrentUser, SessionDep, limiter
from app.core.config import settings
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    TokenPair,
    UserBrief,
)
from app.schemas.common import Message
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenPair)
@limiter.limit(settings.login_rate_limit)
async def login(
    db_session: SessionDep,
    payload: Annotated[LoginRequest, Body()],
    request: Request,
) -> TokenPair:
    _user, access, refresh = await auth_service.authenticate(
        db_session,
        payload.username,
        payload.password,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit(settings.auth_refresh_rate_limit)
async def refresh_tokens(
    db_session: SessionDep,
    payload: Annotated[RefreshRequest, Body()],
    request: Request,
) -> TokenPair:
    _user, access, refresh = await auth_service.refresh_session(
        db_session,
        payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
    )
    return TokenPair(access_token=access, refresh_token=refresh)


@router.get("/me", response_model=MeResponse)
async def me(current: CurrentUser) -> MeResponse:
    return MeResponse(
        user=UserBrief(
            id=current.id,
            username=current.username,
            full_name=current.full_name,
            role=current.role.value,
            is_active=current.is_active,
            must_change_password=current.must_change_password,
        ),
        kyc_employee_can_edit_others=settings.employee_can_edit_others_records,
    )


@router.post("/change-password", response_model=TokenPair)
@limiter.limit(settings.auth_change_password_rate_limit)
async def change_password(
    db_session: SessionDep,
    current: CurrentUser,
    payload: Annotated[ChangePasswordRequest, Body()],
    request: Request,
) -> TokenPair:
    access, refresh = await auth_service.change_own_password(
        db_session,
        current.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/logout", response_model=Message)
async def logout(
    db_session: SessionDep,
    current: CurrentUser,
    payload: Annotated[LogoutRequest, Body()],
) -> Message:
    await auth_service.logout(db_session, payload.refresh_token, current.id)
    return Message(message="تم تسجيل الخروج")
