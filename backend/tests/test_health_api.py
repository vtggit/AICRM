"""Health and startup tests.

Verifies the application can start and respond to basic requests.
"""


def test_health_returns_success(client):
    """GET /api/health should return 200 with status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_root_returns_success(client):
    """GET / should return 200 with a message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
