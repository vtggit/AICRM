"""Outbound email (SMTP) transport for AICRM.

This module is the only place in the code base that talks to an SMTP
server.  Sending is configured exclusively through the following
environment variables, all of which are read at call time (nothing is
cached at import time):

- AICRM_SMTP_HOST       SMTP server to deliver to.  Sending is disabled
                        until AICRM_SMTP_HOST is set to a non-empty
                        value.
- AICRM_SMTP_PORT       TCP port of the SMTP server.
- AICRM_SMTP_TLS        TLS mode: "starttls" or "implicit".  TLS is
                        mandatory; there is no plaintext mode and no
                        setting that disables certificate verification.
- AICRM_SMTP_USERNAME   Optional SMTP username; when set (non-empty) the
                        transport authenticates before sending.
- AICRM_SMTP_PASSWORD   SMTP password used with AICRM_SMTP_USERNAME.
- AICRM_SMTP_FROM       Envelope / Message-From address for every
                        message.
- AICRM_SMTP_CA_FILE    Optional path to a trusted CA bundle used to
                        verify the server certificate; when set it is
                        the ONLY trusted bundle (the system trust store
                        is replaced, not augmented) and when unset the
                        system trust store is used.  Verification is
                        always on in either case.

Sending is disabled until AICRM_SMTP_HOST is set; every send attempt is
made over a verified TLS connection (STARTTLS completed before
authentication for "starttls", implicit TLS for "implicit") and every
connection uses a timeout.  Any failure while connecting, negotiating
TLS, authenticating, or sending raises EmailSendError with a fixed
generic message; the underlying exception is chained but its text never
appears in the raised message, and log lines record only the exception
class name.

Tests may replace the transport implementation with a fake via
set_transport() (or by assigning to the module-level ``transport``
attribute); set_transport(None) restores the real implementation.
"""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from collections.abc import Callable
from email.message import EmailMessage
from email.policy import default as _EMAIL_POLICY

logger = logging.getLogger(__name__)

# Fixed, generic message for every send failure.  The text of the
# underlying exception (which may carry host names, credentials or server
# banners) never appears in the raised message or in any log line.
_SEND_FAILED_MESSAGE = "Email could not be sent; see server logs for details."

# Every SMTP connection is opened with this timeout.
_CONNECT_TIMEOUT = 30.0

_TLS_MODES = ("starttls", "implicit")


class EmailNotConfigured(Exception):
    """Email sending is not configured.

    Raised when AICRM_SMTP_HOST is unset or empty (or another required
    setting is missing or invalid).  No connection is opened.
    """


class EmailSendError(Exception):
    """An email could not be sent.

    The message is always the fixed generic string; the underlying
    exception is available via ``__cause__``.
    """


def _read_config() -> dict[str, object]:
    """Read the SMTP configuration from the environment at call time.

    Raises EmailNotConfigured when any required setting is missing or
    invalid.  No setting may carry a hardcoded default value.
    """
    host = os.getenv("AICRM_SMTP_HOST") or ""
    host = host.strip()
    if not host:
        raise EmailNotConfigured(
            "Email sending is disabled: AICRM_SMTP_HOST is not set."
        )

    raw_port = os.getenv("AICRM_SMTP_PORT") or ""
    try:
        port = int(raw_port.strip())
    except ValueError:
        raise EmailNotConfigured(
            "Email sending is disabled: AICRM_SMTP_PORT is not a valid port."
        ) from None
    if not 1 <= port <= 65535:
        raise EmailNotConfigured(
            "Email sending is disabled: AICRM_SMTP_PORT is out of range."
        )

    tls_mode = os.getenv("AICRM_SMTP_TLS") or ""
    tls_mode = tls_mode.strip().lower()
    if tls_mode not in _TLS_MODES:
        raise EmailNotConfigured(
            "Email sending is disabled: AICRM_SMTP_TLS must be 'starttls' "
            "or 'implicit'; there is no plaintext mode."
        )

    from_addr = os.getenv("AICRM_SMTP_FROM") or ""
    from_addr = from_addr.strip()
    if not from_addr:
        raise EmailNotConfigured(
            "Email sending is disabled: AICRM_SMTP_FROM is not set."
        )

    username = os.getenv("AICRM_SMTP_USERNAME") or ""
    username = username.strip()
    password = os.getenv("AICRM_SMTP_PASSWORD") or ""

    ca_file = os.getenv("AICRM_SMTP_CA_FILE") or ""
    ca_file = ca_file.strip()

    return {
        "host": host,
        "port": port,
        "tls_mode": tls_mode,
        "from_addr": from_addr,
        "username": username,
        "password": password,
        "ca_file": ca_file,
    }


