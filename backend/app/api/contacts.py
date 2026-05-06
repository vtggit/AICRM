from fastapi import APIRouter, Depends, HTTPException

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.models import AuthUser
from app.models.contacts import ContactCreate, ContactUpdate
from app.repositories.audit_postgres_repository import AuditPostgresRepository
from app.repositories.contacts_postgres_repository import ContactsPostgresRepository
from app.services.audit_service import AuditService
from app.services.contacts_service import ContactsService

router = APIRouter(prefix="/api")

_repository = ContactsPostgresRepository()
_audit_repository = AuditPostgresRepository()
_audit_service = AuditService(_audit_repository)
_service = ContactsService(_repository, _audit_service)


@router.get("/contacts")
def get_contacts(_user: AuthUser = Depends(require_role(ROLE_ADMIN))):
    """Only admins can list contacts."""
    contacts = _service.list_contacts()
    return {"items": contacts, "source": "backend"}


@router.post("/contacts", status_code=201)
def create_contact(
    payload: ContactCreate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Only admins can create contacts."""
    try:
        contact = _service.create_contact(payload, actor=user)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return contact


@router.put("/contacts/{contact_id}")
def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Only admins can update contacts."""
    contact = _service.update_contact(contact_id, payload, actor=user)
    if not contact:
        raise HTTPException(status_code=404, detail=f"Contact {contact_id} not found")
    return contact


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Only admins can delete contacts."""
    deleted = _service.delete_contact(contact_id, actor=user)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Contact {contact_id} not found")
    return None
