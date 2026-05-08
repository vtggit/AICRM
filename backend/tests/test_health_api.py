"""Health and startup tests.

Verifies the application can start and respond to basic requests.
"""


def test_health_returns_success(client):
    """GET /api/health should return 200 with status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_health_returns_version(client):
    """GET /api/health should include app_version and service."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "app_version" in data
    assert isinstance(data["app_version"], str)
    assert len(data["app_version"]) > 0
    assert data["service"] == "aicrm-backend"


def test_root_returns_success(client):
    """GET / should return 200 with a message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
