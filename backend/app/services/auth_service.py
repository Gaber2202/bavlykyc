from __future__ import annotations
"""Authentication orchestration."""

import hashlib
import hmac
from datetime import datetime, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories import refresh_token_repository, user_repository
from app.services import audit_service


def _username_audit_hmac(username: str) -> str:
    """Opaque stable id for correlating failed logins without storing raw usernames."""
    from app.core.config import settings

    return hmac.new(
        settings.secret_key.encode("utf-8"),
        username.strip().lower().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]


async def authenticate(
    session: AsyncSession,
    username: str,
    password: str,
    *,
    ip_address: str | None,
    user_agent: str | None,
) -> tuple[User, str, str]:
    user = await user_repository.get_by_username(session, username)
    if user is None:
        await audit_service.log(
            session,
            user_id=None,
            action="login_failed",
            details={
                "user_key": _username_audit_hmac(username),
                "reason": "invalid_credentials",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="بيانات الدخول غير صحيحة",
        )
    if not user.is_active:
        await audit_service.log(
            session,
            user_id=user.id,
            action="login_failed",
            details={
                "user_key": _username_audit_hmac(username),
                "reason": "account_inactive",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="بيانات الدخول غير صحيحة",
        )
    if not verify_password(password, user.hashed_password):
        await audit_service.log(
            session,
            user_id=user.id,
            action="login_failed",
            details={
                "user_key": _username_audit_hmac(username),
                "reason": "bad_password",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="بيانات الدخول غير صحيحة",
        )

    access = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value},
    )
    refresh_plain = create_refresh_token(user.id)
    payload = decode_token(refresh_plain)
    exp_ts = payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
    await refresh_token_repository.store_token(
        session,
        user_id=user.id,
        token=refresh_plain,
        expires_at=expires_at,
        user_agent=user_agent,
    )

    user.last_login_at = datetime.now(timezone.utc)
    await audit_service.log(
        session,
        user_id=user.id,
        action="login",
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(user)
    return user, access, refresh_plain


async def change_own_password(
    session: AsyncSession,
    user_id: str,
    *,
    current_password: str,
    new_password: str,
    ip_address: str | None,
    user_agent: str | None,
) -> tuple[str, str]:
    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود",
        )
    if not verify_password(current_password, user.hashed_password):
        await audit_service.log(
            session,
            user_id=user_id,
            action="password_change_failed",
            details={"reason": "bad_current_password"},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="كلمة المرور الحالية غير صحيحة",
        )
    user.hashed_password = hash_password(new_password)
    user.must_change_password = False
    await user_repository.update_user(session, user)
    await refresh_token_repository.revoke_all_for_user(session, user_id)

    access = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role.value},
    )
    refresh_plain = create_refresh_token(user.id)
    payload = decode_token(refresh_plain)
    exp_ts = payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
    await refresh_token_repository.store_token(
        session,
        user_id=user.id,
        token=refresh_plain,
        expires_at=expires_at,
        user_agent=user_agent,
    )

    await audit_service.log(
        session,
        user_id=user_id,
        action="password_changed_self",
        resource_type="user",
        resource_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    return access, refresh_plain


async def refresh_session(
    session: AsyncSession,
    refresh_token: str,
    *,
    user_agent: str | None,
) -> tuple[User, str, str]:
    try:
        payload = decode_token(refresh_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="انتهت صلاحية رمز التحديث أو أنه غير صالح",
        ) from exc
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="نوع الرمز غير صالح",
        )

    row = await refresh_token_repository.get_valid_by_hash(session, refresh_token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز التحديث ملغى أو منتهي الصلاحية",
        )
    sub = payload.get("sub")
    if sub is None or str(sub) != str(row.user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز التحديث لا يطابق الجلسة المحفوظة",
        )

    user = await user_repository.get_by_id(session, str(sub))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="المستخدم غير نشط أو غير موجود",
        )

    await refresh_token_repository.revoke_by_hash(session, refresh_token)

    access = create_access_token(
        subject=user.id, extra_claims={"role": user.role.value}
    )
    new_refresh = create_refresh_token(user.id)
    new_payload = decode_token(new_refresh)
    exp_ts = new_payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
    await refresh_token_repository.store_token(
        session,
        user_id=user.id,
        token=new_refresh,
        expires_at=expires_at,
        user_agent=user_agent,
    )
    await session.commit()
    return user, access, new_refresh


async def logout(
    session: AsyncSession,
    refresh_token: str | None,
    user_id: str,
) -> None:
    if refresh_token:
        await refresh_token_repository.revoke_by_hash(session, refresh_token)
    await session.commit()
