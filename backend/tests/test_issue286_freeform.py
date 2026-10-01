"""Proving test for issue #286: the compliance record gains the two audit
capability entries without changing anything else.

AC-1: config/compliance_capabilities.yaml gains
      ``audit_details_minimization`` with markers [gdpr], status shipped,
      proof tests/test_issue284_freeform.py::test_issue284_freeform — the
      part-1 test asserting personal values are absent from stored
      details_json while the allowed keys are kept — and the mutation
      ``app.models.audit:minimize_details`` returning ``{}``: stubbing the
      minimizer to return an empty dict empties every stored details
      payload, so the proof's "allowed keys are kept" assertions fail.
      The declared proof is executed, not pattern-matched: the exact
      function the nodeid resolves to is imported and run against this
      test's session database, so a proof that would not pass cannot be
      recorded as shipped.  The entry claims details_json minimization
      only.  No existing entry changes.

AC-2: the same file gains ``audit_retention_erasure`` with markers [gdpr]
      and status unverified, with a YAML comment above it stating that
      audit-log retention limits and erasure of identifiers are not yet
      built (tracked in #289).  A marker counts as covered only when
      EVERY entry naming it is verified and unverified never counts, so
      [gdpr] stays uncovered until #289 ships; the actor columns
      (actor_username, actor_email) stay unchanged under the
      operator-approved #219 policy.
"""

import importlib
import importlib.util
import re
from pathlib import Path
from types import ModuleType

import psycopg2
import pytest

from app.db.connection import get_connection_params

BACKEND_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BACKEND_DIR.parent / "config" / "compliance_capabilities.yaml"

# Statuses that count as verified for marker coverage (per the record's
# header); ``unverified`` never counts.
VERIFIED_STATUSES = {"shipped", "deferred"}

MUTATION_TARGET = "app.models.audit:minimize_details"


def _scalar(raw: str) -> str:
    """Unquote a plain or quoted YAML scalar."""
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ("'", '"'):
        return raw[1:-1]
    return raw


def _flow_list(raw: str) -> list[str]:
    """Parse a flow list of plain scalars such as ``[gdpr]``."""
    assert raw.startswith("[") and raw.endswith("]"), f"not a flow list: {raw!r}"
    inner = raw[1:-1].strip()
    if not inner:
        return []
    return [item.strip() for item in inner.split(",")]


def _parse_returns(raw: str):
    """Parse the mutation ``returns`` literal (null / {} / [true, []])."""
    if raw in ("null", "~"):
        return None
    if raw == "{}":
        return {}
    if raw == "[true, []]":
        return [True, []]
    raise AssertionError(f"unhandled mutation returns literal: {raw!r}")


def _parse_capabilities(text: str) -> list[dict]:
    """Parse the capabilities list of the compliance record.

    Returns one dict per entry: ``id``, ``comments`` (the comment lines
    directly above the entry, ``#`` stripped) and ``fields`` — scalar keys
    map to unquoted values and ``mutation`` maps to its own key/value dict
    ONLY when the entry declares a ``mutation:`` key: a nested (six-space)
    line outside such a block is a malformed record and raises, never
    folded into a synthesized mutation.  Raises on a line it does not
    understand, so a malformed record fails this test instead of passing
    silently.
    """
    lines = text.splitlines()
    entries: list[dict] = []
    index = 0
    while index < len(lines):
        match = re.match(r"^  - id:\s*(\S+)\s*$", lines[index])
        if not match:
            index += 1
            continue

        comment_index = index - 1
        comments: list[str] = []
        while comment_index >= 0:
            stripped = lines[comment_index].strip()
            if stripped.startswith("#"):
                comments.insert(0, stripped.lstrip("#").strip())
                comment_index -= 1
                continue
            if stripped == "":
                comment_index -= 1
                continue
            break

        block_end = index + 1
        while block_end < len(lines) and not re.match(
            r"^(  - id:|\S)", lines[block_end]
        ):
            block_end += 1

        fields: dict[str, str] = {}
        mutation: dict[str, str] | None = None
        for line in lines[index + 1 : block_end]:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            nested = re.match(r"^      ([A-Za-z_]+):\s*(.*)$", line)
            if nested:
                if mutation is None:
                    raise AssertionError(
                        "nested line without a mutation key in entry "
                        f"{match.group(1)!r}: {stripped!r}"
                    )
                mutation[nested.group(1)] = _scalar(nested.group(2))
                continue
            flat = re.match(r"^    ([A-Za-z_]+):\s*(.*)$", line)
            if not flat:
                raise AssertionError(
                    f"unparseable line in entry {match.group(1)!r}: {line!r}"
                )
            key = flat.group(1)
            if key == "mutation":
                mutation = {}
                continue
            fields[key] = _scalar(flat.group(2))
        if mutation is not None:
            fields["mutation"] = mutation
        entries.append({"id": match.group(1), "comments": comments, "fields": fields})
        index = block_end
    return entries


