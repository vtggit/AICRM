# AICRM Backend

This folder contains the backend API for AICRM, built with **FastAPI**.

## Architecture Overview

AICRM is a **backend-owned application**. All business data  —  Contacts, Companies, Leads, Activities, Templates, Tags, Suppressions, Deal Outcomes, Sales Goals, and Settings  —  is managed by the backend and persisted in PostgreSQL. The frontend is a client that communicates exclusively through this API.

### Domains

All major domains are PostgreSQL-backed:

| Domain        | Status    | CRUD Endpoints                                     |
|---------------|-----------|----------------------------------------------------|
| Contacts      | Complete  | GET/POST/PUT/DELETE `/api/contacts`                |
| Leads         | Complete  | GET/POST/PUT/DELETE `/api/leads`                   |
| Activities    | Complete  | GET/POST/PUT/DELETE `/api/activities`              |
| Templates     | Complete  | GET/POST/PUT/DELETE `/api/templates`               |
| Settings      | Complete  | GET/PUT `/api/settings`                            |
| Companies     | Shipped   | GET/POST/PUT/DELETE `/api/companies` (soft delete) |
| Tags          | Shipped   | GET/POST/PUT/DELETE `/api/tags`                    |
| Suppressions  | Shipped   | GET/POST/DELETE `/api/suppressions`                |
| Deal Outcomes | Shipped   | GET/POST/PATCH/DELETE `/api/deal-outcomes`         |
| Sales Goals   | Shipped   | GET/POST/PATCH/DELETE `/api/sales-goals`           |

