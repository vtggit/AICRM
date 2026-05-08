"""PostgreSQL-backed repository for Contacts."""

import logging
import uuid
from datetime import datetime, timezone

from app.db.connection import get_cursor
from app.observability.logging import get_request_id

logger = logging.getLogger(__name__)


def _req() -> str:
    """Return a request-ID suffix for log lines, or empty string."""
    rid = get_request_id()
    return f" request_id={rid}" if rid else ""


def _generate_id() -> str:
    """Generate a UUID-based unique ID."""
    return str(uuid.uuid4())


def _row_to_dict(row) -> dict:
    """Convert a RealDictRow (or dict) into a plain dict with ISO timestamps."""
    d = dict(row)
    for key in ("created_at", "updated_at"):
        if d.get(key):
            ts = d[key]
            if isinstance(ts, datetime):
                d[key] = ts.isoformat()
    return d


class ContactsPostgresRepository:
    """PostgreSQL-backed repository for contact CRUD operations."""

    def list_all(self) -> list[dict]:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM contacts ORDER BY created_at DESC")
            rows = cur.fetchall()
        return [_row_to_dict(r) for r in rows]

    def get_by_id(self, contact_id: str) -> dict | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM contacts WHERE id = %s", (contact_id,))
            row = cur.fetchone()
        if row is None:
            return None
        return _row_to_dict(row)

    def create(self, data: dict) -> dict:
        contact_id = data.get("id", _generate_id())
        now = datetime.now(timezone.utc)

        try:
            with get_cursor() as cur:
                cur.execute(
                    """INSERT INTO contacts
                       (id, name, email, phone, company, status, notes, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        contact_id,
                        data["name"],
                        data.get("email"),
                        data.get("phone"),
                        data.get("company"),
                        data.get("status", "active"),
                        data.get("notes"),
                        now,
                        now,
                    ),
                )
        except Exception as exc:
            logger.error(
                "contacts: failed to create contact id=%s — %s%s",
                contact_id,
                exc,
                _req(),
            )
            raise

        return self.get_by_id(contact_id)

    def update(self, contact_id: str, data: dict) -> dict | None:
        # Build dynamic UPDATE so we only touch provided fields
        updatable = ("name", "email", "phone", "company", "status", "notes")
        fields = [k for k in updatable if k in data]
        if not fields:
            # Nothing to update — just bump the timestamp
            fields = []

        if fields:
            set_clauses = [f"{f} = %s" for f in fields]
            values = [data[f] for f in fields]
        else:
            set_clauses = []
            values = []

        set_clauses.append("updated_at = %s")
        values.append(datetime.now(timezone.utc))
        values.append(contact_id)

        try:
            with get_cursor() as cur:
                if set_clauses:
                    sql = f"UPDATE contacts SET {', '.join(set_clauses)} WHERE id = %s"
                    cur.execute(sql, values)
                else:
                    # Edge case: no fields and no timestamp update needed
                    cur.execute("SELECT 1 FROM contacts WHERE id = %s", (contact_id,))
        except Exception as exc:
            logger.error(
                "contacts: failed to update contact id=%s — %s%s",
                contact_id,
                exc,
                _req(),
            )
            raise

        return self.get_by_id(contact_id)

    def delete(self, contact_id: str) -> bool:
        try:
            with get_cursor() as cur:
                cur.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
                return cur.rowcount > 0
        except Exception as exc:
            logger.error(
                "contacts: failed to delete contact id=%s — %s%s",
                contact_id,
                exc,
                _req(),
            )
            raise
