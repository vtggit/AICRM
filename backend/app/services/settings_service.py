"""Settings service — business logic layer."""

import logging

from app.auth.models import AuthUser
from app.db.connection import transaction_scope
from app.models.audit import AuditEvent
from app.models.settings import SettingsUpdate
from app.repositories.settings_repository import SettingsRepository
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)

_AUTHORITATIVE_FIELDS = ("id", "payload", "created_at", "updated_at")


class SettingsService:
    """Handles Settings business logic and validation."""

    def __init__(
        self,
        repository: SettingsRepository,
        audit_service: AuditService,
    ):
        self.repository = repository
        self.audit_service = audit_service

    # ------------------------------------------------------------------ #
    #  Public API                                                         #
    # ------------------------------------------------------------------ #

    def get_settings(self) -> dict:
        """Return the current settings record."""
        row = self.repository.get_settings()
        if row is None:
            return {
                "id": "app",
                "payload": {},
                "created_at": "",
                "updated_at": "",
            }
        return _ensure_authoritative_shape(row)

    def update_settings(self, payload: SettingsUpdate, actor: AuthUser) -> dict:
        """Merge the incoming payload into the settings record.

        Writes an audit event on success.
        """
        _validate_payload(payload.payload)
        _normalize_payload(payload.payload)

        with (
            transaction_scope()
        ):  # the update and its audit event persist or vanish together
            result = self.repository.update_settings(payload.payload)
            if result is None:
                raise ValueError("Failed to update settings.")

            settings = _ensure_authoritative_shape(result)

            changed_keys = list(payload.payload.keys())

            self.audit_service.write(
                AuditEvent(
                    entity_type="settings",
                    entity_id=settings["id"],
                    action="updated",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "changed_fields": changed_keys,
                    },
                )
            )

        return settings

    def reset_settings(self, actor: AuthUser) -> dict:
        """Reset the settings record's payload to the empty object.

        When the stored payload is not already empty the reset updates the
        stored row in place (the record is never deleted) and writes one
        audit event — action "reset" — naming the removed keys without any
        of their values, in the same transaction as the row update.  When
        the payload is already empty the empty record is returned and no
        audit event is written.
        """
        with transaction_scope():  # row update and audit event persist together
            current = self.repository.get_settings()
            current_payload = (current or {}).get("payload") or {}

            if not current_payload:
                # Already empty: nothing to remove, nothing to audit.
                return _ensure_authoritative_shape(
                    current
                    or {
                        "id": "app",
                        "payload": {},
                        "created_at": "",
                        "updated_at": "",
                    }
                )

            result = self.repository.reset_settings()
            if result is None:
                raise ValueError("Failed to reset settings.")

            settings = _ensure_authoritative_shape(result)

            self.audit_service.write(
                AuditEvent(
                    entity_type="settings",
                    entity_id=settings["id"],
                    action="reset",
                    actor_sub=actor.sub,
                    actor_username=actor.username,
                    actor_email=actor.email,
                    actor_roles=actor.roles,
                    details={
                        "changed_fields": list(current_payload.keys()),
                    },
                )
            )

        return settings


# --------------------------------------------------------------------- #
#  Validation helpers                                                     #
# --------------------------------------------------------------------- #


def _validate_payload(payload: dict) -> None:
    """Payload must be a non-empty dict."""
    if not isinstance(payload, dict):
        raise ValueError("Settings payload must be a JSON object.")


def _normalize_payload(payload: dict) -> None:
    """Light normalization: strip whitespace from string values."""
    for key in list(payload.keys()):
        if isinstance(payload[key], str):
            payload[key] = payload[key].strip()


# --------------------------------------------------------------------- #
#  Response-shape guarantee                                              #
# --------------------------------------------------------------------- #


def _ensure_authoritative_shape(record: dict) -> dict:
    """Guarantee every returned settings dict contains the authoritative
    set of fields."""
    return {k: record.get(k) for k in _AUTHORITATIVE_FIELDS}
