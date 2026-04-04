"""HTTP integration: login + POST /kyc (requires PostgreSQL at Alembic head + seeded user).

Run (from `backend/`):
  TEST_LOGIN_USERNAME=admin TEST_LOGIN_PASSWORD='your-password' \\
    PYTHONPATH=. python -m unittest tests.test_kyc_create_http -v

Skip if TEST_LOGIN_PASSWORD is unset (default in CI / fresh clones).
"""

from __future__ import annotations

import os
import unittest

from starlette.testclient import TestClient

from app.main import app


def _sample_kyc_json() -> dict:
    return {
        "employee_name": "HTTP Integration",
        "client_full_name": "Test Client HTTP",
        "age": 32,
        "passport_job_title": "Engineer",
        "other_job_title": None,
        "service_type": "ترانس روفر القاهرة",
        "assigned_to": "محمود الشيخ",
        "has_bank_statement": "لا",
        "available_balance": None,
        "expected_balance": 2000,
        "marital_status": "أعزب",
        "children_count": None,
        "has_relatives_abroad": "لا",
        "relatives_kinship": None,
        "nationality_type": "مصري",
        "nationality": None,
        "residency_status": None,
        "governorate": "الإسكندرية",
        "consultation_method": "فون",
        "email": "kyc-http-test@example.com",
        "phone_number": "01009998877",
        "whatsapp_number": "01009998877",
        "previous_rejected": "لا",
        "rejection_numbers": None,
        "rejection_reason": None,
        "rejection_country": None,
        "has_previous_visas": "لا",
        "previous_visa_countries": None,
        "recommendation": None,
        "status": "مسودة",
    }


@unittest.skipUnless(
    os.environ.get("TEST_LOGIN_PASSWORD", "").strip(),
    "Set TEST_LOGIN_PASSWORD (and optionally TEST_LOGIN_USERNAME) to run HTTP integration",
)
class TestKycCreateHttp(unittest.TestCase):
    def test_login_and_create_kyc(self) -> None:
        user = os.environ.get("TEST_LOGIN_USERNAME", "admin").strip()
        password = os.environ["TEST_LOGIN_PASSWORD"].strip()

        with TestClient(app) as client:
            login = client.post(
                "/api/v1/auth/login",
                json={"username": user, "password": password},
            )
            self.assertEqual(login.status_code, 200, login.text)
            token = login.json()["access_token"]

            r = client.post(
                "/api/v1/kyc",
                json=_sample_kyc_json(),
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(r.status_code, 201, r.text)
            data = r.json()
            self.assertIn("id", data)
            self.assertEqual(data["service_type"], "ترانس روفر القاهرة")
            self.assertEqual(data["assigned_to"], "محمود الشيخ")


if __name__ == "__main__":
    unittest.main()
