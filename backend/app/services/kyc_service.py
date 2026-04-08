from __future__ import annotations
"""KYC business logic."""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authz import can_employee_modify_kyc_record
from app.models.kyc_record import KYCRecord
from app.models.user import UserRole
from app.repositories import kyc_repository
from app.schemas.kyc import KYCCreate, KYCUpdate, build_kyc_dict_from_create, build_kyc_dict_from_update
from app.services import audit_service


async def create_kyc(
    session: AsyncSession,
    data: KYCCreate,
    *,
    user_id: str,
    role: UserRole,
    ip_address: str | None,
    user_agent: str | None,
) -> KYCRecord:
    is_admin = role == UserRole.admin
    try:
        payload = build_kyc_dict_from_create(data, user_id=user_id, is_admin=is_admin)
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e

    allowed = {c.key for c in KYCRecord.__mapper__.column_attrs}
    row = KYCRecord(**{k: v for k, v in payload.items() if k in allowed})
    await kyc_repository.create_kyc(session, row)
    await audit_service.log(
        session,
        user_id=user_id,
        action="kyc_created",
        resource_type="kyc",
        resource_id=row.id,
        details={"client": row.client_full_name},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(row)
    return row


async def update_kyc(
    session: AsyncSession,
    kyc_id: str,
    data: KYCUpdate,
    *,
    user_id: str,
    role: UserRole,
    ip_address: str | None,
    user_agent: str | None,
) -> KYCRecord:
    row = await kyc_repository.get_by_id(session, kyc_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السجل غير موجود")
    if not can_employee_modify_kyc_record(
        row, actor_role=role, actor_id=user_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "لا يمكن التعديل")

    is_admin = role == UserRole.admin
    try:
        merged = build_kyc_dict_from_update(
            row, data, user_id=user_id, is_admin=is_admin
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e)) from e

    writable = {c.key for c in KYCRecord.__mapper__.column_attrs} - {
        "id",
        "created_at",
        "created_by_id",
        "soft_deleted_at",
    }
    for key, val in merged.items():
        if key in writable:
            setattr(row, key, val)
    await kyc_repository.update_kyc(session, row)
    await audit_service.log(
        session,
        user_id=user_id,
        action="kyc_updated",
        resource_type="kyc",
        resource_id=row.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
    await session.refresh(row)
    return row


async def soft_delete_kyc(
    session: AsyncSession,
    kyc_id: str,
    *,
    user_id: str,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    row = await kyc_repository.get_by_id(session, kyc_id, include_deleted=True)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السجل غير موجود")
    if row.soft_deleted_at is not None:
        return
    await kyc_repository.soft_delete(session, row)
    await audit_service.log(
        session,
        user_id=user_id,
        action="kyc_deleted",
        resource_type="kyc",
        resource_id=kyc_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await session.commit()
