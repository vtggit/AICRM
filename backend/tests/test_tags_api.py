from fastapi import HTTPException

"""API endpoint tests."""


def test_get_unknown_tag_returns_404(client, admin_headers):
    resp = client.get("/api/tags/nonexistent-xyz", headers=admin_headers)
    assert resp.status_code == 404
