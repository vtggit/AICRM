"""Add priority column to contacts.

Revision ID: 0004_add_priority_to_contacts
Revises: 0003_add_deal_outcomes
"""

from alembic import op

revision = "0004_add_priority_to_contacts"
down_revision = "0003_add_deal_outcomes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(50)')


def downgrade() -> None:
    op.execute('ALTER TABLE "contacts" DROP COLUMN IF EXISTS "priority"')
