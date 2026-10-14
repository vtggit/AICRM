"""Proving test for issue #357: static responses must never be served stale.

AC-1: In app/nginx.conf every response served by `location /` (pages,
      scripts, stylesheets and images) carries `Cache-Control: no-cache`,
      sent for every status (`always`).  The `try_files` fallback to
      index.html gets the header too: it is an internal redirect back
      into `location /`.  A page reached through the `/app/` prefix gets
      the same header, because the `rewrite ... last` in `location /app/`
      re-enters location matching and lands in `location /`.  The API
      proxy (`location /api/`) and its headers, and the `try_files`
      fallback, are unchanged.

AC-2: This test proves the criterion from the file itself: it reads
     app/nginx.conf, finds every `server` block and each `location`
     block by matching its braces (not by line position), checks that
     `location /` holds `add_header Cache-Control "no-cache" always;`,
     that `location /api/` has no `Cache-Control` header of its own,
     and that every other directive of each block is the same as on
     the base branch, as enumerated in BASE_DIRECTIVES below.  Every
     server block in the file is checked, not just the first one.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NGINX_CONF = ROOT / "app" / "nginx.conf"

# The exact directive added by this issue, without the terminating `;`.
CACHE_CONTROL_DIRECTIVE = 'add_header Cache-Control "no-cache" always'

# The base-branch directives of every location block, in file order.
BASE_DIRECTIVES = {
    "/app/": [
        "rewrite ^/app/(.*)$ /$1 last",
    ],
    "/": [
        "try_files $uri $uri/ /index.html",
    ],
    "/api/": [
        "proxy_pass http://backend:9000",
        "proxy_set_header Host $host",
        "proxy_set_header X-Real-IP $remote_addr",
        "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for",
        "proxy_set_header X-Forwarded-Proto $scheme",
    ],
}

# The base-branch directives of the server-level context (the text outside
# every location block), in file order.
BASE_SERVER_DIRECTIVES = [
    "listen 8080",
    "server_name _",
    "root /usr/share/nginx/html",
    "index index.html",
]


def _strip_comments(conf: str) -> str:
    """Drop nginx `#` comments so braces in prose cannot break the match."""
    return re.sub(r"#[^\n]*", "", conf)


def _match_braces(text: str, brace_pos: int) -> int:
    """Return the index just past the `}` matching the `{` at brace_pos.

    Counts nested braces after the opening brace, so the result is
    independent of line positions and indentation.
    """
    depth = 1
    pos = brace_pos + 1
    while pos < len(text) and depth:
        if text[pos] == "{":
            depth += 1
        elif text[pos] == "}":
            depth -= 1
        pos += 1
    assert depth == 0, "unbalanced braces starting at " + str(brace_pos)
    return pos


def _server_bodies(conf: str) -> tuple[list[str], list[tuple[int, int]]]:
    """Find every top-level `server { ... }` block by matching braces.

    Returns (bodies, spans): bodies is the list of texts between each
    server block's braces, and spans holds the (start, end) slice of the
    whole `server ... { ... }` statement for each block, so callers can
    blank the blocks out of the config.  Every server block in the file
    is returned, not just the first one.
    """
    bodies: list[str] = []
    spans: list[tuple[int, int]] = []
    for match in re.finditer(r"\bserver[ \t]*\{", conf):
        end = _match_braces(conf, match.end() - 1)
        bodies.append(conf[match.end() : end - 1])
        spans.append((match.start(), end))
    return bodies, spans


def _location_blocks(server: str):
    """Find every `location <prefix> { ... }` block by matching braces.

    Returns (blocks, spans): blocks maps each location prefix to the text
    between its braces, and spans holds the (start, end) slice of the
    whole `location ... { ... }` statement for each prefix, so callers
    can blank the blocks out of the server body.
    """
    blocks: dict[str, str] = {}
    spans: list[tuple[int, int]] = []
    for match in re.finditer(r"\blocation[ \t]+(\S+)[ \t]*\{", server):
        prefix = match.group(1)
        assert prefix not in blocks, "duplicate location " + prefix
        end = _match_braces(server, match.end() - 1)
        blocks[prefix] = server[match.end() : end - 1]
        spans.append((match.start(), end))
    return blocks, spans


def _directives(text: str) -> list[str]:
    """Split a brace-free nginx snippet into its directives (no `;`)."""
    return [part.strip() for part in text.split(";") if part.strip()]


def _check_server_body(server: str) -> list[str]:
    """Verify one server block against AC-1 and the base directives.

    Returns the list of location prefixes verified, in file order.
    """
    blocks, spans = _location_blocks(server)

    # Exactly the three base-branch locations exist — none added, none
    # removed, each prefix declared once.
    assert set(blocks) == set(BASE_DIRECTIVES), "location set changed: " + repr(
        sorted(blocks)
    )

    # --- AC-1: location / carries the no-cache header -------------------
    root_directives = _directives(blocks["/"])
    assert CACHE_CONTROL_DIRECTIVE in root_directives, (
        "location / is missing " + CACHE_CONTROL_DIRECTIVE
    )
    # The file spells the directive with its terminating semicolon.
    assert (
        CACHE_CONTROL_DIRECTIVE + ";" in blocks["/"]
    ), "location / header must be spelled " + repr(CACHE_CONTROL_DIRECTIVE + ";")
    # `always` (inside the exact directive above) is what makes nginx send
    # the header for every status, including errors and the /index.html
    # try_files fallback, which is an internal redirect back here.

    # --- AC-1: the /app/ prefix lands in location / ----------------------
    app_directives = _directives(blocks["/app/"])
    rewrites = [d for d in app_directives if d.startswith("rewrite ")]
    assert (
        len(rewrites) == 1
    ), "location /app/ must keep exactly its rewrite, got " + repr(app_directives)
    assert rewrites[0].endswith(" last"), (
        "the /app/ rewrite must re-enter location matching (last) so the "
        "page is served by location / and gets the header"
    )

    # --- AC-1: the API proxy has no Cache-Control header of its own ------
    api_directives = _directives(blocks["/api/"])
    assert not any(
        d.lower().startswith("add_header") and "cache-control" in d.lower()
        for d in api_directives
    ), "location /api/ must not carry a Cache-Control header of its own"

    # --- AC-2: every other directive of each block matches the base ------
    for prefix, base in BASE_DIRECTIVES.items():
        directives = _directives(blocks[prefix])
        if prefix == "/":
            # The no-cache header is the only allowed addition.
            directives = [d for d in directives if d != CACHE_CONTROL_DIRECTIVE]
        assert directives == base, f"location {prefix} directives changed: " + repr(
            directives
        )

    # --- The server-level context is untouched ----------------------------
    chars = list(server)
    for start, end in spans:
        for index in range(start, end):
            chars[index] = " "
    outer = _directives("".join(chars))
    assert outer == BASE_SERVER_DIRECTIVES, "server-level directives changed: " + repr(
        outer
    )
    return list(blocks)


def test_issue357_freeform():
    conf = _strip_comments(NGINX_CONF.read_text())
    bodies, spans = _server_bodies(conf)
    assert bodies, "app/nginx.conf has no server block"

    # Review-defect proof 1: the test used to inspect only the first
    # server block.  Blank out every extracted server block and require
    # nothing but whitespace to remain: there is no server block (or any
    # other content) outside `bodies`, so the loop below inspects them
    # all.
    outside = list(conf)
    for start, end in spans:
        for index in range(start, end):
            outside[index] = " "
    assert not "".join(
        outside
    ).strip(), "content exists outside the inspected server blocks"

    # Inspect every server block, not just the first one.
    verified: list[str] = []
    for body in bodies:
        verified.extend(_check_server_body(body))

    # Review-defect proof 2: every location block of every server block
    # was verified — the count equals the base location count times the
    # number of server blocks.
    assert len(verified) == len(bodies) * len(
        BASE_DIRECTIVES
    ), "not every location block of every server block was verified: " + repr(verified)
