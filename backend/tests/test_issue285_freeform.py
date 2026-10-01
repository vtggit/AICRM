"""Proving test for issue #285: the one-time migration
0015_minimize_audit_details rewrites legacy audit_log.details_json with
the exact rules of new writes.

AC-1/AC-3: the migration rewrites every non-NULL details_json by invoking
app.models.audit.minimize_details — the same implementation the write
path uses, so stored rows and new writes can never drift (no
re-implemented allow-list, regex, normalization or NULL semantics in
SQL) — reading and updating rows in batches of 1000 by id inside one
transaction (no per-batch commits).  It changes no other column and no
row count, its downgrade is a documented no-op (the removed values
cannot be restored), and the chain keeps one head.

AC-2: this test inserts audit rows whose details_json holds both allowed
keys and personal values (name, email, description, subject), runs the
migration's upgrade, and asserts the personal keys are gone, the allowed
keys keep their valid values, an allowed key holding a personal value
(a name under ``new``) is dropped, a row with only personal keys has
NULL details, and the row count is unchanged.

AC-4: the migration's operator summary is captured and asserted to carry
aggregate metadata only (migration id, rows scanned/updated/nulled) —
no detail values, no actor data — and every non-details column is
asserted byte-for-byte unchanged, so nothing outside details_json (let
alone any actor identity column) is implied to be remediated.
"""

import importlib.util
import json
import logging
import re
from pathlib import Path

import psycopg2
import pytest
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine

from app.db.connection import get_connection_params

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATION_FILE = (
    BACKEND_DIR / "migrations" / "versions" / "0015_minimize_audit_details.py"
)
MIGRATION_REVISION = "0015_minimize_audit_details"
DOWN_REVISION = "0014_add_sales_goals"

# Personal values: none of these may survive in any stored details_json
# nor in the migration's operator summary.
PERSONAL_NAME = "Dana Whitfield"
PERSONAL_SINGLE_TOKEN_NAME = "Dana"
PERSONAL_EMAIL = "dana.whitfield.285@example.com"
PERSONAL_DESCRIPTION = "Discussed the Q3 rollout with Dana Whitfield"
PERSONAL_SUBJECT = "Re: our conversation about Acme Widgetry"
PERSONAL_WEBSITE = "https://acme-widgetry-285.example.com"

PERSONAL_VALUES = {
    PERSONAL_NAME,
    PERSONAL_SINGLE_TOKEN_NAME,
    PERSONAL_EMAIL,
    PERSONAL_DESCRIPTION,
    PERSONAL_SUBJECT,
    PERSONAL_WEBSITE,
    "285@example.com",  # covers every bulk-row email below
}

# More than 1000 rows so the migration must process several id batches.
BULK_ROWS = 1500


def _connect() -> psycopg2.extensions.connection:
    return psycopg2.connect(**get_connection_params())


def _load_migration_module():
    """Load the migration file as a module (its filename starts with a
    digit, so a plain import statement is not possible)."""
    spec = importlib.util.spec_from_file_location(
        "issue285_migration_0015", MIGRATION_FILE
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _run_migration_function(migration_fn) -> None:
    """Run one migration function against the test database bound to a
    real Alembic Operations context — the same mechanism the alembic
    command runner uses to service the migration's ``op`` calls — inside
    a single transaction.  (The session fixture already migrated the
    database to head, so this re-runs the data transformation in place;
    it is idempotent on already-compliant rows.)"""
    params = get_connection_params()
    url = (
        "postgresql+psycopg2://"
        f"{params['user']}:{params['password']}"
        f"@{params['host']}:{params['port']}/{params['dbname']}"
    )
    engine = create_engine(url)
    try:
        with engine.connect() as conn, conn.begin():
            context = MigrationContext.configure(conn)
            with Operations.context(context):
                migration_fn()
    finally:
        engine.dispose()


def _insert_rows(conn, rows) -> None:
    """Insert legacy audit rows.  rows: (entity_id, action, actor_email,
    details_or_None) tuples — inserted by SQL on purpose, because rows
    written through the app are already minimized."""
    with conn.cursor() as cur:
        for entity_id, action, actor_email, details in rows:
            cur.execute(
                """
                INSERT INTO audit_log
                    (entity_type, entity_id, action, actor_sub,
                     actor_username, actor_email, actor_roles, details_json)
                VALUES
                    ('contact', %s, %s, 'sub-285-test', 'tester285',
                     %s, 'admin', %s)
                """,
                (
                    entity_id,
                    action,
                    actor_email,
                    json.dumps(details) if details is not None else None,
                ),
            )
    conn.commit()


def _fetch_rows(conn) -> dict:
    """All audit_log rows keyed by entity_id."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, entity_type, entity_id, action, actor_sub,
                   actor_username, actor_email, actor_roles, timestamp,
                   details_json
            FROM audit_log
            ORDER BY id
            """)
        columns = [column[0] for column in cur.description]
        return {
            row["entity_id"]: row
            for row in (dict(zip(columns, values)) for values in cur.fetchall())
        }


