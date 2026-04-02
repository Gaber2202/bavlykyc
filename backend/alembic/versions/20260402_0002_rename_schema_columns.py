"""Rename columns to match the required KYC schema.

Revision aligns DB column names with:
- kyc_records: created_by, updated_by, deleted_at
- audit_logs: actor_user_id, entity_type, entity_id, metadata
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # kyc_records renames (PostgreSQL has no op.rename_column in Alembic)
    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN created_by_id TO created_by"
    )
    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN updated_by_id TO updated_by"
    )
    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN soft_deleted_at TO deleted_at"
    )

    op.drop_index("ix_kyc_records_created_by_id", table_name="kyc_records")
    op.create_index("ix_kyc_records_created_by", "kyc_records", ["created_by"])

    op.drop_index("ix_kyc_records_soft_deleted_at", table_name="kyc_records")
    op.create_index("ix_kyc_records_deleted_at", "kyc_records", ["deleted_at"])

    # audit_logs renames
    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN user_id TO actor_user_id"
    )
    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN resource_type TO entity_type"
    )
    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN resource_id TO entity_id"
    )
    op.execute('ALTER TABLE audit_logs RENAME COLUMN details TO "metadata"')

    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.create_index(
        "ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"]
    )

    op.drop_index("ix_audit_logs_resource_id", table_name="audit_logs")
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN entity_id TO resource_id"
    )
    op.create_index(
        "ix_audit_logs_resource_id", "audit_logs", ["resource_id"]
    )

    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN actor_user_id TO user_id"
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])

    op.execute(
        "ALTER TABLE audit_logs RENAME COLUMN entity_type TO resource_type"
    )
    op.execute('ALTER TABLE audit_logs RENAME COLUMN "metadata" TO details')

    op.drop_index("ix_kyc_records_deleted_at", table_name="kyc_records")
    op.drop_index("ix_kyc_records_created_by", table_name="kyc_records")

    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN deleted_at TO soft_deleted_at"
    )
    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN updated_by TO updated_by_id"
    )
    op.execute(
        "ALTER TABLE kyc_records RENAME COLUMN created_by TO created_by_id"
    )

    op.create_index(
        "ix_kyc_records_soft_deleted_at", "kyc_records", ["soft_deleted_at"]
    )
    op.create_index(
        "ix_kyc_records_created_by_id", "kyc_records", ["created_by_id"]
    )
