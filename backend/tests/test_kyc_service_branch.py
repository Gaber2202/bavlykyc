"""Regression: فرع الخدمة literals must match frontend + DB string column."""

from __future__ import annotations

import unittest
from decimal import Decimal

from pydantic import ValidationError

from app.constants.kyc_field_options import SERVICE_BRANCH_OPTIONS
from app.schemas.kyc import KYCCreate, build_kyc_dict_from_create
from app.utils.kyc_rules import resolve_assigned_to


def _minimal_create(**overrides: object) -> dict:
    base: dict = {
        "employee_name": "موظف",
        "client_full_name": "عميل",
        "age": 30,
        "passport_job_title": "مهندس",
        "other_job_title": None,
        "service_type": SERVICE_BRANCH_OPTIONS[0],
        "assigned_to": "أحمد الشيخ",
        "has_bank_statement": "لا",
        "available_balance": None,
        "expected_balance": Decimal("1000"),
        "marital_status": "أعزب",
        "children_count": None,
        "has_relatives_abroad": "لا",
        "relatives_kinship": None,
        "nationality_type": "مصري",
        "nationality": None,
        "residency_status": None,
        "governorate": "القاهرة",
        "consultation_method": "مقابلة",
        "email": "user@example.com",
        "phone_number": "01000000000",
        "whatsapp_number": "01000000000",
        "previous_rejected": "لا",
        "rejection_numbers": None,
        "rejection_reason": None,
        "rejection_country": None,
        "has_previous_visas": "لا",
        "previous_visa_countries": None,
        "recommendation": None,
        "status": "مسودة",
    }
    base.update(overrides)
    return base


class TestKycServiceBranch(unittest.TestCase):
    def test_each_service_branch_accepted(self) -> None:
        for branch in SERVICE_BRANCH_OPTIONS:
            with self.subTest(branch=branch):
                rule_a, _ = resolve_assigned_to(branch)
                row = KYCCreate.model_validate(
                    _minimal_create(service_type=branch, assigned_to=rule_a or "—"),
                )
                self.assertEqual(row.service_type, branch)

    def test_legacy_short_branch_rejected(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            KYCCreate.model_validate(
                _minimal_create(service_type="بافلي", assigned_to="أحمد الشيخ")
            )
        errs = ctx.exception.errors()
        self.assertTrue(any(e.get("loc") == ("service_type",) for e in errs))

    def test_relatives_kinship_required_when_abroad_yes(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            KYCCreate.model_validate(
                _minimal_create(
                    has_relatives_abroad="نعم",
                    relatives_kinship=None,
                )
            )
        msg = str(ctx.exception)
        self.assertIn("صلة القرابة", msg)

    def test_relatives_kinship_must_be_allowed_option(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            KYCCreate.model_validate(
                _minimal_create(
                    has_relatives_abroad="نعم",
                    relatives_kinship="قيمة عشوائية",
                )
            )
        msg = str(ctx.exception)
        self.assertIn("صلة القرابة", msg)

    def test_assigned_by_rule_true_when_matches_branch_default(self) -> None:
        branch = SERVICE_BRANCH_OPTIONS[0]
        rule_a, _ = resolve_assigned_to(branch)
        payload = KYCCreate.model_validate(
            _minimal_create(service_type=branch, assigned_to=rule_a or "—"),
        )
        d = build_kyc_dict_from_create(payload, user_id="00000000-0000-0000-0000-000000000001", is_admin=True)
        self.assertTrue(d["assigned_by_rule"])

    def test_assigned_by_rule_false_when_other_dropdown_value(self) -> None:
        """بافلي branch defaults to أحمد; choosing محمود is a manual assignment."""
        branch = SERVICE_BRANCH_OPTIONS[0]
        payload = KYCCreate.model_validate(
            _minimal_create(service_type=branch, assigned_to="محمود الشيخ"),
        )
        d = build_kyc_dict_from_create(payload, user_id="00000000-0000-0000-0000-000000000001", is_admin=True)
        self.assertEqual(d["assigned_to"], "محمود الشيخ")
        self.assertFalse(d["assigned_by_rule"])

    def test_invalid_assignee_rejected(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            KYCCreate.model_validate(
                {**_minimal_create(), "assigned_to": "غير معروف"},
            )
        self.assertTrue(any(e.get("loc") == ("assigned_to",) for e in ctx.exception.errors()))


if __name__ == "__main__":
    unittest.main()
