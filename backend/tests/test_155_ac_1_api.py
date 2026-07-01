"""Company API CRUD tests (real Postgres)."""


def test_company_list_unauthenticated_returns_401(client):
    assert client.get("/api/companies").status_code == 401


def test_company_create_requires_name(client, admin_headers):
    r = client.post("/api/companies", json={}, headers=admin_headers)
    assert r.status_code in (400, 422)


def test_155_ac_1_crud(client, admin_headers, user_headers):
    """Full create -> read -> update(PUT) -> list -> delete round-trip; every field persists."""
    r = client.post("/api/companies", json={"name": "v1", "email": "v1", "phone": "v1", "address": "v1", "website": "v1", "employee_count": 7, "annual_revenue": 9.5, "is_active": True, "description": "v1"}, headers=admin_headers)
    assert r.status_code == 201
    created = r.json()
    entity_id = created["id"]
    assert created["name"] == "v1"
    assert created["email"] == "v1"
    assert created["phone"] == "v1"
    assert created["address"] == "v1"
    assert created["website"] == "v1"
    assert created["employee_count"] == 7
    assert created["annual_revenue"] == 9.5
    assert created["is_active"] == True
    assert created["description"] == "v1"
    got = client.get(f"/api/companies/{entity_id}", headers=user_headers)
    assert got.status_code == 200 and got.json()["id"] == entity_id
    upd = client.put(f"/api/companies/{entity_id}", json={"name": "n2", "email": "v2"}, headers=admin_headers)
    assert upd.status_code == 200
    updated = upd.json()
    assert updated["name"] == "n2" and updated["email"] == "v2"
    listing = client.get("/api/companies", headers=user_headers)
    assert any(x["id"] == entity_id for x in listing.json())
    dele = client.delete(f"/api/companies/{entity_id}", headers=admin_headers)
    assert dele.status_code == 204
    assert client.get(f"/api/companies/{entity_id}", headers=admin_headers).status_code == 404
