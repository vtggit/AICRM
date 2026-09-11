"""Issue #220 — GET /api/audit adopts the product-wide pagination contract.

Proves the audit list endpoint now behaves like the other nine list routers:
    - default page size 20, hard cap 100
    - negative / out-of-range limit and negative offset rejected with 422
    - X-Total-Count carries the total row count matching the current filter
    - results are ordered by the stable key (timestamp DESC, id DESC)
    - offset paging walks the full set deterministically
"""


def test_issue220_freeform(client, admin_headers):
    # Seed a known, mixed set of audit events: 25 contact creates + 1 lead
    # create.  The lead gives a non-contact row so the filtered total can be
    # proven distinct from the unfiltered total.
    for i in range(25):
        r = client.post(
            "/api/contacts",
            json={"name": f"issue220-{i:02d}"},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text
    lead = client.post(
        "/api/leads",
        json={"name": "issue220-lead"},
        headers=admin_headers,
    )
    assert lead.status_code == 201, lead.text

    # --- default page: 20 rows, X-Total-Count present and exact ---
    default = client.get("/api/audit", headers=admin_headers)
    assert default.status_code == 200, default.text
    assert default.headers.get("X-Total-Count") is not None
    total = int(default.headers["X-Total-Count"])
    assert total == 26  # 25 contacts + 1 lead, clean DB
    assert len(default.json()) == min(total, 20)  # default page size enforced

    # --- cap: limit=100 accepted, limit=101 rejected with 422 ---
    capped = client.get("/api/audit?limit=100", headers=admin_headers)
    assert capped.status_code == 200, capped.text
    assert len(capped.json()) == min(total, 100)
    over = client.get("/api/audit?limit=101", headers=admin_headers)
    assert over.status_code == 422, over.text

    # --- validation: negative limit and negative offset rejected with 422 ---
    assert client.get("/api/audit?limit=-1", headers=admin_headers).status_code == 422
    assert client.get("/api/audit?offset=-1", headers=admin_headers).status_code == 422

    # --- offset paging walks the whole set deterministically ---
    walked = []
    for off in range(0, total, 100):
        page = client.get(f"/api/audit?limit=100&offset={off}", headers=admin_headers)
        assert page.status_code == 200, page.text
        walked.extend(page.json())
    assert len(walked) == total
    ids = [e["id"] for e in walked]
    assert len(set(ids)) == total  # no overlap across pages

    # --- stable sort key: (timestamp DESC, id DESC) ---
    keys = [(e["timestamp"], e["id"]) for e in walked]
    for a, b in zip(keys, keys[1:]):
        assert (
            a >= b
        ), f"audit list not in (timestamp DESC, id DESC) order: {a} then {b}"
    for a, b in zip(ids, ids[1:]):
        assert a > b, f"audit ids not strictly descending: {a} then {b}"

    # --- X-Total-Count reflects the current filter, not the unfiltered total ---
    filtered = client.get(
        "/api/audit?entity_type=contact&limit=100", headers=admin_headers
    )
    assert filtered.status_code == 200, filtered.text
    filtered_total = int(filtered.headers["X-Total-Count"])
    assert filtered_total == 25  # exactly the contact rows, not the unfiltered 26
    assert filtered_total < total
    assert all(e["entity_type"] == "contact" for e in filtered.json())
