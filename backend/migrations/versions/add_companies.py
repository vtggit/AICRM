"""Add companies table."""

from alembic import op

revision = "add_companies"
down_revision = "0003_add_deal_outcomes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(255),
            address VARCHAR(255),
            website VARCHAR(255),
            employee_count INTEGER,
            annual_revenue DOUBLE PRECISION,
            is_active BOOLEAN,
            description VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS companies")
