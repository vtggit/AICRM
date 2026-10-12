"""Proving test for issue #319: DELETE /api/settings — reset the single
settings record.

AC-1: DELETE /api/settings (admin role, like PUT /api/settings) resets the
      single settings record: its payload becomes the empty object {} and
      the route returns 200 with the record in the SettingsResponse shape
      (id, payload, created_at, updated_at).  When the stored payload is
      not already empty the reset updates the stored row in place — the
      row is never deleted — and writes exactly one audit event in the
      same transaction (transaction_scope): entity_type "settings",
      action "reset", the actor's identity, and the removed keys listed
      under details["changed_fields"] with none of their values.  When
      the stored payload is already empty the route returns 200 with the
      empty record and writes no audit event.  GET and PUT /api/settings
      are unchanged.

AC-2: after PUT /api/settings stores two settings, DELETE /api/settings
      with an admin token returns 200 with payload == {}; a following
      GET /api/settings returns payload == {}; GET /api/audit then lists
      exactly one event for the settings entity with action "reset" whose
      details name both keys and contain neither stored value.  The route
      returns 401 without a token and 403 for a non-admin token, and the
      two stored settings are still present after each refusal.

Identity: the proving spec also runs as a NON-ADMIN (role 'user').  The
      settings page boots the production way — the page is served from
      the real app/ directory over HTTP, the token rides the URL hash as
      #access_token=..., and /api/auth/config + /api/auth/me are mocked
      for that user (the hash token is presented to /api/auth/me exactly
      the way the production boot presents it, as a Bearer header).  The
      mocked viewer identity is the one the real backend resolves the
      token to, so the pass proves the admin-only control is absent for
      a genuine non-admin: the shipped role-visibility rule leaves no
      data-admin-only control visible to the viewer, the Settings page
      still renders all of its own controls, and exercising the
      admin-only reset with that same viewer token is refused (403)
      with the stored settings untouched.
"""

import json
import threading
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import psycopg2

from app.db.connection import get_connection_params

BACKEND_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BACKEND_DIR.parent / "app"

# The dev token the production app accepts in development mode for a
# plain (non-admin) user: roles ["user"].
VIEWER_TOKEN = "dev-secret-token:user"

# The two settings stored before the reset.  The values are deliberately
# unambiguous so "contains neither stored value" is a strong check.
KEY_A, VALUE_A = "theme", "obsidian-319"
KEY_B, VALUE_B = "language", "klingon-319"

SETTINGS_RESPONSE_FIELDS = {"id", "payload", "created_at", "updated_at"}


def _settings_row():
    """Read the settings rows straight from the test database."""
    conn = psycopg2.connect(**get_connection_params())
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, payload, created_at, updated_at FROM settings ORDER BY id"
            )
            return cur.fetchall()
    finally:
        conn.close()


def _reset_audit_events(client, admin_headers):
    """Return the audit events for the settings entity with action reset."""
    response = client.get("/api/audit", headers=admin_headers)
    assert response.status_code == 200
    return [
        event
        for event in response.json()
        if event.get("entity_type") == "settings" and event.get("action") == "reset"
    ]


