"""Proving test for issue #323: range=1y on /api/analytics/activity-trends."""

from datetime import datetime, timedelta, timezone


def test_issue323_surgical(client, admin_headers, clean_database):
    # Create one activity 200 days in the past
    past_dt = datetime.now(timezone.utc) - timedelta(days=200)
    resp = client.post(
        "/api/activities",
        headers=admin_headers,
        json={
            "type": "call",
            "description": "test activity for 1y range",
            "occurred_at": past_dt.isoformat(),
        },
    )
    assert resp.status_code in (200, 201), resp.text

    # --- range=1y: correct label, 365-day span, activity counted ---
    resp_1y = client.get(
        "/api/analytics/activity-trends?range=1y",
        headers=admin_headers,
    )
    assert resp_1y.status_code == 200, resp_1y.text
    data_1y = resp_1y.json()
    assert data_1y["range"] == "1y"
    start = datetime.fromisoformat(data_1y["start_date"])
    end = datetime.fromisoformat(data_1y["end_date"])
    delta_days = (end - start).total_seconds() / 86400
    assert abs(delta_days - 365) < 1, f"Expected ~365 days, got {delta_days}"
    # The 200-day-old activity must be within the 365-day window
    assert data_1y["total_activities"] >= 1

    # --- range=90d: activity (200 days old) must NOT be counted ---
    resp_90d = client.get(
        "/api/analytics/activity-trends?range=90d",
        headers=admin_headers,
    )
    assert resp_90d.status_code == 200, resp_90d.text
    data_90d = resp_90d.json()
    assert data_90d["total_activities"] == 0

    # --- range=30d: still spans 30 days ---
    resp_30d = client.get(
        "/api/analytics/activity-trends?range=30d",
        headers=admin_headers,
    )
    assert resp_30d.status_code == 200, resp_30d.text
    data_30d = resp_30d.json()
    start_30 = datetime.fromisoformat(data_30d["start_date"])
    end_30 = datetime.fromisoformat(data_30d["end_date"])
    delta_30 = (end_30 - start_30).total_seconds() / 86400
    assert abs(delta_30 - 30) < 1, f"Expected ~30 days, got {delta_30}"
