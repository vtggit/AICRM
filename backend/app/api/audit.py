"""Simple audit log endpoint for development visibility."""

from fastapi import APIRouter, Depends

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.models import AuthUser
from app.repositories.audit_postgres_repository import AuditPostgresRepository
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api")

_audit_repository = AuditPostgresRepository()
_audit_service = AuditService(_audit_repository)


@router.get("/audit")
def get_audit_log(
    entity_type: str | None = None,
    limit: int = 100,
    _user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Admin-only endpoint to inspect recent audit events."""
    events = _audit_service.list_events(entity_type=entity_type, limit=limit)
    return {"items": [e.model_dump() for e in events]}