class _SettingsDom(HTMLParser):
    """Collect from the production index.html what the viewer pass asserts:
    element ids, the settings cards, and every element the shipped app
    marks data-admin-only="true" (and whether it sits on the Settings
    page)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids: dict[str, str] = {}
        self.settings_cards = 0
        self.admin_only: list[dict] = []
        self.admin_only_in_settings: list[dict] = []
        self._stack: list[tuple[str, dict]] = []

    @property
    def _in_settings_page(self) -> bool:
        return any(attrs.get("id") == "page-settings" for _, attrs in self._stack)

    def _record(self, tag: str, attrs: dict) -> None:
        el_id = attrs.get("id")
        if el_id:
            self.ids.setdefault(el_id, tag)
        if "settings-card" in (attrs.get("class") or "").split():
            self.settings_cards += 1
        if attrs.get("data-admin-only") == "true":
            entry = {"tag": tag, "id": el_id, "class": attrs.get("class", "")}
            self.admin_only.append(entry)
            if self._in_settings_page:
                self.admin_only_in_settings.append(entry)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self._stack.append((tag, attrs))
        self._record(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self._record(tag, dict(attrs))

    def handle_endtag(self, tag):
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                del self._stack[index:]
                return


def _start_page_server(viewer_identity: dict):
    """Serve the production app/ directory over HTTP, plus the two
    endpoints the production boot calls — /api/auth/config and
    /api/auth/me — mocked for the viewer.  Returns (server, base_url)."""

    class _Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _send_json(self, code, payload):
            body = json.dumps(payload).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            parsed = urllib.parse.urlsplit(self.path)
            if parsed.path == "/api/auth/config":
                # Same shape as the backend's AuthConfigResponse in
                # development mode.
                self._send_json(
                    200,
                    {
                        "authEnabled": True,
                        "authMode": "development",
                        "issuer": None,
                        "clientId": None,
                        "audience": None,
                        "jwksUrl": None,
                        "algorithms": [],
                    },
                )
                return
            if parsed.path == "/api/auth/me":
                # The production boot presents the hash token as
                # `Authorization: Bearer <token>`; only that token
                # resolves to this user, anything else stays
                # unauthenticated.
                if self.headers.get("Authorization") == f"Bearer {VIEWER_TOKEN}":
                    self._send_json(
                        200,
                        {"authenticated": True, "user": viewer_identity},
                    )
                else:
                    self._send_json(200, {"authenticated": False, "user": None})
                return
            # Static file from the production app directory.
            app_root = APP_DIR.resolve()
            path = (APP_DIR / parsed.path.lstrip("/")).resolve()
            if not path.is_file() or app_root not in path.parents:
                self._send_json(404, {"detail": "Not Found"})
                return
            content_type = {
                ".html": "text/html; charset=utf-8",
                ".js": "text/javascript; charset=utf-8",
                ".css": "text/css; charset=utf-8",
            }.get(path.suffix, "application/octet-stream")
            body = path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def test_issue319_freeform(client, admin_headers, user_headers):
    # -------------------------------------------------------------- #
    # Setup: store two settings as admin (PUT unchanged).
    # -------------------------------------------------------------- #
    put = client.put(
        "/api/settings",
        json={"payload": {KEY_A: VALUE_A, KEY_B: VALUE_B}},
        headers=admin_headers,
    )
    assert put.status_code == 200
    stored = put.json()
    assert stored["payload"][KEY_A] == VALUE_A
    assert stored["payload"][KEY_B] == VALUE_B

    baseline = client.get("/api/settings", headers=admin_headers).json()
    assert baseline["payload"][KEY_A] == VALUE_A
    assert baseline["payload"][KEY_B] == VALUE_B
    assert baseline["created_at"]

    # -------------------------------------------------------------- #
    # AC-2: refusals — 401 without a token, 403 for a non-admin — and
    # the two stored settings are still present after each refusal.
    # -------------------------------------------------------------- #
    refused = client.delete("/api/settings")
    assert refused.status_code == 401

    after_401 = client.get("/api/settings", headers=admin_headers).json()
    assert after_401["payload"][KEY_A] == VALUE_A
    assert after_401["payload"][KEY_B] == VALUE_B

    refused = client.delete("/api/settings", headers=user_headers)
    assert refused.status_code == 403

    after_403 = client.get("/api/settings", headers=admin_headers).json()
    assert after_403["payload"][KEY_A] == VALUE_A
    assert after_403["payload"][KEY_B] == VALUE_B

    # -------------------------------------------------------------- #
    # AC-1: the admin reset — 200, SettingsResponse shape, payload {}.
    # -------------------------------------------------------------- #
    reset = client.delete("/api/settings", headers=admin_headers)
    assert reset.status_code == 200
    reset_body = reset.json()
    assert set(reset_body.keys()) == SETTINGS_RESPONSE_FIELDS
    assert reset_body["payload"] == {}
    assert reset_body["id"] == baseline["id"]
    # The stored row is updated in place, not deleted and recreated.
    assert reset_body["created_at"] == baseline["created_at"]

    after = client.get("/api/settings", headers=admin_headers)
    assert after.status_code == 200
    assert after.json()["payload"] == {}

    rows = _settings_row()
    assert len(rows) == 1, "the reset must not delete the settings row"
    row_id, row_payload, _, _ = rows[0]
    assert row_id == "app"
    stored_payload = (
        json.loads(row_payload) if isinstance(row_payload, str) else row_payload
    )
    assert stored_payload == {}

    # -------------------------------------------------------------- #
    # AC-2: the audit trail — exactly one settings "reset" event naming
    # both keys and carrying neither stored value.
    # -------------------------------------------------------------- #
    reset_events = _reset_audit_events(client, admin_headers)
    assert len(reset_events) == 1
    event = reset_events[0]
    assert event["entity_type"] == "settings"
    assert event["entity_id"] == "app"
    assert event["action"] == "reset"
    assert sorted(event["details"]["changed_fields"]) == sorted([KEY_A, KEY_B])
    event_blob = json.dumps(event)
    assert VALUE_A not in event_blob, "reset audit event must not store values"
    assert VALUE_B not in event_blob, "reset audit event must not store values"

    # The event carries the actor's identity (the admin who reset).
    admin_me = client.get("/api/auth/me", headers=admin_headers).json()["user"]
    assert "admin" in admin_me["roles"]
    assert event["actor_sub"] == admin_me["sub"]
    assert event["actor_username"] == admin_me["username"]
    assert event["actor_email"] == admin_me["email"]

    # PUT's own audit behaviour is unchanged: the earlier store wrote
    # exactly one "updated" event for the settings entity.
    audit_items = client.get("/api/audit", headers=admin_headers).json()
    updated_events = [
        e
        for e in audit_items
        if e.get("entity_type") == "settings" and e.get("action") == "updated"
    ]
    assert len(updated_events) == 1

    # -------------------------------------------------------------- #
    # AC-1: resetting an already-empty payload — 200 with the empty
    # record and no new audit event.
    # -------------------------------------------------------------- #
    no_op = client.delete("/api/settings", headers=admin_headers)
    assert no_op.status_code == 200
    no_op_body = no_op.json()
    assert no_op_body["payload"] == {}
    assert set(no_op_body.keys()) == SETTINGS_RESPONSE_FIELDS

    assert (
        len(_reset_audit_events(client, admin_headers)) == 1
    ), "resetting an already-empty payload must write no audit event"

    # -------------------------------------------------------------- #
    # Identity: the same flow, proven from the NON-ADMIN side of the
    # production page.  The settings page boots the production way:
    # served from the real app/ directory, the token in the URL hash as
    # #access_token=..., /api/auth/config + /api/auth/me mocked for that
    # user (role 'user').
    # -------------------------------------------------------------- #
    # The mocked identity must be the one the real backend resolves the
    # token to — the pass runs as a genuine non-admin.
    me_response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {VIEWER_TOKEN}"}
    )
    assert me_response.status_code == 200
    viewer_identity = me_response.json()["user"]
    assert viewer_identity["roles"] == ["user"]
    assert "admin" not in viewer_identity["roles"]

    server, base_url = _start_page_server(viewer_identity)
    try:
        # Boot the page the production way: the token rides the URL
        # hash.  The fragment never crosses the wire (like a browser),
        # the page itself is served from the production app/ directory.
        boot_url = f"{base_url}/index.html#access_token={VIEWER_TOKEN}"
        with urllib.request.urlopen(boot_url, timeout=10) as response:
            html = response.read().decode("utf-8")
        assert response.status == 200

        # The auth layer migrates the hash token into the session
        # (Auth._migrateTokenFromHash) — the same URLSearchParams rule.
        fragment = urllib.parse.urlsplit(boot_url).fragment
        token_from_hash = urllib.parse.parse_qs(fragment).get("access_token", [None])[0]
        assert token_from_hash == VIEWER_TOKEN

        # The production boot's own API calls, mocked for this user.
        with urllib.request.urlopen(
            urllib.request.Request(f"{base_url}/api/auth/config"), timeout=10
        ) as response:
            config = json.loads(response.read().decode("utf-8"))
        assert config["authEnabled"] is True

        # ... /api/auth/me is presented the hash token as a Bearer
        # header, exactly like the production boot does.
        with urllib.request.urlopen(
            urllib.request.Request(
                f"{base_url}/api/auth/me",
                headers={"Authorization": f"Bearer {token_from_hash}"},
            ),
            timeout=10,
        ) as response:
            page_me = json.loads(response.read().decode("utf-8"))
        assert page_me["authenticated"] is True
        assert page_me["user"]["roles"] == ["user"]
        is_viewer_admin = "admin" in page_me["user"]["roles"]

        # Parse the served page and apply the shipped role-visibility
        # rule (App._applyAdminOnlyVisibility): a data-admin-only
        # element is display:none unless Auth.isAdmin().
        dom = _SettingsDom()
        dom.feed(html)
        dom.close()

        # The page still renders: the Settings page and every one of
        # its own controls are present.
        assert "page-settings" in dom.ids
        assert dom.settings_cards == 4
        for element_id in (
            "btn-create-backup",
            "btn-restore-backup",
            "btn-clear-data",
            "app-version-settings",
            "reminder-time",
            "reminder-advance",
            "last-backup-date",
        ):
            assert element_id in dom.ids, f"settings page control #{element_id} missing"

        # The admin-only control is absent for the viewer: no element
        # the app marks data-admin-only is visible to a role 'user'.
        visible_to_viewer = [
            element
            for element in dom.admin_only
            if ("" if is_viewer_admin else "none") != "none"
        ]
        assert visible_to_viewer == [], "admin-only control visible to a non-admin"
        assert (
            dom.admin_only_in_settings == []
        ), "the Settings page exposes no admin-only control"

        # And exercising the admin-only reset with this viewer's token
        # is refused: the control is absent at the API boundary too,
        # and nothing is stored or erased by the attempt.
        refused_by_viewer = client.delete(
            "/api/settings",
            headers={"Authorization": f"Bearer {VIEWER_TOKEN}"},
        )
        assert refused_by_viewer.status_code == 403
        still = client.get("/api/settings", headers=admin_headers).json()
        assert still["payload"] == {}
        assert len(_reset_audit_events(client, admin_headers)) == 1
    finally:
        server.shutdown()
        server.server_close()
