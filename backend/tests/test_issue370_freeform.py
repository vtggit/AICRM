"""Proving test for issue #370: bump the pinned certifi release.

AC-1: In backend/constraints.txt the line ``certifi==2026.7.22`` becomes
      ``certifi==2026.10.19`` and nothing else in the file changes — no
      other pin, comment or ordering.

AC-2: This test proves the criterion from the file itself, without
      comparing the whole file: it reads backend/constraints.txt and
      asserts only that certifi is pinned with ``==`` to ``2026.10.19``
      or a later version, compared as versions
      (``packaging.version.Version``), and that no line in the file is
      ``certifi==2026.7.22``.  The former whole-file ``EXPECTED``
      snapshot comparison is removed: because the test inspects only
      the certifi line, a later bump of any other pin (such as the
      opentelemetry-api bump of issue #376) leaves it passing — it
      passes on the file both before and after that bump.
"""

from pathlib import Path

from packaging.version import Version

BACKEND = Path(__file__).resolve().parents[1]
CONSTRAINTS = BACKEND / "constraints.txt"

MIN_CERTIFI = Version("2026.10.19")

OLD_PIN = "certifi==2026.7.22"


def _certifi_pins(text: str) -> list[Version]:
    """Collect the versions of every ``certifi==...`` line, in file order."""
    pins: list[Version] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "==" not in stripped:
            continue
        name, version = stripped.split("==", 1)
        if name.strip() == "certifi":
            pins.append(Version(version.strip()))
    return pins


def test_issue370_freeform():
    text = CONSTRAINTS.read_text(encoding="utf-8")
    lines = text.splitlines()

    # --- AC-2: certifi is pinned with == to 2026.10.19 or later ----------
    pins = _certifi_pins(text)
    assert pins, "certifi is not pinned with == in backend/constraints.txt"
    for pin in pins:
        assert pin >= MIN_CERTIFI, (
            "certifi must be pinned with == to 2026.10.19 or a later "
            + "version, got "
            + str(pin)
        )

    # --- AC-2: no line in the file is the old pin ------------------------
    assert not any(line.strip() == OLD_PIN for line in lines), (
        "backend/constraints.txt must not keep " + OLD_PIN
    )
