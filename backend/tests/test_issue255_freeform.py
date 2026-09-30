"""Proving test for issue #255: hardened outbound email transport.

AC-1: backend/app/email/transport.py provides send_email(to, subject, body)
      configured only from AICRM_SMTP_HOST, AICRM_SMTP_PORT, AICRM_SMTP_TLS,
      AICRM_SMTP_USERNAME, AICRM_SMTP_PASSWORD, AICRM_SMTP_FROM and the
      optional AICRM_SMTP_CA_FILE, read at call time; an unset or empty
      AICRM_SMTP_HOST raises EmailNotConfigured without opening any
      connection; TLS is mandatory (starttls completes STARTTLS before
      login, implicit connects over TLS); the server certificate is always
      verified, using AICRM_SMTP_CA_FILE as the CA bundle when set; there
      is no plaintext mode and no way to disable verification; every
      connection uses a timeout; a module-level hook swaps the transport
      for a fake; the module docstring lists the seven variable names and
      states that sending is disabled until AICRM_SMTP_HOST is set.

AC-2: any failure while connecting, negotiating TLS, authenticating or
      sending raises EmailSendError with a fixed generic message; the
      underlying exception is chained, its text never enters the raised
      message, and log lines record only the exception class name.
"""

import logging
import re
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.email import transport as email_transport

# Sample hostile values that must never leak into raised messages or logs.
SAMPLE_HOST = "hostile.smtp.evil.example"
SAMPLE_USER = "hostile-smtp-user"
SAMPLE_PASS = "hostile-smtp-password"
SAMPLE_BANNER = "220 mail.evil.example ESMTP hostile-banner"
SAMPLE_FROM = "hostile.from@evil.example"
SECRET_FRAGMENTS = (SAMPLE_HOST, SAMPLE_USER, SAMPLE_PASS, SAMPLE_BANNER)

SEVEN_VARS = (
    "AICRM_SMTP_HOST",
    "AICRM_SMTP_PORT",
    "AICRM_SMTP_TLS",
    "AICRM_SMTP_USERNAME",
    "AICRM_SMTP_PASSWORD",
    "AICRM_SMTP_FROM",
    "AICRM_SMTP_CA_FILE",
)

RECIPIENT = "recipient@nowhere.test"


def _hostile_text(stage: str) -> str:
    return (
        f"{stage}: connect to {SAMPLE_HOST} failed; "
        f"authenticated as {SAMPLE_USER} with {SAMPLE_PASS}; "
        f"server banner: {SAMPLE_BANNER}"
    )


def _clear_smtp_env(monkeypatch) -> None:
    for name in SEVEN_VARS:
        monkeypatch.delenv(name, raising=False)


def _set_smtp_env(
    monkeypatch,
    tls="starttls",
    ca_file=None,
    with_auth=True,
    with_from=True,
) -> None:
    monkeypatch.setenv("AICRM_SMTP_HOST", SAMPLE_HOST)
    monkeypatch.setenv("AICRM_SMTP_PORT", "2525")
    if tls is None:
        monkeypatch.delenv("AICRM_SMTP_TLS", raising=False)
    else:
        monkeypatch.setenv("AICRM_SMTP_TLS", tls)
    if with_auth:
        monkeypatch.setenv("AICRM_SMTP_USERNAME", SAMPLE_USER)
        monkeypatch.setenv("AICRM_SMTP_PASSWORD", SAMPLE_PASS)
    else:
        monkeypatch.delenv("AICRM_SMTP_USERNAME", raising=False)
        monkeypatch.delenv("AICRM_SMTP_PASSWORD", raising=False)
    if with_from:
        monkeypatch.setenv("AICRM_SMTP_FROM", SAMPLE_FROM)
    else:
        monkeypatch.delenv("AICRM_SMTP_FROM", raising=False)
    if ca_file is None:
        monkeypatch.delenv("AICRM_SMTP_CA_FILE", raising=False)
    else:
        monkeypatch.setenv("AICRM_SMTP_CA_FILE", str(ca_file))


