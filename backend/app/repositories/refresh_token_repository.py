from __future__ import annotations
"""Refresh token storage."""

import hashlib
from datetime import datetime, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def store_token(
    session: AsyncSession,
    *,
    user_id: str,
    token: str,
    expires_at: datetime,
    user_agent: str | None,
) -> RefreshToken:
    row = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=expires_at,
        user_agent=user_agent,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return row


async def get_valid_by_hash(
    session: AsyncSession, token: str
) -> RefreshToken | None:
    h = hash_token(token)
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == h,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > now,
        )
    )
    return result.scalar_one_or_none()


async def revoke_by_hash(session: AsyncSession, token: str) -> None:
    h = hash_token(token)
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == h)
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def revoke_all_for_user(session: AsyncSession, user_id: str) -> None:
    await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def cleanup_expired(session: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    await session.execute(delete(RefreshToken).where(RefreshToken.expires_at < now))
