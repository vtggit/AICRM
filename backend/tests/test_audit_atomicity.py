"""Audit atomicity — the Option B policy, proven at the API surface.

app/services/audit_service.py documents: a mutation whose audit write fails must not persist.
transaction_scope() (app/db/connection.py) is the mechanism; these tests break the audit write
on purpose and assert the business mutation vanished with it, entity family by entity family.
"""

import uuid

import pytest

from app.services.audit_service import AuditService


class _AuditBoom(RuntimeError):
    """Distinctive failure injected into AuditService.write."""


@pytest.fixture
def broken_audit(monkeypatch):
    """Every audit write fails — mutations under the policy must roll back."""

    def _boom(self, event):
        raise _AuditBoom("audit backend down")

    monkeypatch.setattr(AuditService, "write", _boom)


def _expect_server_failure(call):
    """The injected failure surfaces as a re-raise (TestClient default) or a 5xx."""
    try:
        resp = call()
    except _AuditBoom:
        return
    assert resp.status_code >= 500, resp.text


def _names(client, admin_headers, route):
    listing = client.get(route, headers=admin_headers)
    assert listing.status_code == 200, listing.text
    return [r.get("name") for r in listing.json()]


def test_contact_create_rolls_back_when_audit_fails(
    client, admin_headers, broken_audit
):
    name = f"atomic-{uuid.uuid4().hex[:8]}"
    _expect_server_failure(
        lambda: client.post("/api/contacts", json={"name": name}, headers=admin_headers)
    )
    assert name not in _names(client, admin_headers, "/api/contacts")


def test_contact_delete_rolls_back_when_audit_fails(client, admin_headers, monkeypatch):
    name = f"atomic-{uuid.uuid4().hex[:8]}"
    created = client.post("/api/contacts", json={"name": name}, headers=admin_headers)
    assert created.status_code == 201, created.text
    cid = created.json()["id"]

    def _boom(self, event):
        raise _AuditBoom("audit backend down")

    monkeypatch.setattr(AuditService, "write", _boom)
    _expect_server_failure(
        lambda: client.delete(f"/api/contacts/{cid}", headers=admin_headers)
    )
    # the delete must NOT have survived its failed audit
    assert client.get(f"/api/contacts/{cid}", headers=admin_headers).status_code == 200


def test_contact_bulk_delete_rolls_back_when_audit_fails(
    client, admin_headers, monkeypatch
):
    ids = []
    for _ in range(2):
        r = client.post(
            "/api/contacts",
            json={"name": f"atomic-{uuid.uuid4().hex[:8]}"},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])

    def _boom(self, event):
        raise _AuditBoom("audit backend down")

    monkeypatch.setattr(AuditService, "write", _boom)
    _expect_server_failure(
        lambda: client.post(
            "/api/contacts/bulk-delete",
            json={"ids": ids},
            headers=admin_headers,
        )
    )
    for cid in ids:  # every row of the bulk delete rolled back
        assert (
            client.get(f"/api/contacts/{cid}", headers=admin_headers).status_code == 200
        )


def test_lead_create_rolls_back_when_audit_fails(client, admin_headers, broken_audit):
    name = f"atomic-{uuid.uuid4().hex[:8]}"
    _expect_server_failure(
        lambda: client.post("/api/leads", json={"name": name}, headers=admin_headers)
    )
    assert name not in _names(client, admin_headers, "/api/leads")


def test_activity_create_rolls_back_when_audit_fails(
    client, admin_headers, broken_audit
):
    desc = f"atomic-{uuid.uuid4().hex[:8]}"
    _expect_server_failure(
        lambda: client.post(
            "/api/activities",
            json={"type": "note", "description": desc},
            headers=admin_headers,
        )
    )
    listing = client.get("/api/activities", headers=admin_headers)
    assert listing.status_code == 200
    assert desc not in [r.get("description") for r in listing.json()]


def test_template_create_rolls_back_when_audit_fails(
    client, admin_headers, broken_audit
):
    name = f"atomic-{uuid.uuid4().hex[:8]}"
    _expect_server_failure(
        lambda: client.post(
            "/api/templates",
            json={"name": name, "content": "hello {name}"},
            headers=admin_headers,
        )
    )
    assert name not in _names(client, admin_headers, "/api/templates")


def test_settings_update_rolls_back_when_audit_fails(
    client, admin_headers, broken_audit
):
    marker = f"atomic-{uuid.uuid4().hex[:8]}"
    _expect_server_failure(
        lambda: client.put(
            "/api/settings",
            json={"payload": {"atomicity_marker": marker}},
            headers=admin_headers,
        )
    )
    current = client.get("/api/settings", headers=admin_headers)
    assert current.status_code == 200
    assert current.json()["payload"].get("atomicity_marker") != marker
