"""transaction_scope — the primitive that makes the audit failure policy real.

The policy (app/services/audit_service.py, Option B): a mutation whose audit write fails must
not persist. That requires the mutation and the audit write to share ONE transaction — these
tests pin the sharing, the rollback, the nesting, and that standalone get_cursor behavior is
unchanged."""

import uuid

import pytest

from app.db.connection import get_cursor, transaction_scope


def _mk(table_suffix):
    """A throwaway table per test — no interference, trivially droppable (test database)."""
    name = f"txs_{table_suffix}_{uuid.uuid4().hex[:8]}"
    with get_cursor() as cur:
        cur.execute(f"CREATE TABLE {name} (id VARCHAR(64) PRIMARY KEY)")
    return name


def _count(table):
    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) AS n FROM {table}")
        return cur.fetchone()["n"]


def test_cursors_inside_a_scope_share_one_transaction(client, test_database):
    t = _mk("share")
    with transaction_scope():
        with get_cursor() as cur:
            cur.execute(f"INSERT INTO {t} (id) VALUES ('a')")
        with get_cursor() as cur:  # a second get_cursor: same txn, sees the uncommitted row
            cur.execute(f"SELECT COUNT(*) AS n FROM {t}")
            assert cur.fetchone()["n"] == 1
    assert _count(t) == 1  # committed once, at scope exit


def test_scope_rolls_back_everything_on_exception(client, test_database):
    t = _mk("rollback")
    with pytest.raises(RuntimeError):
        with transaction_scope():
            with get_cursor() as cur:
                cur.execute(f"INSERT INTO {t} (id) VALUES ('a')")
            with get_cursor() as cur:
                cur.execute(f"INSERT INTO {t} (id) VALUES ('b')")
            raise RuntimeError("the audit write failed after the mutation")
    assert _count(t) == 0  # the mutation must NOT survive its failed audit


def test_nested_scope_joins_the_outer_transaction(client, test_database):
    t = _mk("nested")
    with pytest.raises(RuntimeError):
        with transaction_scope():
            with get_cursor() as cur:
                cur.execute(f"INSERT INTO {t} (id) VALUES ('outer')")
            with transaction_scope():  # joins — must NOT commit on its own exit
                with get_cursor() as cur:
                    cur.execute(f"INSERT INTO {t} (id) VALUES ('inner')")
            raise RuntimeError("failure after the inner scope exited")
    assert _count(t) == 0  # the inner scope's write rolled back with the outer


def test_standalone_get_cursor_is_unchanged(client, test_database):
    t = _mk("standalone")
    with get_cursor() as cur:
        cur.execute(f"INSERT INTO {t} (id) VALUES ('a')")
    assert _count(t) == 1  # committed by get_cursor itself, as before
    with pytest.raises(RuntimeError), get_cursor() as cur:
        cur.execute(f"INSERT INTO {t} (id) VALUES ('b')")
        raise RuntimeError("standalone failure")
    assert _count(t) == 1  # standalone rollback, as before


def test_sequential_scopes_are_independent(client, test_database):
    t = _mk("seq")
    with pytest.raises(RuntimeError):
        with transaction_scope():
            with get_cursor() as cur:
                cur.execute(f"INSERT INTO {t} (id) VALUES ('doomed')")
            raise RuntimeError("first scope dies")
    with transaction_scope():  # a fresh scope afterwards must work normally
        with get_cursor() as cur:
            cur.execute(f"INSERT INTO {t} (id) VALUES ('kept')")
    with get_cursor() as cur:
        cur.execute(f"SELECT id FROM {t}")
        assert [r["id"] for r in cur.fetchall()] == ["kept"]
