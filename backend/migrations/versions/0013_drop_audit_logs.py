"""Drop the parallel audit_logs table (audit convergence, step 3).

AICRM converged on the native, baseline `audit_log` system (richer events, five wired
services), with the transaction guarantee supplied by transaction_scope (#212, #213).
The parallel `audit_logs` entity from the pillar-inheritance campaign is retired; the
companies audit trail now flows through `audit_log` like every other entity.
"""

from alembic import op

revision = "0013_drop_audit_logs"
down_revision = "0012_add_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_logs")


def downgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            actor VARCHAR(255),
            entity_type VARCHAR(255),
            entity_id VARCHAR(255),
            detail VARCHAR(255),
            action VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_audit_logs_action
                CHECK (action IN ('create', 'update', 'delete'))
        );
    """)
