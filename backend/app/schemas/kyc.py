from __future__ import annotations
"""KYC schemas with conditional validation."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import EmailStr, Field, model_validator

from app.schemas.common import APIModel, StrictInputModel
from app.constants.kyc_field_options import ServiceBranchLiteral
from app.utils.kyc_rules import (
    validate_kyc_conditional_fields,
    clear_conditional_fields_for_write,
    resolve_assigned_to,
)

YesNoLiteral = Literal["نعم", "لا"]
MaritalLiteral = Literal["أعزب", "متزوج", "مطلق", "أرمل"]
NationalityTypeLiteral = Literal["مصري", "غير مصري"]
ConsultationLiteral = Literal["مقابلة", "فون", "فيديوكول"]
StatusLiteral = Literal[
    "مسودة", "قيد المراجعة", "موافق", "مرفوض", "مكتمل"
]


class KYCBaseFields(StrictInputModel):
    employee_name: str = Field(..., min_length=1, max_length=255)
    client_full_name: str = Field(..., min_length=1, max_length=255)
    age: int = Field(..., ge=0, le=120)
    passport_job_title: str = Field(..., min_length=1, max_length=255)
    other_job_title: str | None = Field(None, max_length=255)

    service_type: ServiceBranchLiteral

    has_bank_statement: YesNoLiteral
    available_balance: Decimal | None = None
    expected_balance: Decimal | None = None

    marital_status: MaritalLiteral
    children_count: int | None = Field(None, ge=0, le=50)

    has_relatives_abroad: YesNoLiteral
    relatives_kinship: str | None = Field(None, max_length=120)
    nationality_type: NationalityTypeLiteral
    nationality: str | None = Field(None, max_length=120)
    residency_status: YesNoLiteral | None = None
    governorate: str = Field(..., min_length=1, max_length=120)

    consultation_method: ConsultationLiteral
    email: EmailStr = Field(..., max_length=255)
    phone_number: str = Field(..., min_length=3, max_length=50)
    whatsapp_number: str = Field(..., min_length=3, max_length=50)

    previous_rejected: YesNoLiteral
    rejection_numbers: str | None = Field(None, max_length=120)
    rejection_reason: str | None = None
    rejection_country: str | None = Field(None, max_length=120)

    has_previous_visas: YesNoLiteral
    previous_visa_countries: str | None = None

    recommendation: str | None = None
    status: StatusLiteral = "مسودة"

    @model_validator(mode="after")
    def conditional_checks(self) -> "KYCBaseFields":
        data = self.model_dump()
        errs = validate_kyc_conditional_fields(data)
        if errs:
            raise ValueError("; ".join(errs))
        return self


class KYCCreate(KYCBaseFields):
    pass


class KYCUpdate(StrictInputModel):
    employee_name: str | None = Field(None, min_length=1, max_length=255)
    client_full_name: str | None = Field(None, min_length=1, max_length=255)
    age: int | None = Field(None, ge=0, le=120)
    passport_job_title: str | None = Field(None, min_length=1, max_length=255)
    other_job_title: str | None = None
    service_type: ServiceBranchLiteral | None = None
    has_bank_statement: YesNoLiteral | None = None
    available_balance: Decimal | None = None
    expected_balance: Decimal | None = None
    marital_status: MaritalLiteral | None = None
    children_count: int | None = Field(None, ge=0, le=50)
    has_relatives_abroad: YesNoLiteral | None = None
    relatives_kinship: str | None = Field(None, max_length=120)
    nationality_type: NationalityTypeLiteral | None = None
    nationality: str | None = None
    residency_status: YesNoLiteral | None = None
    governorate: str | None = Field(None, min_length=1, max_length=120)
    consultation_method: ConsultationLiteral | None = None
    email: EmailStr | None = Field(None, max_length=255)
    phone_number: str | None = Field(None, min_length=3, max_length=50)
    whatsapp_number: str | None = Field(None, min_length=3, max_length=50)
    previous_rejected: YesNoLiteral | None = None
    rejection_numbers: str | None = None
    rejection_reason: str | None = None
    rejection_country: str | None = None
    has_previous_visas: YesNoLiteral | None = None
    previous_visa_countries: str | None = None
    recommendation: str | None = None
    status: StatusLiteral | None = None


def merge_kyc_for_validation(
    existing: dict[str, Any], patch: dict[str, Any]
) -> dict[str, Any]:
    merged = {**existing, **{k: v for k, v in patch.items() if v is not None}}
    return merged


class KYCRead(APIModel):
    id: str
    employee_name: str
    client_full_name: str
    age: int
    passport_job_title: str
    other_job_title: str | None
    service_type: str
    assigned_to: str | None
    assigned_by_rule: bool
    has_bank_statement: str
    available_balance: Decimal | None
    expected_balance: Decimal | None
    marital_status: str
    children_count: int | None
    has_relatives_abroad: str
    relatives_kinship: str | None
    nationality_type: str
    nationality: str | None
    residency_status: str | None
    governorate: str
    consultation_method: str
    email: str
    phone_number: str
    whatsapp_number: str
    previous_rejected: str
    rejection_numbers: str | None
    rejection_reason: str | None
    rejection_country: str | None
    has_previous_visas: str
    previous_visa_countries: str | None
    recommendation: str | None
    status: str
    created_by_id: str
    updated_by_id: str | None
    created_at: datetime
    updated_at: datetime
    soft_deleted_at: datetime | None


class KYCListQuery(StrictInputModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=500)
    search: str | None = Field(None, max_length=200)
    service_type: str | None = None
    status: str | None = None
    created_by_id: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    include_deleted: bool = False


def build_kyc_dict_from_create(
    payload: KYCCreate,
    *,
    user_id: str,
    is_admin: bool,
) -> dict[str, Any]:
    raw = payload.model_dump()
    assigned, by_rule = resolve_assigned_to(payload.service_type)
    raw["assigned_to"] = assigned
    raw["assigned_by_rule"] = by_rule
    cleared = clear_conditional_fields_for_write(raw)
    cleared["created_by_id"] = user_id
    cleared["updated_by_id"] = user_id
    return cleared


def build_kyc_dict_from_update(
    existing_row: Any,
    payload: KYCUpdate,
    *,
    user_id: str,
    is_admin: bool,
) -> dict[str, Any]:
    patch = payload.model_dump(exclude_unset=True)
    current = {
        "employee_name": existing_row.employee_name,
        "client_full_name": existing_row.client_full_name,
        "age": existing_row.age,
        "passport_job_title": existing_row.passport_job_title,
        "other_job_title": existing_row.other_job_title,
        "service_type": existing_row.service_type,
        "assigned_to": existing_row.assigned_to,
        "assigned_by_rule": existing_row.assigned_by_rule,
        "has_bank_statement": existing_row.has_bank_statement,
        "available_balance": existing_row.available_balance,
        "expected_balance": existing_row.expected_balance,
        "marital_status": existing_row.marital_status,
        "children_count": existing_row.children_count,
        "has_relatives_abroad": existing_row.has_relatives_abroad,
        "relatives_kinship": existing_row.relatives_kinship,
        "nationality_type": existing_row.nationality_type,
        "nationality": existing_row.nationality,
        "residency_status": existing_row.residency_status,
        "governorate": existing_row.governorate,
        "consultation_method": existing_row.consultation_method,
        "email": existing_row.email,
        "phone_number": existing_row.phone_number,
        "whatsapp_number": existing_row.whatsapp_number,
        "previous_rejected": existing_row.previous_rejected,
        "rejection_numbers": existing_row.rejection_numbers,
        "rejection_reason": existing_row.rejection_reason,
        "rejection_country": existing_row.rejection_country,
        "has_previous_visas": existing_row.has_previous_visas,
        "previous_visa_countries": existing_row.previous_visa_countries,
        "recommendation": existing_row.recommendation,
        "status": existing_row.status,
    }
    merged = {**current, **patch}
    if "service_type" in patch:
        assigned, by_rule = resolve_assigned_to(str(merged["service_type"]))
        merged["assigned_to"] = assigned
        merged["assigned_by_rule"] = by_rule
    merged["updated_by_id"] = user_id
    errs = validate_kyc_conditional_fields(merged)
    if errs:
        raise ValueError("; ".join(errs))
    return clear_conditional_fields_for_write(merged)
