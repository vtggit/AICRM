"""API endpoint tests."""


def test_get_unknown_tag_returns_404(client, admin_headers):
    resp = client.get(
        "/api/tags/00000000-0000-0000-0000-000000000000", headers=admin_headers
    )
    assert resp.status_code == 404
    assert client.get("/api/tags/00000000-0000-0000-0000-000000000000").status_code in (
        401,
        403,
    )