class _RecordingBase:
    """Base for the recording SMTP fakes; each subclass tracks its own list."""

    def __init__(self, host, port, **kwargs):
        self.host = host
        self.port = port
        self.kwargs = kwargs
        self.calls = []
        type(self).instances.append(self)

    def ehlo(self):
        self.calls.append(("ehlo", ()))
        return (250, b"ready")

    def starttls(self, **kwargs):
        self.calls.append(("starttls", kwargs))
        return (220, b"Ready to start TLS")

    def login(self, username, password):
        self.calls.append(("login", (username, password)))
        return (235, b"Authentication successful")

    def sendmail(self, from_addr, to_addrs, message=None, **kwargs):
        self.calls.append(("sendmail", (from_addr, to_addrs, message)))
        return {}

    def quit(self):
        self.calls.append(("quit", ()))
        return (221, b"Bye")

    def close(self):
        self.calls.append(("close", ()))


class _RecordingSMTP(_RecordingBase):
    """Fake smtplib.SMTP that records every call it receives."""

    instances = []


class _RecordingSSL(_RecordingBase):
    """Fake smtplib.SMTP_SSL (implicit TLS) that records every call."""

    instances = []


def _reset_fakes() -> None:
    _RecordingSMTP.instances = []
    _RecordingSSL.instances = []


def _call_names(connection) -> list[str]:
    return [name for name, _args in connection.calls]


def _make_raising_fake(
    init_exc=None, starttls_exc=None, login_exc=None, sendmail_exc=None
):
    """Build a fake SMTP class that raises the given exceptions per stage."""

    class _Fake:
        def __init__(self, host, port, **kwargs):
            self.kwargs = kwargs
            self.calls = []
            if init_exc is not None:
                raise init_exc

        def starttls(self, **kwargs):
            self.calls.append(("starttls", kwargs))
            if starttls_exc is not None:
                raise starttls_exc
            return (220, b"Ready to start TLS")

        def login(self, username, password):
            self.calls.append(("login", (username, password)))
            if login_exc is not None:
                raise login_exc
            return (235, b"Authentication successful")

        def sendmail(self, from_addr, to_addrs, message=None, **kwargs):
            self.calls.append(("sendmail", (from_addr, to_addrs, message)))
            if sendmail_exc is not None:
                raise sendmail_exc
            return {}

        def ehlo(self):
            self.calls.append(("ehlo", ()))
            return (250, b"ready")

        def quit(self):
            self.calls.append(("quit", ()))
            return (221, b"Bye")

        def close(self):
            self.calls.append(("close", ()))

    return _Fake


def _expect_unconfigured() -> None:
    with pytest.raises(email_transport.EmailNotConfigured):
        email_transport.send_email(RECIPIENT, "subject", "body")
    assert not _RecordingSMTP.instances
    assert not _RecordingSSL.instances


def _make_ca_bundle(tmp_path: Path) -> Path:
    """Generate a self-signed CA certificate bundle (PEM) for testing."""
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "issue255 test ca")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    bundle = tmp_path / "ca-bundle.pem"
    bundle.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return bundle


