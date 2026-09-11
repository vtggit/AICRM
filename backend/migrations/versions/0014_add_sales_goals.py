"""Add sales_goals table (issue #195).

The sales_goals API (backend/app/api/sales_goals.py) and its repository
(backend/app/repositories/sales_goals_postgres_repository.py) shipped before the
table existed in the Alembic chain, so a database built by running the migrations
alone returned 503 (relation does not exist) on every sales-goals request. This
migration adds the table with exactly the DDL of
backend/app/db/schema.py::CREATE_SALES_GOALS_TABLE.
"""

from alembic import op

revision = "0014_add_sales_goals"
down_revision = "0013_drop_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sales_goals (
            id              VARCHAR(64)  PRIMARY KEY,
            name            VARCHAR(200) NOT NULL,
            type            VARCHAR(50)  NOT NULL,
            target_value    NUMERIC(14, 2) NOT NULL DEFAULT 0,
            current_value   NUMERIC(14, 2) NOT NULL DEFAULT 0,
            period          VARCHAR(50)  NOT NULL,
            start_date      DATE         NOT NULL,
            end_date        DATE         NOT NULL,
            created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sales_goals")
