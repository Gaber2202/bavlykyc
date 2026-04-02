from __future__ import annotations
"""Application settings loaded from environment."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ALLOWED_JWT_ALGS = frozenset({"HS256"})


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "KYC Management API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    """Expose OpenAPI/Swagger when True; when False, docs are hidden unless debug is True."""

    expose_docs: bool = False

    secret_key: str = Field(
        ...,
        min_length=32,
        description="Minimum 256-bit equivalent random secret for HS256 (e.g. openssl rand -hex 32).",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    database_url: str

    cors_origins: str = "http://localhost:5173"

    employee_can_edit_others_records: bool = False

    login_rate_limit: str = "10/minute"
    auth_refresh_rate_limit: str = "30/minute"
    auth_change_password_rate_limit: str = "10/minute"

    @field_validator("jwt_algorithm")
    @classmethod
    def jwt_algorithm_allowlist(cls, v: str) -> str:
        alg = v.strip().upper()
        if alg not in _ALLOWED_JWT_ALGS:
            raise ValueError(f"JWT_ALGORITHM must be one of: {sorted(_ALLOWED_JWT_ALGS)}")
        return alg

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def api_docs_enabled(self) -> bool:
        return self.debug or self.expose_docs


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
