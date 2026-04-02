from __future__ import annotations
"""Shared API dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token_safe
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories import user_repository

limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)


SessionDep = Annotated[AsyncSession, Depends(get_db)]


def _paths_ok_when_must_change_password(request_path: str) -> bool:
    base = settings.api_v1_prefix.rstrip("/")
    allowed = {
        f"{base}/auth/me",
        f"{base}/auth/change-password",
        f"{base}/auth/logout",
        f"{base}/auth/refresh",
    }
    return request_path in allowed


async def get_current_user_optional(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(security)
    ],
    db_session: SessionDep,
) -> User | None:
    if credentials is None:
        return None
    payload = decode_token_safe(credentials.credentials)
    if not payload or payload.get("type") != "access":
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    user = await user_repository.get_by_id(db_session, str(uid))
    if user is None:
        return None
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب. تواصل مع المسؤول لإعادة التفعيل.",
        )
    request.state.user_id = user.id
    return user


async def get_current_user(
    user: Annotated[User | None, Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="مطلوب تسجيل الدخول أو الرمز غير صالح",
        )
    return user


async def require_active_account(
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db_session: SessionDep,
) -> User:
    """Re-load user so deactivation mid-session takes effect without waiting for token expiry."""
    db_user = await user_repository.get_by_id(db_session, user.id)
    if db_user is None or not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب أو لم يعد موجوداً.",
        )
    if db_user.must_change_password and not _paths_ok_when_must_change_password(
        request.url.path
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="يجب تغيير كلمة المرور قبل استخدام النظام.",
        )
    return db_user


async def require_admin(
    user: Annotated[User, Depends(require_active_account)],
) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="يتطلب صلاحيات المسؤول",
        )
    return user


CurrentUser = Annotated[User, Depends(require_active_account)]
AdminUser = Annotated[User, Depends(require_admin)]
