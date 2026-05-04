"""Audit repository interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List

from app.models.audit import AuditEvent, AuditEventResponse


class AuditRepository(ABC):
    """Abstract audit repository."""

    @abstractmethod
    def write_event(self, event: AuditEvent) -> AuditEventResponse:
        """Persist an audit event and return the stored record."""

    @abstractmethod
    def list_events(
        self,
        entity_type: str | None = None,
        limit: int = 100,
    ) -> List[AuditEventResponse]:
        """Return recent audit events, optionally filtered by entity type."""
