"""Company data models."""

from pydantic import BaseModel, Field


class CompanyCreate(BaseModel):
    """Request model for creating a company."""

    name: str = Field(..., min_length=1)
    email: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    address: str | None = Field(default=None)
    website: str | None = Field(default=None)
    employee_count: int | None = Field(default=None)
    annual_revenue: float | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    description: str | None = Field(default=None)


class CompanyUpdate(BaseModel):
    """Request model for updating a company (all fields optional)."""

    name: str | None = Field(default=None)
    email: str | None = Field(default=None)
    phone: str | None = Field(default=None)
    address: str | None = Field(default=None)
    website: str | None = Field(default=None)
    employee_count: int | None = Field(default=None)
    annual_revenue: float | None = Field(default=None)
    is_active: bool | None = Field(default=None)
    description: str | None = Field(default=None)


class CompanyResponse(BaseModel):
    """Response model for a company record."""

    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    website: str | None = None
    employee_count: int | None = None
    annual_revenue: float | None = None
    is_active: bool | None = None
    description: str | None = None
    created_at: str
    updated_at: str