def test_issue255_freeform(monkeypatch, caplog, tmp_path):
    caplog.set_level(logging.DEBUG, logger=email_transport.__name__)

    # ------------------------------------------------------------------
    # AC-1: module docstring lists the seven variables and states that
    #       sending is disabled until AICRM_SMTP_HOST is set.
    # ------------------------------------------------------------------
    doc = email_transport.__doc__ or ""
    for var in SEVEN_VARS:
        assert var in doc, f"{var} missing from module docstring"
    assert "disabled until aicrm_smtp_host is set" in doc.lower()

    # AC-1: no value, host or domain is added anywhere in the module.
    src = Path(email_transport.__file__).read_text(encoding="utf-8")
    assert src.count("os.getenv") == 7, "exactly the seven env vars must be read"
    for match in re.finditer(r'os\.getenv\(\s*"(AICRM_SMTP_[A-Z_]+)"([^)]*)\)', src):
        assert (
            match.group(2).strip() == ""
        ), f"{match.group(1)} must not carry a hardcoded default value"
    lowered_src = src.lower()
    for token in ("localhost", "127.0.0.1", "example.com", "example.org"):
        assert token not in lowered_src, f"hardcoded {token!r} found in transport.py"

    # ------------------------------------------------------------------
    # Install recording fakes so any connection attempt is observable.
    # ------------------------------------------------------------------
    monkeypatch.setattr(smtplib, "SMTP", _RecordingSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", _RecordingSSL)
    _reset_fakes()

    # ------------------------------------------------------------------
    # Trust-store spies: prove that AICRM_SMTP_CA_FILE REPLACES the
    # system trust store (load_default_certs must not run and only the
    # bundle may be trusted when the file is set) and that the system
    # store is used when the file is unset.
    # ------------------------------------------------------------------
    trust_calls = {"default_certs": 0, "verify_locations": []}
    _orig_load_default_certs = ssl.SSLContext.load_default_certs
    _orig_load_verify_locations = ssl.SSLContext.load_verify_locations

    def _spy_load_default_certs(self, purpose=ssl.Purpose.SERVER_AUTH):
        trust_calls["default_certs"] += 1
        return _orig_load_default_certs(self, purpose)

    def _spy_load_verify_locations(self, cafile=None, capath=None, cadata=None):
        trust_calls["verify_locations"].append((cafile, capath, cadata))
        return _orig_load_verify_locations(self, cafile, capath, cadata)

    monkeypatch.setattr(ssl.SSLContext, "load_default_certs", _spy_load_default_certs)
    monkeypatch.setattr(
        ssl.SSLContext, "load_verify_locations", _spy_load_verify_locations
    )

    def _reset_trust_calls() -> None:
        trust_calls["default_certs"] = 0
        trust_calls["verify_locations"].clear()

    # ------------------------------------------------------------------
    # AC-1: unconfigured path — EmailNotConfigured, no connection opened.
    # (Env vars are set here, after import: they are read at call time.)
    # ------------------------------------------------------------------
    _clear_smtp_env(monkeypatch)
    _expect_unconfigured()

    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("AICRM_SMTP_HOST", "")
    _expect_unconfigured()

    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("AICRM_SMTP_HOST", "   ")
    _expect_unconfigured()

    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("AICRM_SMTP_HOST", SAMPLE_HOST)
    _expect_unconfigured()  # port missing

    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("AICRM_SMTP_HOST", SAMPLE_HOST)
    monkeypatch.setenv("AICRM_SMTP_PORT", "not-a-port")
    _expect_unconfigured()  # non-numeric port

    _clear_smtp_env(monkeypatch)
    monkeypatch.setenv("AICRM_SMTP_HOST", SAMPLE_HOST)
    monkeypatch.setenv("AICRM_SMTP_PORT", "99999999999")
    _expect_unconfigured()  # out-of-range port

    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls=None)  # tls missing: no plaintext mode
    _expect_unconfigured()

    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls="plaintext")
    _expect_unconfigured()  # invalid tls mode: still no plaintext mode

    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls="implicit", with_from=False)
    _expect_unconfigured()  # from missing

    # ------------------------------------------------------------------
    # AC-1: starttls mode — STARTTLS before login, verifying context,
    #       connection timeout, configured credentials and envelope.
    # ------------------------------------------------------------------
    _reset_fakes()
    _reset_trust_calls()
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls="starttls")
    assert email_transport.send_email(RECIPIENT, "Hello subject", "Body text") is None
    assert len(_RecordingSMTP.instances) == 1
    assert not _RecordingSSL.instances
    conn = _RecordingSMTP.instances[0]
    assert conn.host == SAMPLE_HOST
    assert conn.port == 2525
    timeout = conn.kwargs.get("timeout")
    assert isinstance(timeout, (int, float)) and timeout > 0, "connection must be timed"
    names = _call_names(conn)
    assert names.index("starttls") < names.index("login")
    assert names.index("login") < names.index("sendmail")
    ctx = conn.calls[names.index("starttls")][1]["context"]
    assert ctx.check_hostname is True
    assert ctx.verify_mode == ssl.CERT_REQUIRED
    assert conn.calls[names.index("login")][1] == (SAMPLE_USER, SAMPLE_PASS)
    from_addr, to_addrs, payload = conn.calls[names.index("sendmail")][1]
    assert from_addr == SAMPLE_FROM
    assert to_addrs == [RECIPIENT]
    assert "Hello subject" in payload and "Body text" in payload
    assert "quit" in names
    assert (
        trust_calls["default_certs"] == 1
    ), "system trust store must be loaded when AICRM_SMTP_CA_FILE is unset"
    assert (
        trust_calls["verify_locations"] == []
    ), "no CA bundle may be loaded when AICRM_SMTP_CA_FILE is unset"

    # ------------------------------------------------------------------
    # AC-1: implicit mode — TLS from the start (no STARTTLS), verifying
    #       context, connection timeout, no login when unauthenticated.
    # ------------------------------------------------------------------
    _reset_fakes()
    _reset_trust_calls()
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls="implicit", with_auth=False)
    assert (
        email_transport.send_email(RECIPIENT, "Implicit subject", "Implicit body")
        is None
    )
    assert not _RecordingSMTP.instances
    assert len(_RecordingSSL.instances) == 1
    ssl_conn = _RecordingSSL.instances[0]
    assert ssl_conn.host == SAMPLE_HOST
    assert ssl_conn.port == 2525
    ssl_timeout = ssl_conn.kwargs.get("timeout")
    assert isinstance(ssl_timeout, (int, float)) and ssl_timeout > 0
    ssl_names = _call_names(ssl_conn)
    assert "starttls" not in ssl_names
    assert "login" not in ssl_names
    assert "sendmail" in ssl_names
    ssl_ctx = ssl_conn.kwargs.get("context")
    assert ssl_ctx is not None, "implicit mode must pass a TLS context"
    assert ssl_ctx.check_hostname is True
    assert ssl_ctx.verify_mode == ssl.CERT_REQUIRED
    assert (
        trust_calls["default_certs"] == 1
    ), "system trust store must be loaded when AICRM_SMTP_CA_FILE is unset"
    assert (
        trust_calls["verify_locations"] == []
    ), "no CA bundle may be loaded when AICRM_SMTP_CA_FILE is unset"

    # ------------------------------------------------------------------
    # AC-1: AICRM_SMTP_CA_FILE is used as the trusted CA bundle, and the
    #       context still verifies.
    # ------------------------------------------------------------------
    _reset_fakes()
    ca_bundle = _make_ca_bundle(tmp_path)
    _reset_trust_calls()
    _clear_smtp_env(monkeypatch)
    _set_smtp_env(monkeypatch, tls="starttls", ca_file=ca_bundle)
    email_transport.send_email(RECIPIENT, "CA subject", "CA body")
    assert len(_RecordingSMTP.instances) == 1
    ca_conn = _RecordingSMTP.instances[0]
    ca_names = _call_names(ca_conn)
    ca_ctx = ca_conn.calls[ca_names.index("starttls")][1]["context"]
    assert ca_ctx.check_hostname is True
    assert ca_ctx.verify_mode == ssl.CERT_REQUIRED
    # Defect fix: AICRM_SMTP_CA_FILE must REPLACE the system trust store,
    # not augment it — no system CAs may be trusted alongside the bundle.
    assert trust_calls["default_certs"] == 0, (
        "AICRM_SMTP_CA_FILE must replace the system trust store; "
        "load_default_certs must not run when the file is set"
    )
    assert trust_calls["verify_locations"] == [
        (str(ca_bundle), None, None)
    ], "the AICRM_SMTP_CA_FILE bundle must be the loaded trust anchor"
    ca_certs = ca_ctx.get_ca_certs()
    assert (
        len(ca_certs) == 1
    ), "only the AICRM_SMTP_CA_FILE certificate may be trusted when it is set"
    assert (("commonName", "issue255 test ca"),) in ca_certs[0][
        "subject"
    ], "the single trusted certificate must be the one from AICRM_SMTP_CA_FILE"

    # ------------------------------------------------------------------
    # AC-2: failures while connecting, negotiating TLS, authenticating or
    #       sending raise EmailSendError with a fixed generic message;
    #       the original exception is chained, its text never leaks into
    #       the raised message or the logs, and logs name the class only.
    # ------------------------------------------------------------------
    scenarios = [
        # (mode, stage, exception, expected logged class name)
        (
            "starttls",
            dict(init_exc=OSError(_hostile_text("connect"))),
            "OSError",
        ),
        (
            "starttls",
            dict(starttls_exc=ssl.SSLError(_hostile_text("tls"))),
            "SSLError",
        ),
        (
            "starttls",
            dict(
                login_exc=smtplib.SMTPAuthenticationError(
                    535, _hostile_text("auth").encode()
                )
            ),
            "SMTPAuthenticationError",
        ),
        (
            "starttls",
            dict(
                sendmail_exc=smtplib.SMTPDataError(550, _hostile_text("data").encode())
            ),
            "SMTPDataError",
        ),
        (
            "implicit",
            dict(init_exc=ConnectionError(_hostile_text("connect-implicit"))),
            "ConnectionError",
        ),
    ]
    messages = []
    for mode, stage_kwargs, expected_class in scenarios:
        _reset_fakes()
        fake_cls = _make_raising_fake(**stage_kwargs)
        _clear_smtp_env(monkeypatch)
        _set_smtp_env(monkeypatch, tls=mode)
        monkeypatch.setattr(smtplib, "SMTP", fake_cls)
        monkeypatch.setattr(smtplib, "SMTP_SSL", fake_cls)
        first_exc = next(iter(stage_kwargs.values()))
        before = len(caplog.records)
        with pytest.raises(email_transport.EmailSendError) as excinfo:
            email_transport.send_email(RECIPIENT, "subject", "body")
        err = excinfo.value
        message = str(err)
        assert message, "EmailSendError must carry a message"
        for secret in SECRET_FRAGMENTS:
            assert secret not in message, f"{secret!r} leaked into raised message"
        assert err.__cause__ is first_exc, "underlying exception must be chained"
        new_log_text = "\n".join(
            record.getMessage() for record in caplog.records[before:]
        )
        for secret in SECRET_FRAGMENTS:
            assert secret not in new_log_text, f"{secret!r} leaked into log output"
        assert (
            expected_class in new_log_text
        ), f"log line must record the exception class name {expected_class!r}"
        messages.append(message)
    assert len(set(messages)) == 1, "the generic message must be fixed"

    # ------------------------------------------------------------------
    # AC-1: module-level hook — a fake replaces the transport, and
    #       set_transport(None) restores the real one.
    # ------------------------------------------------------------------
    monkeypatch.setattr(smtplib, "SMTP", _RecordingSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", _RecordingSSL)
    captured = []

    def _fake_transport(to, subject, body):
        captured.append((to, subject, body))

    _clear_smtp_env(monkeypatch)  # unconfigured: the fake must still work
    email_transport.set_transport(_fake_transport)
    assert (
        email_transport.send_email("hook@nowhere.test", "hook subject", "hook body")
        is None
    )
    assert captured == [("hook@nowhere.test", "hook subject", "hook body")]

    captured.clear()
    email_transport.transport = _fake_transport  # direct assignment works too
    email_transport.send_email("again@nowhere.test", "s2", "b2")
    assert captured == [("again@nowhere.test", "s2", "b2")]

    email_transport.set_transport(None)  # restore the real transport
    with pytest.raises(email_transport.EmailNotConfigured):
        email_transport.send_email("x@nowhere.test", "s", "b")
