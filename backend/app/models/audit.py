"""Audit event data models."""

import re
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator

#: The only detail keys that may be persisted to audit_log.details_json.
#: Everything else (names, emails, websites, free text, ...) is dropped on
#: write so the audit trail carries no personal data (#284).
AUDIT_DETAIL_ALLOWED_KEYS = (
    "changed_fields",
    "count",
    "status",
    "stage",
    "type",
    "category",
    "old",
    "new",
    "source",
    "soft",
    "contact_id",
    "contact_ids",
)

# Expected non-personal value shapes for the allowed keys.
_FIELD_NAME_RE = re.compile(r"^[a-z_][a-z0-9_]{0,63}$")
_CODE_RE = re.compile(r"^[A-Za-z0-9_*-]{1,40}$")
_CONTACT_ID_RE = re.compile(r"^[A-Za-z0-9-]{1,64}$")

_CODE_KEYS = frozenset({"status", "stage", "type", "category", "old", "new", "source"})

# A single word that starts with a capital letter ("Dana", "Acme",
# "Widgetry") is a personal name or company name, not a machine code: every
# machine code in this product (opted_in, cold-call, vip, the consent
# wildcard *) is lowercase or carries a digit or symbol, so a capitalized
# single word under a code key is personal data and dropped (value-level
# minimization, #284).
_SINGLE_TOKEN_NAME_RE = re.compile(r"^[A-Z][A-Za-z]*$")


def _is_field_name(value: Any) -> bool:
    """A field-name identifier such as ``name`` or ``email_consent_status``."""
    return isinstance(value, str) and _FIELD_NAME_RE.fullmatch(value) is not None


def _is_short_code(value: Any) -> bool:
    """A short machine code such as ``opted_in``, ``accepted`` or the consent
    wildcard ``*``.  Rejects names, emails and any other free text."""
    return isinstance(value, str) and _CODE_RE.fullmatch(value) is not None


def _is_contact_id(value: Any) -> bool:
    """An identifier such as a UUID string or ``bulk``."""
    return isinstance(value, str) and _CONTACT_ID_RE.fullmatch(value) is not None


def _is_single_token_name(value: Any) -> bool:
    """A single-token personal value: a one-word name or company name such as
    ``Dana`` or ``Acme``.  Machine codes never look like this — they are
    lowercase or carry a digit or symbol — so a capitalized single word under
    a code key is treated as personal data and dropped."""
    return isinstance(value, str) and _SINGLE_TOKEN_NAME_RE.fullmatch(value) is not None


def _allowed_detail_value(key: str, value: Any) -> bool:
    """True when *value* has the non-personal shape expected for *key*.

    An allowed key whose value does not match the expected shape is treated
    as personal data and dropped: callers cannot be relied upon to avoid
    storing personal values (a name under ``new``, an email under
    ``source``, free text under ``status``) so every value is checked.  For
    the code keys this also drops single-token personal values (a one-word
    name or company name such as ``Dana`` or ``Acme``), which match the code
    shape but are not machine codes.
    """
    if key in _CODE_KEYS:
        return _is_short_code(value) and not _is_single_token_name(value)
    if key == "changed_fields":
        return isinstance(value, (list, tuple)) and all(
            _is_field_name(item) for item in value
        )
    if key == "count":
        return isinstance(value, int) and not isinstance(value, bool)
    if key == "soft":
        return isinstance(value, bool)
    if key == "contact_id":
        return _is_contact_id(value)
    if key == "contact_ids":
        return isinstance(value, (list, tuple)) and all(
            _is_contact_id(item) for item in value
        )
    return False


def minimize_details(details: dict) -> dict:
    """Return a new dict holding only non-personal audit details.

    Keys outside :data:`AUDIT_DETAIL_ALLOWED_KEYS` are dropped.  An allowed
    key is kept only when its value has the expected non-personal shape:

    - ``changed_fields``: a list of field-name identifiers
      (``^[a-z_][a-z0-9_]{0,63}$``); dropped as a whole if any element does
      not match
    - ``count``: an integer
    - ``soft``: a boolean
    - ``status`` / ``stage`` / ``type`` / ``category`` / ``old`` / ``new`` /
      ``source``: a short code (``^[A-Za-z0-9_*-]{1,40}$``), except a
      single-token personal value — a one-word name or company name such as
      ``Dana`` or ``Acme`` — which is dropped (value-level minimization)
    - ``contact_id``: an id (``^[A-Za-z0-9-]{1,64}$``)
    - ``contact_ids``: a list of such ids; dropped as a whole if any
      element does not match

    ``None`` or empty input yields ``{}``; the input is never mutated.
    """
    if not isinstance(details, dict) or not details:
        return {}
    minimized: dict[str, Any] = {}
    for key, value in details.items():
        if key not in AUDIT_DETAIL_ALLOWED_KEYS:
            continue
        if not _allowed_detail_value(key, value):
            continue
        if isinstance(value, tuple):
            value = list(value)
        minimized[key] = value
    return minimized


class AuditEvent(BaseModel):
    """Internal audit event to be written to the repository."""

    entity_type: str
    entity_id: str
    action: str
    actor_sub: str
    actor_username: str | None = None
    actor_email: str | None = None
    actor_roles: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("details", mode="before")
    @classmethod
    def _minimize_details(cls, value: Any) -> dict[str, Any]:
        """Minimize details on every construction path so every write path
        (AuditService.write, the consent repository audit insert, the
        suppressions repository audit insert) stores minimized details."""
        return minimize_details(value)


class AuditEventResponse(BaseModel):
    """Audit event returned by the API."""

    id: int
    entity_type: str
    entity_id: str
    action: str
    actor_sub: str
    actor_username: str | None = None
    actor_email: str | None = None
    actor_roles: str | None = None
    timestamp: str
    details: dict[str, Any] = Field(default_factory=dict)
