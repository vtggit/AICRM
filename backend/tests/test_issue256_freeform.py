"""Proving test for issue #256: freeform contact email.

AC-1: POST /api/contacts/{contact_id}/send-email (any signed-in user)
      accepts {subject: 1-500, body: 1-20000} and answers:
      404 when the contact does not exist or is soft-deleted; 422 when
      the contact has no email address; 409 when may_send refuses, with
      the gate's reasons in the response detail; 503 with detail "email
      sending is not configured" when the transport raises
      EmailNotConfigured; 502 with detail "the email could not be sent"
      (and no further detail) when it raises EmailSendError; and 202
      with {"status": "accepted"} when the transport accepts the message.

AC-2: only a successfully accepted send is recorded: an activity of
      type email / status completed / occurred_at now / the contact's
      name / description "Email accepted: <subject>" (body not stored)
      and an audit event with action email.sent whose details hold the
      contact id and subject only.  A refused, unconfigured or failed
      send creates neither.  The transport is replaced with a fake for
      every branch.
"""

import uuid

from app.email import transport as email_transport

SUBJECT = "Quarterly follow-up"
BODY = "Hi there,\n\nPlease find the quarterly numbers attached.\n\nThanks."
RUN = uuid.uuid4().hex[:8]
TARGET_EMAIL = f"issue256.target.{RUN}@example.com"
REFUSED_EMAIL = f"issue256.refused.{RUN}@example.com"


def _counts(client, admin_headers) -> tuple[int, int]:
    """Return (activity row count, email.sent audit event count)."""
    activities = client.get("/api/activities", headers=admin_headers).json()
    audit = client.get(
        "/api/audit", params={"limit": 100}, headers=admin_headers
    ).json()
    email_sent = [e for e in audit if e["action"] == "email.sent"]
    return len(activities), len(email_sent)


