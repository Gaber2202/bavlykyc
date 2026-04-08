"""KYC: property assets, USD/bank accounts, commercial register + tax card."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "kyc_records",
        sa.Column("has_property_assets", sa.String(length=10), nullable=False, server_default="لا"),
    )
    op.add_column(
        "kyc_records",
        sa.Column("property_assets_detail", sa.Text(), nullable=True),
    )
    op.add_column(
        "kyc_records",
        sa.Column("has_usd_account", sa.String(length=10), nullable=False, server_default="لا"),
    )
    op.add_column(
        "kyc_records",
        sa.Column("has_bank_account", sa.String(length=10), nullable=False, server_default="لا"),
    )
    op.add_column(
        "kyc_records",
        sa.Column(
            "has_commercial_register_and_tax_card",
            sa.String(length=10),
            nullable=False,
            server_default="لا",
        ),
    )
    op.alter_column("kyc_records", "has_property_assets", server_default=None)
    op.alter_column("kyc_records", "has_usd_account", server_default=None)
    op.alter_column("kyc_records", "has_bank_account", server_default=None)
    op.alter_column("kyc_records", "has_commercial_register_and_tax_card", server_default=None)


def downgrade() -> None:
    op.drop_column("kyc_records", "has_commercial_register_and_tax_card")
    op.drop_column("kyc_records", "has_bank_account")
    op.drop_column("kyc_records", "has_usd_account")
    op.drop_column("kyc_records", "property_assets_detail")
    op.drop_column("kyc_records", "has_property_assets")
