"""Minimize legacy audit_log.details_json in place (issue #285).

Since #284 every new audit write persists only minimized details (see
app.models.audit.minimize_details), but rows written before that still
carry personal data in details_json.  This one-time data migration
rewrites every non-NULL audit_log.details_json by invoking that same
minimize_details() implementation — not a re-implemented copy of the
allow-list, shape checks or NULL semantics — so stored rows and new
writes can never drift:

- detail keys outside the allow-list are dropped
- an allowed key whose value does not have the expected non-personal
  shape (for example a personal name under "new") is dropped
- a row whose details are reduced to nothing is set to NULL, the same
  NULL semantics the write path uses for an empty details object

Scope: the details_json column only.  No other audit_log column is read
or written, and no row is inserted, deleted or renamed, so the row
count is unchanged.  Rows are read and updated in batches of 1000 by
id (the primary key) inside the single transaction Alembic opens for
this migration — there are no per-batch commits, so a failure rolls the
whole rewrite back.  The id-ordered pagination also guarantees a row is
read at most once.

The operator summary logged by upgrade() carries aggregate metadata
only: the migration id plus the rows scanned, updated and nulled.  It
never includes detail values, actor identities or any other personal
data.

Downgrade is a documented no-op: the personal values removed by
upgrade() no longer exist anywhere in the database and cannot be
restored, and this migration changed no schema to roll back.
"""

import json
import logging

from alembic import op
from sqlalchemy import text

from app.models.audit import minimize_details

revision = "0015_minimize_audit_details"
down_revision = "0014_add_sales_goals"
branch_labels = None
depends_on = None

#: Rows read (and rewritten) per batch.  Small batches keep the
#: statement cache and transaction memory bounded on large audit logs;
#: pagination is by primary key, so the batches never overlap.
BATCH_SIZE = 1000

_SUMMARY_LOGGER = logging.getLogger("alembic")


def _fetch_batch(bind, last_id):
    """One id-ordered batch of rows still carrying non-NULL details."""
    result = bind.execute(
        text(
            "SELECT id, details_json "
            "FROM audit_log "
            "WHERE details_json IS NOT NULL AND id > :last_id "
            "ORDER BY id "
            "LIMIT :batch_size"
        ),
        {"last_id": last_id, "batch_size": BATCH_SIZE},
    )
    return result.fetchall()


def upgrade() -> None:
    """Rewrite every non-NULL details_json with the write-path rules."""
    bind = op.get_bind()
    rows_scanned = 0
    rows_updated = 0
    rows_nulled = 0
    last_id = -1
    while True:
        batch = _fetch_batch(bind, last_id)
        if not batch:
            break
        for row_id, details_json in batch:
            rows_scanned += 1
            minimized = minimize_details(details_json)
            if not minimized:
                # Nothing non-personal survived: store NULL, exactly like
                # a new write of an empty details object.
                bind.execute(
                    text(
                        "UPDATE audit_log " "SET details_json = NULL " "WHERE id = :id"
                    ),
                    {"id": row_id},
                )
                rows_updated += 1
                rows_nulled += 1
                continue
            if details_json == minimized:
                # Already compliant (same keys and same values): leave
                # the row untouched.
                continue
            bind.execute(
                text(
                    "UPDATE audit_log "
                    "SET details_json = CAST(:details AS JSONB) "
                    "WHERE id = :id"
                ),
                {"details": json.dumps(minimized), "id": row_id},
            )
            rows_updated += 1
        last_id = batch[-1][0]
    _SUMMARY_LOGGER.info(
        "audit details minimization: migration=%s "
        "rows_scanned=%d rows_updated=%d rows_nulled=%d",
        revision,
        rows_scanned,
        rows_updated,
        rows_nulled,
    )


def downgrade() -> None:
    """No-op, by design.

    upgrade() removes personal values from details_json; those values
    are gone from the database and cannot be restored, so there is
    nothing to roll back.  The migration changed no schema, so the
    downgrade intentionally does nothing.
    """
