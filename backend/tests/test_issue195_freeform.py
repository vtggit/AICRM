"""Proving test for issue #195 — sales_goals table exists via migrations alone.

On a database built by running the Alembic migrations alone, POST /api/sales-goals
creates a goal (201) and GET /api/sales-goals responds 200 with a JSON list —
no 503 database-unavailable error and no response validation error.
"""

import psycopg2

from app.db.connection import get_connection_params


def test_issue195_freeform(client, admin_headers):
    try:
        # Create a sales goal — must succeed (201), not 503 (missing table)
        # and not a response validation error.
        create_resp = client.post(
            "/api/sales-goals",
            headers=admin_headers,
            json={
                "name": "Q1 Revenue Target",
                "type": "revenue",
                "target_value": 500000.0,
                "period": "quarterly",
                "start_date": "2025-01-01",
                "end_date": "2025-03-31",
            },
        )
        assert create_resp.status_code == 201, (
            f"POST /api/sales-goals returned {create_resp.status_code}: "
            f"{create_resp.text}"
        )
        created = create_resp.json()
        assert created["id"]
        assert created["name"] == "Q1 Revenue Target"
        # start_date / end_date must be ISO-8601 strings (SalesGoalResponse declares str)
        assert created["start_date"] == "2025-01-01"
        assert created["end_date"] == "2025-03-31"

        # List sales goals — must respond 200 with a JSON list, not 503 and not a
        # response validation error.
        list_resp = client.get("/api/sales-goals", headers=admin_headers)
        assert list_resp.status_code == 200, (
            f"GET /api/sales-goals returned {list_resp.status_code}: "
            f"{list_resp.text}"
        )
        body = list_resp.json()
        assert isinstance(body, list)
        assert any(g["id"] == created["id"] for g in body)
    finally:
        # Clean up any sales_goals rows this test inserted, even on assertion failure.
        conn = psycopg2.connect(**get_connection_params())
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM sales_goals;")
            conn.commit()
        finally:
            conn.close()
