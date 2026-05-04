"""Audit service - central place for writing audit events."""

import logging
from typing import Any, Dict, List

from app.models.audit import AuditEvent, AuditEventResponse
from app.repositories.audit_repository import AuditRepository
from app.observability.logging import get_request_id

logger = logging.getLogger(__name__)


def _req() -> str:
    """Return a request-ID suffix for log lines, or empty string."""
    rid = get_request_id()
    return f" request_id={rid}" if rid else ""


class AuditService:
    """Writes audit events through the repository layer."""

    def __init__(self, repository: AuditRepository):
        self.repository = repository

    def write(self, event: AuditEvent) -> AuditEventResponse:
        """Persist an audit event."""
        try:
            return self.repository.write_event(event)
        except Exception as exc:
            logger.error(
                "audit: failed to write event — entity_type=%s entity_id=%s action=%s error=%s%s",
                event.entity_type,
                event.entity_id,
                event.action,
                exc,
                _req(),
            )
            raise

    def list_events(
        self,
        entity_type: str | None = None,
        limit: int = 100,
    ) -> List[AuditEventResponse]:
        """Return recent audit events."""
        return self.repository.list_events(entity_type=entity_type, limit=limit)
