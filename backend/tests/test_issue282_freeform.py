"""Issue 282 — entity id fields must be canonical UUIDs.

Free-form values (XSS payloads, random text, NUL/control bytes, huge
strings) are rejected with a 422 pattern-mismatch *before* any database
access, while a well-formed unknown UUID still reaches the existing
reference-error 422.  The two 422s use distinguishable envelopes.
"""

import uuid

XSS_COMPANY_ID = 'x" onclick="alert(1)'

MALFORMED_COMPANY_IDS = (
    XSS_COMPANY_ID,
    "ABC",
    "",
    "no-such-ref",
    "12345678-1234-1234-1234-12345678901g",
    "ABCDEF01-2222-3333-4444-555566667777",
    "\x00\x01\x02",
    "\t\n",
    "a" * 100_000,
)


def _assert_pattern_mismatch(response, field):
    """422 via the validation envelope, naming `field` with a pattern error."""
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["detail"] == "Request validation failed."
    errors = {e["field"]: e for e in body["errors"]}
    assert field in errors, body
    assert errors[field]["type"] == "string_pattern_mismatch", body
    assert "Invalid reference" not in response.text


def _assert_reference_error(response):
    """422 via the existing reference-not-found envelope (no validation errors)."""
    assert response.status_code == 422, response.text
    body = response.json()
    assert body["detail"].startswith("Invalid reference:")
    assert "errors" not in body
    assert "string_pattern_mismatch" not in response.text


def test_issue282_freeform(client, admin_headers):
    # --- Malformed company_id on POST /api/contacts -> 422 naming company_id
    for bad in MALFORMED_COMPANY_IDS:
        resp = client.post(
            "/api/contacts",
            json={"name": "x", "company_id": bad},
            headers=admin_headers,
        )
        _assert_pattern_mismatch(resp, "body.company_id")

    # --- Malformed company_id on POST /api/leads -> 422 naming company_id
    for bad in (XSS_COMPANY_ID, "ABC"):
        resp = client.post(
            "/api/leads",
            json={"name": "x", "company_id": bad},
            headers=admin_headers,
        )
        _assert_pattern_mismatch(resp, "body.company_id")

    # --- Malformed lead_id on POST /api/deal-outcomes -> 422 naming lead_id
    for bad in (XSS_COMPANY_ID, "ABC"):
        resp = client.post(
            "/api/deal-outcomes",
            json={
                "lead_id": bad,
                "outcome": "won",
                "reason_category": "budget",
            },
            headers=admin_headers,
        )
        _assert_pattern_mismatch(resp, "body.lead_id")

    # --- A well-formed unknown UUID -> the existing reference-error 422
    unknown = str(uuid.uuid4())
    _assert_reference_error(
        client.post(
            "/api/contacts",
            json={"name": "x", "company_id": unknown},
            headers=admin_headers,
        )
    )
    _assert_reference_error(
        client.post(
            "/api/leads",
            json={"name": "x", "company_id": unknown},
            headers=admin_headers,
        )
    )
    _assert_reference_error(
        client.post(
            "/api/deal-outcomes",
            json={
                "lead_id": unknown,
                "outcome": "won",
                "reason_category": "budget",
            },
            headers=admin_headers,
        )
    )

    # --- Real company id still works end to end (201s)
    company = client.post(
        "/api/companies",
        json={"name": "Issue 282 Company"},
        headers=admin_headers,
    )
    assert company.status_code == 201, company.text
    company_id = company.json()["id"]

    contact = client.post(
        "/api/contacts",
        json={"name": "Valid Ref", "company_id": company_id},
        headers=admin_headers,
    )
    assert contact.status_code == 201, contact.text
    assert contact.json()["company_id"] == company_id

    lead = client.post(
        "/api/leads",
        json={"name": "Valid Ref Lead", "company_id": company_id},
        headers=admin_headers,
    )
    assert lead.status_code == 201, lead.text
    assert lead.json()["company_id"] == company_id

    outcome = client.post(
        "/api/deal-outcomes",
        json={
            "lead_id": lead.json()["id"],
            "outcome": "won",
            "reason_category": "budget",
            "reason_text": "Valid reference",
        },
        headers=admin_headers,
    )
    assert outcome.status_code == 201, outcome.text
    assert outcome.json()["lead_id"] == lead.json()["id"]

    # --- PUT /api/contacts/<id> with an invalid company_id -> 422
    for bad in (XSS_COMPANY_ID, "ABC", ""):
        resp = client.put(
            f"/api/contacts/{contact.json()['id']}",
            json={"company_id": bad},
            headers=admin_headers,
        )
        _assert_pattern_mismatch(resp, "body.company_id")

    # PUT with a well-formed unknown UUID -> the reference-error 422
    _assert_reference_error(
        client.put(
            f"/api/contacts/{contact.json()['id']}",
            json={"company_id": str(uuid.uuid4())},
            headers=admin_headers,
        )
    )

    # PUT with the real company id still succeeds
    ok = client.put(
        f"/api/contacts/{contact.json()['id']}",
        json={"company_id": company_id},
        headers=admin_headers,
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["company_id"] == company_id

    # --- Trailing newline in email is rejected on contacts and leads
    for path in ("/api/contacts", "/api/leads"):
        resp = client.post(
            path,
            json={"name": "x", "email": "jane@example.com\n"},
            headers=admin_headers,
        )
        assert resp.status_code == 422, resp.text
        body = resp.json()
        assert body["detail"] == "Request validation failed."
        errors = {e["field"]: e for e in body["errors"]}
        assert "body.email" in errors, body
        assert errors["body.email"]["type"] == "value_error", body
        assert "Invalid reference" not in resp.text

    # --- Empty lead_id is a pattern mismatch, not a length error
    _assert_pattern_mismatch(
        client.post(
            "/api/deal-outcomes",
            json={"lead_id": "", "outcome": "won", "reason_category": "budget"},
            headers=admin_headers,
        ),
        "body.lead_id",
    )