def _summary_records(caplog) -> list:
    """The migration's operator summary lines, if any were logged."""
    return [
        record.getMessage()
        for record in caplog.records
        if record.name == "alembic"
        and record.getMessage().startswith("audit details minimization:")
    ]


@pytest.mark.usefixtures("test_database", "test_env_setup")
def test_issue285_freeform(caplog):
    # ---------------- chain shape (AC-1) ---------------- #
    cfg = Config()
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    heads = ScriptDirectory.from_config(cfg).get_heads()
    assert heads == [MIGRATION_REVISION], "the chain must keep one head"

    module = _load_migration_module()
    assert module.revision == MIGRATION_REVISION
    assert module.down_revision == DOWN_REVISION

    # ---------------- insert legacy rows (AC-2) ---------------- #
    # Rows hold both allowed keys and personal values (name, email,
    # description, subject); one row holds a personal value under an
    # allowed key; one row has only personal keys; one row has NULL
    # details; one row is already compliant; one row carries an actor
    # identity that must stay untouched.
    special = [
        (
            "i285-mixed",
            "update",
            None,
            {
                "changed_fields": ["name", "email_consent_status"],
                "count": 3,
                "status": "active",
                "new": "opted_in",
                "name": PERSONAL_NAME,
                "email": PERSONAL_EMAIL,
                "description": PERSONAL_DESCRIPTION,
                "subject": PERSONAL_SUBJECT,
                "website": PERSONAL_WEBSITE,
            },
        ),
        (
            "i285-name-under-new",
            "update",
            None,
            {"new": PERSONAL_NAME, "stage": "qualified", "count": 2},
        ),
        (
            "i285-single-token-name",
            "update",
            None,
            {"new": PERSONAL_SINGLE_TOKEN_NAME, "status": "active"},
        ),
        (
            "i285-only-personal",
            "create",
            None,
            {
                "name": PERSONAL_NAME,
                "email": PERSONAL_EMAIL,
                "subject": PERSONAL_SUBJECT,
            },
        ),
        (
            "i285-bad-shapes",
            "delete",
            None,
            {
                "changed_fields": ["name", PERSONAL_NAME],
                "count": "three",
                "soft": "yes",
            },
        ),
        ("i285-null-details", "create", None, None),
        (
            "i285-compliant",
            "update",
            None,
            {
                "count": 5,
                "soft": True,
                "contact_id": "abc-123",
                "source": "manual",
            },
        ),
        (
            "i285-actor-untouched",
            "update",
            PERSONAL_EMAIL,
            {"count": 1},
        ),
    ]
    bulk = [
        (
            f"i285-bulk-{index}",
            "update",
            None,
            {
                "count": index % 7,
                "email": f"bulk{index}285@example.com",
                "note": f"legacy row {index}",
            },
        )
        for index in range(BULK_ROWS)
    ]

    conn = _connect()
    try:
        _insert_rows(conn, special + bulk)
        before = _fetch_rows(conn)
    finally:
        conn.close()

    # ---------------- run the migration's upgrade (AC-2) ---------------- #
    with caplog.at_level(logging.INFO, logger="alembic"):
        _run_migration_function(module.upgrade)

    conn = _connect()
    try:
        after = _fetch_rows(conn)
    finally:
        conn.close()

    # Row count is unchanged.
    assert len(after) == len(before) == len(special) + BULK_ROWS

    # Personal values are gone from every stored details payload.
    for row in after.values():
        blob = json.dumps(row["details_json"])
        for value in PERSONAL_VALUES:
            assert value not in blob, f"personal data survived: {value!r}"

    # Allowed keys keep their valid values; personal keys are gone.
    assert after["i285-mixed"]["details_json"] == {
        "changed_fields": ["name", "email_consent_status"],
        "count": 3,
        "status": "active",
        "new": "opted_in",
    }
    # An allowed key holding a personal value (a name under "new") is
    # dropped while the allowed keys with valid values are kept.
    assert after["i285-name-under-new"]["details_json"] == {
        "stage": "qualified",
        "count": 2,
    }
    # A single-token personal value under a code key is dropped too.
    assert after["i285-single-token-name"]["details_json"] == {"status": "active"}
    # A row with only personal keys has NULL details.
    assert after["i285-only-personal"]["details_json"] is None
    # Every allowed key failing its value shape also yields NULL.
    assert after["i285-bad-shapes"]["details_json"] is None
    # NULL stays NULL.
    assert after["i285-null-details"]["details_json"] is None
    # The already-compliant row is untouched.
    assert after["i285-compliant"]["details_json"] == {
        "count": 5,
        "soft": True,
        "contact_id": "abc-123",
        "source": "manual",
    }
    # Bulk rows: personal keys stripped on every row, across batches.
    for index in range(BULK_ROWS):
        assert after[f"i285-bulk-{index}"]["details_json"] == {"count": index % 7}

    # No other column changed anywhere (details_json aside) — in
    # particular the actor identity column is left exactly as stored,
    # i.e. nothing outside details_json is remediated by this migration.
    untouched_columns = (
        "id",
        "entity_type",
        "entity_id",
        "action",
        "actor_sub",
        "actor_username",
        "actor_email",
        "actor_roles",
        "timestamp",
    )
    for entity_id, before_row in before.items():
        after_row = after[entity_id]
        for column in untouched_columns:
            assert (
                before_row[column] == after_row[column]
            ), f"{column} changed for {entity_id}"
    assert after["i285-actor-untouched"]["actor_email"] == PERSONAL_EMAIL

    # ---- operator summary: aggregate metadata only (AC-4) ---- #
    summaries = _summary_records(caplog)
    assert len(summaries) == 1, "upgrade must log exactly one summary"
    match = re.fullmatch(
        r"audit details minimization: migration=(\S+) "
        r"rows_scanned=(\d+) rows_updated=(\d+) rows_nulled=(\d+)",
        summaries[0],
    )
    assert match, "summary must carry aggregate metadata only"
    assert match.group(1) == MIGRATION_REVISION
    rows_scanned = int(match.group(2))
    rows_updated = int(match.group(3))
    rows_nulled = int(match.group(4))
    # Every non-NULL row was scanned (the pre-existing NULL row is
    # skipped); every row changed except the two already-compliant
    # ones; the personal-only and bad-shape rows were nulled.
    assert rows_scanned == len(before) - 1
    assert rows_updated == rows_scanned - 2
    assert rows_nulled == 2
    for value in PERSONAL_VALUES:
        assert value not in summaries[0], "no personal data in the summary"

    # ------------- downgrade: documented no-op (AC-1) ------------- #
    _run_migration_function(module.downgrade)

    conn = _connect()
    try:
        after_downgrade = _fetch_rows(conn)
    finally:
        conn.close()

    assert after_downgrade == after, "downgrade must be a no-op"
    assert len(_summary_records(caplog)) == 1, "downgrade logs no summary"
