from __future__ import annotations
"""KYC assignment and validation helpers."""

from decimal import Decimal
from typing import Any

SERVICE_TYPE_ASSIGNEE: dict[str, str | None] = {
    "بافلي": "أحمد الشيخ",
    "ترانس روفر": "محمود الشيخ",
    "أخرى": None,
}

YES = "نعم"
NO = "لا"


def resolve_assigned_to(
    service_type: str,
    manual_assigned_to: str | None,
    is_admin: bool,
) -> tuple[str | None, bool]:
    """Return (assigned_to, assigned_by_rule). Admin may override for أخرى."""
    base = SERVICE_TYPE_ASSIGNEE.get(service_type)
    if service_type == "أخرى":
        if is_admin and manual_assigned_to and manual_assigned_to.strip():
            return manual_assigned_to.strip(), False
        # Rule result: empty assignment when service type is "أخرى" unless admin overrides.
        return None, True
    if base:
        return base, True
    if manual_assigned_to and manual_assigned_to.strip() and is_admin:
        return manual_assigned_to.strip(), False
    return manual_assigned_to.strip() if manual_assigned_to else None, False


def validate_kyc_conditional_fields(data: dict[str, Any]) -> list[str]:
    """Return list of validation error messages (empty if valid)."""
    errors: list[str] = []
    hbs = data.get("has_bank_statement")
    if hbs == YES:
        if data.get("available_balance") is None:
            errors.append("available_balance مطلوب عند اختيار نعم لكشف الحساب")
        if data.get("expected_balance") is not None:
            errors.append("يجب عدم إدخال الرصيد المتوقع عند نعم لكشف الحساب")
    elif hbs == NO:
        if data.get("expected_balance") is None:
            errors.append("expected_balance مطلوب عند اختيار لا لكشف الحساب")
        if data.get("available_balance") is not None:
            errors.append("يجب عدم إدخال الرصيد المتاح عند لا لكشف الحساب")

    ms = data.get("marital_status")
    if ms == "متزوج":
        if data.get("children_count") is None:
            errors.append("عدد الأطفال مطلوب للمتزوج")
    else:
        if data.get("children_count") is not None:
            errors.append("عدد الأطفال غير مطلوب إلا للمتزوج")

    nt = data.get("nationality_type")
    if nt == "غير مصري":
        if not (data.get("nationality") or "").strip():
            errors.append("الجنسية مطلوبة لغير المصري")
        if data.get("residency_status") not in (YES, NO):
            errors.append("حالة الإقامة مطلوبة لغير المصري")
    else:
        if data.get("nationality"):
            errors.append("الجنسية غير مطلوبة للمصري")
        if data.get("residency_status"):
            errors.append("حالة الإقامة غير مطلوبة للمصري")

    pr = data.get("previous_rejected")
    if pr == YES:
        for key, label in (
            ("rejection_numbers", "أرقام الرفض"),
            ("rejection_reason", "سبب الرفض"),
            ("rejection_country", "دولة الرفض"),
        ):
            v = data.get(key)
            if v is None or (isinstance(v, str) and not str(v).strip()):
                errors.append(f"{label} مطلوب عند وجود رفض سابق")
    else:
        for key in ("rejection_numbers", "rejection_reason", "rejection_country"):
            if data.get(key):
                errors.append("حقول الرفض غير مطلوبة عند عدم وجود رفض سابق")

    hpv = data.get("has_previous_visas")
    if hpv == YES:
        v = data.get("previous_visa_countries")
        if v is None or (isinstance(v, str) and not str(v).strip()):
            errors.append("دول التأشيرات السابقة مطلوبة")
    else:
        if data.get("previous_visa_countries"):
            errors.append("دول التأشيرات غير مطلوبة عند لا")

    return errors


def clear_conditional_fields_for_write(data: dict[str, Any]) -> dict[str, Any]:
    """Apply clearing rules so stored payload matches conditional logic."""
    out = {**data}
    hbs = out.get("has_bank_statement")
    if hbs == YES:
        out["expected_balance"] = None
    elif hbs == NO:
        out["available_balance"] = None

    if out.get("marital_status") != "متزوج":
        out["children_count"] = None

    if out.get("nationality_type") != "غير مصري":
        out["nationality"] = None
        out["residency_status"] = None

    if out.get("previous_rejected") != YES:
        out["rejection_numbers"] = None
        out["rejection_reason"] = None
        out["rejection_country"] = None

    if out.get("has_previous_visas") != YES:
        out["previous_visa_countries"] = None

    return out
