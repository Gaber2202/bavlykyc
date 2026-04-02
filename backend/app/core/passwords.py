from __future__ import annotations

import secrets


def generate_temporary_password(length: int = 14) -> str:
    """Cryptographically strong password safe for one-time admin handoff."""
    return secrets.token_urlsafe(length)[:length]
