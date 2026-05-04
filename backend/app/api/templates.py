"""Templates API routes — mirrors the Contacts pattern."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.models import AuthUser
from app.auth.dependencies import require_authenticated_user
from app.models.templates import TemplateCreate, TemplateUpdate, TemplateResponse
from app.repositories.audit_postgres_repository import AuditPostgresRepository
from app.repositories.templates_postgres_repository import TemplatesPostgresRepository
from app.services.audit_service import AuditService
from app.services.templates_service import TemplatesService

router = APIRouter(prefix="/api")

_repository = TemplatesPostgresRepository()
_audit_repository = AuditPostgresRepository()
_audit_service = AuditService(_audit_repository)
_service = TemplatesService(_repository, _audit_service)


@router.get("/templates", response_model=list[TemplateResponse],
            dependencies=[Depends(require_authenticated_user)])
def list_templates():
    """List all templates (authenticated users)."""
    return _service.list_templates()


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role(ROLE_ADMIN))])
def create_template(
    payload: TemplateCreate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Create a new template (admin only)."""
    try:
        template = _service.create_template(payload, user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return template


@router.put("/templates/{template_id}", response_model=TemplateResponse,
            dependencies=[Depends(require_role(ROLE_ADMIN))])
def update_template(
    template_id: str,
    payload: TemplateUpdate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Update an existing template (admin only)."""
    result = _service.update_template(template_id, payload, user)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Template not found")
    return result


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role(ROLE_ADMIN))])
def delete_template(
    template_id: str,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Delete a template (admin only)."""
    deleted = _service.delete_template(template_id, user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Template not found")
    return None
