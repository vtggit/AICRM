"""Contacts API routes — CRUD for contact records."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.models import AuthUser
from app.models.contacts import ContactCreate, ContactResponse, ContactUpdate
from app.repositories.audit_postgres_repository import AuditPostgresRepository
from app.repositories.contacts_postgres_repository import ContactsPostgresRepository
from app.services.audit_service import AuditService
from app.services.contacts_service import ContactsService

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

_repository = ContactsPostgresRepository()
_audit_repository = AuditPostgresRepository()
_audit_service = AuditService(_audit_repository)
_service = ContactsService(_repository, _audit_service)


@router.get("", response_model=list[ContactResponse])
def list_contacts(_user: AuthUser = Depends(require_role(ROLE_ADMIN))):
    """List all contacts. Requires admin role."""
    return _service.list_contacts()


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactCreate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Create a new contact. Requires admin role."""
    try:
        contact = _service.create_contact(payload, actor=user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Update an existing contact. Requires admin role."""
    contact = _service.update_contact(contact_id, payload, actor=user)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contact {contact_id} not found")
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str,
    user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """Delete a contact. Requires admin role."""
    deleted = _service.delete_contact(contact_id, actor=user)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Contact {contact_id} not found")
    return None
