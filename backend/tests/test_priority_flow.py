"""Field-flow test — priority round-trips through the contacts API."""


def test_priority_round_trips(client, admin_headers):
    body = {"name": "test"}
    body["priority"] = "high"
    created = client.post("/api/contacts", json=body, headers=admin_headers)
    assert created.status_code == 201, created.text
    _id = created.json()["id"]
    listing = client.get("/api/contacts", headers=admin_headers)
    assert listing.status_code == 200, listing.text
    row = next((r for r in listing.json() if r.get("id") == _id), None)
    assert row is not None, "created record not found in list"
    assert row.get("priority") == "high"
