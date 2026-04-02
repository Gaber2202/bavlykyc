#!/usr/bin/env python3
from __future__ import annotations

"""Create initial admin user. Run from backend/: PYTHONPATH=. python scripts/seed_admin.py"""

import asyncio
import os
import sys
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


async def main() -> None:
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "ChangeMe123!")
    full_name = os.environ.get("ADMIN_FULL_NAME", "مدير النظام")

    async with AsyncSessionLocal() as session:
        existing = await session.scalar(
            select(User).where(User.username == username)
        )
        if existing:
            print("Admin already exists")
            return
        user = User(
            id=str(uuid4()),
            username=username,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.admin,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        print(f"Created admin user: {username}")


if __name__ == "__main__":
    asyncio.run(main())
