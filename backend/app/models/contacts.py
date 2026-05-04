"""Contact data models for the AICRM backend."""

import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# Allowed status values — mirrored from the UI dropdown
ALLOWED_STATUSES: set[str] = {"active", "inactive", "vip"}

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: Optional[str]) -> Optional[str]:
    """Raise if email is present but not plausibly formatted."""
    if value is None:
        return None
    if not _EMAIL_RE.match(value):
        raise ValueError("Email format is invalid.")
    return value


def _normalize_phone(value: Optional[str]) -> Optional[str]:
    """Strip everything except digits, '+', '-', '(', ')', and spaces."""
    if not value:
        return None
    return re.sub(r"[^\d+\-\(\)\s]", "", value)


class ContactCreate(BaseModel):
    """Request model for creating a contact."""

    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, max_length=300)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    status: Literal["active", "inactive", "vip"] = Field(default="active")
    notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_phone(v)


class ContactUpdate(BaseModel):
    """Request model for updating a contact."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, max_length=300)
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    status: Optional[Literal["active", "inactive", "vip"]] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_phone(v)


class ContactResponse(BaseModel):
    """Response model for a contact record."""

    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "name": "Jane Smith",
                "email": "jane@example.com",
                "phone": "+1-555-0100",
                "company": "Acme Corp",
                "status": "active",
                "notes": "Met at conference",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
            }
        }