def test_issue256_freeform(client, admin_headers, user_headers):
    sent = []

    def ok_transport(to, subject, body):
        sent.append((to, subject, body))

    def not_configured_transport(to, subject, body):
        raise email_transport.EmailNotConfigured("AICRM_SMTP_HOST is not set")

    def failing_transport(to, subject, body):
        raise email_transport.EmailSendError("hostile failure text must not leak")

    email_transport.set_transport(ok_transport)
    try:
        # ---------------------------------------------------------- #
        # Setup: three contacts — one opted-in target, one without an
        # email address, one whose consent is still unknown (so the
        # may_send gate refuses it).
        # ---------------------------------------------------------- #
        target = client.post(
            "/api/contacts",
            json={"name": "Issue 256 Target", "email": TARGET_EMAIL},
            headers=admin_headers,
        )
        assert target.status_code == 201, target.text
        target_id = target.json()["id"]

        no_email = client.post(
            "/api/contacts",
            json={"name": "Issue 256 No Email"},
            headers=admin_headers,
        )
        assert no_email.status_code == 201, no_email.text
        no_email_id = no_email.json()["id"]

        refused = client.post(
            "/api/contacts",
            json={"name": "Issue 256 Refused", "email": REFUSED_EMAIL},
            headers=admin_headers,
        )
        assert refused.status_code == 201, refused.text
        refused_id = refused.json()["id"]

        consent = client.put(
            f"/api/contacts/{target_id}",
            json={"email_consent_status": "opted_in", "consent_source": "manual"},
            headers=admin_headers,
        )
        assert consent.status_code == 200, consent.text

        baseline = _counts(client, admin_headers)

        # ---------------------------------------------------------- #
        # AC-1 success branch: any signed-in user (non-admin here),
        # transport accepts -> 202 {"status": "accepted"}.
        # AC-2: the activity and audit rows exist exactly once.
        # ---------------------------------------------------------- #
        sent.clear()
        ok = client.post(
            f"/api/contacts/{target_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert ok.status_code == 202, ok.text
        assert ok.json() == {"status": "accepted"}
        assert sent == [
            (TARGET_EMAIL, SUBJECT, BODY)
        ], "the fake transport must receive (to, subject, body)"

        after_ok = _counts(client, admin_headers)
        assert after_ok == (
            baseline[0] + 1,
            baseline[1] + 1,
        ), "an accepted send must record exactly one activity and one audit event"

        activities = client.get("/api/activities", headers=admin_headers).json()
        recorded = [
            a for a in activities if a["description"] == f"Email accepted: {SUBJECT}"
        ]
        assert len(recorded) == 1, "exactly one activity for the accepted send"
        activity = recorded[0]
        assert activity["type"] == "email"
        assert activity["status"] == "completed"
        assert activity["contact_name"] == "Issue 256 Target"
        assert activity["occurred_at"], "occurred_at must be set to now"
        assert BODY not in activity["description"], "the body must not be stored"

        audit = client.get(
            "/api/audit", params={"limit": 100}, headers=admin_headers
        ).json()
        sent_events = [e for e in audit if e["action"] == "email.sent"]
        assert len(sent_events) == 1, "exactly one email.sent audit event"
        event = sent_events[0]
        assert event["entity_type"] == "contact"
        assert event["entity_id"] == target_id
        assert set(event["details"].keys()) == {
            "contact_id",
            "subject",
        }, "audit details hold the contact id and subject only"
        assert event["details"]["contact_id"] == target_id
        assert event["details"]["subject"] == SUBJECT
        for value in event["details"].values():
            assert value not in (
                TARGET_EMAIL,
                BODY,
            ), "no recipient address and no body in audit details"

        # ---------------------------------------------------------- #
        # AC-1: unauthenticated calls are rejected before anything else.
        # ---------------------------------------------------------- #
        anon = client.post(
            f"/api/contacts/{target_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
        )
        assert anon.status_code == 401, anon.text
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: 404 when the contact does not exist (or is soft-deleted).
        # ---------------------------------------------------------- #
        missing = client.post(
            "/api/contacts/does-not-exist-256/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert missing.status_code == 404, missing.text
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: 422 when the contact has no email address.
        # ---------------------------------------------------------- #
        no_addr = client.post(
            f"/api/contacts/{no_email_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert no_addr.status_code == 422, no_addr.text
        assert "email" in no_addr.json()["detail"]
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: 409 when may_send refuses — the gate's reasons are in
        # the response detail.
        # ---------------------------------------------------------- #
        gate = client.get(
            "/api/suppressions/may-send",
            params={"email": REFUSED_EMAIL},
            headers=user_headers,
        ).json()
        assert gate["may_send"] is False and gate["reasons"]
        refused_send = client.post(
            f"/api/contacts/{refused_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert refused_send.status_code == 409, refused_send.text
        detail = refused_send.json()["detail"]
        for reason in gate["reasons"]:
            assert reason in detail, f"gate reason {reason!r} missing from detail"
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: 503 with detail "email sending is not configured" when
        # the transport raises EmailNotConfigured.
        # ---------------------------------------------------------- #
        email_transport.set_transport(not_configured_transport)
        unconfigured = client.post(
            f"/api/contacts/{target_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert unconfigured.status_code == 503, unconfigured.text
        assert unconfigured.json()["detail"] == "email sending is not configured"
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: 502 with detail "the email could not be sent" and no
        # further detail when the transport raises EmailSendError.
        # ---------------------------------------------------------- #
        email_transport.set_transport(failing_transport)
        failed = client.post(
            f"/api/contacts/{target_id}/send-email",
            json={"subject": SUBJECT, "body": BODY},
            headers=user_headers,
        )
        assert failed.status_code == 502, failed.text
        assert failed.json() == {
            "detail": "the email could not be sent"
        }, "the 502 body must carry the fixed detail and nothing else"
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1: hostile inputs must never produce a 500 — the subject
        # and body bounds (1-500, 1-20000) are enforced with 422.
        # ---------------------------------------------------------- #
        email_transport.set_transport(ok_transport)
        hostile = [
            {"subject": "", "body": BODY},
            {"subject": "s" * 501, "body": BODY},
            {"subject": SUBJECT, "body": ""},
            {"subject": SUBJECT, "body": "b" * 20001},
            {"subject": 123, "body": BODY},
        ]
        for payload in hostile:
            bad = client.post(
                f"/api/contacts/{target_id}/send-email",
                json=payload,
                headers=user_headers,
            )
            assert bad.status_code == 422, (payload, bad.text)
        assert _counts(client, admin_headers) == after_ok

        # ---------------------------------------------------------- #
        # AC-1 boundary: exactly 500-char subject and 20000-char body
        # are accepted and recorded like any other successful send.
        # ---------------------------------------------------------- #
        boundary_subject = "s" * 500
        boundary_body = "b" * 20000
        sent.clear()
        boundary = client.post(
            f"/api/contacts/{target_id}/send-email",
            json={"subject": boundary_subject, "body": boundary_body},
            headers=user_headers,
        )
        assert boundary.status_code == 202, boundary.text
        assert boundary.json() == {"status": "accepted"}
        assert sent == [(TARGET_EMAIL, boundary_subject, boundary_body)]
        after_boundary = _counts(client, admin_headers)
        assert after_boundary == (after_ok[0] + 1, after_ok[1] + 1)
        boundary_activities = [
            a
            for a in client.get("/api/activities", headers=admin_headers).json()
            if a["description"] == f"Email accepted: {boundary_subject}"
        ]
        assert len(boundary_activities) == 1
        boundary_audit = [
            e
            for e in client.get(
                "/api/audit", params={"limit": 100}, headers=admin_headers
            ).json()
            if e["action"] == "email.sent"
            and e["details"].get("subject") == boundary_subject
        ]
        assert len(boundary_audit) == 1
        assert boundary_audit[0]["details"]["contact_id"] == target_id
    finally:
        email_transport.set_transport(None)
