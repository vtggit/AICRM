#!/usr/bin/env bash
# Backend startup script — waits for PostgreSQL, runs migrations, then starts the app.
#
# Usage (inside Docker):
#   ENTRYPOINT ["/app/start.sh"]
#   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
#
# Startup flow:
#   1. Wait for PostgreSQL to accept connections
#   2. Run Alembic migrations (alembic upgrade head)
#   3. Hand off to the CMD (uvicorn)
#
# This ensures schema versioning is deliberate and repeatable.

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-aicrm}"

MAX_ATTEMPTS=30
SLEEP_INTERVAL=2

attempt=0
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT} ..."

while [ $attempt -lt $MAX_ATTEMPTS ]; do
    if python -c "
import psycopg2
try:
    conn = psycopg2.connect(host='${DB_HOST}', port=${DB_PORT}, dbname='${DB_NAME}', user='${DB_USER}', password='${DB_PASSWORD}')
    conn.close()
    exit(0)
except Exception:
    exit(1)
" 2>/dev/null; then
        echo "PostgreSQL is ready."
        break
    fi

    attempt=$((attempt + 1))
    echo "  attempt ${attempt}/${MAX_ATTEMPTS} — waiting ${SLEEP_INTERVAL}s ..."
    sleep $SLEEP_INTERVAL
done

if [ $attempt -ge $MAX_ATTEMPTS ]; then
    echo "ERROR: PostgreSQL at ${DB_HOST}:${DB_PORT} did not become ready in time."
    exit 1
fi

# ---------------------------------------------------------------------------
# Run Alembic migrations
# ---------------------------------------------------------------------------
echo "Running database migrations ..."
cd /app
alembic upgrade head
echo "Migrations complete."

# ---------------------------------------------------------------------------
# Start the application
# ---------------------------------------------------------------------------
exec "$@"
