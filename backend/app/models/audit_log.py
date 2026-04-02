from __future__ import annotations

"""Audit trail entries."""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    # Attribute names kept for backward compatibility with existing code,
    # while the actual DB column names match the required schema.
    user_id: Mapped[Optional[str]] = mapped_column(
        "actor_user_id",
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(80), index=True)
    # Column names follow the required schema.
    resource_type: Mapped[Optional[str]] = mapped_column(
        "entity_type", String(80), nullable=True
    )
    resource_id: Mapped[Optional[str]] = mapped_column(
        "entity_id", String(64), nullable=True, index=True
    )
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "metadata", JSONB, nullable=True
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
