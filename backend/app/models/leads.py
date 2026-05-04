"""Lead data models for the AICRM backend."""

import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# Allowed stage values — mirrored from the UI dropdown
ALLOWED_STAGES: set[str] = {
    "new", "contacted", "qualified", "proposal", "won", "lost",
}

# Allowed source values — mirrored from the UI dropdown
ALLOWED_SOURCES: set[str] = {
    "website", "referral", "social", "cold-call", "event",
}

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


class LeadCreate(BaseModel):
    """Request model for creating a lead."""

    name: str = Field(..., min_length=1, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=300)
    phone: Optional[str] = Field(default=None, max_length=50)
    value: Optional[float] = Field(default=None, ge=0)
    stage: Literal["new", "contacted", "qualified", "proposal", "won", "lost"] = Field(
        default="new",
    )
    source: Optional[Literal["website", "referral", "social", "cold-call", "event"]] = (
        Field(default=None)
    )
    notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_phone(v)


class LeadUpdate(BaseModel):
    """Request model for updating a lead."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=300)
    phone: Optional[str] = Field(default=None, max_length=50)
    value: Optional[float] = Field(default=None, ge=0)
    stage: Optional[Literal["new", "contacted", "qualified", "proposal",
                             "won", "lost"]] = Field(default=None)
    source: Optional[Literal["website", "referral", "social", "cold-call",
                              "event"]] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: Optional[str]) -> Optional[str]:
        return _normalize_phone(v)


class LeadResponse(BaseModel):
    """Response model for a lead record."""

    id: str
    name: str
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    value: Optional[float] = None
    stage: str = "new"
    source: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "name": "Acme Corp Lead",
                "company": "Acme Corp",
                "email": "lead@acme.com",
                "phone": "+1-555-0100",
                "value": 50000.0,
                "stage": "new",
                "source": "website",
                "notes": "Interested in enterprise plan",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
            }
        }
