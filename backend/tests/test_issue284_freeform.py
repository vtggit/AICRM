"""Proving test for issue #284: audit details are minimized before persistence.

AC-1: app/models/audit.py defines AUDIT_DETAIL_ALLOWED_KEYS and
      minimize_details(); AuditEvent applies it through a field validator, so
      every write path (AuditService.write, the consent repository audit
      insert, the suppressions repository audit insert) stores minimized
      details — value-level included.

AC-2: this test creates, updates and deletes a contact, a lead, a company,
      an activity and a template through the API, runs a bulk status update,
      unsubscribes a contact and sends a contact email with a fake transport,
      then reads audit_log.details_json directly and asserts that no stored
      details contain a name, email, company, website, industry, description
      or subject value from the test data, while the allowed keys that were
      written (changed_fields, count, stage, old, new, contact_id, ...) are
      still present with their values.  It also unit-tests minimize_details:
      every allowed key with a valid value is kept, every other key is
      dropped, None gives {}, and personal-shaped values under allowed keys
      are dropped while valid values are kept.
"""

import json

import psycopg2

from app.db.connection import get_connection_params
from app.email import transport as email_transport
from app.models.audit import AUDIT_DETAIL_ALLOWED_KEYS, AuditEvent, minimize_details

# --------------------------------------------------------------------------- #
# Test data — every personal value below must NOT appear in stored audit
# details.
# --------------------------------------------------------------------------- #
COMPANY_NAME = "Acme Widgetry Co"
COMPANY_NAME_2 = "Globex Industrial Corp"
COMPANY_WEBSITE = "https://acme-widgetry.example.com"
COMPANY_INDUSTRY = "Widgetry"
COMPANY_INDUSTRY_2 = "Industrial Supplies"

CONTACT1_NAME = "Dana Whitfield"
CONTACT1_EMAIL = "dana.whitfield.284@example.com"
CONTACT2_NAME = "Riley Chen"
CONTACT2_EMAIL = "riley.chen.284@example.com"
CONTACT3_NAME = "Morgan Reyes"
CONTACT3_EMAIL = "morgan.reyes.284@example.com"

LEAD_NAME = "Jordan Avery"
LEAD_NAME_2 = "Jordan A. Avery"
LEAD_COMPANY = "Initech LLC"
LEAD_EMAIL = "jordan.avery.284@example.com"

ACTIVITY_TYPE = "call"
ACTIVITY_DESCRIPTION = (
    "Discussed the Q3 rollout with Dana Whitfield at Acme Widgetry Co"
)

TEMPLATE_NAME = "Follow-up after intro call"
TEMPLATE_SUBJECT = "Re: our conversation"
TEMPLATE_CONTENT = "Hi Dana, thanks for the intro call at Acme Widgetry Co."

EMAIL_SUBJECT = "Quarterly numbers inside"
EMAIL_BODY = "Hi Morgan, the quarterly numbers for Acme Widgetry Co are attached."

PERSONAL_VALUES = {
    COMPANY_NAME,
    COMPANY_NAME_2,
    COMPANY_WEBSITE,
    COMPANY_INDUSTRY,
    COMPANY_INDUSTRY_2,
    CONTACT1_NAME,
    CONTACT1_EMAIL,
    CONTACT2_NAME,
    CONTACT2_EMAIL,
    CONTACT3_NAME,
    CONTACT3_EMAIL,
    LEAD_NAME,
    LEAD_NAME_2,
    LEAD_COMPANY,
    LEAD_EMAIL,
    ACTIVITY_DESCRIPTION,
    TEMPLATE_NAME,
    TEMPLATE_SUBJECT,
    TEMPLATE_CONTENT,
    EMAIL_SUBJECT,
    EMAIL_BODY,
}


