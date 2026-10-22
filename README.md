# AICRM

**AI-powered Customer Relationship Management** — a backend-owned web application for managing contacts, companies, leads, activities, email templates, sales goals, and win/loss outcomes.
This software has always been and is intended to be 100 percent AI coded. Its original and ongoing purpose is to test AI software development systems.
However, in this role a full featured CRM has been created.

## License

This project is source-available proprietary software.

You may view this repository and use the software for your own internal purposes, but you may not modify it, distribute it, sublicense it, sell it, or offer it as a hosted or managed service. It is development and demonstration software, is not intended for production use, and is provided without warranty or any support commitment.

See [LICENSE](./LICENSE) for the full license terms.

## Architecture

AICRM is a **backend-owned application**. All business data is managed by a FastAPI backend and persisted in PostgreSQL. The frontend is a static client that communicates exclusively through the backend REST API.

```text
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
│  - Contacts │ Companies │ Leads │ Activities     │
│  - Templates │ Tags │ Settings │ Audit Log       │
│  - Deal Outcomes │ Sales Goals │ Analytics       │
│  - Suppressions (send gate) │ Email (SMTP)       │
│  - Auth (dev mode + JWT/IdP production mode)     │
│  - Role-based authorization                      │
│  - Structured logging with request correlation   │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│              PostgreSQL (system of record)        │
│  Tables: contacts, companies, leads, activities, │
│          templates, settings, audit_log,         │
│          contact_tags, contact_tag_mapping,      │
│          deal_outcomes, sales_goals,             │
│          contact_consent, suppressions           │
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

This starts the three application services in the correct order:

1. **PostgreSQL** — waits until the database is ready to accept connections
2. **Backend** — waits for PostgreSQL, runs Alembic migrations, then starts the API on port 9000
3. **Frontend** — serves the static SPA on port 8080, proxying `/api/*` requests to the backend. Every page, script, stylesheet and image is sent with `Cache-Control: no-cache`, so a browser picks up a new deploy on its next request instead of running a cached old script

`docker-compose.yml` also defines a fourth service, `test-db` (an ephemeral PostgreSQL on host port 5433 used by `backend/run_tests.sh`). It has no compose profile, so a plain `docker compose up` starts it as well.

### 3. Open the Application

Visit **<http://localhost:8080>** in your browser.

### 4. Authenticate

In development mode, click the auth indicator in the sidebar footer (or the **Log In** button on the banner) and enter the dev token (`dev-secret-token` by default, configurable via `AUTH_DEV_TOKEN` in `.env`).

The bare dev token receives the roles in `AUTH_DEV_ROLES` (default `user`). The `user` role cannot create, edit, or delete most records (see Known Gaps for the exceptions) and cannot read contacts or tags, and admin-only controls are hidden in the UI. To sign in with the `admin` role, enter `dev-secret-token:admin`, or set `AUTH_DEV_ROLES=admin,user` in `.env`.

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
pip install -r requirements.txt -c constraints.txt
export AUTH_MODE=development
export AUTH_DEV_TOKEN=dev-secret-token

# Run migrations (creates/updates database schema)
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The backend serves at `http://localhost:9000`. Migrations are applied via Alembic
before the server starts (automatically in Docker, manually above).

`constraints.txt` pins the exact version of every backend package, so a local install, the
backend image and CI all get the same set. To take upgrades on purpose, run
`scripts/refresh_constraints.sh` (needs Docker), review the diff of `backend/constraints.txt`,
and open a pull request.

### 3. Open the Frontend

Serve the `app/` directory locally:

```bash
cd app
python -m http.server 8080
```

`app/js/config.js` resolves the API base URL to the relative path `/api` unless `window.AICRM_CONFIG.API_BASE_URL` is set before it loads. A plain static server does not proxy `/api` to the backend, so set the override, for example with a script block placed before `js/config.js` in `app/index.html`:

```html
<script>
  window.AICRM_CONFIG = { API_BASE_URL: 'http://localhost:9000/api' };
</script>
```

The backend's default CORS origins include `http://localhost:8080`. Under Docker Compose no override is needed, because nginx proxies `/api/*` to the backend.

## Configuration

All configuration is driven by environment variables. `.env.example` lists the values `docker-compose.yml` consumes, with descriptions and safe defaults. The backend reads further variables that are not in `.env.example`; see [backend/README.md](backend/README.md) for the full list.

Key categories:

| Category | Key Variables |
|----------|---------------|
| Database | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT_HOST` (compose); `DB_HOST`, `DB_PORT` (backend) |
| Backend | `BACKEND_PORT_HOST`, `LOG_LEVEL`, `LOG_FORMAT` (`LOG_FORMAT` is not passed to the backend container by `docker-compose.yml`) |
| Frontend | `FRONTEND_PORT_HOST` |
| CORS | `CORS_ORIGINS` (comma-separated list) |
| Auth (dev) | `AUTH_ENABLED`, `AUTH_MODE=development`, `AUTH_DEV_TOKEN`, `AUTH_DEV_ROLES` |
| Auth (prod) | `AUTH_MODE=production`, `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`, `AUTH_ALGORITHMS`, `AUTH_JWKS_CACHE_TTL`, `AUTH_ROLE_CLAIMS`, `AUTH_GROUP_CLAIMS` |
| Version and build | `APP_VERSION`, `GIT_SHA`, `BUILD_TIMESTAMP` (not passed to the backend container by `docker-compose.yml`; the container reads the version from the mounted `VERSION` file instead) |
| Email (SMTP) | `AICRM_SMTP_HOST`, `AICRM_SMTP_PORT`, `AICRM_SMTP_TLS`, `AICRM_SMTP_FROM`, `AICRM_SMTP_USERNAME`, `AICRM_SMTP_PASSWORD`, `AICRM_SMTP_CA_FILE` (not passed to the backend container by `docker-compose.yml`; sending is disabled until `AICRM_SMTP_HOST` is set) |

`DEBUG` and `ENVIRONMENT` are defined in `backend/app/config.py` but are not read anywhere else in the backend and are not passed through by `docker-compose.yml`.

There are no hidden fallback paths — if an env var is not set, the documented default is used. `AUTH_JWKS_URL` set to an empty or whitespace-only value counts as unset, so the backend derives it from the issuer (`<AUTH_ISSUER>/protocol/openid-connect/certs`); `docker-compose.yml` passes an empty value when `.env` does not set it.

## Database and Schema Versioning

AICRM uses **Alembic** for versioned database schema management.

- Schema changes are tracked in `backend/migrations/versions/` as individual migration files.
- A baseline migration (`0001_baseline.py`) captures the initial schema (contacts, leads, activities, templates, settings, audit_log). Later migrations (`0002` through `0015`) add contact tags, deal outcomes, companies (with company links on contacts and leads, soft delete, and unique names), contact consent, suppressions, and sales goals, and minimize stored audit details.
- On container startup, `start.sh` runs `alembic upgrade head` before starting the application, ensuring the database schema is always up to date.
- Migration history is tracked in the `alembic_version` table inside PostgreSQL.
- For local development (no Docker), run `alembic upgrade head` manually inside `backend/` before starting the server.

**Developer rule:** schema changes should be introduced through new migration files — not by editing legacy schema helpers. See [backend/README.md](backend/README.md) for the full migration workflow.

## Authentication in Development

| Setting | Value | Description |
|---------|-------|-------------|
| `AUTH_MODE` | `development` | Simple shared bearer token |
| `AUTH_DEV_TOKEN` | `dev-secret-token` | The token to use in `Authorization: Bearer` header |
| `AUTH_DEV_ROLES` | `user` | Comma-separated roles assigned to the bare dev token |

A role suffix on the dev token overrides `AUTH_DEV_ROLES`: `<token>:admin` yields the roles `admin` and `user`, and `<token>:user` yields `user`. Most write endpoints, and reads of contacts, tags, suppressions, and the audit log, require the `admin` role.

In production mode (`AUTH_MODE=production`), the backend validates real JWTs against an external identity provider using JWKS-based signature verification, and the frontend login redirects to the identity provider (OIDC implicit flow, using the issuer and client ID from `/api/auth/config`). See [backend/README.md](backend/README.md) for production auth configuration.

## Project Structure

```text
AICRM/
├── .env.example                  # Configuration template (copy to .env)
├── docker-compose.yml            # Full-stack container orchestration
├── VERSION                       # Application version (source of truth)
├── CHANGELOG.md                  # Release notes
├── LICENSE                       # License terms
├── pyproject.toml                # black and ruff configuration
├── package.json                  # Node dev tooling (markdownlint, Playwright)
├── .github/workflows/            # CI workflows
├── app/                          # Frontend (static client)
│   ├── Dockerfile                # Frontend container (unprivileged nginx)
│   ├── nginx.conf                # Nginx config (SPA + API proxy)
│   ├── index.html
│   ├── css/
│   │   ├── styles.css            # Base styles (light + dark themes)
│   │   ├── tokens.css            # Design tokens
│   │   ├── shell.css             # Application shell layout
│   │   ├── overview.css          # Dashboard page
│   │   ├── contacts.css          # Contacts split pane
│   │   └── companies.css, leads.css, activities.css, templates.css,
│   │       salesgoals.css, winloss.css, analytics.css  # One stylesheet per page
│   ├── js/
│   │   ├── app.js                # Application entry point
│   │   ├── api.js                # HTTP client (fetch wrapper)
│   │   ├── auth.js               # Auth state management
│   │   ├── config.js             # Runtime configuration
│   │   ├── contacts-data-source.js
│   │   ├── companies-data-source.js
│   │   ├── leads-data-source.js
│   │   ├── activities-data-source.js
│   │   ├── templates-data-source.js
│   │   ├── settings-data-source.js
│   │   ├── sales-goals-data-source.js
│   │   └── version.js
│   └── tests/                    # Playwright specs (@playwright/test) + playwright.config.js
├── backend/                      # Backend API (FastAPI)
│   ├── Dockerfile                # Backend container
│   ├── start.sh                  # Startup script (DB wait + migrations)
│   ├── run_tests.sh              # Test runner (ephemeral PostgreSQL container)
│   ├── alembic.ini               # Alembic migration configuration
│   ├── openapi.json              # Committed OpenAPI contract artifact
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
│   │   ├── email/                # Outbound email (SMTP) transport
│   │   └── observability/        # Logging & middleware
│   ├── tests/                    # pytest suite
│   ├── requirements.txt          # Direct backend dependencies
│   ├── constraints.txt           # Exact pinned versions (used by the image and CI)
│   └── README.md                 # Detailed backend docs
├── scripts/
│   ├── check_release_metadata.py # VERSION / CHANGELOG consistency check
│   ├── export_openapi.py         # Regenerates backend/openapi.json
│   ├── refresh_constraints.sh    # Regenerates backend/constraints.txt (upgrades on purpose)
│   └── ca_gate/                  # Pull request contract gate tooling
├── tests/                        # ca_gate self-tests and ad hoc browser test scripts
├── config/                       # Product vision, deployment facts, compliance capabilities
└── docs/                         # Documentation
    ├── README.md                 # Feature guide
    ├── applications/aicrm/       # Architecture, security, operations
    ├── enterprise/               # Enterprise standards and reference architectures
    ├── operations/               # Runbook, release process, support model
    ├── design/, ux/, ui-specs/   # Design system (design/design-system.md) and UI specifications
    ├── product/, roadmap/        # Requirements and enhancement backlog
    └── testing/                  # Playwright verification scripts
```

## Domains

| Domain      | Description                    | API Endpoints                        |
|-------------|--------------------------------|--------------------------------------|
| Contacts    | CRM contact records            | GET/POST/PUT/DELETE `/api/contacts`; GET `/api/contacts/duplicates`; POST `/api/contacts/bulk-delete`, `/api/contacts/bulk-update-status`, `/api/contacts/{id}/send-email` |
| Companies   | Company records (soft delete)  | GET/POST/PUT/DELETE `/api/companies` |
| Tags        | Contact tags                   | GET/POST/PUT/DELETE `/api/tags`; PUT `/api/tags/contacts/{id}/tags` |
| Leads       | Sales lead pipeline            | GET/POST/PUT/DELETE `/api/leads`; PATCH `/api/leads/{id}/stage` |
| Activities  | Tasks, calls, meetings, emails, notes | GET/POST/PUT/DELETE `/api/activities`|
| Templates   | Reusable email templates       | GET/POST/PUT/DELETE `/api/templates` |
| Deal Outcomes | Win/loss reasons for leads   | GET/POST/PATCH/DELETE `/api/deal-outcomes`; GET `/api/deal-outcomes/analytics`, `/api/deal-outcomes/leads/{lead_id}` |
| Sales Goals | Targets and progress           | GET/POST/PATCH/DELETE `/api/sales-goals`; GET `/api/sales-goals/progress`; POST `/api/sales-goals/recalculate` |
| Suppressions | Email suppression list and send gate | GET/POST/DELETE `/api/suppressions`; POST `/api/suppressions/unsubscribe`; GET `/api/suppressions/may-send` |
| Analytics   | Conversion funnel and activity trends (`range` of `7d`, `30d`, `90d` or `1y`) | GET `/api/analytics/funnel`, `/api/analytics/activity-trends` |
| Settings    | Application configuration (`PUT` merges keys; `DELETE` resets to an empty payload) | GET/PUT/DELETE `/api/settings` |
| Audit       | Audit log (admin only)         | GET `/api/audit`                     |
| Auth        | Current user and public auth configuration | GET `/api/auth/me`, `/api/auth/config` |
| Health      | Liveness, readiness, version   | GET `/api/health`, `/api/health/ready`, `/api/health/version` |

The committed OpenAPI artifact (`backend/openapi.json`) is the authoritative endpoint list.

## Key Design Decisions

- **PostgreSQL is the system of record.** No business data lives in browser storage.
- **Frontend is a client.** It renders UI and delegates all data operations to the backend.
- **Browser storage is session-only.** Auth tokens use `sessionStorage`; the theme preference is saved through the backend Settings API.
- **Audit logging** records mutations (create, update, delete) for contacts, companies, leads, activities, templates, and settings (including a settings reset, which records the removed keys without their values), plus contact email sends and unsubscribes. Tags, deal outcomes, sales goals, and direct suppression-list edits are not audit-logged.
- **Request correlation** via `X-Request-ID` headers for full-stack traceability.
- **Role-based authorization** via the `require_role()` dependency on admin-only routes and `require_authenticated_user` on routes open to any signed-in user. `require_any_role()` is also defined, but no route uses it yet.
- **One design system for every page.** `docs/design/design-system.md` sets the layout rules; under its "No endless pages" rule each page fits the window and only designated panes (a list, a table body, a detail pane) scroll.
- **Pinned dependencies.** `backend/constraints.txt` fixes every backend package version; `test_dependencies_pinned.py` checks that every requirement has an exact pin and that the image and CI install with the constraints file.
- **Containerized local development** via Docker Compose for reproducible startup.

## Documentation

- [Backend README](backend/README.md) — detailed backend setup, configuration, and troubleshooting
- [Feature Guide](docs/README.md) — frontend features and how they work
- [Application Documentation Index](docs/applications/aicrm/index.md) — current state, remaining gaps, and target direction
- [Deployment Architecture](docs/applications/aicrm/deployment/deployment-architecture.md) — containerized deployment model
- [Application Security Model](docs/applications/aicrm/security/application-security-model.md) — security model, gaps, and target direction
- [Monitoring and Observability](docs/applications/aicrm/operations/monitoring-observability.md) — logging, audit, and observability
- [Standards Conformance](docs/applications/aicrm/compliance/standards-conformance.md) — enterprise standards alignment
- [Operational Runbook](docs/operations/runbook.md) — first-response guidance for common incidents
- [Release Process](docs/operations/release-process.md) — versioning and release workflow
- [Contract Gate Tooling](scripts/ca_gate/README.md) — pull request contract gate scripts
- [Branch Protection](docs/branch-protection.md) — required checks for the contract gate

## Testing

AICRM has an automated backend test suite covering API behavior, authentication, authorization, audit logging, database migrations, and the OpenAPI contract.

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
| Audit | `test_audit_api.py`, `test_audit_atomicity.py`, `test_transaction_scope.py` | Audit records for mutations, actor identity, admin-only access, atomic audit writes |
| Migrations | `test_migrations.py` | Clean migration apply, schema correctness, downgrade/re-upgrade |
| Companies | `test_companies_*.py`, `test_company_id_*.py`, `test_idx_companies_deleted_at_partial.py`, `test_contacts_company_id_filter.py`, `test_leads_company_id_*.py` | Company CRUD, soft delete, unique names, pagination, company links on contacts and leads |
| Consent and suppression | `test_contact_consent.py`, `test_suppression_send_gate.py` | Contact consent changes, suppression list, unsubscribe, send gate |
| API contract | `test_openapi_contract.py` | Generated OpenAPI schema is structurally sound and exposes the expected components (drift against `backend/openapi.json` is caught by the CI diff check) |
| Pagination | `test_list_pagination_hardening.py` | List endpoint pagination defaults, caps, validation, and totals |
| Container hardening | `test_container_hardening.py` | Dockerfile and compose hardening settings |
| Dependency pins | `test_dependencies_pinned.py` | Every requirement has an exact pin in `constraints.txt`; the image and CI install with it |
| Issue-specific proofs | `test_issue*_freeform.py`, `test_issue*_surgical.py` | Acceptance-criteria tests tied to individual issues |

Frontend Playwright specs live in `app/tests/*.spec.js` (run with `@playwright/test`; the merge gate runs them for pull requests that change those specs), and standalone Playwright verification scripts live in `docs/testing/` (see [docs/README.md](docs/README.md)). Neither is part of the Backend CI workflow.

**What is not yet covered:**

- Frontend UI automation in the main CI workflow (frontend specs run only in the merge gate, for pull requests that change them)
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
| Python dependency audit | [pip-audit](https://github.com/pypa/pip-audit) | Known-vulnerability scanning for the pinned backend dependencies (`backend/constraints.txt`) |
| Secret-pattern scanning | [gitleaks](https://github.com/gitleaks/gitleaks) | Accidental committed API keys, tokens, and credentials |

**Run locally before pushing:**

```bash
# Audit Python dependencies for known vulnerabilities
pip install pip-audit
pip-audit -r backend/constraints.txt --no-deps --disable-pip

# Scan for accidentally committed secrets
# (install gitleaks: https://github.com/gitleaks/gitleaks#installing)
gitleaks detect --source="." --no-git --verbose -c .gitleaks.toml
```

CI will reject PRs that introduce vulnerable dependencies or commit obvious secret patterns. Because the audit checks the pinned set, an advisory published after a pin was set also fails the check, on every pull request, until the pin moves. The gitleaks configuration (`.gitleaks.toml`) excludes only `.env.example`, which holds placeholder values; documentation files such as this README are scanned.

## Continuous Integration

Backend CI runs automatically on pushes to, and pull requests targeting, `main` or `master` via GitHub Actions.

**Workflow:** [`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml)

**What CI verifies before merge:**

1. **Release metadata** — `VERSION` format, changelog consistency, and drift detection (no database required)
2. **Quality gates** — Python formatting (black), linting (ruff), and shell script checks (shellcheck) run first and fail fast without requiring a database
3. **Security hygiene** — Python dependency vulnerability scanning (pip-audit) and secret-pattern scanning (gitleaks) run without a database
4. **API contract** — validates the committed OpenAPI schema artifact (`backend/openapi.json`) stays in sync with the live FastAPI application
5. **Migrations apply cleanly** — Alembic migrations run against a fresh PostgreSQL database
6. **Full backend test suite passes** — auth, authz, CRUD, audit, migration, and contract tests all run against a real PostgreSQL-backed database

Five independent CI jobs run in parallel: release metadata (`release-metadata`), quality gates (`quality`), security hygiene (`security-hygiene`), API contract (`contract-check`), and backend tests (`backend-tests`). This means formatting/linting problems and dependency issues are caught quickly without waiting for a database to start.

```text
Push or open PR
  → GitHub Actions starts automatically
    → Release metadata is checked (VERSION, CHANGELOG)
    → Quality gates run (black, ruff, shellcheck)
    → Security hygiene runs (pip-audit, gitleaks)
    → API contract is checked (OpenAPI schema sync)
    → PostgreSQL service container launches
      → Migrations are validated
        → Backend test suite runs
          → Pass/fail is visible in the PR check
```

**Other workflows:**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [`codeagent-merge-gate.yml`](.github/workflows/codeagent-merge-gate.yml) | Pull requests | Runs the contract gate's own tests (`tests/ca_gate/`, blocking), then checks the pull request's acceptance-criteria contract against a test run (backend pytest proofs, or the Playwright specs in `app/tests/` when the pull request changes them). The check fails if a linked issue cannot be fetched |
| [`codeagent-gate-revalidate.yml`](.github/workflows/codeagent-gate-revalidate.yml) | Daily schedule, manual dispatch | Re-validates open contract-bearing pull requests against their linked issues |
| [`markdownlint.yml`](.github/workflows/markdownlint.yml) | Pull requests that change Markdown files | Lints Markdown with markdownlint-cli2 |

See [scripts/ca_gate/README.md](scripts/ca_gate/README.md) and [docs/branch-protection.md](docs/branch-protection.md) for the contract gate.

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
- **Backend:** uses the `APP_VERSION` env var if set, otherwise reads `VERSION` at startup, otherwise falls back to the in-code default `0.1.0`. The backend image is built from the `backend/` directory, which does not contain `VERSION`, so `docker-compose.yml` mounts the repository's `VERSION` file read-only into the backend container (at `/VERSION`, the path the backend looks in). The containerized backend therefore reports the version in `VERSION`.
- **Frontend:** fetches version from backend `/api/health` at runtime
- **Release notes:** [`CHANGELOG.md`](CHANGELOG.md) at repo root

### How to Verify the Running Version

```bash
# Backend health endpoint
curl http://localhost:9000/api/health
# → {"status": "ok", "app_version": "0.2.3", "service": "aicrm-backend",
#    "git_sha": null, "build_timestamp": null}
```

`git_sha` and `build_timestamp` are `null` unless the `GIT_SHA` and/or `BUILD_TIMESTAMP` environment variables are set (e.g. in CI or container builds), in which case the health endpoint reports them:

```json
{
  "status": "ok",
  "app_version": "0.2.3",
  "service": "aicrm-backend",
  "git_sha": "abc1234",
  "build_timestamp": "2025-01-15T10:30:00Z"
}
```

`GET /api/health/version` returns only `{"version": "<app_version>"}`, and `GET /api/health/ready` adds a `dependencies` list with database connectivity status.

The frontend also displays the version in the sidebar footer and on the Settings page (the sidebar stays empty and Settings reads "unavailable" if the backend cannot be reached). Beside it, the sidebar shows the signed-in user by the first non-empty value of `display_name`, `username`, `email` and `sub`.

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

AICRM treats the backend API as an explicit contract. Domain endpoints use explicit Pydantic request/response models, with a few exceptions that return untyped JSON objects (the two `/api/analytics/*` endpoints, `POST /api/contacts/{id}/send-email`, and `GET /api/health/version`). A committed OpenAPI schema artifact (`backend/openapi.json`) serves as the authoritative contract document, and CI validates that it stays in sync with the live application to prevent silent backend/frontend drift.

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

1. End-to-end SSO login UX is partial. In production auth mode the frontend redirects to the identity provider using the OIDC implicit flow; authorization code flow with PKCE, token refresh, and identity-provider logout are not implemented (logout only clears the local token).
2. Role-based access control is not uniform across domains. Most mutations require the `admin` role, but `POST /api/deal-outcomes`, `POST /api/sales-goals/recalculate`, and `POST /api/contacts/{id}/send-email` accept any authenticated user; reads of contacts, tags, suppressions, and the audit log require `admin`, while other reads need only authentication.
3. No metrics collection or alerting (Prometheus/Grafana).
4. No automated backup/restore tooling for PostgreSQL.
5. Frontend UI automation is not part of the Backend CI workflow. Playwright specs exist in `app/tests/` and verification scripts in `docs/testing/`, but the specs run only in the merge gate for pull requests that change them.
6. Audit logging does not cover tags, deal outcomes, sales goals, or direct suppression-list edits.

## Operations and Support

AICRM has a documented steady-state support and maintenance model covering:

- **Operational runbooks** — first-response guidance for common incidents
- **Release discipline** — version management, CI-enforced metadata consistency, and release workflow
- **Support and maintenance expectations** — ownership areas, recurring maintenance tasks, and incident response guidance

See [docs/operations/support-maintenance-model.md](docs/operations/support-maintenance-model.md) for the full sustainment guide.
