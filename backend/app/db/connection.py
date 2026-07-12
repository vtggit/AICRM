"""PostgreSQL connection helper."""

import contextvars
import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras

from app.config import DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER

# The active transaction scope's cursor, if any (see transaction_scope). contextvars make the
# scope request-local: FastAPI runs each request in its own context, so scopes never leak
# across concurrent requests.
_scope_cursor: contextvars.ContextVar = contextvars.ContextVar(
    "transaction_scope_cursor", default=None
)


def get_connection_params() -> dict:
    """Return a dict of connection parameters.

    Reads from os.environ at call time so tests can override DB_NAME
    (or any other DB setting) by setting environment variables before
    the call.  Falls back to the module-level defaults from app.config.

    Useful for tests and external tools that need the raw parameters
    rather than a live connection object.
    """
    return {
        "host": os.getenv("DB_HOST", DB_HOST),
        "port": int(os.getenv("DB_PORT", str(DB_PORT))),
        "dbname": os.getenv("DB_NAME", DB_NAME),
        "user": os.getenv("DB_USER", DB_USER),
        "password": os.getenv("DB_PASSWORD", DB_PASSWORD),
    }


def get_connection():
    """Return a new psycopg2 connection to the PostgreSQL database."""
    return psycopg2.connect(**get_connection_params())


@contextmanager
def transaction_scope():
    """One transaction for everything inside the block: every get_cursor() call within the
    scope yields the SAME cursor on the SAME connection, and commit/rollback happens HERE,
    at scope exit — a business mutation and its audit event persist or vanish together.

    This makes the audit module's documented failure policy (Option B: a failed audit write
    rolls back the mutation, see app/services/audit_service.py) mechanically true; without a
    scope, each get_cursor() commits independently and the policy holds only by wishful
    docstring.

    Nesting: an inner transaction_scope joins the outer one — there are no partial commits
    inside an enclosing scope.
    """
    existing = _scope_cursor.get()
    if existing is not None:
        yield existing  # join the enclosing scope; only the owner commits
        return
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    token = _scope_cursor.set(cur)
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _scope_cursor.reset(token)
        cur.close()
        conn.close()


@contextmanager
def get_cursor():
    """Context manager that yields a cursor and auto-commits or rolls back.

    Inside a transaction_scope() it yields the scope's cursor instead and does NOT commit —
    the scope owner commits or rolls back everything at once. Standalone behavior (no active
    scope) is unchanged: own connection, own transaction.
    """
    scoped = _scope_cursor.get()
    if scoped is not None:
        yield scoped
        return
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
