"""Proving test for issue #293: the installed ``alembic`` console script
runs from ``backend/`` without ``PYTHONPATH``.

``backend/alembic.ini`` sets ``prepend_sys_path = .`` in its ``[alembic]``
section, so the console executable puts the directory it was started from
(``backend/``) on ``sys.path`` and can import the ``app`` package exactly
as ``python -m alembic`` can (which relies on the interpreter's implicit
current-directory entry that a bare console script does not get).

``alembic history`` loads every migration module to build the revision
graph, and migration 0015_minimize_audit_details imports
``app.models.audit`` at module level.  Against an ``alembic.ini`` that
lacks ``prepend_sys_path``, that load raises
``ModuleNotFoundError: No module named 'app'`` and the command exits
non-zero, so this test fails.

Subprocess output is captured as bytes and decoded with an explicit
``utf-8`` + ``errors="replace"`` decode that never consults the active
locale, so non-ASCII alembic output (the em-dashes in the 0010/0009
migration summaries) can never crash this test on
``UnicodeDecodeError`` no matter which locale the test process runs
under.
"""

import locale
import os
import shutil
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
MIGRATION_REVISION = "0015_minimize_audit_details"
# Substring of the 0010 summary line that ``alembic history`` prints; it
# carries a U+2014 em dash, i.e. non-ASCII output in UTF-8 bytes.
NON_ASCII_SUMMARY = "Add contact_consent \u2014 normalized per-channel consent"


def _decode_subprocess_output(raw: bytes) -> str:
    """Decode subprocess output without depending on the active locale.

    An explicit encoding plus ``errors="replace"`` cannot raise
    ``UnicodeDecodeError`` on any input, unlike a locale-preferred
    decoding (e.g. ASCII under a C locale) applied to UTF-8 output.
    """
    return raw.decode("utf-8", errors="replace")


def _run_alembic_history(env) -> tuple:
    """Run the installed ``alembic`` console script; return (rc, out, err)."""
    alembic_executable = shutil.which("alembic")
    assert (
        alembic_executable is not None
    ), "installed alembic console script not found on PATH"
    completed = subprocess.run(
        [alembic_executable, "history"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        timeout=120,
    )
    stdout = _decode_subprocess_output(completed.stdout)
    stderr = _decode_subprocess_output(completed.stderr)
    return completed.returncode, stdout, stderr


def test_issue293_freeform() -> None:
    # AC-2: the installed console executable, working directory backend/,
    # PYTHONPATH removed from the environment.
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)

    returncode, stdout, stderr = _run_alembic_history(env)
    assert returncode == 0, (
        f"alembic history exited with code {returncode}: "
        f"stdout={stdout!r} stderr={stderr!r}"
    )
    assert MIGRATION_REVISION in stdout

    # Locale-defect proof: the decode path used for the subprocess output
    # is explicit UTF-8 with replacement, so non-ASCII alembic output
    # decodes losslessly and malformed bytes degrade to U+FFFD instead of
    # raising, independent of the test process' locale.
    assert (
        _decode_subprocess_output(NON_ASCII_SUMMARY.encode("utf-8"))
        == NON_ASCII_SUMMARY
    )
    assert _decode_subprocess_output(b"\xff\xfe\x80") == "\ufffd\ufffd\ufffd"

    # End-to-end under a hostile locale: while the test process itself runs
    # under the C locale (preferred encoding ASCII), where a locale-
    # dependent decode of the em-dash summaries would raise
    # UnicodeDecodeError, the run must still succeed and keep the
    # non-ASCII summary text intact.
    previous_locale = locale.setlocale(locale.LC_ALL)
    try:
        locale.setlocale(locale.LC_ALL, "C")
        returncode, stdout, stderr = _run_alembic_history(env)
    finally:
        locale.setlocale(locale.LC_ALL, previous_locale)

    assert returncode == 0, (
        f"alembic history exited with code {returncode} under C locale: "
        f"stdout={stdout!r} stderr={stderr!r}"
    )
    assert MIGRATION_REVISION in stdout
    assert NON_ASCII_SUMMARY in stdout
