"""Activity data models for the AICRM backend."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Allowed activity types — mirrored from the UI dropdown
ALLOWED_TYPES: set[str] = {"call", "email", "meeting", "note", "task"}

# Allowed activity statuses
ALLOWED_STATUSES: set[str] = {"pending", "completed"}


class ActivityCreate(BaseModel):
    """Request model for creating an activity."""

    type: Literal["call", "email", "meeting", "note", "task"] = Field(...)
    description: str = Field(..., min_length=1, max_length=5000)
    contact_name: Optional[str] = Field(default=None, max_length=200)
    occurred_at: Optional[str] = Field(default=None)
    due_date: Optional[str] = Field(default=None)
    status: Literal["pending", "completed"] = Field(default="pending")


class ActivityUpdate(BaseModel):
    """Request model for updating an activity."""

    type: Optional[Literal["call", "email", "meeting", "note", "task"]] = Field(default=None)
    description: Optional[str] = Field(default=None, min_length=1, max_length=5000)
    contact_name: Optional[str] = Field(default=None, max_length=200)
    occurred_at: Optional[str] = Field(default=None)
    due_date: Optional[str] = Field(default=None)
    status: Optional[Literal["pending", "completed"]] = Field(default=None)


class ActivityResponse(BaseModel):
    """Response model for an activity record."""

    id: str
    type: str
    description: str
    contact_name: Optional[str] = None
    occurred_at: str
    due_date: Optional[str] = None
    status: str = "pending"
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "type": "call",
                "description": "Follow-up call about proposal",
                "contact_name": "Jane Smith",
                "occurred_at": "2025-01-15T10:30:00+00:00",
                "due_date": "2025-01-20",
                "status": "pending",
                "created_at": "2025-01-15T10:30:00+00:00",
                "updated_at": "2025-01-15T10:30:00+00:00",
            }
        }
