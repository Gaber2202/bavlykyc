from __future__ import annotations

"""KYC submission record."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class KYCRecord(Base):
    __tablename__ = "kyc_records"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )

    employee_name: Mapped[str] = mapped_column(String(255), index=True)
    client_full_name: Mapped[str] = mapped_column(String(255), index=True)
    age: Mapped[int] = mapped_column(Integer)
    passport_job_title: Mapped[str] = mapped_column(String(255))
    other_job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    service_type: Mapped[str] = mapped_column(String(50), index=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    assigned_by_rule: Mapped[bool] = mapped_column(default=True)

    has_bank_statement: Mapped[str] = mapped_column(String(10))
    available_balance: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    expected_balance: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(14, 2), nullable=True
    )

    marital_status: Mapped[str] = mapped_column(String(20))
    children_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    has_relatives_abroad: Mapped[str] = mapped_column(String(10))
    nationality_type: Mapped[str] = mapped_column(String(20), index=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    residency_status: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    governorate: Mapped[str] = mapped_column(String(120))

    consultation_method: Mapped[str] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone_number: Mapped[str] = mapped_column(String(50), index=True)
    whatsapp_number: Mapped[str] = mapped_column(String(50))

    previous_rejected: Mapped[str] = mapped_column(String(10))
    rejection_numbers: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_country: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    has_previous_visas: Mapped[str] = mapped_column(String(10))
    previous_visa_countries: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), index=True, default="مسودة")

    # Attribute names kept for backward compatibility with existing code,
    # while the actual DB column names match the required schema.
    created_by_id: Mapped[str] = mapped_column(
        "created_by",
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
    )
    updated_by_id: Mapped[Optional[str]] = mapped_column(
        "updated_by",
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    soft_deleted_at: Mapped[Optional[datetime]] = mapped_column(
        "deleted_at", DateTime(timezone=True), nullable=True, index=True
    )

    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by_id], back_populates="kyc_created"
    )
    updater: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[updated_by_id]
    )
