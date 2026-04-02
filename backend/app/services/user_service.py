from __future__ import annotations
"""User management."""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.passwords import generate_temporary_password
from app.core.security import hash_password
from app.models.user import User
from app.repositories import refresh_token_repository, user_repository
from app.schemas.user import (
    AdminPasswordReset,
    AdminPasswordResetResponse,
    UserCreate,
    UserUpdate,
    UsernameUpdate,
)
from app.services import audit_service


async def create_user(
    session: AsyncSession,
    data: UserCreate,
    *,
    actor_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> User:
    existing = await user_repository.get_by_username(session, data.username)
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "اسم المستخدم موجود مسبقاً")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        is_active=True,
        must_change_password=False,
    )
    await user_repository.create_user(session, user)
    await audit_service.log(
        session,
        user_id=actor_id,
        action="user_created",
        resource_type="user",
        resource_id=user.id,
        details={"username": user.username, "role": user.role.value},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(user)
    return user


async def update_user(
    session: AsyncSession,
    user_id: str,
    data: UserUpdate,
    *,
    actor_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> User:
    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    prev_role = user.role.value
    prev_name = user.full_name

    name_changed = False
    if data.full_name is not None and data.full_name != user.full_name:
        user.full_name = data.full_name
        name_changed = True

    role_changed = False
    if data.role is not None and data.role != user.role:
        user.role = data.role
        role_changed = True

    await user_repository.update_user(session, user)

    if role_changed:
        await audit_service.log(
            session,
            user_id=actor_id,
            action="role_changed",
            resource_type="user",
            resource_id=user.id,
            details={"from": prev_role, "to": user.role.value},
            ip_address=ip_address,
            user_agent=user_agent,
        )
    if name_changed:
        await audit_service.log(
            session,
            user_id=actor_id,
            action="user_updated",
            resource_type="user",
            resource_id=user.id,
            details={"field": "full_name", "from": prev_name, "to": user.full_name},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    await session.commit()
    await session.refresh(user)
    return user


async def update_username(
    session: AsyncSession,
    user_id: str,
    data: UsernameUpdate,
    *,
    actor_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> User:
    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    taken = await user_repository.get_by_username(session, data.username)
    if taken and taken.id != user_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "اسم المستخدم مستخدم")
    old = user.username
    user.username = data.username
    await user_repository.update_user(session, user)
    await audit_service.log(
        session,
        user_id=actor_id,
        action="user_username_changed",
        resource_type="user",
        resource_id=user.id,
        details={"from": old, "to": user.username},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(user)
    return user


async def reset_password(
    session: AsyncSession,
    user_id: str,
    data: AdminPasswordReset,
    *,
    actor_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> AdminPasswordResetResponse:
    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    manual = (data.new_password or "").strip()
    if manual:
        plain = manual
        temporary = None
    else:
        plain = generate_temporary_password()
        temporary = plain
    user.hashed_password = hash_password(plain)
    user.must_change_password = True
    await user_repository.update_user(session, user)
    await refresh_token_repository.revoke_all_for_user(session, user.id)
    await audit_service.log(
        session,
        user_id=actor_id,
        action="password_reset_by_admin",
        resource_type="user",
        resource_id=user.id,
        details={
            "target_username": user.username,
            "generated": temporary is not None,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    return AdminPasswordResetResponse(
        message="تم إعادة تعيين كلمة المرور؛ على المستخدم تسجيل الدخول وكلمة المرور الجديدة.",
        temporary_password=temporary,
    )


async def set_active(
    session: AsyncSession,
    user_id: str,
    is_active: bool,
    *,
    actor_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> User:
    user = await user_repository.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المستخدم غير موجود")
    if user_id == actor_id and not is_active:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "لا يمكن تعطيل حسابك أثناء الجلسة الحالية",
        )
    user.is_active = is_active
    await user_repository.update_user(session, user)
    if not is_active:
        await refresh_token_repository.revoke_all_for_user(session, user.id)
    await audit_service.log(
        session,
        user_id=actor_id,
        action="user_deactivated" if not is_active else "user_activated",
        resource_type="user",
        resource_id=user.id,
        details={"username": user.username, "is_active": is_active},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(user)
    return user
