"""Contact freeform email service (issue #256).

Sends a freeform email to a contact on behalf of any signed-in user.
The send is gated by the suppression send-gate (may_send), dispatched
through the single outbound transport (app.email.transport), and only a
successfully accepted send records an activity and an audit event —
both in one transaction.  A refused, unconfigured or failed send
records neither.
"""

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from app.auth.models import AuthUser
from app.db.connection import transaction_scope
from app.email.transport import EmailNotConfigured, EmailSendError, send_email
from app.models.audit import AuditEvent
from app.repositories.activities_postgres_repository import (
    ActivitiesPostgresRepository,
)
from app.repositories.contacts_postgres_repository import ContactsPostgresRepository
from app.repositories.suppressions_postgres_repository import (
    SuppressionsPostgresRepository,
)
from app.services.audit_service import AuditService


class ContactEmailRequest(BaseModel):
    """Request body for POST /api/contacts/{contact_id}/send-email."""

    subject: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1, max_length=20000)


class ContactNotFoundError(Exception):
    """The contact does not exist or is soft-deleted."""


class ContactHasNoEmailError(Exception):
    """The contact record has no email address."""


class SendGateRefusedError(Exception):
    """The may_send gate refused the send; carries the gate's reasons."""

    def __init__(self, reasons: list[str]):
        super().__init__("; ".join(reasons))
        self.reasons = list(reasons)


class EmailNotConfiguredError(Exception):
    """The email transport is not configured."""


class EmailSendFailedError(Exception):
    """The email transport could not deliver the message."""


class ContactEmailService:
    """Business logic for sending freeform email to a contact (#256)."""

    def __init__(
        self,
        contacts_repository: ContactsPostgresRepository,
        activities_repository: ActivitiesPostgresRepository,
        suppressions_repository: SuppressionsPostgresRepository,
        audit_service: AuditService,
    ):
        self.contacts_repository = contacts_repository
        self.activities_repository = activities_repository
        self.suppressions_repository = suppressions_repository
        self.audit_service = audit_service

    def send_email(
        self,
        contact_id: str,
        subject: str,
        body: str,
        actor: AuthUser,
    ) -> dict[str, Any]:
        """Send a freeform email to the contact.

        Checks, in order: the contact exists and is not soft-deleted, the
        contact has an email address, the may_send gate allows the
        address, and the transport accepts the message.  Only a
        successfully accepted send records an activity (type email,
        status completed, occurred_at now, the contact's name, and the
        subject — never the body) and an audit event (action
        email.sent, details holding only the contact id and subject),
        atomically.
        """
        contact = self.contacts_repository.get_by_id(contact_id, include_tags=False)
        if contact is None or contact.get("deleted_at") is not None:
            raise ContactNotFoundError(f"Contact {contact_id} not found")

        email = contact.get("email")
        if not email or not str(email).strip():
            raise ContactHasNoEmailError("Contact has no email address")

        may, reasons = self.suppressions_repository.may_send(email)
        if not may:
            raise SendGateRefusedError(reasons)

        try:
            send_email(str(email), subject, body)
        except EmailNotConfigured as exc:
            raise EmailNotConfiguredError from exc
        except EmailSendError as exc:
            raise EmailSendFailedError from exc

        now = datetime.now(timezone.utc)
        with transaction_scope():  # activity and audit event persist or vanish together
            self.activities_repository.create(
                {
                    "type": "email",
                    "description": f"Email accepted: {subject}",
                    "contact_name": contact.get("name"),
                    "occurred_at": now,
                    "status": "completed",
                }
            )

            self.audit_service.write(
                AuditEvent(
                    entity_type="contact",
                    entity_id=contact_id,
                    action="email.sent",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "contact_id": contact_id,
                        "subject": subject,
                    },
                )
            )

        return {"status": "accepted"}
