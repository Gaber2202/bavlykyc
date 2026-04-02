"""Partial index for common analytics filters (active KYC rows only)."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_kyc_records_analytics_created",
        "kyc_records",
        ["created_at", "created_by", "service_type"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_kyc_records_analytics_created", table_name="kyc_records")
