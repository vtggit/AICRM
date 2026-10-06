"""Proving test for issue #269: header-injection hardening in send_email.

AC-1: send_email rejects or sanitizes CR, LF and NUL in ``to`` and
      ``subject`` before MIME construction; the tests prove that an
      injected header such as Bcc is never emitted in the rendered
      message.

AC-2: ``to`` values containing CR, LF or NUL are rejected with a
      validation error (a ValueError, never a transport failure) before
      MIME construction; they are never sanitized.

AC-3: To values containing CR, LF or NUL are rejected before MIME
      construction: no SMTP connection is opened and nothing is sent.

AC-4: ``subject`` values are sanitized by removing CR, LF and NUL before
      MIME construction; the send proceeds and the rendered message
      carries exactly the cleaned subject and no injected headers.
"""

import smtplib
from email import message_from_string

import pytest

from app.email import transport as email_transport

VICTIM = "victim@example.com"
INJECTED = "injected@evil.example"
INJECTED_HEADER = f"Bcc: {INJECTED}"
FORBIDDEN = ("\r", "\n", "\0")


class _RecordingSMTP:
    """Fake smtplib class that records every call; no network is used."""

    instances = []

    def __init__(self, host, port, **kwargs):
        self.host = host
        self.port = port
        self.calls: list[tuple] = []
        type(self).instances.append(self)

    def ehlo(self, *args, **kwargs):
        self.calls.append(("ehlo", ()))
        return (250, b"ok")

    def starttls(self, **kwargs):
        self.calls.append(("starttls", kwargs))
        return (220, b"ok")

    def login(self, username, password):
        self.calls.append(("login", (username, password)))
        return (235, b"ok")

    def sendmail(self, from_addr, to_addrs, message=None, **kwargs):
        self.calls.append(("sendmail", (from_addr, to_addrs, message)))
        return {}

    def quit(self):
        self.calls.append(("quit", ()))
        return (221, b"bye")

    def close(self):
        self.calls.append(("close", ()))


def _sent_mime() -> str:
    """Return the MIME payload handed to sendmail by the last connection."""
    connection = _RecordingSMTP.instances[-1]
    sendmail_calls = [args for name, args in connection.calls if name == "sendmail"]
    assert len(sendmail_calls) == 1, "exactly one sendmail call is expected"
    _from_addr, to_addrs, mime = sendmail_calls[0]
    assert to_addrs == [VICTIM], "the envelope recipient must be the clean address"
    assert isinstance(mime, str) and mime
    return mime


