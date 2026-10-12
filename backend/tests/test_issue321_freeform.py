"""Proving test for issue #321: the backend container reports the
repository version.

AC-1: in docker-compose.yml the `backend` service mounts the repository
      VERSION file read-only at /VERSION (volumes entry
      `./VERSION:/VERSION:ro`).  That is the path
      backend/app/config.py already reads when it runs from
      /app/app/config.py (the relative lookup ../../VERSION from /app/app
      resolves to /VERSION), so a container started with APP_VERSION
      unset reports the version in VERSION.  The service keeps its
      hardening (read_only: true, cap_drop ALL, tmpfs /tmp) and no other
      service gains a volume.

AC-2: this test proves, without any YAML library, that the `backend`
      service block of docker-compose.yml contains the entry
      `./VERSION:/VERSION:ro` under `volumes`, that
      os.path.normpath(os.path.join("/app/app", "..", "..", "VERSION"))
      is "/VERSION", and that app.config._get_app_version() returns the
      stripped content of the repository VERSION file when APP_VERSION
      is unset.  Both files are read as text from the repository root,
      Path(__file__).resolve().parents[2].

Review fixes proven here:
  * the volume entry comparison is on the normalized logical entry,
    not a raw-line exact match (bullet, spacing and trailing comments
    are insignificant);
  * service block extraction is anchored to the top-level `services:`
    section, so same-named keys outside that section are never picked
    up.
"""

import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _services_section(compose: str) -> str:
    """Return the body of the top-level `services:` section (no YAML lib).

    Only the zero-indent `services:` key anchors the section; the body
    runs until the next zero-indent key (any top-level key, not just
    `volumes:`) or end of file.
    """
    m = re.search(r"(?ms)^services:[ \t]*\n(.*?)(?=^[^\s#]|\Z)", compose)
    assert m, "docker-compose.yml has no top-level services: section"
    return m.group(1)


def _service_block(compose: str, name: str) -> str:
    """Extract one service block, anchored to the `services:` section."""
    section = _services_section(compose)
    m = re.search(
        r"(?ms)^  " + re.escape(name) + r":\n(.*?)(?=^  [A-Za-z0-9_]|\Z)",
        section,
    )
    assert m, name + " service missing from docker-compose.yml"
    return m.group(1)


def _volume_entry(raw_line: str) -> str:
    """Reduce a raw `- ...` compose list line to its logical entry.

    Strips indentation, the list bullet, extra whitespace and any
    trailing YAML comment, so comparisons are on the logical entry
    rather than the raw line.
    """
    item = raw_line.strip()
    if item.startswith("-"):
        item = item[1:]
    item = re.split(r"\s+#", item, maxsplit=1)[0]
    return item.strip()


def test_issue321_freeform():
    compose = (ROOT / "docker-compose.yml").read_text()
    expected_version = (ROOT / "VERSION").read_text().strip()
    assert expected_version, "repository VERSION file must not be empty"

    # --- AC-1: the backend service mounts ./VERSION:/VERSION:ro ------
    backend = _service_block(compose, "backend")
    volumes = re.search(
        r"(?ms)^[ \t]*volumes:[ \t]*\n((?:[ \t]+-[ \t]+[^\n]+\n?)+)", backend
    )
    assert volumes, "backend service has no volumes entry"
    raw_items = [line for line in volumes.group(1).splitlines() if line.strip()]
    entries = [_volume_entry(line) for line in raw_items]
    assert entries == [
        "./VERSION:/VERSION:ro"
    ], "backend volumes must be exactly ./VERSION:/VERSION:ro, got " + repr(entries)

    # Review fix proof (raw-line comparison): the entry check compares
    # normalized logical entries, not raw lines — bullet spacing and
    # trailing comments must not change the result.
    for raw in (
        "- ./VERSION:/VERSION:ro",
        "  -   ./VERSION:/VERSION:ro",
        "      - ./VERSION:/VERSION:ro   # mounted read-only",
    ):
        assert _volume_entry(raw) == "./VERSION:/VERSION:ro"

    # Review fix proof (unanchored extraction): extraction is anchored to
    # the top-level services: section, so a same-named key elsewhere in
    # the document is never picked up, and the section ends at any
    # top-level key (here `networks:`, not just `volumes:`).
    synthetic = (
        "x-decoys:\n"
        "  backend:\n"
        "    volumes:\n"
        "      - ./DECOY:/DECOY\n"
        "services:\n"
        "  backend:\n"
        "    container_name: real-backend\n"
        "networks:\n"
        "  default:\n"
        "    driver: bridge\n"
    )
    anchored = _service_block(synthetic, "backend")
    assert "real-backend" in anchored, "extraction skipped the services: section"
    assert "DECOY" not in anchored, "extraction picked up a key outside services:"

    # The hardening that made the read-only rootfs possible is intact.
    assert "read_only: true" in backend, "backend lost read_only"
    assert re.search(r"cap_drop:\s*\n\s*- ALL", backend), "backend lost cap_drop ALL"
    assert "tmpfs:" in backend and "- /tmp" in backend, "backend lost tmpfs /tmp"

    # No other service gains a volume: db keeps its pre-existing
    # aicrm-postgres-data volume, test-db and frontend keep none.
    for svc, expected in (("db", 1), ("test-db", 0), ("frontend", 0)):
        block = _service_block(compose, svc)
        count = len(re.findall(r"(?m)^[ \t]+volumes:[ \t]*$", block))
        assert count == expected, svc + " service gained/lost a volumes key"
    assert "aicrm-postgres-data:/var/lib/postgresql/data" in _service_block(
        compose, "db"
    ), "db volume changed"

    # --- In-container path math --------------------------------------
    # The Dockerfile copies the backend context to /app, so
    # backend/app/config.py runs from /app/app/config.py and its relative
    # lookup os.path.join(dirname(__file__), "..", "..", "VERSION") hits
    # the mounted /VERSION.
    assert (
        os.path.normpath(os.path.join("/app/app", "..", "..", "VERSION")) == "/VERSION"
    )

    # --- AC-2: _get_app_version() with APP_VERSION unset --------------
    from app.config import _get_app_version

    saved = os.environ.get("APP_VERSION")
    os.environ.pop("APP_VERSION", None)
    try:
        assert _get_app_version() == expected_version
    finally:
        if saved is not None:
            os.environ["APP_VERSION"] = saved
