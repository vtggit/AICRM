"""Health check API route."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import APP_VERSION, BUILD_TIMESTAMP, GIT_SHA

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Response model for the health check endpoint."""

    status: str = Field(..., description="Service health status")
    app_version: str = Field(..., description="Application version string")
    service: str = Field(..., description="Service identifier")
    git_sha: str | None = Field(default=None, description="Git commit SHA (build metadata)")
    build_timestamp: str | None = Field(
        default=None, description="ISO-8601 build timestamp (build metadata)"
    )


@router.get("/api/health", response_model=HealthResponse)
def health_check():
    """Return service health status and version information."""
    payload: dict = {
        "status": "ok",
        "app_version": APP_VERSION,
        "service": "aicrm-backend",
    }
    if GIT_SHA:
        payload["git_sha"] = GIT_SHA
    if BUILD_TIMESTAMP:
        payload["build_timestamp"] = BUILD_TIMESTAMP
    return payload