def test_issue269_freeform(monkeypatch):
    # Run the real SMTP code path (config -> TLS -> sendmail) against a
    # recording fake so the exact MIME payload that would hit the wire
    # can be inspected.  The transport hook is pinned to the real
    # implementation so a fake left behind by another test cannot hide
    # the validation/sanitization.
    monkeypatch.setenv("AICRM_SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("AICRM_SMTP_PORT", "2525")
    monkeypatch.setenv("AICRM_SMTP_TLS", "starttls")
    monkeypatch.setenv("AICRM_SMTP_FROM", "noreply@example.test")
    monkeypatch.delenv("AICRM_SMTP_USERNAME", raising=False)
    monkeypatch.delenv("AICRM_SMTP_PASSWORD", raising=False)
    monkeypatch.delenv("AICRM_SMTP_CA_FILE", raising=False)
    monkeypatch.setattr(smtplib, "SMTP", _RecordingSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", _RecordingSMTP)
    monkeypatch.setattr(email_transport, "transport", email_transport._default_send)

    # ------------------------------------------------------------------
    # AC-2 / AC-3: a recipient containing CR, LF or NUL is rejected with
    # a validation error before MIME construction — never sanitized, no
    # connection opened, nothing sent.
    # ------------------------------------------------------------------
    hostile_recipients = [
        f"{VICTIM}\r\n{INJECTED_HEADER}",
        f"{VICTIM}\n{INJECTED_HEADER}",
        f"{VICTIM}\r{INJECTED_HEADER}",
        f"{VICTIM}\x00{INJECTED_HEADER}",
        f"\x00{VICTIM}",
        f"{VICTIM}\r\n{INJECTED_HEADER}\r\n",
    ]
    error_messages = []
    for to_value in hostile_recipients:
        _RecordingSMTP.instances = []
        with pytest.raises(email_transport.EmailValidationError) as excinfo:
            email_transport.send_email(to_value, "Plain subject", "Plain body")
        # a validation error (ValueError), not a transport failure
        assert isinstance(excinfo.value, ValueError)
        assert not isinstance(excinfo.value, email_transport.EmailSendError)
        # the fixed message never echoes the hostile input
        error_messages.append(str(excinfo.value))
        assert INJECTED not in str(excinfo.value)
        # rejected before MIME construction: no connection, no sendmail
        assert (
            _RecordingSMTP.instances == []
        ), "a rejected recipient must not open an SMTP connection"
    assert len(set(error_messages)) == 1, "the validation message must be fixed"

    # ------------------------------------------------------------------
    # AC-4: the subject is sanitized (CR, LF and NUL removed) before MIME
    # construction; the send succeeds and the rendered message carries
    # exactly the cleaned subject.
    # ------------------------------------------------------------------
    hostile_subjects = [
        f"Hello\r\n{INJECTED_HEADER}",
        f"Hello\n{INJECTED_HEADER}",
        f"Hello\r{INJECTED_HEADER}",
        f"Hello\x00{INJECTED_HEADER}",
        "multi\r\nline\x00subject\n",
        "\r\n\x00",  # entirely control characters: must not raise
    ]
    for subject_value in hostile_subjects:
        _RecordingSMTP.instances = []
        assert (
            email_transport.send_email(VICTIM, subject_value, "Plain body") is None
        ), f"sanitized subject must still be sent: {subject_value!r}"
        mime = _sent_mime()
        parsed = message_from_string(mime)
        # AC-1: an injected header is never emitted
        assert (
            parsed.get_all("Bcc") is None
        ), f"header injection succeeded for subject {subject_value!r}"
        # AC-4: the subject is exactly the original minus CR/LF/NUL
        expected = subject_value.replace("\r", "").replace("\n", "").replace("\0", "")
        assert parsed["Subject"] == expected
        for char in FORBIDDEN:
            assert char not in (parsed["Subject"] or "")
        assert "\x00" not in mime, "NUL must not reach the wire"

    # ------------------------------------------------------------------
    # AC-1: the full CR/LF/NUL matrix for both arguments.
    # ------------------------------------------------------------------
    for char in FORBIDDEN:
        # to: rejected before anything runs
        _RecordingSMTP.instances = []
        with pytest.raises(email_transport.EmailValidationError):
            email_transport.send_email(
                f"{VICTIM}{char}{INJECTED_HEADER}", "subject", "body"
            )
        assert _RecordingSMTP.instances == []

        # subject: sanitized; the rendered message has no Bcc header
        _RecordingSMTP.instances = []
        email_transport.send_email(VICTIM, f"Hi{char}{INJECTED_HEADER}", "body")
        parsed = message_from_string(_sent_mime())
        assert parsed.get_all("Bcc") is None
        assert parsed["Subject"] == f"HiBcc: {INJECTED}"

    # ------------------------------------------------------------------
    # AC-1: the checks run at the send_email boundary, before any
    # transport (even a fake) is invoked.
    # ------------------------------------------------------------------
    captured: list[tuple[str, str, str]] = []

    def _fake_transport(to, subject, body):
        captured.append((to, subject, body))

    monkeypatch.setattr(email_transport, "transport", _fake_transport)
    # a hostile recipient is rejected before the transport is called
    with pytest.raises(email_transport.EmailValidationError):
        email_transport.send_email(f"{VICTIM}\n{INJECTED_HEADER}", "s", "b")
    assert captured == [], "a rejected recipient must not reach the transport"
    # a hostile subject reaches the transport already sanitized
    email_transport.send_email(VICTIM, f"Hi\r\n{INJECTED_HEADER}\x00", "b")
    assert captured == [(VICTIM, f"HiBcc: {INJECTED}", "b")]
