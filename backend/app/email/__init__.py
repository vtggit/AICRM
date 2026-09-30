# Outbound email package — hardened SMTP transport (see app.email.transport).

from .transport import (
    EmailNotConfigured,
    EmailSendError,
    send_email,
    set_transport,
)

__all__ = [
    "EmailNotConfigured",
    "EmailSendError",
    "send_email",
    "set_transport",
]
