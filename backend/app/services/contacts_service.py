"""Contacts service - business logic layer."""

from typing import Optional

from app.auth.models import AuthUser
from app.models.audit import AuditEvent
from app.models.contacts import ALLOWED_STATUSES, ContactCreate, ContactUpdate
from app.repositories.contacts_postgres_repository import ContactsPostgresRepository
from app.services.audit_service import AuditService

# Fields that must always be present in a backend-returned contact record.
_AUTHORITATIVE_FIELDS = ("id", "name", "email", "phone", "company", "status",
                          "notes", "created_at", "updated_at")


class ContactsService:
    """Handles Contacts business logic and validation."""

    def __init__(
        self,
        repository: ContactsPostgresRepository,
        audit_service: AuditService,
    ):
        self.repository = repository
        self.audit_service = audit_service

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def list_contacts(self) -> list[dict]:
        rows = self.repository.list_all()
        return [_ensure_authoritative_shape(r) for r in rows]

    def get_contact(self, contact_id: str) -> Optional[dict]:
        row = self.repository.get_by_id(contact_id)
        if row is None:
            return None
        return _ensure_authoritative_shape(row)

    def create_contact(self, payload: ContactCreate, actor: AuthUser) -> dict:
        _validate_contact_name(payload.name)
        _validate_status(payload.status)
        _normalize_fields(payload)
        data = payload.model_dump(exclude_unset=True)
        contact = _ensure_authoritative_shape(self.repository.create(data))

        self.audit_service.write(AuditEvent(
            entity_type="contact",
            entity_id=contact["id"],
            action="created",
            actor_sub=actor.sub,
            actor_username=actor.username,
            actor_email=actor.email,
            actor_roles=actor.roles,
            details={
                "name": contact["name"],
                "email": contact.get("email"),
                "company": contact.get("company"),
            },
        ))

        return contact

    def update_contact(
        self, contact_id: str, payload: ContactUpdate, actor: AuthUser,
    ) -> Optional[dict]:
        existing = self.repository.get_by_id(contact_id)
        if not existing:
            return None

        if payload.name is not None:
            _validate_contact_name(payload.name)
        if payload.status is not None:
            _validate_status(payload.status)

        data = payload.model_dump(exclude_unset=True, exclude_none=True)
        result = self.repository.update(contact_id, data)
        if result is None:
            return None

        contact = _ensure_authoritative_shape(result)

        changed_fields = [k for k in data if k in ("name", "email", "phone",
                                                     "company", "status", "notes")]

        self.audit_service.write(AuditEvent(
            entity_type="contact",
            entity_id=contact_id,
            action="updated",
            actor_sub=actor.sub,
            actor_username=actor.username,
            actor_email=actor.email,
            actor_roles=actor.roles,
            details={
                "changed_fields": changed_fields,
            },
        ))

        return contact

    def delete_contact(self, contact_id: str, actor: AuthUser) -> bool:
        existing = self.repository.get_by_id(contact_id)
        deleted = self.repository.delete(contact_id)
        if not deleted:
            return False

        self.audit_service.write(AuditEvent(
            entity_type="contact",
            entity_id=contact_id,
            action="deleted",
            actor_sub=actor.sub,
            actor_username=actor.username,
            actor_email=actor.email,
            actor_roles=actor.roles,
            details={
                "name": existing.get("name") if existing else None,
                "email": existing.get("email") if existing else None,
            },
        ))

        return True


# --------------------------------------------------------------------- #
#  Validation helpers                                                     #
# --------------------------------------------------------------------- #

def _validate_contact_name(name: str) -> None:
    """Name must be a non-empty string after trimming."""
    if not name or not name.strip():
        raise ValueError("Contact name is required.")


def _validate_status(status: str) -> None:
    """Status must be one of the allowed values."""
    if status not in ALLOWED_STATUSES:
        raise ValueError(
            f"Invalid status '{status}'. Allowed values: {', '.join(sorted(ALLOWED_STATUSES))}"
        )


def _normalize_fields(payload: ContactCreate | ContactUpdate) -> None:
    """Light normalization: trim whitespace on string fields."""
    for field in ("name", "email", "phone", "company", "notes"):
        val = getattr(payload, field, None)
        if isinstance(val, str):
            setattr(payload, field, val.strip() or None)


# --------------------------------------------------------------------- #
#  Response-shape guarantee                                              #
# --------------------------------------------------------------------- #

def _ensure_authoritative_shape(record: dict) -> dict:
    """
    Guarantee every returned contact dict contains the authoritative set
    of fields, even if the repository layer ever drops one.
    """
    return {k: record.get(k) for k in _AUTHORITATIVE_FIELDS}
