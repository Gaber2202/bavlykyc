from __future__ import annotations
"""KYC assignment and validation helpers."""

from typing import Any

from app.constants.kyc_field_options import RELATIVES_KINSHIP_OPTIONS

YES = "نعم"
NO = "لا"


def resolve_assigned_to(service_type: str) -> tuple[str | None, bool]:
    """Assign owner from فرع الخدمة (بافلي → أحمد، ترانس روفر → محمود)."""
    st = (service_type or "").strip()
    if st.startswith("بافلي"):
        return "أحمد الشيخ", True
    if st.startswith("ترانس روفر"):
        return "محمود الشيخ", True
    return None, False


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

    hpa = data.get("has_property_assets")
    if hpa == YES:
        if not (data.get("property_assets_detail") or "").strip():
            errors.append("تفاصيل الأملاك مطلوبة عند اختيار نعم لوجود أملاك")
    else:
        if data.get("property_assets_detail"):
            errors.append("تفاصيل الأملاك غير مطلوبة عند لا لوجود أملاك")

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

    hrel = data.get("has_relatives_abroad")
    if hrel == YES:
        rk = (data.get("relatives_kinship") or "").strip()
        if not rk:
            errors.append("صلة القرابة مطلوبة عند نعم لوجود أقارب في الخارج")
        elif rk not in RELATIVES_KINSHIP_OPTIONS:
            errors.append("صلة القرابة غير ضمن القائمة المعتمدة")
    else:
        if data.get("relatives_kinship"):
            errors.append("صلة القرابة غير مطلوبة عند لا لوجود أقارب في الخارج")

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

    if out.get("has_relatives_abroad") != YES:
        out["relatives_kinship"] = None

    if out.get("has_property_assets") != YES:
        out["property_assets_detail"] = None

    return out
