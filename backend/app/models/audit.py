"""Audit event data models."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AuditEvent(BaseModel):
    """Internal audit event to be written to the repository."""

    entity_type: str
    entity_id: str
    action: str
    actor_sub: str
    actor_username: Optional[str] = None
    actor_email: Optional[str] = None
    actor_roles: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditEventResponse(BaseModel):
    """Audit event returned by the API."""

    id: int
    entity_type: str
    entity_id: str
    action: str
    actor_sub: str
    actor_username: Optional[str] = None
    actor_email: Optional[str] = None
    actor_roles: Optional[str] = None
    timestamp: str
    details: Dict[str, Any] = Field(default_factory=dict)
