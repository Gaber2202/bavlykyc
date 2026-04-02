"""Add must_change_password to users."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_users_must_change_password",
        "users",
        ["must_change_password"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_must_change_password", table_name="users")
    op.drop_column("users", "must_change_password")
