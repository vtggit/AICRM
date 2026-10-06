"""Shared identifier types for AICRM request models.

Entity IDs across AICRM are canonical UUIDs produced by
``str(uuid.uuid4())`` — lowercase hex with hyphens.  Request models use
``EntityId`` so that anything else is rejected with a 422 pattern
mismatch before any database access.
"""

from typing import Annotated

from pydantic import StringConstraints

EntityId = Annotated[
    str,
    StringConstraints(
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    ),
]
