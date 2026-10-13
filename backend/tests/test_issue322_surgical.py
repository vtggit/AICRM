import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _run_config_check(env_overrides: dict[str, str | None]) -> str:
    """Run a fresh Python process that imports app.auth.config and prints AUTH_JWKS_URL."""
    env = os.environ.copy()
    env["AUTH_ISSUER"] = "https://idp.example.test/realms/demo"
    for key, value in env_overrides.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value

    code = "import app.auth.config as c; print(c.AUTH_JWKS_URL)"
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
        env=env,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    return result.stdout.strip()


def test_issue322_surgical():
    # Case 1: AUTH_JWKS_URL set to empty string → default
    url = _run_config_check({"AUTH_JWKS_URL": ""})
    assert url == ("https://idp.example.test/realms/demo/protocol/openid-connect/certs")

    # Case 2: AUTH_JWKS_URL removed from environment → default
    url = _run_config_check({"AUTH_JWKS_URL": None})
    assert url == ("https://idp.example.test/realms/demo/protocol/openid-connect/certs")

    # Case 3: AUTH_JWKS_URL set to a non-empty value → used as given
    url = _run_config_check({"AUTH_JWKS_URL": "https://keys.example.test/certs"})
    assert url == "https://keys.example.test/certs"