def _audit_rows() -> list[dict]:
    """Read audit_log straight out of the database."""
    conn = psycopg2.connect(**get_connection_params())
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT entity_type, entity_id, action, details_json "
                "FROM audit_log ORDER BY id"
            )
            columns = [column[0] for column in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def _stored_details(raw) -> dict:
    """The stored details dict; details_json is JSONB (psycopg2 decodes it to
    a dict) and empty events store NULL."""
    if raw is None:
        return {}
    if isinstance(raw, str):
        return json.loads(raw)
    return dict(raw)


def _details(
    rows: list[dict], entity_type: str, entity_id: str, action: str
) -> list[dict]:
    """All stored details dicts for one (entity_type, entity_id, action)."""
    found = []
    for row in rows:
        if (
            row["entity_type"] == entity_type
            and row["entity_id"] == entity_id
            and row["action"] == action
        ):
            found.append(_stored_details(row["details_json"]))
    return found


def test_issue284_freeform(client, admin_headers, user_headers):
    # ========================================================== #
    # Unit level: the minimize_details contract.
    # ========================================================== #
    kept = minimize_details(
        {
            "changed_fields": ["name", "email_consent_status"],
            "count": 3,
            "status": "active",
            "stage": "qualified",
            "type": "call",
            "category": "follow-up",
            "old": "*",
            "new": "opted_in",
            "source": "manual",
            "soft": True,
            "contact_id": "abc-123",
            "contact_ids": ["abc-123", "DEF-456"],
            "name": CONTACT1_NAME,
            "email": CONTACT1_EMAIL,
            "company": COMPANY_NAME,
            "website": COMPANY_WEBSITE,
            "industry": COMPANY_INDUSTRY,
            "description": ACTIVITY_DESCRIPTION,
            "subject": EMAIL_SUBJECT,
            "body": EMAIL_BODY,
        }
    )
    assert set(kept) == set(
        AUDIT_DETAIL_ALLOWED_KEYS
    ), "every allowed key with a valid value is kept, every other key is dropped"
    assert kept["changed_fields"] == ["name", "email_consent_status"]
    assert kept["count"] == 3
    assert kept["status"] == "active"
    assert kept["stage"] == "qualified"
    assert kept["type"] == "call"
    assert kept["category"] == "follow-up"
    assert kept["old"] == "*"
    assert kept["new"] == "opted_in"
    assert kept["source"] == "manual"
    assert kept["soft"] is True
    assert kept["contact_id"] == "abc-123"
    assert kept["contact_ids"] == ["abc-123", "DEF-456"]

    assert minimize_details(None) == {}
    assert minimize_details({}) == {}

    # Value-level rules: personal-shaped values under allowed keys are each
    # dropped, while valid values are kept.
    assert minimize_details({"new": CONTACT1_NAME}) == {}
    assert minimize_details({"source": CONTACT1_EMAIL}) == {}
    assert minimize_details({"status": "met Dana at the office"}) == {}
    assert minimize_details({"changed_fields": ["name", CONTACT1_NAME]}) == {}
    assert minimize_details({"contact_ids": ["abc-123", CONTACT1_EMAIL]}) == {}
    assert minimize_details(
        {
            "new": "opted_in",
            "source": "unsubscribe",
            "status": "opted_out",
            "changed_fields": ["industry"],
            "contact_ids": ["abc-123"],
        }
    ) == {
        "new": "opted_in",
        "source": "unsubscribe",
        "status": "opted_out",
        "changed_fields": ["industry"],
        "contact_ids": ["abc-123"],
    }

    # Single-token personal values (one-word names / company names) match the
    # code shape but are not machine codes: they must be dropped from every
    # code key, while lowercase or digit/symbol-carrying codes are kept.
    assert minimize_details({"new": "Dana"}) == {}
    assert minimize_details({"old": "Acme"}) == {}
    assert minimize_details({"new": "DANA"}) == {}
    assert minimize_details({"status": "Widgetry"}) == {}
    assert minimize_details({"stage": "Qualified"}) == {}
    assert minimize_details({"type": "Call"}) == {}
    assert minimize_details({"category": "Followup"}) == {}
    assert minimize_details({"source": "Manual"}) == {}
    assert minimize_details(
        {
            "new": "opted_in",
            "old": "unknown",
            "source": "manual",
            "status": "vip",
            "stage": "qualified",
            "type": "call",
            "category": "follow-up",
        }
    ) == {
        "new": "opted_in",
        "old": "unknown",
        "source": "manual",
        "status": "vip",
        "stage": "qualified",
        "type": "call",
        "category": "follow-up",
    }

    # AuditEvent applies the minimization through its field validator, so no
    # write path can persist unminimized details.
    event = AuditEvent(
        entity_type="contact",
        entity_id="c1",
        action="updated",
        actor_sub="u1",
        details={
            "name": CONTACT1_NAME,
            "email": CONTACT1_EMAIL,
            "subject": EMAIL_SUBJECT,
            "changed_fields": ["company", "status"],
            "count": 2,
            "old": "Acme",
            "new": "Dana",
        },
    )
    assert event.details == {"changed_fields": ["company", "status"], "count": 2}
    assert (
        AuditEvent(
            entity_type="contact",
            entity_id="c1",
            action="created",
            actor_sub="u1",
            details=None,
        ).details
        == {}
    )

    # ========================================================== #
    # API level: exercise every audit write path, then read
    # audit_log.details_json directly from the database.
    # ========================================================== #
    def ok_transport(to, subject, body):
        pass

    email_transport.set_transport(ok_transport)
    try:
        # ---------------- company: create / update / delete ---------------- #
        company = client.post(
            "/api/companies",
            headers=admin_headers,
            json={
                "name": COMPANY_NAME,
                "website": COMPANY_WEBSITE,
                "industry": COMPANY_INDUSTRY,
            },
        )
        assert company.status_code == 201, company.text
        company_id = company.json()["id"]

        company_upd = client.put(
            f"/api/companies/{company_id}",
            headers=admin_headers,
            json={"industry": COMPANY_INDUSTRY_2},
        )
        assert company_upd.status_code == 200, company_upd.text

        # ---------------- contacts: create / update / consent ---------------- #
        c1 = client.post(
            "/api/contacts",
            headers=admin_headers,
            json={
                "name": CONTACT1_NAME,
                "email": CONTACT1_EMAIL,
                "company": COMPANY_NAME,
                "status": "active",
            },
        )
        assert c1.status_code == 201, c1.text
        c1_id = c1.json()["id"]

        c2 = client.post(
            "/api/contacts",
            headers=admin_headers,
            json={"name": CONTACT2_NAME, "email": CONTACT2_EMAIL},
        )
        assert c2.status_code == 201, c2.text
        c2_id = c2.json()["id"]

        c3 = client.post(
            "/api/contacts",
            headers=admin_headers,
            json={"name": CONTACT3_NAME, "email": CONTACT3_EMAIL},
        )
        assert c3.status_code == 201, c3.text
        c3_id = c3.json()["id"]

        c1_upd = client.put(
            f"/api/contacts/{c1_id}",
            headers=admin_headers,
            json={"company": COMPANY_NAME_2, "status": "vip"},
        )
        assert c1_upd.status_code == 200, c1_upd.text

        # Consent change through the contact update (consent repository audit
        # insert); the consent-only update also writes an "updated" event
        # whose changed_fields list is empty.
        c3_consent = client.put(
            f"/api/contacts/{c3_id}",
            headers=admin_headers,
            json={"email_consent_status": "opted_in", "consent_source": "manual"},
        )
        assert c3_consent.status_code == 200, c3_consent.text

        # ---------------- leads: create / update / delete ---------------- #
        lead = client.post(
            "/api/leads",
            headers=admin_headers,
            json={
                "name": LEAD_NAME,
                "company": LEAD_COMPANY,
                "email": LEAD_EMAIL,
                "stage": "new",
            },
        )
        assert lead.status_code == 201, lead.text
        lead_id = lead.json()["id"]

        lead_upd = client.put(
            f"/api/leads/{lead_id}",
            headers=admin_headers,
            json={"name": LEAD_NAME_2, "stage": "qualified"},
        )
        assert lead_upd.status_code == 200, lead_upd.text

        # ---------------- activities: create / update / delete ---------------- #
        activity = client.post(
            "/api/activities",
            headers=admin_headers,
            json={
                "type": ACTIVITY_TYPE,
                "description": ACTIVITY_DESCRIPTION,
                "status": "pending",
            },
        )
        assert activity.status_code == 201, activity.text
        activity_id = activity.json()["id"]

        activity_upd = client.put(
            f"/api/activities/{activity_id}",
            headers=admin_headers,
            json={"status": "completed"},
        )
        assert activity_upd.status_code == 200, activity_upd.text

        # ---------------- templates: create / update / delete ---------------- #
        template = client.post(
            "/api/templates",
            headers=admin_headers,
            json={
                "name": TEMPLATE_NAME,
                "category": "follow-up",
                "subject": TEMPLATE_SUBJECT,
                "content": TEMPLATE_CONTENT,
            },
        )
        assert template.status_code == 201, template.text
        template_id = template.json()["id"]

        template_upd = client.put(
            f"/api/templates/{template_id}",
            headers=admin_headers,
            json={"category": "meeting"},
        )
        assert template_upd.status_code == 200, template_upd.text

        # ---------------- bulk status update (count / contact_ids) ---------------- #
        bulk = client.post(
            "/api/contacts/bulk-update-status",
            headers=admin_headers,
            json={"ids": [c1_id, c2_id], "status": "inactive"},
        )
        assert bulk.status_code == 200, bulk.text
        assert bulk.json()["success_count"] == 2

        # ---------------- unsubscribe (suppressions repository audit insert) ---------------- #
        unsub = client.post(
            "/api/suppressions/unsubscribe",
            headers=admin_headers,
            json={"contact_id": c1_id},
        )
        assert unsub.status_code == 200, unsub.text
        assert unsub.json()["may_send"] is False

        # ---------------- send a contact email with a fake transport ---------------- #
        sent = client.post(
            f"/api/contacts/{c3_id}/send-email",
            headers=user_headers,
            json={"subject": EMAIL_SUBJECT, "body": EMAIL_BODY},
        )
        assert sent.status_code == 202, sent.text
        assert sent.json() == {"status": "accepted"}

        # ---------------- deletes ---------------- #
        for delete in (
            client.delete(f"/api/leads/{lead_id}", headers=admin_headers),
            client.delete(f"/api/companies/{company_id}", headers=admin_headers),
            client.delete(f"/api/activities/{activity_id}", headers=admin_headers),
            client.delete(f"/api/templates/{template_id}", headers=admin_headers),
            client.delete(f"/api/contacts/{c2_id}", headers=admin_headers),
        ):
            assert delete.status_code == 204, delete.text

        # ========================================================== #
        # Read audit_log.details_json directly and prove the policy.
        # ========================================================== #
        rows = _audit_rows()
        assert rows, "the write paths above must have produced audit rows"

        # No stored details contain a name, email, company, website,
        # industry, description or subject value from the test data.
        blob = json.dumps(
            [_stored_details(r["details_json"]) for r in rows],
            sort_keys=True,
        ).lower()
        for value in PERSONAL_VALUES:
            assert (
                value.lower() not in blob
            ), f"personal value {value!r} leaked into stored audit details"

        # The allowed keys that were written are still present with their
        # values — minimization keeps non-personal data.
        assert _details(rows, "company", company_id, "created") == [{}]
        assert _details(rows, "company", company_id, "updated") == [
            {"changed_fields": ["industry"]}
        ]
        assert _details(rows, "company", company_id, "deleted") == [{"soft": True}]

        assert _details(rows, "contact", c1_id, "created") == [{}]
        c1_updated = _details(rows, "contact", c1_id, "updated")
        assert len(c1_updated) == 1 and set(c1_updated[0]) == {"changed_fields"}
        assert sorted(c1_updated[0]["changed_fields"]) == ["company", "status"]
        assert _details(rows, "contact", c1_id, "consent_change") == [
            {"old": "*", "new": "opted_out", "source": "unsubscribe"}
        ]
        assert _details(rows, "contact", c2_id, "created") == [{}]
        assert _details(rows, "contact", c2_id, "deleted") == [{}]
        assert _details(rows, "contact", c3_id, "created") == [{}]
        assert _details(rows, "contact", c3_id, "updated") == [{"changed_fields": []}]
        assert _details(rows, "contact", c3_id, "consent_change") == [
            {"old": "unknown", "new": "opted_in", "source": "manual"}
        ]
        assert _details(rows, "contact", c3_id, "email.sent") == [{"contact_id": c3_id}]
        assert _details(rows, "contact", "bulk", "bulk_status_updated") == [
            {"count": 2, "status": "inactive", "contact_ids": [c1_id, c2_id]}
        ]

        assert _details(rows, "lead", lead_id, "created") == [{"stage": "new"}]
        lead_updated = _details(rows, "lead", lead_id, "updated")
        assert len(lead_updated) == 1 and set(lead_updated[0]) == {"changed_fields"}
        assert sorted(lead_updated[0]["changed_fields"]) == ["name", "stage"]
        assert _details(rows, "lead", lead_id, "deleted") == [{"stage": "qualified"}]

        assert _details(rows, "activity", activity_id, "created") == [
            {"type": ACTIVITY_TYPE, "status": "pending"}
        ]
        assert _details(rows, "activity", activity_id, "updated") == [
            {"changed_fields": ["status"]}
        ]
        assert _details(rows, "activity", activity_id, "deleted") == [
            {"type": ACTIVITY_TYPE}
        ]

        assert _details(rows, "template", template_id, "created") == [
            {"category": "follow-up"}
        ]
        assert _details(rows, "template", template_id, "updated") == [
            {"changed_fields": ["category"]}
        ]
        assert _details(rows, "template", template_id, "deleted") == [
            {"category": "meeting"}
        ]
    finally:
        email_transport.set_transport(None)
