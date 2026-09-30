"""Proving test for issue #249: Alembic env.py must name the psycopg2 driver explicitly."""

from pathlib import Path


def test_issue249_surgical() -> None:
    env_path = Path(__file__).resolve().parent.parent / "migrations" / "env.py"
    source = env_path.read_text(encoding="utf-8")
    assert (
        "postgresql+psycopg2://" in source
    ), "env.py must use the explicit psycopg2 driver in the connection URL"
    assert (
        "postgresql://" not in source
    ), "env.py must not use a bare postgresql:// URL (missing driver spec)"
