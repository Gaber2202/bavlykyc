"""Widen service_type; add relatives_kinship; migrate legacy service_type values."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "kyc_records",
        sa.Column("relatives_kinship", sa.String(length=120), nullable=True),
    )
    op.alter_column(
        "kyc_records",
        "service_type",
        existing_type=sa.String(length=50),
        type_=sa.String(length=80),
        existing_nullable=False,
    )
    op.execute(
        sa.text(
            """
            UPDATE kyc_records SET service_type = 'بافلي القاهرة'
            WHERE service_type = 'بافلي'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE kyc_records SET service_type = 'ترانس روفر القاهرة'
            WHERE service_type = 'ترانس روفر'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE kyc_records SET service_type = 'بافلي القاهرة'
            WHERE service_type = 'أخرى'
            """
        )
    )


def downgrade() -> None:
    op.drop_column("kyc_records", "relatives_kinship")
    op.alter_column(
        "kyc_records",
        "service_type",
        existing_type=sa.String(length=80),
        type_=sa.String(length=50),
        existing_nullable=False,
    )