Read-only analytics (`/api/analytics/*`) and the audit log query (`/api/audit`) are also mounted. See [Available Endpoints](#available-endpoints) for the full route list.

### Authentication

Two modes are supported:

- **Development mode** (`AUTH_MODE=development`): accepts a simple shared bearer token (`AUTH_DEV_TOKEN`). The bare token gets the roles in `AUTH_DEV_ROLES` (default `user`); `<token>:admin` and `<token>:user` select an admin or a non-admin identity.
- **Production mode** (`AUTH_MODE=production`): validates real JWTs against a configured identity provider using JWKS-based signature verification, issuer/audience validation, and token expiry checks.
- Roles and groups are normalized from IdP claims into a consistent application user context.
- Unknown `AUTH_MODE` values fail closed (no silent fallback to dev mode).

### Authorization

Role-based authorization is available via `require_role()` and `require_any_role()` dependencies. Two roles are recognised: `admin` and `user`. Which routes need `admin` is listed in [Available Endpoints](#available-endpoints).

### Audit Logging

Audit logging records mutations (create, update, delete) for Contacts, Companies, Leads, Activities, Templates, and Settings in a PostgreSQL `audit_log` table, along with contact consent changes, unsubscribes, and contact email sends. Tags, Deal Outcomes, Sales Goals, and direct suppression-list add/remove do not write audit events.

### Observability

Structured logging with per-request correlation IDs (`X-Request-ID`) is in place for operational observability.

### Versioning

The application version is defined in the **VERSION** file at the repository root.
The backend reads this file at startup and exposes the version via the health endpoint.

**Where version comes from:**

1. `APP_VERSION` environment variable (highest priority - useful for container deployments)
2. `VERSION` file at repo root (source of truth)
3. Hardcoded fallback `0.1.0` (safety net only)

The `VERSION` file is resolved relative to the source tree (two directories above `backend/app/`). The Docker image is built with `backend/` as its build context, so the repo-root `VERSION` file is not inside the image, and `docker-compose.yml` does not pass `APP_VERSION`, `GIT_SHA`, or `BUILD_TIMESTAMP` to the backend container. A container therefore reports the `0.1.0` fallback unless `APP_VERSION` is supplied.

**How version is exposed:**

```bash
curl http://localhost:9000/api/health
# Response: {"status": "ok", "app_version": "0.1.0", "service": "aicrm-backend",
#            "git_sha": null, "build_timestamp": null}

curl http://localhost:9000/api/health/version
# Response: {"version": "0.1.0"}
```

**Build / revision traceability:**

The health response always carries `git_sha` and `build_timestamp`. They are `null`
unless the `GIT_SHA` and/or `BUILD_TIMESTAMP` environment variables are set (e.g. by CI
or a Docker build step):

```bash
curl http://localhost:9000/api/health
# Response: {"status": "ok", "app_version": "0.1.0", "service": "aicrm-backend",
#            "git_sha": "abc1234", "build_timestamp": "2025-01-15T10:30:00Z"}
```

These values are never hardcoded in source. They are injected at build time via
environment variables so the running instance can be traced back to a specific
git commit and build time.

**CI validation of release metadata:**

CI runs `scripts/check_release_metadata.py` in a dedicated `release-metadata` job
that validates:

- `VERSION` file exists and is non-empty
- `VERSION` format is `MAJOR.MINOR.PATCH`
- `CHANGELOG.md` exists
- The current version appears in `CHANGELOG.md` (or an `[Unreleased]` section exists)
- If `VERSION` changes in a PR, `CHANGELOG.md` must also change

Run the check locally: `python3 scripts/check_release_metadata.py`

See [docs/operations/release-process.md](../docs/operations/release-process.md) for the full
versioning policy, release workflow, and which steps are automated vs manual.

## Structure

```text
backend/
├── Dockerfile                # Container build definition
├── start.sh                  # Startup script (DB wait + migrations)
├── run_tests.sh              # Test runner (ephemeral PostgreSQL container + pytest)
├── alembic.ini               # Alembic migration configuration
├── migrations/               # Versioned database migrations
│   ├── env.py                # Migration environment (reads env vars)
│   ├── script.py.mako        # Template for new migrations
│   └── versions/             # Individual migration files
│       ├── 0001_baseline.py  # Baseline migration (schema state when Alembic was introduced)
│       └── 0002_*.py … 0015_*.py  # Incremental migrations: contact tags, deal outcomes,
│                                  # companies (+ company_id links, soft delete, indexes),
│                                  # contact consent, suppressions, sales goals, audit details
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI application entry point
│   ├── config.py             # Application and database configuration
│   ├── auth/                 # Authentication and authorization layer
│   │   ├── __init__.py
│   │   ├── config.py         # Auth configuration (env-driven)
│   │   ├── models.py         # AuthUser model
│   │   ├── security.py       # Token validation helpers
│   │   ├── dependencies.py   # FastAPI route dependencies
│   │   └── authorization.py  # Role-based authorization helpers
│   ├── db/                   # Database connection and schema
│   │   ├── __init__.py
│   │   ├── connection.py     # PostgreSQL connection helper
│   │   └── schema.py         # DEPRECATED  —  kept as reference only
│   ├── api/                  # API route modules
│   │   ├── __init__.py
│   │   ├── health.py         # Health endpoints (liveness, readiness, version)
│   │   ├── auth.py           # Auth endpoints (/me, /config)
│   │   ├── contacts.py       # Contacts CRUD, bulk, duplicates, send-email endpoints
│   │   ├── companies.py      # Companies CRUD endpoints (soft delete)
│   │   ├── tags.py           # Contact tag CRUD and contact-tag assignment endpoints
│   │   ├── suppressions.py   # Suppression list, unsubscribe, send-gate endpoints
│   │   ├── leads.py          # Leads CRUD endpoints
│   │   ├── activities.py     # Activities CRUD endpoints
│   │   ├── templates.py      # Templates CRUD endpoints
│   │   ├── deal_outcomes.py  # Win/loss outcome endpoints
│   │   ├── sales_goals.py    # Sales goal endpoints
│   │   ├── analytics.py      # Funnel and activity-trend analytics endpoints
│   │   ├── settings.py       # Settings endpoints
│   │   └── audit.py          # Audit log query endpoints
│   ├── email/                # Outbound email
│   │   ├── __init__.py
│   │   └── transport.py      # SMTP transport (TLS-only, env-configured)
│   ├── services/             # Business logic layer
│   ├── repositories/         # Data access layer (all PostgreSQL-backed)
│   ├── models/               # Pydantic data models
│   └── observability/        # Operational observability
│       ├── __init__.py
│       ├── logging.py        # Structured logging configuration
│       └── middleware.py     # Request ID and request logging middleware
├── requirements.txt
├── openapi.json              # Committed API contract artifact
├── tests/                    # Automated test suite (43 test modules)
│   ├── conftest.py           # Shared fixtures (DB, app, auth tokens)
│   ├── test_*_api.py         # Per-domain API tests (health, auth, contacts, companies,
│   │                         #   leads, activities, templates, settings, audit)
│   ├── test_authorization.py # Authorization tests
│   ├── test_migrations.py    # Migration tests
│   ├── test_openapi_contract.py # API contract validation tests
│   ├── test_issue<N>_*.py    # Per-issue proving tests
│   └── test_*.py             # Focused behaviour tests (pagination, soft delete, consent,
│                             #   suppression send gate, audit atomicity, container hardening, ...)
└── README.md
```

## Running the Backend

### Option A: Full Stack via Docker Compose (Recommended)

From the repository root:

```bash
cp .env.example .env     # first time only
docker compose up --build
```

The backend container:

1. Waits for PostgreSQL to accept connections (`start.sh`)
2. Runs Alembic migrations (`alembic upgrade head`)
3. Starts uvicorn on port 9000

Migrations are applied automatically on every container start. The migration
history is tracked in the `alembic_version` table inside PostgreSQL.

### Option B: Manual (No Docker)

```bash
cd backend
pip install -r requirements.txt
export AUTH_MODE=development
export AUTH_DEV_TOKEN=dev-secret-token

# Run migrations first
alembic upgrade head

# Then start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The server starts at `http://localhost:9000`.

## Database

### Dependency

The backend requires PostgreSQL 12+. In docker-compose mode, the `db` service is started first and the backend waits for it via `start.sh`. In manual mode, start PostgreSQL yourself before running the backend.

### Schema Versioning with Alembic

Schema changes are managed through **Alembic**, a versioned migration tool.
All schema evolution happens through migration files in `backend/migrations/versions/`.

**Key principles:**

- Schema changes are **versioned, ordered, reviewable, and repeatable**.
- The baseline migration (`0001_baseline.py`) represents the current schema state at the time this system was introduced.
- New schema changes are introduced by creating a new migration file  —  not by editing `schema.py`.
- Migrations are applied automatically on container startup via `start.sh`.
- Migration history is tracked in the `alembic_version` table inside PostgreSQL.

### Migration Workflow

**Create a new migration:**

```bash
cd backend
alembic revision -m "add_new_column_to_contacts"
```

This creates a new, empty migration file in `migrations/versions/`. Write the
`upgrade()` and `downgrade()` steps by hand, following the existing migrations.
`migrations/env.py` sets `target_metadata=None` (there are no SQLAlchemy models),
so `--autogenerate` has no metadata to diff against.

**Apply pending migrations:**

```bash
cd backend
alembic upgrade head
```

**Check current migration status:**

```bash
cd backend
alembic current     # shows the currently applied revision
alembic history     # shows the full migration chain
```

**Downgrade one step (use with caution):**

```bash
cd backend
alembic downgrade -1
```

### Startup Order (Containerized)

```text
db (PostgreSQL)
  → healthcheck passes (pg_isready)
    → backend (start.sh waits for DB connectivity)
      → alembic upgrade head (applies pending migrations)
        → uvicorn starts
          → API is ready
```

### Legacy Schema Helper

The file `backend/app/db/schema.py` is retained temporarily as a reference
for the current schema structure. It is **no longer** the primary mechanism
for schema evolution. New schema changes should always go through Alembic
migrations.

## Configuration

All configuration is driven by environment variables with explicit, safe defaults. There are no hidden fallback paths. The tables below list the variables the backend reads and their in-code defaults. `.env.example` at the repository root holds the values `docker-compose.yml` consumes; it is not the complete list (for example it omits `AUTH_JWKS_URL` and the `AICRM_SMTP_*` variables), and it sets `DB_PASSWORD=change-me-in-production` rather than the in-code default.

### Database

| Variable       | Default     | Description          |
|----------------|-------------|----------------------|
| `DB_HOST`      | `localhost` | PostgreSQL host      |
| `DB_PORT`      | `5432`      | PostgreSQL port      |
| `DB_NAME`      | `aicrm`     | Database name        |
| `DB_USER`      | `aicrm`     | Database username    |
| `DB_PASSWORD`  | `aicrm`     | Database password    |

### Application

| Variable      | Default       | Description                          |
|---------------|---------------|--------------------------------------|
| `ENVIRONMENT` | `development` | Environment label (defined in `app/config.py`; not read elsewhere in `backend/app/`) |
| `DEBUG`       | `true`        | Debug flag (defined in `app/config.py`; not passed to FastAPI) |
| `CORS_ORIGINS`| (see below)   | Comma-separated allowed origins      |
| `APP_VERSION` | (unset)       | Overrides the version read from the `VERSION` file |
| `GIT_SHA`     | (empty)       | Build traceability, reported by the health endpoints when set |
| `BUILD_TIMESTAMP` | (empty)   | Build traceability, reported by the health endpoints when set |

Default CORS origins: `http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080`

`docker-compose.yml` overrides this with its own default: `http://localhost:3000,http://localhost:8080,http://frontend`.

### Authentication

| Variable             | Default                                              | Description                                      |
|----------------------|------------------------------------------------------|--------------------------------------------------|
| `AUTH_ENABLED`       | `true`                                               | Enable/disable auth boundary. When `false`, `0`, or `off`, every request runs as an `anonymous` user with no roles, so admin-only routes still return 403 |
| `AUTH_MODE`          | `development`                                        | `development` or `production` (fail closed for unknown values) |
| `AUTH_DEV_TOKEN`     | `dev-secret-token`                                   | Shared bearer token for dev mode                 |
| `AUTH_DEV_ROLES`     | `user`                                               | Comma-separated roles for the bare dev token (the `:admin` / `:user` suffixed forms ignore it) |
| `AUTH_ISSUER`        | `https://dev.example.com/realms/aicrm`               | IdP issuer URL (production mode)                 |
| `AUTH_CLIENT_ID`     | `aicrm-backend`                                      | Client ID / audience                             |
| `AUTH_AUDIENCE`      | (same as `AUTH_CLIENT_ID`)                           | JWT audience claim to validate                   |
| `AUTH_JWKS_URL`      | (derived from `AUTH_ISSUER`)                         | JWKS discovery URL                               |
| `AUTH_ALGORITHMS`    | `RS256`                                              | Comma-separated list of allowed JWT algorithms   |
| `AUTH_JWKS_CACHE_TTL`| `3600`                                               | JWKS cache TTL in seconds                        |
| `AUTH_ROLE_CLAIMS`   | `roles,realm_access.roles,resource_access.{client_id}.roles` | Dot-notation claim paths to scan for roles |
| `AUTH_GROUP_CLAIMS`  | `groups`                                             | Dot-notation claim paths to scan for groups      |

The JWKS variable the code reads is `AUTH_JWKS_URL` (`app/auth/config.py`). The derived default (`<AUTH_ISSUER>/protocol/openid-connect/certs`) applies only when the variable is absent from the environment: `docker-compose.yml` passes `AUTH_JWKS_URL` to the container as an empty string when it is not set in `.env`, which replaces the derived default, so set it explicitly for production mode under docker-compose.

**Development mode example:**

```bash
export AUTH_MODE=development
export AUTH_DEV_TOKEN=my-dev-token
# Bearer my-dev-token        -> roles from AUTH_DEV_ROLES (default: user)
# Bearer my-dev-token:admin  -> admin + user
# Bearer my-dev-token:user   -> user
```

**Production mode example:**

```bash
export AUTH_MODE=production
export AUTH_ISSUER=https://your-idp.example.com/realms/aicrm
export AUTH_CLIENT_ID=aicrm-backend
export AUTH_JWKS_URL=https://your-idp.example.com/realms/aicrm/protocol/openid-connect/certs
```

### Logging

| Variable    | Default | Description                              |
|-------------|---------|------------------------------------------|
| `LOG_LEVEL` | `INFO`  | Python log level (DEBUG, INFO, WARNING, ERROR) |
| `LOG_FORMAT` | `%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s` | Python logging format string |

Logs are written through a Python `StreamHandler` (stderr by default) in a structured format that includes timestamp, level, request ID, logger name, and message. Example:

```text
2024-01-15T10:30:00+0000 WARNING  [a1b2c3d4-...] app.auth.security: auth: JWT validation failed — token expired request_id=a1b2c3d4-...
```

### Email (SMTP)

Outbound email (`POST /api/contacts/{id}/send-email`) is configured only through these variables, read at send time by `app/email/transport.py`. None has a default, and `docker-compose.yml` does not pass them to the backend container.

| Variable | Description |
|----------|-------------|
| `AICRM_SMTP_HOST` | SMTP server. Sending is disabled (the endpoint returns 503) until this is set |
| `AICRM_SMTP_PORT` | SMTP port (1-65535) |
| `AICRM_SMTP_TLS` | `starttls` or `implicit`. TLS is mandatory; there is no plaintext mode |
| `AICRM_SMTP_FROM` | From address for every message |
| `AICRM_SMTP_USERNAME` | Optional; when set, the transport authenticates before sending |
| `AICRM_SMTP_PASSWORD` | Password used with `AICRM_SMTP_USERNAME` |
| `AICRM_SMTP_CA_FILE` | Optional CA bundle path; when set it replaces the system trust store |

## Available Endpoints

| Method | Path                        | Auth     | Description                |
|--------|-----------------------------|----------|----------------------------|
| GET    | `/`                         | No       | Root endpoint              |
| GET    | `/api/health`               | No       | Liveness check             |
| GET    | `/api/health/ready`         | No       | Readiness check (database) |
| GET    | `/api/health/version`       | No       | Application version        |
| GET    | `/api/auth/config`          | No       | Public auth config         |
| GET    | `/api/auth/me`              | Yes      | Current user context       |
| GET    | `/api/contacts`             | Admin    | List contacts              |
| GET    | `/api/contacts/duplicates`  | Admin    | Find duplicate contacts    |
| GET    | `/api/contacts/{id}`        | Admin    | Get a contact by ID        |
| POST   | `/api/contacts`             | Admin    | Create a contact           |
| PUT    | `/api/contacts/{id}`        | Admin    | Update a contact           |
| DELETE | `/api/contacts/{id}`        | Admin    | Delete a contact           |
| POST   | `/api/contacts/bulk-delete` | Admin    | Delete several contacts    |
| POST   | `/api/contacts/bulk-update-status` | Admin | Set the status of several contacts |
| POST   | `/api/contacts/{id}/send-email` | Yes  | Send an email to a contact (202 on acceptance) |
| GET    | `/api/companies`            | Yes      | List companies             |
| POST   | `/api/companies`            | Admin    | Create a company           |
| GET    | `/api/companies/{id}`       | Yes      | Get a company by ID        |
| PUT    | `/api/companies/{id}`       | Admin    | Update a company           |
| DELETE | `/api/companies/{id}`       | Admin    | Soft-delete a company      |
| GET    | `/api/tags`                 | Admin    | List tags                  |
| POST   | `/api/tags`                 | Admin    | Create a tag               |
| PUT    | `/api/tags/{id}`            | Admin    | Update a tag               |
| DELETE | `/api/tags/{id}`            | Admin    | Delete a tag               |
| PUT    | `/api/tags/contacts/{contact_id}/tags` | Admin | Replace a contact's tags |
| GET    | `/api/suppressions`         | Admin    | List suppression entries   |
| POST   | `/api/suppressions`         | Admin    | Add an address to the suppression list |
| DELETE | `/api/suppressions/{id}`    | Admin    | Remove a suppression entry |
| POST   | `/api/suppressions/unsubscribe` | Admin | Unsubscribe a contact (suppress + opt out) |
| GET    | `/api/suppressions/may-send` | Yes     | Send gate for an email address |
| GET    | `/api/leads`                | Yes      | List leads                 |
| POST   | `/api/leads`                | Admin    | Create a lead              |
| GET    | `/api/leads/{id}`           | Yes      | Get a lead by ID           |
| PUT    | `/api/leads/{id}`           | Admin    | Update a lead              |
| PATCH  | `/api/leads/{id}/stage`     | Admin    | Update a lead's stage      |
| DELETE | `/api/leads/{id}`           | Admin    | Delete a lead              |
| GET    | `/api/activities`           | Yes      | List activities            |
| POST   | `/api/activities`           | Admin    | Create an activity         |
| GET    | `/api/activities/{id}`      | Yes      | Get an activity by ID      |
| PUT    | `/api/activities/{id}`      | Admin    | Update an activity         |
| DELETE | `/api/activities/{id}`      | Admin    | Delete an activity         |
| GET    | `/api/templates`            | Yes      | List templates             |
| POST   | `/api/templates`            | Admin    | Create a template          |
| PUT    | `/api/templates/{id}`       | Admin    | Update a template          |
| DELETE | `/api/templates/{id}`       | Admin    | Delete a template          |
| GET    | `/api/deal-outcomes`        | Yes      | List win/loss outcomes     |
| POST   | `/api/deal-outcomes`        | Yes      | Create a win/loss outcome  |
| GET    | `/api/deal-outcomes/analytics` | Yes   | Win/loss analytics summary |
| GET    | `/api/deal-outcomes/{id}`   | Yes      | Get an outcome by ID       |
| PATCH  | `/api/deal-outcomes/{id}`   | Admin    | Update an outcome          |
| DELETE | `/api/deal-outcomes/{id}`   | Admin    | Delete an outcome          |
| GET    | `/api/deal-outcomes/leads/{lead_id}` | Yes | Get the outcome for a lead |
| GET    | `/api/sales-goals`          | Yes      | List sales goals           |
| POST   | `/api/sales-goals`          | Admin    | Create a sales goal        |
| GET    | `/api/sales-goals/progress` | Yes      | Sales goal progress summary |
| POST   | `/api/sales-goals/recalculate` | Yes   | Recalculate goal values    |
| GET    | `/api/sales-goals/{id}`     | Yes      | Get a sales goal by ID     |
| PATCH  | `/api/sales-goals/{id}`     | Admin    | Update a sales goal        |
| DELETE | `/api/sales-goals/{id}`     | Admin    | Delete a sales goal        |
| GET    | `/api/analytics/funnel`     | Yes      | Lead funnel analytics      |
| GET    | `/api/analytics/activity-trends` | Yes | Activity trend analytics   |
| GET    | `/api/settings`             | Yes      | Get application settings   |
| PUT    | `/api/settings`             | Admin    | Update application settings |
| GET    | `/api/audit`                | Admin    | List audit events          |

Routes marked **Yes** require a valid Bearer token. Routes marked **Admin** additionally require the `admin` role and return 403 without it. In development mode, use the value of `AUTH_DEV_TOKEN` (default: `dev-secret-token`); the bare token carries the roles in `AUTH_DEV_ROLES` (default `user`), so use `dev-secret-token:admin` for **Admin** routes.

List endpoints accept `limit` (default 20, maximum 100) and `offset` query parameters and report the total row count in the `X-Total-Count` response header.

## Request Correlation

Every request is assigned a unique correlation ID, exposed in the `X-Request-ID` response header. If the incoming request already carries an `X-Request-ID` header, it is preserved; otherwise a new UUID is generated. This ID is included in all backend log lines, making it easy to trace a single request through the full stack:

```bash
curl -v http://localhost:9000/api/contacts \
  -H "Authorization: Bearer dev-secret-token:admin"
# Response header: X-Request-ID: <uuid>
```

## Troubleshooting

### Health Endpoints

The backend provides two health endpoints for operational diagnostics (a third, `/api/health/version`, returns only `{"version": "..."}`):

```bash
# Basic liveness check (returns 200 if the process is running)
curl http://localhost:9000/api/health

# Readiness check (includes database connectivity status)
curl http://localhost:9000/api/health/ready
```

The readiness endpoint returns `"status": "degraded"` (still with HTTP 200) if the database is unreachable, even though the process itself is running. Use this to distinguish between "backend down" and "backend running but database unavailable."

Response fields:

- `status`: `"ok"` or `"degraded"` (`/api/health` always reports `"ok"`)
- `app_version`: Application version from `VERSION` file or `APP_VERSION` env var
- `service`: Always `"aicrm-backend"`
- `git_sha`: Git commit SHA from the `GIT_SHA` env var, otherwise `null`
- `build_timestamp`: Build timestamp from the `BUILD_TIMESTAMP` env var, otherwise `null`
- `dependencies` (readiness only): List of dependency statuses (e.g., `[{"name": "database", "status": "ok"|"error", "detail": "..."}]`)

### Backend Not Starting

**Symptoms:** Backend container exits, process crashes, or port 9000 is not listening.

**Diagnostics:**

```bash
# Check if the process is running
docker ps -a | grep aicrm-backend

# View startup logs (look for [startup] prefixed lines)
docker logs aicrm-backend --tail 50

# Check for port conflicts
lsof -i :9000
```

**Startup log prefixes and their meaning:**

- `[startup] Waiting for PostgreSQL at <host>:<port> (database: <name>) ...`  —  Normal: backend is waiting for DB
- `[startup]   attempt N/30 — waiting 2s ...`  —  Normal: a connection attempt failed and will be retried
- `[startup] PostgreSQL is ready.`  —  Normal: DB connection established
- `[startup] Running database migrations ...`  —  Normal: applying schema migrations
- `[startup] Migrations complete.`  —  Normal: schema is up to date
- `[startup] Starting application server ...`  —  Normal: handing off to uvicorn
- `[startup] ERROR: PostgreSQL at <host>:<port> did not become ready in time.`  —  DB is down or unreachable after 30 attempts, 2 seconds apart
- `[startup] ERROR: Database migrations failed with exit code <N>.`  —  Migration error (see below)

**Common causes:**

- **Database not ready:** Backend makes 30 connection attempts, 2 seconds apart (about 60 seconds). If DB doesn't start, the backend exits with a clear error. Start the database first.
- **Port conflict:** Another process is using port 9000. Kill it or change `BACKEND_PORT_HOST` (the host port docker-compose publishes).
- **Missing Python dependencies:** Rebuild the container image.

### Database Connection Failure

**Symptoms:**

- Frontend shows "The service is temporarily unavailable" on API requests
- `/api/health/ready` returns `"status": "degraded"` with database error
- Backend logs show `psycopg2.OperationalError` or connection refused errors

**Diagnostics:**

```bash
# Check if PostgreSQL is running
docker ps | grep aicrm-db

# Test database connectivity
docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT 1"

# Check backend logs for connection errors
docker logs aicrm-backend --tail 50 | grep -i "database\|postgres\|psycopg"

# Check readiness endpoint
curl http://localhost:9000/api/health/ready
```

**Common causes:**

- **Database container not started:** `docker start aicrm-db`
- **Database still initializing:** PostgreSQL can take 10-30 seconds to start. Wait or restart backend.
- **Wrong credentials:** Verify DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD environment variables.
- **Network issue:** Containers must be on the same Docker network.

### Migration Failure

**Symptoms:**

- Backend logs show `[startup] ERROR: Database migrations failed`
- Backend process exits with non-zero code
- Error references a specific migration file or SQL error

**Diagnostics:**

```bash
# View migration error details
docker logs aicrm-backend --tail 100 | grep -A 20 "migration"

# Check current migration version
docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT version_num FROM alembic_version"

# Check migration history
docker exec aicrm-backend alembic history
docker exec aicrm-backend alembic current
```

**Common causes:**

- **Stale schema:** Database was modified outside of migrations. Inspect with `alembic current` and `alembic heads`.
- **Conflicting migrations:** Two HEAD revisions exist. Resolve with `alembic merge head`.
- **Missing migration:** New code references tables not yet created. Create the migration with `alembic revision -m "description"` and write its steps by hand.
- **Permission issue:** PostgreSQL user lacks CREATE/ALTER privileges.

**Recovery:**

```bash
# If safe to stamp (schema manually matches a known revision)
docker exec aicrm-backend alembic stamp <revision>

# Re-run migrations
docker exec aicrm-backend alembic upgrade head
```

### Authentication Failures

**Symptoms:** Frontend shows "You must sign in to perform this action" or API returns 401.

**Diagnostics:**

```bash
# Check auth-related log lines
docker logs aicrm-backend --tail 50 | grep -i "auth\|token\|401"
```

**Auth failure types (check backend logs):**

| Log message | Meaning | Resolution |
|---|---|---|
| `auth: unauthenticated access attempt` | No valid token provided (logged for every 401) | User needs to log in |
| `auth: missing Authorization header` / `auth: malformed Authorization header` | Header absent or not `Bearer <token>` | Send a Bearer token |
| `auth: JWT validation failed — token expired` | Token expired | Log in again |
| `auth: JWT validation failed — <reason>` | Token is invalid (bad signature, malformed, missing claim) | Clear the stored token (sessionStorage), log in again |
| `auth: JWT signature verification failed — no matching key in JWKS` | Token `kid` not in the IdP key set | Check AUTH_JWKS_URL points at the right IdP |
| `auth: JWT validation failed — invalid issuer` | Issuer mismatch | Check AUTH_ISSUER config |
| `auth: JWT validation failed — invalid audience` | Audience mismatch | Check AUTH_AUDIENCE config |
| `auth: failed to fetch JWKS — <error>` | Can't reach auth provider | Check network and AUTH_JWKS_URL |
| `auth: dev token mismatch` / `auth: unknown dev token suffix '<suffix>'` | Dev mode: token does not match `AUTH_DEV_TOKEN` | Use the configured dev token |
| `auth: unsupported AUTH_MODE=<value> — failing closed` | AUTH_MODE is neither `development` nor `production` | Fix AUTH_MODE |

**Auth configuration:**

- `AUTH_MODE=development`: Accepts only a bearer token matching `AUTH_DEV_TOKEN` (optionally suffixed `:admin` or `:user`)
- `AUTH_MODE=production`: Validates real JWTs against JWKS endpoint
- Unknown AUTH_MODE values fail closed with no silent fallback: the backend still starts, but every token is rejected and protected routes return 401

**Common causes:**

- **Expired token:** Normal. User logs in again.
- **Stale token in browser:** Clear the browser's sessionStorage (key `aicrm_token`) and log in again.
- **Auth mode misconfiguration:** Verify AUTH_MODE is "development" or "production".
- **JWKS unreachable:** Production mode requires network access to AUTH_JWKS_URL.

### Forbidden Action (403)

**Symptoms:** Frontend shows "You do not have permission to perform this action" or API returns 403.

**Diagnostics:**

```bash
# Check authorization log lines
docker logs aicrm-backend --tail 50 | grep -i "forbidden\|403\|admin"
```

The log line prefixed with `authz: forbidden` includes the user's subject, required role, and actual roles.

**Common causes:**

- **Non-admin user accessing admin features:** Expected. The `admin` role is required for the audit log, for updating settings, for most create/update/delete routes, and for reading contacts, tags, and the suppression list (see the **Admin** rows in [Available Endpoints](#available-endpoints)).
- **Token missing the `admin` role:** Authorization checks the normalized roles list (read from the claim paths in `AUTH_ROLE_CLAIMS`), not an `is_admin` claim. If the user should be admin, re-authenticate with a token that carries the `admin` role. In development mode use `<AUTH_DEV_TOKEN>:admin` or set `AUTH_DEV_ROLES=admin,user`.
- **Frontend showing admin UI to non-admin users:** Admin-only elements should be hidden. If visible, it's a frontend bug.

### Audit Write Failure

**Symptoms:**

- API mutations fail with 5xx errors (503 from the database error handler when the audit write fails with a PostgreSQL error, otherwise 500)
- Backend logs show `audit: failed to write event` (and `audit: DB write failed` from the repository layer)

**Current behavior (Option B):**
When an audit write fails, the entire business mutation fails. This ensures every persisted mutation has a corresponding audit record. See `backend/app/services/audit_service.py` for the policy rationale.

**Diagnostics:**

```bash
# Check audit-related log lines
docker logs aicrm-backend --tail 50 | grep -i "audit"

# Verify audit_log table is accessible
docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT count(*) FROM audit_log"
```

**Common causes:**

- **Audit table missing:** Run migrations (`alembic upgrade head`).
- **Database permissions:** Grant INSERT on audit_log to the application user.
- **Database disk full:** Free disk space or expand volume.

### Request ID Tracing

Every request carries a unique `X-Request-ID` (UUID), included in response headers and all backend log lines. Use this to trace a specific request:

1. Note the `X-Request-ID` from the response header or error message
2. Search logs: `docker logs aicrm-backend | grep "<request_id>"`
3. This shows the complete log trail for that request

```bash
# Example: trace a request
curl -v http://localhost:9000/api/contacts \
  -H "Authorization: Bearer dev-secret-token:admin"
# Note the X-Request-ID from response headers
# Then: docker logs aicrm-backend | grep "a1b2c3d4-..."
```

### Backend Port / Config Mismatch

**Symptoms:** Frontend can't reach backend, but backend health check works on a different port.

**Diagnostics:**

```bash
# Check what port the backend is actually listening on
docker logs aicrm-backend --tail 20 | grep "Uvicorn"

# Check frontend configuration
grep "API_BASE_URL" app/js/config.js
```

The frontend connects to the backend via `Config.API_BASE_URL`, defined in `app/js/config.js` and used by `app/js/api.js`. It defaults to the relative path `/api`, which the frontend's nginx (`app/nginx.conf`) proxies to `http://backend:9000`. To point the frontend elsewhere, set `window.AICRM_CONFIG.API_BASE_URL` before `config.js` loads; if you change the backend's container port, update the `proxy_pass` target in `app/nginx.conf` accordingly.

## Testing

### Running the Test Suite

The backend has an automated test suite covering API behavior, authentication,
authorization, audit logging, and database migrations. There are two ways to
run the tests.

#### Option 1: Containerized PostgreSQL (Recommended)

The simplest approach uses a containerized PostgreSQL test database. This
requires only Docker  —  no host PostgreSQL installation needed.

```bash
cd backend
./run_tests.sh              # run all tests
./run_tests.sh -k test_auth # pass extra pytest args
```

The script starts an ephemeral PostgreSQL container on port 5433, runs the
test suite, and tears down the container automatically. It never touches your
normal development database.

#### Option 2: Local PostgreSQL

If you have PostgreSQL running locally, you can run pytest directly:

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

The test suite uses a dedicated test database (`aicrm_test_db`) that is
created and destroyed automatically per test session. It will **never**
touch your normal development database.

### Prerequisites

**Option 1 (containerized):** Docker must be installed and accessible.

**Option 2 (local PostgreSQL):**

- PostgreSQL 12+ running and accessible at the configured `DB_HOST`/`DB_PORT`
- The configured database user must have permission to create/drop databases

### Test Categories

| Test File | Category | What It Covers |
|-----------|----------|----------------|
| `test_health_api.py` | Health | `/api/health` returns success |
| `test_auth_api.py` | Authentication | Token validation, role normalization, 401 for missing/invalid tokens |
| `test_authorization.py` | Authorization | 401 for unauthenticated, 403 for non-admin mutations, admin access succeeds |
| `test_contacts_api.py` | Domain CRUD | Full CRUD on contacts with auth/authz guards |
| `test_templates_api.py` | Domain CRUD | Full CRUD on templates with auth/authz guards |
| `test_leads_api.py` | Domain CRUD | Full CRUD on leads with auth/authz guards |
| `test_activities_api.py` | Domain CRUD | Full CRUD on activities with auth/authz guards |
| `test_settings_api.py` | Domain CRUD | Read/update settings with auth/authz guards |
| `test_audit_api.py` | Audit | Audit records written for mutations, actor identity captured, admin-only access |
| `test_migrations.py` | Migrations | Clean migration apply, core tables exist, schema correctness, downgrade/re-upgrade |
| `test_openapi_contract.py` | API contract | The generated OpenAPI schema is structurally sound |
| `test_companies_*.py`, `test_company_id_*.py`, `test_*_company_id_*.py`, `test_idx_companies_deleted_at_partial.py` | Companies | Company CRUD, soft delete, unique names, pagination, native audit trail, `company_id` links and filters on contacts and leads |
| `test_contact_consent.py`, `test_suppression_send_gate.py` | Consent and suppression | Consent flow, suppression list, unsubscribe, the send gate |
| `test_list_pagination_hardening.py` | Pagination | Defaults, caps, validation, and totals on the list endpoints |
| `test_audit_atomicity.py`, `test_transaction_scope.py` | Audit policy | A mutation whose audit write fails does not persist |
| `test_container_hardening.py` | Container hardening | Non-root users, pinned image digests, locked-down compose |
| `test_issue<N>_freeform.py`, `test_issue<N>_surgical.py` | Per-issue proving tests | One module per issue (e.g. sales goals migration, audit pagination, email transport and send-email route, UUID id validation, audit detail minimization) |

The table groups the 43 test modules in `backend/tests/`; list the directory for the exact set.

### Test Configuration Assumptions

- Tests run in **development auth mode** (`AUTH_MODE=development`) for fast, deterministic results.
- Admin and non-admin users are simulated via the development tokens `dev-secret-token:admin` and `dev-secret-token:user`.
- Before each test the `clean_database` fixture in `conftest.py` truncates the application tables it lists. `companies` and `suppressions` are not in that list.
- The test database is isolated from the production database by name.

### CI Integration

Backend CI is automated via GitHub Actions (`.github/workflows/backend-ci.yml`).
The workflow runs on every push and pull request to `main`/`master`.

**CI jobs (in the order they are defined; the workflow declares no dependencies between them, so they run independently):**

1. **Release metadata** (`release-metadata`)  —  validates `VERSION` format, changelog consistency, and drift detection (no database required)
2. **Quality gates** (`quality`)  —  Python formatting (black), linting (ruff), and shell checks (shellcheck) (no database required)
3. **Security hygiene** (`security-hygiene`)  —  dependency vulnerability scanning (pip-audit) and secret detection (gitleaks) (no database required)
4. **API contract** (`contract-check`)  —  validates `backend/openapi.json` stays in sync with the live FastAPI schema (requires backend dependencies)
5. **Backend tests** (`backend-tests`)  —  full DB-backed test suite

Two further workflows touch the backend: `.github/workflows/codeagent-merge-gate.yml` runs on pull requests and, for a PR that carries a CodeAgent PR contract, runs only that contract's proving tests (see [scripts/ca_gate/README.md](../scripts/ca_gate/README.md)); `.github/workflows/markdownlint.yml` lints the repository's Markdown files when a pull request changes a `.md` file (this README included).

**CI test path (backend-tests job):**

1. A PostgreSQL 15 service container (`postgres:15-alpine`) is started by GitHub Actions
2. Alembic migrations are applied to verify they work on a clean database
3. The full pytest suite runs against the PostgreSQL-backed test database

The CI environment uses the same test database name and credentials as the
local containerized runner, just with a native service container instead of
Docker Compose:

| Variable | CI Value |
|----------|---------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `aicrm` |
| `DB_USER` | `aicrm` |
| `DB_PASSWORD` | `change-me-in-production` |
| `AUTH_MODE` | `development` |
| `AUTH_DEV_TOKEN` | `dev-secret-token` |

**Local vs CI comparison:**

| Aspect | Local (`./run_tests.sh`) | CI (GitHub Actions) |
|--------|--------------------------|---------------------|
| PostgreSQL | Docker Compose ephemeral container | GitHub Actions service container |
| Port | 5433 | 5432 |
| Test DB | `aicrm_test_db` (created by conftest) | `aicrm_test_db` (created by conftest) |
| Migrations | Applied by conftest | Applied explicitly + by conftest |
| Test command | `python3 -m pytest tests/ -v --tb=short` | `python3 -m pytest tests/ -v --tb=short` |
| Result | Local output | PR check status |

Both paths run the same real DB-backed test suite  —  CI does not substitute a
watered-down version. Migration failures and test failures appear as distinct
CI steps for clear visibility.

## Code Quality

The backend enforces automated quality gates for Python code and shell scripts.
These run in CI as a job separate from the test suite and can be executed locally.

### Tools

| Tool | Purpose | Config |
|------|---------|--------|
| [black](https://black.readthedocs.io/) | Deterministic Python formatting | `pyproject.toml` |
| [ruff](https://docs.astral.sh/ruff/) | Fast Python linting (practical rules) | `pyproject.toml` |
| [shellcheck](https://www.shellcheck.net/) | Shell script static analysis |  —  |

### Local Commands

Run from the repository root:

```bash
# Check formatting (fails if any file needs formatting)
black --check backend/

# Auto-format all backend Python files
black backend/

# Check linting
ruff check backend/

# Auto-fix safe lint issues
ruff check backend/ --fix

# Check shell scripts
shellcheck backend/run_tests.sh backend/start.sh
```

### What the Rules Enforce

**black** enforces consistent, deterministic formatting. There are no style
arguments  —  if black says the file is wrong, run `black backend/` to fix it.

**ruff** catches practical problems including:

- Unused imports
- Undefined names
- Duplicate imports
- Obvious code simplifications
- Common bug patterns
- Import ordering (isort rules)
- Outdated syntax (pyupgrade rules)

The ruleset is intentionally modest. It focuses on catching real problems
without generating style noise. The selected rule families are `F`, `E`, `W`,
`I`, `SIM`, and `UP`, with `E501` and `SIM102` ignored. See `pyproject.toml`
(at the repository root) for the active rules.

### CI Integration

The "Quality gates" CI job runs black, ruff, and shellcheck. It is independent
of the backend test job (the workflow declares no ordering between jobs) and
does not require a database, so it completes quickly. If a PR introduces a
formatting or linting problem, this job fails regardless of the test result.

## Known Gaps and Future Work

1. End-to-end SSO login UX. The frontend (`app/js/auth.js`) has an OIDC implicit-flow redirect login and a local logout that clears the stored token; token refresh is not implemented.
2. Expand role-based access control to cover all domains uniformly (for example, reading contacts requires `admin` while reading leads does not, and creating a deal outcome does not require `admin` while creating a lead does).
3. Metrics collection and alerting (Prometheus/Grafana).
4. Automated backup and restore tooling for PostgreSQL.
5. Frontend UI automation in standing CI. Playwright specs exist under `app/tests/` and the CodeAgent merge gate runs them for pull requests that change a spec there, but `backend-ci.yml` has no frontend job.

## API Contract Discipline

AICRM treats the backend API as an explicit contract, not just a set of working routes. This section describes the contract discipline introduced in Step 27.

### Why

Backend route changes should be treated as **contract changes**, not casual implementation edits. This does not mean freezing everything forever  —  it means making changes explicit, reviewable, and less surprising.

### Request/Response Models

All migrated domain endpoints use explicit Pydantic request/response models consistently:

- **Contacts**: `ContactCreate`, `ContactUpdate`, `ContactResponse`, plus `BulkContactIds`, `BulkStatusUpdate`, `BulkOperationResult`, `DuplicateDetectionResponse`, and `ContactEmailRequest` (defined in `app/services/contact_email_service.py`)
- **Companies**: `CompanyCreate`, `CompanyUpdate`, `CompanyResponse`
- **Tags**: `TagCreate`, `TagUpdate`, `TagResponse`, `ContactTagsUpdate`
- **Suppressions**: `SuppressionCreate`, `SuppressionResponse`, `UnsubscribeRequest`, `MaySendResponse`
- **Templates**: `TemplateCreate`, `TemplateUpdate`, `TemplateResponse`
- **Leads**: `LeadCreate`, `LeadUpdate`, `LeadResponse`
- **Activities**: `ActivityCreate`, `ActivityUpdate`, `ActivityResponse`
- **Deal Outcomes**: `DealOutcomeCreate`, `DealOutcomeUpdate`, `DealOutcomeResponse`, `DealOutcomeAnalytics`
- **Sales Goals**: `SalesGoalCreate`, `SalesGoalUpdate`, `SalesGoalResponse`, `SalesGoalProgress`
- **Settings**: `SettingsUpdate`, `SettingsResponse`
- **Audit**: `AuditEventResponse`
- **Auth**: `AuthUser`, `MeResponse`, `AuthConfigResponse`
- **Health**: `HealthResponse`, `ReadinessResponse`

No inconsistent field presence across similar routes. A few routes declare no `response_model` and return plain dicts: `GET /`, `GET /api/analytics/funnel`, `GET /api/analytics/activity-trends`, `GET /api/health/version`, and `POST /api/contacts/{id}/send-email`.

### Response Shape Conventions

- **List endpoints** return raw arrays consistently (e.g., `GET /api/contacts` → `[{...}, ...]`), paged by `limit`/`offset` with the total in the `X-Total-Count` header.
- **Detail/mutation endpoints** return the authoritative record object.
- **Error responses** from route handlers use FastAPI's default `{"detail": ...}` shape. The global handlers in `app/main.py` add a `request_id` field: request validation errors return 422 with `detail`, `errors` (`field`, `message`, `type`), and `request_id`; foreign-key violations return 422, unique violations 409, other database errors 503, and unhandled exceptions 500.

### OpenAPI Schema as Contract Artifact

The OpenAPI schema generated by FastAPI is treated as a meaningful contract artifact:

- **Artifact location**: `backend/openapi.json`
- **Export script**: `scripts/export_openapi.py`
- **Regenerate**: `python3 scripts/export_openapi.py`

When you change an endpoint schema, you must regenerate and commit the contract artifact. CI will fail if the committed artifact diverges from the live schema.

### CI Enforcement

The `contract-check` CI job validates that `backend/openapi.json` stays in sync with the live FastAPI application. If a PR changes an endpoint model or route without updating the contract artifact, CI fails with a diff showing the drift.

### Developer Guidance

When making API changes:

1. Update the Pydantic models in `backend/app/models/`
2. Update route `response_model` declarations in `backend/app/api/`
3. Regenerate the contract artifact: `python3 scripts/export_openapi.py`
4. Commit both the code changes and the updated `backend/openapi.json`
5. Review the diff in `backend/openapi.json` to confirm the API surface change is intentional

### Frontend Alignment

Frontend data-source modules and the API client (`app/js/api.js`) are expected to match the now-explicit API contract. When reviewing backend changes, the committed OpenAPI schema serves as the reference for expected request/response shapes.

## Operational Ownership

The backend is the operational core of AICRM. The following expectations apply to anyone maintaining it.

### Maintenance Tasks for Backend Maintainers

| Task | Frequency | What to Do |
|------|-----------|-----------|
| Review failed CI runs | As they occur | Investigate and resolve quality gate, security hygiene, contract, or test failures |
| Review dependency hygiene | Monthly | Run `pip-audit -r backend/requirements.txt`; patch critical vulnerabilities |
| Review migration changes | Every schema change | Verify correctness, rollback safety, and data impact before merging |
| Verify environment configuration | Monthly | Confirm environment variables and auth settings have not drifted |
| Keep runbooks current | When behavior changes | Update `docs/operations/runbook.md` when new failure modes are discovered |

### Where to Find Operational Documentation

- **Runbook:** [docs/operations/runbook.md](../docs/operations/runbook.md)  —  first-response guidance for incidents
- **Support and Maintenance Model:** [docs/operations/support-maintenance-model.md](../docs/operations/support-maintenance-model.md)  —  ownership, recurring tasks, incident expectations
- **Release Process:** [docs/operations/release-process.md](../docs/operations/release-process.md)  —  version management and release workflow
- **Known Issues:** [docs/operations/known-issues.md](../docs/operations/known-issues.md)  —  track of known operational issues
