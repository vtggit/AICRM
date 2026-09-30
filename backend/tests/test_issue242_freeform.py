"""Issue #242 — list-router coverage and audit X-Total-Count value semantics.

Proves:
  AC-1: the hardening contract now covers every list router — /api/suppressions
        (admin-only) and /api/sales-goals (full list now that its migration
        exists) — all responding 200 with X-Total-Count under admin headers.
  AC-2: GET /api/audit X-Total-Count VALUE semantics: after creating companies
        through the API (each create writes one audit event) the header equals
        the row count of audit_log read directly with SELECT COUNT(*); the
        default page returns min(20, total) rows, limit=5 returns 5 rows, and
        limit=100&offset=<total-3> returns 3 rows.
  AC-3: non-integer paging values (limit=abc, limit=1.5, offset=abc,
        offset=1.5) are rejected with 422 on every endpoint in the list.
"""

import psycopg2

from app.db.connection import get_connection_params

ENDPOINTS = [
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


def test_issue242_freeform(client, admin_headers, user_headers):
    # --- AC-1: every list router answers the hardened contract for admins ---
    for ep in ENDPOINTS:
        ok = client.get(ep, headers=admin_headers)
        assert ok.status_code == 200, ep + ": " + ok.text
        assert ok.headers.get("X-Total-Count") is not None, ep
        assert len(ok.json()) <= 20, ep

    # /api/suppressions is admin-only: a plain user is rejected with 403
    denied = client.get("/api/suppressions", headers=user_headers)
    assert denied.status_code == 403, denied.text

    # --- AC-3: non-integer paging values rejected with 422 everywhere ---
    for ep in ENDPOINTS:
        for bad in ("limit=abc", "limit=1.5", "offset=abc", "offset=1.5"):
            assert (
                client.get(ep + "?" + bad, headers=admin_headers).status_code == 422
            ), f"{ep}?{bad}"

    # --- AC-2: audit X-Total-Count VALUE semantics ---
    # 25 company creates through the API; each create writes exactly one
    # audit event (clean DB via the autouse truncation fixture).
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
            "/api/companies",
            json={"name": f"Issue242 Co {i:02d}"},
            headers=admin_headers,
        )
        assert r.status_code == 201, r.text

    # Proof that the total is measured, not a hardcoded literal: the
    # expected total is the baseline row count plus one event per create.
    db_total = audit_row_count()
    assert db_total == db_before + 25  # one audit event per create

    default = client.get("/api/audit", headers=admin_headers)
    assert default.status_code == 200, default.text
    total = int(default.headers["X-Total-Count"])
    assert total == db_total  # header equals the true row count
    assert len(default.json()) == min(20, total)  # default page

    five = client.get("/api/audit?limit=5", headers=admin_headers)
    assert five.status_code == 200, five.text
    assert len(five.json()) == 5

    tail = client.get(f"/api/audit?limit=100&offset={total - 3}", headers=admin_headers)
    assert tail.status_code == 200, tail.text
    assert len(tail.json()) == 3
