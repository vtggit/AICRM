"""Template data models for the AICRM backend."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Allowed category values — mirrored from the UI dropdown
ALLOWED_CATEGORIES: set[str] = {
    "follow-up", "introduction", "proposal", "thank-you", "meeting", "other",
}


class TemplateCreate(BaseModel):
    """Request model for creating a template."""

    name: str = Field(..., min_length=1, max_length=200)
    category: Literal["follow-up", "introduction", "proposal", "thank-you",
                       "meeting", "other"] = Field(default="other")
    subject: Optional[str] = Field(default=None, max_length=500)
    content: str = Field(..., min_length=1)


class TemplateUpdate(BaseModel):
    """Request model for updating a template."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[Literal["follow-up", "introduction", "proposal",
                                "thank-you", "meeting", "other"]] = Field(default=None)
    subject: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = Field(default=None)


class TemplateResponse(BaseModel):
    """Response model for a template record."""

    id: str
    name: str
    category: str = "other"
    subject: Optional[str] = None
    content: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "abc123",
                "name": "Welcome Email",
                "category": "introduction",
                "subject": "Welcome to {{contact_company}}!",
                "content": "Dear {{contact_name}}, thank you for joining us.",
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
            }
        }
