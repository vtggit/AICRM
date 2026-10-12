"""Settings API routes — get, update and reset the single application settings record."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.dependencies import require_authenticated_user
from app.auth.models import AuthUser
from app.models.settings import SettingsResponse, SettingsUpdate
from app.repositories.audit_postgres_repository import AuditPostgresRepository
from app.repositories.settings_postgres_repository import SettingsPostgresRepository
from app.services.audit_service import AuditService
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])

_repository = SettingsPostgresRepository()
_audit_repository = AuditPostgresRepository()
_audit_service = AuditService(_audit_repository)
_service = SettingsService(_repository, _audit_service)


@router.delete("", response_model=SettingsResponse)
def reset_settings(
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Reset application settings to an empty payload. Requires admin role.

    The stored record is updated in place (never deleted); when the stored
    payload was not already empty a "reset" audit event is written naming
    the removed keys without their values.
    """
    try:
        settings = _service.reset_settings(user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return settings


@router.get("", response_model=SettingsResponse)
def get_settings(_user: AuthUser = Depends(require_authenticated_user)):
    """Return the current application settings. Requires authentication."""
    return _service.get_settings()


@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Update application settings. Requires admin role.

    The incoming payload is merged into the existing settings record.
    """
    try:
        settings = _service.update_settings(payload, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return settings
