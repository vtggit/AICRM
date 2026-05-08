# Deployment Architecture

## Purpose

This document describes how AICRM is currently deployed and defines the target deployment architecture.

## Current State

AICRM is a **three-service containerized application** consisting of a frontend, backend, and PostgreSQL database.

- **Frontend Runtime**: A static single-page application served by nginx inside a Docker container. It can also be served locally with any static file server during development.
- **Backend Runtime**: A FastAPI application (Python) in a Docker container, serving the REST API for all business domains (Contacts, Templates, Leads, Activities, Settings). It runs via `uvicorn` on port 9000 and depends on PostgreSQL.
- **Database**: PostgreSQL 15 (Alpine) running in a Docker container, backed by a named Docker volume for data persistence.
- **Data Location**: All business data lives in PostgreSQL (backend-owned). The browser uses sessionStorage only for transient auth tokens; no business data is stored client-side.
- **Deployment Method**: Three services orchestrated via Docker Compose:
  - `db` — PostgreSQL container with health check
  - `backend` — FastAPI container with DB readiness wait (`start.sh`)
  - `frontend` — nginx container serving static assets and proxying `/api/*` to the backend
- **Configuration**: All configuration is driven by environment variables with explicit defaults. A `.env.example` file documents every configurable value. No hidden fallback paths exist.
- **Startup Order**: Docker Compose enforces startup order via `depends_on` with health check conditions:
  1. `db` starts and passes `pg_isready` health check
  2. `backend` starts, `start.sh` confirms DB connectivity (up to 60s retries), runs `alembic upgrade head` to apply migrations, then uvicorn launches
  3. `frontend` starts and proxies API requests to the backend
- **Startup Failure Behavior**:
  - **DB not ready within 60s**: `start.sh` exits with a clear error message (`[startup] ERROR: PostgreSQL ... did not become ready`). The backend container stops.
  - **Migration failure**: `start.sh` exits with a clear error (`[startup] ERROR: Database migrations failed`). The backend container stops. Logs include the migration error details.
  - **Auth misconfiguration**: Unknown `AUTH_MODE` values cause immediate startup failure with a descriptive error. No silent fallback to development mode.
- **Health and Readiness**:
  - `GET /api/health` — Liveness check. Returns 200 with service status, version, and build metadata. Used by Docker Compose health checks.
  - `GET /api/health/ready` — Readiness check. Includes dependency status (database connectivity). Returns `"status": "degraded"` if database is unreachable.
- **Frontend Startup Behavior**: The frontend checks backend availability at page load via the health endpoint. If the backend is unreachable, a "Backend server is unreachable" banner is displayed. The app continues rendering but API requests fail with clear error messages.
- **Runtime Failure Behavior**:
  - **Database becomes unavailable**: API requests return 503 with a meaningful error. Readiness endpoint reports degraded status. No automatic retry logic yet.
  - **Auth provider unreachable** (production mode): Token validation fails with a clear 401. Backend logs include the JWKS fetch error.
  - **Audit write failure**: Business mutation fails entirely (Option B policy). See `backend/app/services/audit_service.py` for rationale.
- **Operational Documentation**: A practical runbook exists at `docs/operations/runbook.md` with first-response guidance for common incidents (backend not starting, DB failure, migration failure, auth failure, etc.).
- **Schema Versioning**: Managed by Alembic. Migration files live in `backend/migrations/versions/`. A baseline migration (`0001_baseline.py`) captures the current schema state. On every container start, `start.sh` runs `alembic upgrade head` to ensure the database schema is current. Migration history is tracked in the `alembic_version` table. New schema changes are introduced through versioned migration files — not by editing legacy schema helpers.
- **Auth Path**: All backend API endpoints require a valid JWT. The frontend includes auth helpers (`js/auth.js`) that read the token from sessionStorage and attach it to API requests.

### Container Layout

```
┌─────────────────────────────────────────────┐
│  docker-compose.yml                         │
│                                             │
│  ┌──────────┐    ┌──────────┐              │
│  │ frontend │───▶│ backend  │              │
│  │ (nginx)  │    │ (FastAPI)│───┐          │
│  │ :8080    │    │ :9000    │   │          │
│  └──────────┘    └──────────┘   │          │
│                                  ▼          │
│                          ┌──────────┐       │
│                          │    db    │       │
│                          │ (Postgres)│      │
│                          │ :5432    │       │
│                          └──────────┘       │
└─────────────────────────────────────────────┘
```

## Configuration Model

All runtime values are controlled via environment variables. The `.env.example` file at the repository root is the single source of truth for configuration documentation.

| Category | Key Variables |
|----------|---------------|
| Database | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT_HOST` |
| Backend | `BACKEND_PORT_HOST`, `LOG_LEVEL`, `DEBUG`, `ENVIRONMENT` |
| Frontend | `FRONTEND_PORT_HOST` |
| CORS | `CORS_ORIGINS` (comma-separated list) |
| Auth (dev) | `AUTH_MODE=development`, `AUTH_DEV_TOKEN`, `AUTH_DEV_ROLES` |
| Auth (prod) | `AUTH_MODE=production`, `AUTH_ISSUER`, `AUTH_CLIENT_ID`, `AUTH_AUDIENCE` |

No secrets are committed. Developers copy `.env.example` to `.env` and adjust values as needed.

## Gaps

- No CI/CD pipeline for automated build, test, and deployment.
- No environment separation (dev, staging, production) beyond local `.env` customization.
- No infrastructure-as-code or deployment manifests for cloud platforms.
- No rolling update strategy or zero-downtime deployment.
- No automated backup/restore tooling for PostgreSQL.
- No metrics collection or alerting (Prometheus/Grafana).
- No automated retry or circuit breaker logic for transient dependency failures.
- Frontend error handling covers major failure classes but is not yet exhaustive for all edge cases.

## Target Direction

The target deployment will introduce:

- CI/CD pipeline for automated testing and deployment.
- Environment separation with configuration management (dev, staging, production).
- Centralized database deployment (managed PostgreSQL or equivalent).
- Identity provider deployment (Keycloak or equivalent).
- Infrastructure-as-code for reproducible cloud environments.
- Migration testing strategy (run migrations against a test database in CI).
- Metrics collection, alerting, and log aggregation.

## Related Enterprise Standards

- Containerized deployment standard
- CI/CD pipeline requirements
- Environment management policy
- Infrastructure-as-code guidelines
