from __future__ import annotations
"""Reusable RBAC helpers for resource ownership (e.g. employee-scoped edits)."""

from app.core.config import settings
from app.models.kyc_record import KYCRecord
from app.models.user import User, UserRole


def can_employee_modify_kyc_record(
    record: KYCRecord,
    *,
    actor_role: UserRole,
    actor_id: str,
) -> bool:
    """Admins always pass. Employees pass if they created the row or org policy allows."""
    if actor_role == UserRole.admin:
        return True
    if record.created_by_id != actor_id:
        return settings.employee_can_edit_others_records
    return True


def can_employee_modify_kyc_record_for_user(user: User, record: KYCRecord) -> bool:
    """Convenience when a full `User` is already loaded (e.g. route handlers)."""
    return can_employee_modify_kyc_record(
        record, actor_role=user.role, actor_id=user.id
    )
