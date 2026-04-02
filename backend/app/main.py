from __future__ import annotations
"""FastAPI application entry."""

from contextlib import asynccontextmanager

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.deps import limiter
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import get_db
from app.middleware.security_headers import SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


def create_app() -> FastAPI:
    expose_docs = settings.api_docs_enabled
    app = FastAPI(
        title=settings.app_name,
        openapi_url=(
            f"{settings.api_v1_prefix}/openapi.json" if expose_docs else None
        ),
        docs_url=(f"{settings.api_v1_prefix}/docs" if expose_docs else None),
        redoc_url=(f"{settings.api_v1_prefix}/redoc" if expose_docs else None),
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    def _validation_payload(exc: RequestValidationError) -> dict:
        if settings.debug:
            return {"detail": exc.errors(), "message": "Validation error"}
        errs = []
        for e in exc.errors():
            loc = e.get("loc") or ()
            tail = [str(p) for p in loc if p not in ("body", "query", "path", "header")]
            field = ".".join(tail[-4:]) if tail else "request"
            errs.append({"field": field, "message": str(e.get("msg", "غير صالح"))})
        return {
            "detail": "طلب غير صالح",
            "errors": errs,
        }

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_validation_payload(exc),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        if isinstance(exc, (HTTPException, StarletteHTTPException)):
            raise exc
        if settings.debug:
            raise exc
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        """Liveness: process is up (use for load balancer pings)."""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["health"])
    async def health_ready(
        db_session: Annotated[AsyncSession, Depends(get_db)],
    ) -> JSONResponse:
        """Readiness: PostgreSQL reachable (use before routing traffic after deploy)."""
        try:
            await db_session.execute(text("SELECT 1"))
        except Exception:
            return JSONResponse(
                status_code=503,
                content={"status": "degraded", "database": "unreachable"},
            )
        return JSONResponse(
            status_code=200,
            content={"status": "ok", "database": "connected"},
        )

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