def _build_ssl_context(ca_file: str) -> ssl.SSLContext:
    """Return a verifying TLS context.

    The context always verifies the server certificate (check_hostname
    enabled, verify_mode=CERT_REQUIRED).  When ca_file is set it becomes
    the only trusted CA bundle: the system trust store is replaced, not
    augmented (create_default_context(cafile=...) skips
    load_default_certs(), so no system CAs are trusted alongside it).
    When ca_file is empty the system trust store is used.  There is no
    way to turn verification off.
    """
    if ca_file:
        return ssl.create_default_context(cafile=ca_file)
    return ssl.create_default_context()


def _build_payload(from_addr: str, to_addr: str, subject: str, body: str) -> str:
    """Render the message; the result is always ASCII-safe for SMTP."""
    message = EmailMessage(policy=_EMAIL_POLICY)
    message["From"] = from_addr
    message["To"] = to_addr
    message["Subject"] = subject
    message.set_content(body)
    return message.as_string()


def _default_send(to: str, subject: str, body: str) -> None:
    """Real SMTP transport: connect over TLS, authenticate, send, close."""
    config = _read_config()
    connection = None
    try:
        context = _build_ssl_context(str(config["ca_file"]))
        if config["tls_mode"] == "implicit":
            connection = smtplib.SMTP_SSL(
                str(config["host"]),
                int(config["port"]),
                timeout=_CONNECT_TIMEOUT,
                context=context,
            )
        else:
            connection = smtplib.SMTP(
                str(config["host"]),
                int(config["port"]),
                timeout=_CONNECT_TIMEOUT,
            )
            connection.starttls(context=context)
        if config["username"]:
            connection.login(str(config["username"]), str(config["password"]))
        connection.sendmail(
            str(config["from_addr"]),
            [to],
            _build_payload(str(config["from_addr"]), to, subject, body),
        )
    except Exception as exc:
        # Only the exception class name is logged; its text may contain
        # host names, credentials or server banners and must stay out of
        # the raised message and the log output.
        logger.error("Email send failed: %s", type(exc).__name__)
        raise EmailSendError(_SEND_FAILED_MESSAGE) from exc
    finally:
        if connection is not None:
            try:
                connection.quit()
            except Exception as close_exc:
                logger.error(
                    "SMTP connection close failed: %s", type(close_exc).__name__
                )
                try:
                    connection.close()
                except Exception as socket_exc:
                    logger.error(
                        "SMTP socket close failed: %s", type(socket_exc).__name__
                    )


# Module-level transport hook: send_email() delegates to this callable.
# Tests may replace it with a fake (same (to, subject, body) signature)
# via set_transport(); set_transport(None) restores the real transport.
transport: Callable[[str, str, str], None] = _default_send


def set_transport(implementation: Callable[[str, str, str], None] | None) -> None:
    """Replace the transport used by send_email().

    Pass a callable with the (to, subject, body) signature to install a
    fake (useful in tests); pass None to restore the real SMTP transport.
    """
    global transport
    transport = _default_send if implementation is None else implementation


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email to ``to``.

    The SMTP configuration comes from the AICRM_SMTP_* environment
    variables, read at call time; see the module docstring.  Raises
    EmailNotConfigured when sending is not configured and EmailSendError
    when the send fails.  Returns None on success.
    """
    transport(to, subject, body)
