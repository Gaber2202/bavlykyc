from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status


def parse_optional_iso_date(raw: str | None, *, label_ar: str) -> date | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        return date.fromisoformat(raw.strip())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{label_ar}: تنسيق التاريخ غير صالح (YYYY-MM-DD)",
        ) from None
