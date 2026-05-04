# AICRM backend configuration

import os

APP_NAME: str = "AICRM"
APP_VERSION: str = "0.1.0"
ENVIRONMENT: str = "development"
DEBUG: bool = True

# Frontend origins allowed to make cross-origin requests.
# Add more entries as needed (e.g. production URLs).
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

# ---------------------------------------------------------------------------
# PostgreSQL configuration
# All values can be overridden via environment variables.
# ---------------------------------------------------------------------------
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
DB_NAME: str = os.getenv("DB_NAME", "aicrm")
DB_USER: str = os.getenv("DB_USER", "aicrm")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "aicrm")
