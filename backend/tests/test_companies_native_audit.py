"""Companies on the native audit path (audit convergence, step 3).

The trail: create/update/delete through the API produce created/updated/deleted events in
the native audit_log, actor-attributed, with the soft-delete marked as such. The tombstone
rail (#210): an update must never mutate a soft-deleted row. And the Option B policy holds
for companies exactly as for the other audited entities."""

import uuid

import pytest

from app.services.audit_service import AuditService


def _events_for(client, admin_headers, entity_id):
    listing = client.get("/api/audit?entity_type=company", headers=admin_headers)
    assert listing.status_code == 200, listing.text
    return [e for e in listing.json() if e["entity_id"] == entity_id]


def test_company_mutations_write_the_native_trail(client, admin_headers):
    name = f"native-{uuid.uuid4().hex[:8]}"
    created = client.post("/api/companies", json={"name": name}, headers=admin_headers)
    assert created.status_code == 201, created.text
    cid = created.json()["id"]

    upd = client.put(
        f"/api/companies/{cid}",
        json={"industry": "auditing"},
        headers=admin_headers,
    )
    assert upd.status_code == 200, upd.text

    dele = client.delete(f"/api/companies/{cid}", headers=admin_headers)
    assert dele.status_code == 204, dele.text

    events = _events_for(client, admin_headers, cid)
    assert sorted(e["action"] for e in events) == ["created", "deleted", "updated"]
    assert all(e["actor_sub"] for e in events)

    updated = next(e for e in events if e["action"] == "updated")
    assert updated["details"]["changed_fields"] == ["industry"]
    deleted = next(e for e in events if e["action"] == "deleted")
    assert deleted["details"]["soft"] is True  # the row survives as a tombstone


def test_update_never_mutates_a_tombstone(client, admin_headers):
    # the #210 rail: after a soft delete, a PUT must 404 AND leave the tombstone unchanged
    name = f"tomb-{uuid.uuid4().hex[:8]}"
    created = client.post("/api/companies", json={"name": name}, headers=admin_headers)
    assert created.status_code == 201, created.text
    cid = created.json()["id"]

    assert (
        client.delete(f"/api/companies/{cid}", headers=admin_headers).status_code == 204
    )
    upd = client.put(
        f"/api/companies/{cid}",
        json={"name": "ghost-write"},
        headers=admin_headers,
    )
    assert upd.status_code == 404, upd.text

    # the tombstone row itself is untouched (visible only via include_deleted)
    listing = client.get(
        "/api/companies?include_deleted=true&limit=100", headers=admin_headers
    )
    row = next(r for r in listing.json() if r["id"] == cid)
    assert row["name"] == name  # not "ghost-write" — no ghost mutation

    # and no 'updated' audit event exists for the tombstone
    events = _events_for(client, admin_headers, cid)
    assert "updated" not in [e["action"] for e in events]


def test_company_create_rolls_back_when_audit_fails(client, admin_headers, monkeypatch):
    name = f"atomic-{uuid.uuid4().hex[:8]}"

    def _boom(self, event):
        raise RuntimeError("audit backend down")

    monkeypatch.setattr(AuditService, "write", _boom)
    try:
        resp = client.post("/api/companies", json={"name": name}, headers=admin_headers)
        assert resp.status_code >= 500, resp.text
    except RuntimeError:
        pass
    monkeypatch.undo()
    listing = client.get("/api/companies?limit=100", headers=admin_headers)
    assert name not in [r["name"] for r in listing.json()]
