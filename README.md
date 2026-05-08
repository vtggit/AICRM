# AICRM

**AI-powered Customer Relationship Management** — a backend-owned web application for managing contacts, leads, activities, and email templates.

## Architecture

AICRM is a **backend-owned application**. All business data is managed by a FastAPI backend and persisted in PostgreSQL. The frontend is a static client that communicates exclusively through the backend REST API.

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│  Static HTML/CSS/JS (app/)                       │
│  - No browser storage for business data          │
│  - All domain data loaded via backend API        │
│  - Auth state in sessionStorage (tokens only)    │
└────────────────────┬─────────────────────────────┘
                     │ REST API (JSON)
                     ▼
┌──────────────────────────────────────────────────┐
│                Backend (FastAPI)                  │
│  - Contacts  │  Leads  │  Activities             │
│  - Templates │  Settings │  Audit Log            │
│  - Auth (dev mode + JWT/IdP production mode)     │
│  - Role-based authorization                      │
│  - Structured logging with request correlation   │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL (system of record)        │
│  Tables: contacts, leads, activities,            │
│          templates, settings, audit_log          │
└──────────────────────────────────────────────────┘
```

## Quick Start — Full Stack (Docker Compose)

The fastest way to get the full stack running is with Docker Compose.

### Prerequisites

- **Docker** and **Docker Compose** (v2+)

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if you want to change defaults (database password, ports, etc.). The defaults in `.env.example` work out of the box for local development.

### 2. Start Everything

```bash
docker compose up --build
```

This starts three services in the correct order:

1. **PostgreSQL** — waits until the database is ready to accept connections
2. **Backend** — waits for PostgreSQL, runs Alembic migrations, then starts the API on port 9000
3. **Frontend** — serves the static SPA on port 8080, proxying `/api/*` requests to the backend

### 3. Open the Application

Visit **http://localhost:8080** in your browser.

### 4. Authenticate

In development mode, click the auth indicator in the header and enter the dev token (`dev-secret-token` by default, configurable via `AUTH_DEV_TOKEN` in `.env`).

## Quick Start — Manual (No Docker)

If you prefer to run components individually:

### Prerequisites

- **Python 3.10+** (backend)
- **PostgreSQL 12+** (database)

### 1. Start PostgreSQL

```bash
docker run --name aicrm-postgres \
  -e POSTGRES_DB=aicrm \
  -e POSTGRES_USER=aicrm \
  -e POSTGRES_PASSWORD=aicrm \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
export AUTH_MODE=development
export AUTH_DEV_TOKEN=dev-secret-token

# Run migrations (creates/updates database schema)
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The backend serves at `http://localhost:9000`. Migrations are applied via Alembic
before the server starts (automatically in Docker, manually above).

### 3. Open the Frontend

Open `app/index.html` in a browser, or serve it locally:

```bash
cd app
python -m http.server 8080
```

## Configuration

All configuration is driven by environment variables. See `.env.example` for the complete list of configurable values with descriptions and safe defaults.

Key categories:

| Category | Key Variables |
|----------|---------------|
| Database | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT_HOST` |
| Backend | `BACKEND_PORT_HOST`, `LOG_LEVEL`, `DEBUG`, `ENVIRONMENT` |
| Frontend | `FRONTEND_PORT_HOST` |
| CORS | `CORS_ORIGINS` (comma-separated list) |
| Auth (dev) | `AUTH_MODE=development`, `AUTH_DEV_TOKEN`, `AUTH_DEV_ROLES` |
| Auth (prod) | `AUTH_MODE=production`, `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_AUDIENCE` |

There are no hidden fallback paths — if an env var is not set, the documented default is used.

## Database and Schema Versioning

AICRM uses **Alembic** for versioned database schema management.

- Schema changes are tracked in `backend/migrations/versions/` as individual migration files.
- A baseline migration (`0001_baseline.py`) captures the current schema state.
- On container startup, `start.sh` runs `alembic upgrade head` before starting the application, ensuring the database schema is always up to date.
- Migration history is tracked in the `alembic_version` table inside PostgreSQL.
- For local development (no Docker), run `alembic upgrade head` manually inside `backend/` before starting the server.

**Developer rule:** schema changes should be introduced through new migration files — not by editing legacy schema helpers. See [backend/README.md](backend/README.md) for the full migration workflow.

## Authentication in Development

| Setting | Value | Description |
|---------|-------|-------------|
| `AUTH_MODE` | `development` | Simple shared bearer token |
| `AUTH_DEV_TOKEN` | `dev-secret-token` | The token to use in `Authorization: Bearer` header |
| `AUTH_DEV_ROLES` | `user` | Comma-separated roles assigned to the dev token |

In production mode (`AUTH_MODE=production`), the backend validates real JWTs against an external identity provider using JWKS-based signature verification. See [backend/README.md](backend/README.md) for production auth configuration.

## Project Structure

```
AICRM/
├── .env.example                  # Configuration template (copy to .env)
├── docker-compose.yml            # Full-stack container orchestration
├── app/                          # Frontend (static client)
│   ├── Dockerfile                # Frontend container (nginx)
│   ├── nginx.conf                # Nginx config (SPA + API proxy)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js                # Application entry point
│       ├── api.js                # HTTP client (fetch wrapper)
│       ├── auth.js               # Auth state management
│       ├── config.js             # Runtime configuration
│       ├── contacts-data-source.js
│       ├── leads-data-source.js
│       ├── activities-data-source.js
│       ├── templates-data-source.js
│       ├── settings-data-source.js
│       └── version.js
├── backend/                      # Backend API (FastAPI)
│   ├── Dockerfile                # Backend container
│   ├── start.sh                  # Startup script (DB wait + migrations)
│   ├── alembic.ini               # Alembic migration configuration
│   ├── migrations/               # Versioned database migrations
│   │   └── versions/             # Individual migration files
│   ├── app/
│   │   ├── main.py               # Application entry point
│   │   ├── config.py             # Configuration
│   │   ├── auth/                 # Authentication & authorization
│   │   ├── db/                   # Database connection & schema
│   │   ├── api/                  # Route modules (all domains)
│   │   ├── services/             # Business logic
│   │   ├── repositories/         # Data access (PostgreSQL)
│   │   ├── models/               # Pydantic models
│   │   └── observability/        # Logging & middleware
│   ├── requirements.txt
│   └── README.md                 # Detailed backend docs
└── docs/                         # Documentation
    └── applications/aicrm/       # Architecture, security, operations
```

## Domains

| Domain      | Description                    | API Endpoints                        |
|-------------|--------------------------------|--------------------------------------|
| Contacts    | CRM contact records            | GET/POST/PUT/DELETE `/api/contacts`  |
| Leads       | Sales lead pipeline            | GET/POST/PUT/DELETE `/api/leads`     |
| Activities  | Tasks, calls, meetings, emails | GET/POST/PUT/DELETE `/api/activities`|
| Templates   | Reusable email templates       | GET/POST/PUT/DELETE `/api/templates` |
| Settings    | Application configuration      | GET/PUT `/api/settings`              |

## Key Design Decisions

- **PostgreSQL is the system of record.** No business data lives in browser storage.
- **Frontend is a client.** It renders UI and delegates all data operations to the backend.
- **Browser storage is session-only.** Auth tokens use `sessionStorage`; theme preferences are transient.
- **Audit logging** records all mutations (create, update, delete) across all domains.
- **Request correlation** via `X-Request-ID` headers for full-stack traceability.
- **Role-based authorization** via `require_role()` and `require_any_role()` dependencies.
- **Containerized local development** via Docker Compose for reproducible startup.

## Documentation

- [Backend README](backend/README.md) — detailed backend setup, configuration, and troubleshooting
- [Deployment Architecture](docs/applications/aicrm/deployment/deployment-architecture.md) — containerized deployment model
- [Monitoring and Observability](docs/applications/aicrm/operations/monitoring-observability.md) — logging, audit, and observability
- [Standards Conformance](docs/applications/aicrm/compliance/standards-conformance.md) — enterprise standards alignment

## Testing

AICRM has an automated backend test suite covering API behavior, authentication, authorization, audit logging, and database migrations.

```bash
# Containerized PostgreSQL (recommended — no host DB needed)
cd backend
./run_tests.sh

# Or with local PostgreSQL
cd backend
pytest tests/ -v
```

The test suite uses an isolated test database (`aicrm_test_db`) that is created and destroyed per test session. It never touches your normal database.

**What is covered:**

| Category | Test Files | Coverage |
|----------|-----------|----------|
| Health | `test_health_api.py` | `/api/health` returns success |
| Authentication | `test_auth_api.py` | Token validation, role normalization, 401 for invalid tokens |
| Authorization | `test_authorization.py` | 401/403 guards on all protected routes |
| Domain CRUD | `test_contacts_api.py`, `test_templates_api.py`, `test_leads_api.py`, `test_activities_api.py`, `test_settings_api.py` | Full CRUD with auth/authz guards |
| Audit | `test_audit_api.py` | Audit records for mutations, actor identity, admin-only access |
| Migrations | `test_migrations.py` | Clean migration apply, schema correctness, downgrade/re-upgrade |

**What is not yet covered:**

- Frontend UI automation (backend coverage is the current priority)
- Performance and load testing
- Accessibility testing automation
- End-to-end SSO login flow testing

See [backend/README.md](backend/README.md) for detailed test instructions.

## Code Quality

AICRM enforces automated quality gates in CI and provides the same tools for local development.

**Tools and configuration:**

| Tool | Purpose | Config |
|------|---------|--------|
| [black](https://black.readthedocs.io/) | Python formatting (deterministic) | `pyproject.toml` |
| [ruff](https://docs.astral.sh/ruff/) | Python linting (fast, practical rules) | `pyproject.toml` |
| [shellcheck](https://www.shellcheck.net/) | Shell script sanity checks | — |

**Run locally before pushing:**

```bash
# Check formatting (no changes)
black --check backend/

# Auto-format
black backend/

# Check linting
ruff check backend/

# Auto-fix linting where safe
ruff check backend/ --fix

# Check shell scripts
shellcheck backend/run_tests.sh backend/start.sh
```

CI will reject PRs that fail any of these checks, so running them locally saves time.

## Security Hygiene

AICRM runs lightweight security checks in CI to catch common dependency and secret-management mistakes before merge. This is a practical hygiene layer, not a full security program.

**What is checked:**

| Check | Tool | Purpose |
|-------|------|---------|
| Python dependency audit | [pip-audit](https://github.com/pypa/pip-audit) | Known-vulnerability scanning for backend dependencies |
| Secret-pattern scanning | [gitleaks](https://github.com/gitleaks/gitleaks) | Accidental committed API keys, tokens, and credentials |

**Run locally before pushing:**

```bash
# Audit Python dependencies for known vulnerabilities
pip install pip-audit
pip-audit -r backend/requirements.txt

# Scan for accidentally committed secrets
# (install gitleaks: https://github.com/gitleaks/gitleaks#installing)
gitleaks detect --source="." --no-git --verbose -c .gitleaks.toml
```

CI will reject PRs that introduce vulnerable dependencies or commit obvious secret patterns. The gitleaks configuration (`.gitleaks.toml`) excludes documentation and template files that intentionally contain example values.

## Continuous Integration

Backend CI runs automatically on every push and pull request via GitHub Actions.

**Workflow:** [`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml)

**What CI verifies before merge:**

1. **Release metadata** — `VERSION` format, changelog consistency, and drift detection (no database required)
2. **Quality gates** — Python formatting (black), linting (ruff), and shell script checks (shellcheck) run first and fail fast without requiring a database
3. **Security hygiene** — Python dependency vulnerability scanning (pip-audit) and secret-pattern scanning (gitleaks) run without a database
4. **API contract** — validates the committed OpenAPI schema artifact (`backend/openapi.json`) stays in sync with the live FastAPI application
5. **Migrations apply cleanly** — Alembic migrations run against a fresh PostgreSQL database
6. **Full backend test suite passes** — auth, authz, CRUD, audit, migration, and contract tests all run against a real PostgreSQL-backed database

Three independent CI jobs run in parallel after checkout: quality gates, security hygiene, and backend tests. This means formatting/linting problems and dependency issues are caught quickly without waiting for a database to start.

```
Push or open PR
  → GitHub Actions starts automatically
    → Quality gates run (black, ruff, shellcheck)
    → Security hygiene runs (pip-audit, gitleaks)
    → PostgreSQL service container launches
      → Migrations are validated
        → Backend test suite runs
          → Pass/fail is visible in the PR check
```

See [Testing Strategy](docs/applications/aicrm/testing/testing-strategy.md) for the full testing approach.

## Versioning and Releases

AICRM uses a single application version for the entire project, following semantic versioning conventions.

**Current version:** see [`VERSION`](VERSION) at the repository root.

### Versioning Model

- **Major**: breaking architectural or behavioral changes
- **Minor**: meaningful feature or domain capability additions
- **Patch**: fixes, polish, and non-breaking improvements

The frontend and backend share one version because they are a single application.

### Where Version Lives

- **Source of truth:** `VERSION` file at repo root
- **Backend:** reads from `VERSION` at startup (overridable via `APP_VERSION` env var)
- **Frontend:** fetches version from backend `/api/health` at runtime
- **Release notes:** [`CHANGELOG.md`](CHANGELOG.md) at repo root

### How to Verify the Running Version

```bash
# Backend health endpoint
curl http://localhost:9000/api/health
# → {"status": "ok", "app_version": "0.1.0", "service": "aicrm-backend"}
```

When `GIT_SHA` and/or `BUILD_TIMESTAMP` environment variables are set (e.g. in CI or container builds), the health endpoint also includes traceability metadata:

```json
{
  "status": "ok",
  "app_version": "0.1.0",
  "service": "aicrm-backend",
  "git_sha": "abc1234",
  "build_timestamp": "2025-01-15T10:30:00Z"
}
```

The frontend also displays the version in the sidebar footer and Settings page.

### How to Bump the Version

1. Update the version in `VERSION` (e.g., `0.1.0` → `0.2.0`)
2. Add a new section to `CHANGELOG.md` with the new version, date, and summary of changes
3. Commit both changes together with a message like `chore: bump version to 0.2.0`
4. Tag the release: `git tag -a v0.2.0 -m "Release v0.2.0"`

**CI enforces release metadata consistency.** If you change `VERSION` without also updating `CHANGELOG.md`, CI will fail. The version format is also validated automatically (must be `MAJOR.MINOR.PATCH`). See [docs/operations/release-process.md](docs/operations/release-process.md) for the full release workflow and which checks are automated vs manual.

### Release Metadata Validation

CI validates the following before merge:

| Check | Tool | Enforced By |
|-------|------|-------------|
| `VERSION` file exists and is non-empty | `scripts/check_release_metadata.py` | CI job: `release-metadata` |
| `VERSION` format is `MAJOR.MINOR.PATCH` | `scripts/check_release_metadata.py` | CI job: `release-metadata` |
| `CHANGELOG.md` exists | `scripts/check_release_metadata.py` | CI job: `release-metadata` |
| Version appears in changelog (or `[Unreleased]` section exists) | `scripts/check_release_metadata.py` | CI job: `release-metadata` |
| If `VERSION` changes in a PR, `CHANGELOG.md` must also change | `scripts/check_release_metadata.py` | CI job: `release-metadata` |

Run the check locally:

```bash
python3 scripts/check_release_metadata.py
```

## API Contract Discipline

AICRM treats the backend API as an explicit contract. All domain endpoints use explicit Pydantic request/response models. A committed OpenAPI schema artifact (`backend/openapi.json`) serves as the authoritative contract document, and CI validates that it stays in sync with the live application to prevent silent backend/frontend drift.

### Frontend Contract Consumption

The frontend consumes the governed API through a centralized, deliberate pattern:

- **`app/js/api.js`** is the single contract boundary. It handles all HTTP execution, auth header injection, JSON parsing, error classification (auth/validation/network/server), and response-shape validation.
- **Domain data-source files** (`*-data-source.js`) are thin wrappers that call `ApiClient` methods and normalize entity shapes (e.g., `snake_case` → `camelCase`). They should not call `fetch()` directly or reinvent error handling.
- **`app/js/auth.js`** consumes `/api/auth/me` through a centralized parser with explicit response-shape expectations.
- **`ApiError`** is a normalized error class used across all domains. Every API failure flows through `ApiError.fromResult()` so the UI can inspect `status`, `type`, and `message` consistently.
- **Response-shape validators** (`assertList`, `assertEntity`, `assertObject`, `assertAuthMe`) make frontend contract assumptions explicit. When the backend drifts, the frontend fails fast with a clear error instead of producing confusing UI bugs.

**Rules for frontend developers:**

1. Use `api.js` for all backend interactions — never call `fetch()` directly in feature code.
2. Keep domain data-source files thin (call API methods, normalize shapes, pass through errors).
3. Do not add ad hoc fetch/response parsing in feature code.
4. When the backend API contract changes: update the OpenAPI artifact, then verify the frontend API consumption layer still parses correctly.

When making API changes, regenerate the contract artifact with `python3 scripts/export_openapi.py` and commit the updated `backend/openapi.json` alongside your code changes. See [backend/README.md](backend/README.md) for full details.

## Known Gaps

1. End-to-end SSO login UX (redirect flow, logout, token refresh).
2. Role-based access control not yet applied uniformly across all domains.
3. No metrics collection or alerting (Prometheus/Grafana).
4. No automated backup/restore tooling for PostgreSQL.
5. Frontend UI automation (backend test coverage is now established).
