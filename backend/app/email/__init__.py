# Outbound email package — hardened SMTP transport (see app.email.transport).

from .transport import (
    EmailNotConfigured,
    EmailSendError,
    EmailValidationError,
    send_email,
    set_transport,
)

__all__ = [
    "EmailNotConfigured",
    "EmailSendError",
    "EmailValidationError",
    "send_email",
    "set_transport",
]