def _load_proof_module(module_path: Path) -> ModuleType:
    """Import the module a declared proof nodeid resolves to.

    Prefers the module object pytest already imported (full-suite runs)
    and falls back to loading the file directly so the proof resolves
    however this test happens to be invoked.
    """
    name = module_path.stem
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError:
        spec = importlib.util.spec_from_file_location(
            f"issue286_declared_proof_{name}", module_path
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module


def _clear_proof_tables() -> None:
    """Delete the rows the declared proof leaves in the tables the shared
    clean_database fixture does not cover (companies, suppressions).

    DELETE rather than TRUNCATE: Postgres refuses to truncate a table that
    a foreign key references unless every referencing table is named in the
    same statement, while DELETE applies the FK action row by row (contacts
    and leads reference companies with ON DELETE SET NULL).
    """
    conn = psycopg2.connect(**get_connection_params())
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM companies")
            cur.execute("DELETE FROM suppressions")
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def test_issue286_freeform(monkeypatch, client, admin_headers, user_headers):
    text = CONFIG_PATH.read_text(encoding="utf-8")
    lines = text.splitlines()
    # The record's header and top-level key are intact.
    assert lines[0] == "# AICRM compliance capabilities (CodeAgent#815)."
    assert lines.count("capabilities:") == 1

    entries = _parse_capabilities(text)
    assert entries, "no capabilities entries found"
    by_id = {entry["id"]: entry for entry in entries}
    assert len(by_id) == len(entries), "duplicate entry ids"

    # ---------------- parser contract: no synthesized mutation -------- #
    # A nested line in an entry that declares no ``mutation:`` key must
    # fail loudly: the old parser folded any six-space line into a
    # fabricated ``mutation`` field, so a malformed record would have
    # passed this test while claiming a mutation it never declared.
    no_mutation_key = (
        "capabilities:\n"
        "  - id: no_mutation_key\n"
        "    markers: [gdpr]\n"
        "    status: shipped\n"
        "    proof: tests/test_none.py::test_none\n"
        "      smuggled: value\n"
    )
    with pytest.raises(AssertionError, match="mutation"):
        _parse_capabilities(no_mutation_key)

    # A declared ``mutation:`` block still parses to its own key/value dict.
    with_mutation_key = (
        "capabilities:\n"
        "  - id: with_mutation_key\n"
        "    markers: [gdpr]\n"
        "    status: shipped\n"
        "    proof: tests/test_none.py::test_none\n"
        "    mutation:\n"
        "      target: app.models.audit:minimize_details\n"
        "      returns: {}\n"
    )
    parsed = _parse_capabilities(with_mutation_key)
    assert parsed[0]["fields"]["mutation"] == {
        "target": "app.models.audit:minimize_details",
        "returns": "{}",
    }
    assert set(parsed[0]["fields"]) == {"markers", "status", "proof", "mutation"}

    # ---------------- AC-1: audit_details_minimization ---------------- #
    minimization = by_id["audit_details_minimization"]
    assert _flow_list(minimization["fields"]["markers"]) == ["gdpr"]
    assert minimization["fields"]["status"] == "shipped"
    assert minimization["fields"]["proof"] == (
        "tests/test_issue284_freeform.py::test_issue284_freeform"
    )
    assert minimization["fields"]["mutation"]["target"] == MUTATION_TARGET
    assert _parse_returns(minimization["fields"]["mutation"]["returns"]) == {}
    # Claims details_json minimization only: no decision text or other
    # keys beyond markers/status/proof/mutation.
    assert set(minimization["fields"]) == {"markers", "status", "proof", "mutation"}

    # The declared proof nodeid is EXECUTED, not pattern-matched: a regex
    # over the source only proves the function name exists, not that the
    # proof passes.  Import the module the nodeid resolves to and run the
    # exact function against this test's session database (the autouse
    # clean_database fixture already truncated the tables for this test).
    proof_file, _, proof_function = minimization["fields"]["proof"].partition("::")
    proof_module_path = BACKEND_DIR / proof_file
    assert proof_module_path.is_file()
    proof_module = _load_proof_module(proof_module_path)
    declared_proof = getattr(proof_module, proof_function)
    assert callable(declared_proof)
    # The shared clean_database fixture does not clear ``companies`` or
    # ``suppressions``, yet the proof populates both: an earlier run of this
    # same proof in the session (its own pytest execution) leaves a company
    # whose LOWER(name) is uniquely indexed, which would 409 the proof's
    # company creation.  Clear both tables before and after the run so this
    # test is order-independent and its own residue is removed.
    _clear_proof_tables()
    declared_proof(client, admin_headers, user_headers)
    _clear_proof_tables()

    # The declared mutation target resolves to the real minimizer, and
    # stubbing it to return {} empties exactly what the proof test asserts
    # is kept: the allowed keys with non-personal values disappear from
    # the details payload every write path stores.
    module_name, _, attr_name = MUTATION_TARGET.partition(":")
    audit_module = importlib.import_module(module_name)
    minimize_details = getattr(audit_module, attr_name)
    assert callable(minimize_details)
    assert minimize_details({"stage": "new", "note": "Dana"}) == {"stage": "new"}

    from app.models.audit import AuditEvent

    monkeypatch.setattr(audit_module, "minimize_details", lambda details: {})
    event = AuditEvent(
        entity_type="lead",
        entity_id="lead-286",
        action="created",
        actor_sub="sub-286",
        details={"stage": "new", "note": "Dana"},
    )
    assert event.details == {}, "the declared stub must empty stored details"

    # ---------------- AC-2: audit_retention_erasure ---------------- #
    erasure = by_id["audit_retention_erasure"]
    assert _flow_list(erasure["fields"]["markers"]) == ["gdpr"]
    assert erasure["fields"]["status"] == "unverified"
    # Unverified records nothing else: no proof, no mutation.
    assert set(erasure["fields"]) == {"markers", "status"}

    # The YAML comment above the entry states the gap and its tracker.
    comment = " ".join(erasure["comments"]).lower()
    assert "retention" in comment
    assert "erasure" in comment
    assert "not yet" in comment
    assert "#289" in comment

    # The actor identity columns stay unchanged under the #219 policy:
    # they remain first-class fields of the audit event model.
    assert "actor_username" in AuditEvent.model_fields
    assert "actor_email" in AuditEvent.model_fields

    # [gdpr] stays uncovered: a marker counts as covered only when EVERY
    # entry naming it is verified, and unverified never counts.
    gdpr_entries = [
        entry for entry in entries if "gdpr" in _flow_list(entry["fields"]["markers"])
    ]
    assert len(gdpr_entries) == 2
    assert not all(
        entry["fields"]["status"] in VERIFIED_STATUSES for entry in gdpr_entries
    )

    # ---------------- existing entries are unchanged ---------------- #
    expected_shipped = {
        "email_consent_tracking": {
            "status": "shipped",
            "markers": ["consent", "opt-out", "opt out", "casl", "can-spam", "canspam"],
            "proof": "tests/test_contact_consent.py::test_contact_consent_flow",
            "mutation": {
                "target": (
                    "app.repositories.contact_consent_postgres_repository"
                    ":ContactConsentPostgresRepository.set_consent_with_audit"
                ),
                "returns": None,
            },
        },
        "suppression_send_gate": {
            "status": "shipped",
            "markers": ["suppression", "can-spam", "canspam", "casl"],
            "proof": "tests/test_suppression_send_gate.py::test_suppression_send_gate",
            "mutation": {
                "target": "app.repositories.suppressions_postgres_repository"
                ":SuppressionsPostgresRepository.may_send",
                "returns": [True, []],
            },
        },
    }
    for entry_id, expected in expected_shipped.items():
        entry = by_id[entry_id]
        assert entry["fields"]["status"] == expected["status"]
        assert _flow_list(entry["fields"]["markers"]) == expected["markers"]
        assert entry["fields"]["proof"] == expected["proof"]
        assert entry["fields"]["mutation"]["target"] == expected["mutation"]["target"]
        assert (
            _parse_returns(entry["fields"]["mutation"]["returns"])
            == expected["mutation"]["returns"]
        )
        assert set(entry["fields"]) == {"markers", "status", "proof", "mutation"}

    deferred = by_id["public_unsubscribe_links"]
    assert deferred["fields"]["status"] == "deferred"
    assert _flow_list(deferred["fields"]["markers"]) == ["unsubscribe"]
    assert deferred["fields"]["decision"] == (
        "Public unsubscribe links and ESP webhooks belong to the ESP integration epic"
    )
    assert set(deferred["fields"]) == {"markers", "status", "decision"}

    assert len(entries) == 5
