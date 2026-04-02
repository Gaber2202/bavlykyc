from __future__ import annotations
"""Shared schema types."""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


class StrictInputModel(BaseModel):
    """Request bodies: reject unknown fields and trim strings."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class Message(APIModel):
    message: str


class PaginatedMeta(APIModel):
    total: int
    page: int
    page_size: int


class PaginatedResponse(APIModel, Generic[T]):
    items: list[T]
    meta: PaginatedMeta
