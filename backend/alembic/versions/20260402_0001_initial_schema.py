from __future__ import annotations
"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Single ENUM creation: defining it on the Column lets Alembic emit CREATE TYPE once.
    # A separate .create() duplicates CREATE TYPE and fails on PostgreSQL.
    user_role = postgresql.ENUM("admin", "employee", name="user_role")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_is_active", "users", ["is_active"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index(
        "ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=True),
        sa.Column("resource_id", sa.String(length=64), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    op.create_table(
        "kyc_records",
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("employee_name", sa.String(length=255), nullable=False),
        sa.Column("client_full_name", sa.String(length=255), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("passport_job_title", sa.String(length=255), nullable=False),
        sa.Column("other_job_title", sa.String(length=255), nullable=True),
        sa.Column("service_type", sa.String(length=50), nullable=False),
        sa.Column("assigned_to", sa.String(length=255), nullable=True),
        sa.Column(
            "assigned_by_rule",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("has_bank_statement", sa.String(length=10), nullable=False),
        sa.Column("available_balance", sa.Numeric(14, 2), nullable=True),
        sa.Column("expected_balance", sa.Numeric(14, 2), nullable=True),
        sa.Column("marital_status", sa.String(length=20), nullable=False),
        sa.Column("children_count", sa.Integer(), nullable=True),
        sa.Column("has_relatives_abroad", sa.String(length=10), nullable=False),
        sa.Column("nationality_type", sa.String(length=20), nullable=False),
        sa.Column("nationality", sa.String(length=120), nullable=True),
        sa.Column("residency_status", sa.String(length=10), nullable=True),
        sa.Column("governorate", sa.String(length=120), nullable=False),
        sa.Column("consultation_method", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=50), nullable=False),
        sa.Column("whatsapp_number", sa.String(length=50), nullable=False),
        sa.Column("previous_rejected", sa.String(length=10), nullable=False),
        sa.Column("rejection_numbers", sa.String(length=120), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("rejection_country", sa.String(length=120), nullable=True),
        sa.Column("has_previous_visas", sa.String(length=10), nullable=False),
        sa.Column("previous_visa_countries", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="مسودة",
        ),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("soft_deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_kyc_records_employee_name", "kyc_records", ["employee_name"]
    )
    op.create_index(
        "ix_kyc_records_client_full_name", "kyc_records", ["client_full_name"]
    )
    op.create_index("ix_kyc_records_service_type", "kyc_records", ["service_type"])
    op.create_index("ix_kyc_records_status", "kyc_records", ["status"])
    op.create_index("ix_kyc_records_created_by_id", "kyc_records", ["created_by_id"])
    op.create_index("ix_kyc_records_created_at", "kyc_records", ["created_at"])
    op.create_index("ix_kyc_records_email", "kyc_records", ["email"])
    op.create_index("ix_kyc_records_phone_number", "kyc_records", ["phone_number"])
    op.create_index("ix_kyc_records_assigned_to", "kyc_records", ["assigned_to"])
    op.create_index("ix_kyc_records_soft_deleted_at", "kyc_records", ["soft_deleted_at"])
    op.create_index(
        "ix_kyc_records_nationality_type", "kyc_records", ["nationality_type"]
    )


def downgrade() -> None:
    op.drop_table("kyc_records")
    op.drop_table("audit_logs")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    user_role = postgresql.ENUM("admin", "employee", name="user_role")
    user_role.drop(op.get_bind(), checkfirst=True)
