"""Pagination hardening — defaults, caps, validation, and totals on every list."""

import psycopg2

from app.db.connection import get_connection_params


def test_list_pagination_hardening(client, admin_headers):
    endpoints = [
        "/api/activities",
        "/api/audit",
        "/api/companies",
        "/api/contacts",
        "/api/deal-outcomes",
        "/api/leads",
        "/api/sales-goals",
        "/api/suppressions",
        "/api/tags",
        "/api/templates",
    ]
    for ep in endpoints:
        assert (
            client.get(ep + "?limit=-1", headers=admin_headers).status_code == 422
        ), ep
        assert (
            client.get(ep + "?limit=101", headers=admin_headers).status_code == 422
        ), ep
        assert (
            client.get(ep + "?offset=-1", headers=admin_headers).status_code == 422
        ), ep
        # non-integer paging values must be rejected with 422, not coerced
        for bad in ("limit=abc", "limit=1.5", "offset=abc", "offset=1.5"):
            assert (
                client.get(ep + "?" + bad, headers=admin_headers).status_code == 422
            ), (ep + "?" + bad)
    for ep in endpoints:
        ok = client.get(ep, headers=admin_headers)
        assert ok.status_code == 200, ep + ": " + ok.text
        assert ok.headers.get("X-Total-Count") is not None, ep
        assert len(ok.json()) <= 20, ep

    def audit_row_count() -> int:
        conn = psycopg2.connect(**get_connection_params())
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM audit_log")
                return cur.fetchone()[0]
        finally:
            conn.close()

    db_before = audit_row_count()
    for i in range(25):
        r = client.post(
            "/api/companies", json={"name": f"Page Co {i:02d}"}, headers=admin_headers
        )
        assert r.status_code == 201, r.text
    full = client.get("/api/companies", headers=admin_headers)
    total = int(full.headers["X-Total-Count"])
    assert len(full.json()) == 20 and total >= 25  # default page, true total
    rest = client.get("/api/companies?limit=100&offset=20", headers=admin_headers)
    assert len(rest.json()) == total - 20  # offset walks the whole set
    five = client.get("/api/companies?limit=5", headers=admin_headers)
    assert len(five.json()) == 5

    # X-Total-Count VALUE semantics for GET /api/audit: each company create
    # above wrote exactly one audit event, so the header must equal the raw
    # row count of audit_log.
    db_total = audit_row_count()
    assert db_total == db_before + 25  # one event per create; measured, never hardcoded

    audit_default = client.get("/api/audit", headers=admin_headers)
    assert audit_default.status_code == 200, audit_default.text
    audit_total = int(audit_default.headers["X-Total-Count"])
    assert audit_total == db_total  # header equals the true row count
    assert len(audit_default.json()) == min(20, audit_total)  # default page

    audit_five = client.get("/api/audit?limit=5", headers=admin_headers)
    assert audit_five.status_code == 200, audit_five.text
    assert len(audit_five.json()) == 5

    tail = client.get(
        f"/api/audit?limit=100&offset={audit_total - 3}", headers=admin_headers
    )
    assert tail.status_code == 200, tail.text
    assert len(tail.json()) == 3
