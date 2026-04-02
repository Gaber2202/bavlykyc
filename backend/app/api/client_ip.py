from __future__ import annotations
"""Consistent client IP for rate limits and audit (see production notes for proxy trust)."""

from fastapi import Request


def client_ip(request: Request) -> str | None:
    """Prefer X-Forwarded-For only when running behind a trusted reverse proxy."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None
