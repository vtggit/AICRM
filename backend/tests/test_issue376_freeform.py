"""Proving test for issue #376: bump the pinned opentelemetry-api release.

AC-1: In backend/constraints.txt the line
      ``opentelemetry-api==1.45.1`` becomes
      ``opentelemetry-api==1.45.2`` and nothing else in the file changes
      — no other pin, comment or ordering.

AC-2: This test proves the criterion from the file itself, without
      comparing the whole file: it reads backend/constraints.txt and
      asserts only that opentelemetry-api is pinned with ``==`` to
      ``1.45.2`` or a later version, compared as versions
      (``packaging.version.Version``), and that no line in the file is
      ``opentelemetry-api==1.45.1``.  It compares no other line, so a
      later bump of any other pin leaves this test passing.
"""

from pathlib import Path

from packaging.version import Version

BACKEND = Path(__file__).resolve().parents[1]
CONSTRAINTS = BACKEND / "constraints.txt"

MIN_OTEL_API = Version("1.45.2")

OLD_PIN = "opentelemetry-api==1.45.1"


def _otel_api_pins(text: str) -> list[Version]:
    """Collect the versions of every ``opentelemetry-api==...`` line."""
    pins: list[Version] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "==" not in stripped:
            continue
        name, version = stripped.split("==", 1)
        if name.strip() == "opentelemetry-api":
            pins.append(Version(version.strip()))
    return pins


def test_issue376_freeform():
    text = CONSTRAINTS.read_text(encoding="utf-8")
    lines = text.splitlines()

    # --- AC-2: opentelemetry-api is pinned with == to 1.45.2 or later ----
    pins = _otel_api_pins(text)
    assert pins, "opentelemetry-api is not pinned with == in backend/constraints.txt"
    for pin in pins:
        assert pin >= MIN_OTEL_API, (
            "opentelemetry-api must be pinned with == to 1.45.2 or a "
            + "later version, got "
            + str(pin)
        )

    # --- AC-2: no line in the file is the old pin ------------------------
    assert not any(line.strip() == OLD_PIN for line in lines), (
        "backend/constraints.txt must not keep " + OLD_PIN
    )
