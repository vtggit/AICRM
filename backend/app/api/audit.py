"""Audit log API routes — read-only access to audit event history."""

from fastapi import APIRouter, Depends, Query, Response

from app.auth.authorization import ROLE_ADMIN, require_role
from app.auth.models import AuthUser
from app.db.connection import get_cursor
from app.models.audit import AuditEventResponse
from app.repositories.audit_postgres_repository import _row_to_response

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventResponse])
def get_audit_log(
    response: Response,
    entity_type: str | None = None,
    limit: int = Query(default=20, ge=0, le=100),
    offset: int = Query(default=0, ge=0),
    _user: AuthUser = Depends(require_role(ROLE_ADMIN)),
):
    """List recent audit events. Requires admin role.

    Optionally filter by entity type.  Follows the product-wide pagination
    contract: offset/limit paging (default 20, hard cap 100, non-negative
    values only) with the total matching row count in the X-Total-Count
    header.  Results are ordered by a stable key (timestamp DESC, id DESC)
    so offset pages are deterministic under concurrent inserts.
    """
    where = "WHERE entity_type = %s" if entity_type else ""
    params = (entity_type,) if entity_type else ()

    with get_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) AS n FROM audit_log {where}", params)
        total = cur.fetchone()["n"]

        cur.execute(
            f"SELECT * FROM audit_log {where} "
            "ORDER BY timestamp DESC, id DESC "
            "LIMIT %s OFFSET %s",
            params + (limit, offset),
        )
        rows = cur.fetchall()

    events = [_row_to_response(r) for r in rows]
    response.headers["X-Total-Count"] = str(total)
    return events
