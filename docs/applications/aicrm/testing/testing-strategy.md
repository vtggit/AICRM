# Testing Strategy

## Purpose

This document describes the current testing approach for AICRM and defines the target testing strategy.

## Current State

### Backend Tests (Automated)

AICRM has a comprehensive automated backend test suite built with **pytest**, covering the entire backend-owned architecture.

**Test Infrastructure:**

- **Framework**: pytest with httpx for async HTTP testing
- **Database**: Isolated test database (`aicrm_test_db`) created/destroyed per test session
- **Auth**: Development-mode tokens simulate admin and non-admin users
- **Fixtures**: Centralized in `backend/tests/conftest.py` with per-test table truncation

**Test Structure:**

```
backend/tests/
├── conftest.py              # Shared fixtures (DB, app, auth tokens)
├── test_health_api.py       # Health endpoint tests
├── test_auth_api.py         # Authentication tests
├── test_authorization.py    # Authorization tests
├── test_contacts_api.py     # Contacts CRUD tests
├── test_templates_api.py    # Templates CRUD tests
├── test_leads_api.py        # Leads CRUD tests
├── test_activities_api.py   # Activities CRUD tests
├── test_settings_api.py     # Settings CRUD tests
├── test_audit_api.py        # Audit logging tests
└── test_migrations.py       # Migration tests
```

**Coverage by Category:**

| Category | Test File | What It Verifies |
|----------|-----------|-----------------|
| Health | `test_health_api.py` | `/api/health` returns success; app starts with test config |
| Authentication | `test_auth_api.py` | `/api/auth/me` returns 401 without token; valid token returns user context; invalid token returns 401; role/group normalization |
| Authorization | `test_authorization.py` | Unauthenticated → 401; non-admin mutation → 403; admin mutation → success; all protected routes covered |
| Contacts CRUD | `test_contacts_api.py` | Full CRUD lifecycle; validation; auth/authz guards |
| Templates CRUD | `test_templates_api.py` | Full CRUD lifecycle; category defaults; auth/authz guards |
| Leads CRUD | `test_leads_api.py` | Full CRUD lifecycle; stage/value defaults; auth/authz guards |
| Activities CRUD | `test_activities_api.py` | Full CRUD lifecycle; status defaults; validation; auth/authz guards |
| Settings CRUD | `test_settings_api.py` | Read/update; payload merging; admin-only mutations |
| Audit | `test_audit_api.py` | Audit records written for all mutations; actor identity captured; admin-only access to audit log; timestamps present |
| Migrations | `test_migrations.py` | Clean migration apply; core tables exist; schema correctness; downgrade/re-upgrade cycle |

**Running Tests:**

Two options are available:

```bash
# Option 1: Containerized PostgreSQL (recommended — no host DB needed)
cd backend
./run_tests.sh

# Option 2: Local PostgreSQL
cd backend
pytest tests/ -v
```

The containerized approach (`./run_tests.sh`) starts an ephemeral PostgreSQL
container on port 5433, runs the test suite, and tears down the container
automatically. It requires only Docker — no host PostgreSQL installation.

### CI Automated Verification

Backend CI runs automatically via GitHub Actions
(`.github/workflows/backend-ci.yml`) on every push and pull request.

**CI execution path:**

1. **Quality gates** — Python formatting (black), linting (ruff), and shell script checks (shellcheck) run first in a dedicated job. This job requires no database and fails fast.
2. **Backend tests** — A PostgreSQL 15 service container is provisioned by GitHub Actions.
3. Alembic migrations are applied to a clean database to verify migration correctness.
4. The full pytest suite runs against the PostgreSQL-backed test database, exercising auth, authz, CRUD, audit, and migration tests.

CI enforces code quality gates in addition to runtime correctness. If a PR
introduces formatting problems, unused imports, or shell script issues, CI
rejects it before the test suite even starts.

CI uses the same real DB-backed test suite as the local runner — it does not
substitute a watered-down path. Quality gate failures, migration failures, and
test failures are all reported as distinct CI steps so the root cause is
immediately visible.

The test database (`aicrm_test_db`) is created and destroyed by the
session-scoped conftest fixture, the same way it works locally.

### E2E Tests (Frontend)

Playwright-based end-to-end tests exist in `docs/testing/`. Tests cover features such as activity due-date tracking, backup/restore, CSV import/export, email templates, keyboard shortcuts, lead scoring, revenue summary, and version display.

### Unit Tests

Backend service/repository unit tests are selectively added where they provide clear value (e.g., validation/normalization behavior). API-level tests are the primary test layer.

### Integration Tests

The backend test suite serves as the integration test layer — every test exercises the full stack from HTTP request through service layer to PostgreSQL.

### Test Execution

- **Backend (local)**: `./run_tests.sh` (containerized PostgreSQL, recommended) or `pytest tests/ -v` (local PostgreSQL)
- **Backend (CI)**: Runs automatically via GitHub Actions on push/PR — same DB-backed test suite as local
- **Frontend E2E**: Run against the browser-rendered application. Screenshots and result JSON files are stored in `test-results/`.

## Gaps

- No unit test coverage for business logic in `app.js` or the frontend data-source modules.
- No performance or load testing.
- No accessibility testing automation.
- Frontend UI automation is lighter than backend coverage.
- No test coverage reporting (quality gates currently cover formatting/linting, not coverage thresholds).

## Target Direction

The target testing strategy will include:

- Continued expansion of backend API tests as new endpoints are added.
- Frontend UI automation expanded to cover critical user workflows.
- CI/CD quality gates with coverage thresholds (CI already runs automated backend verification).
- Accessibility testing as part of the test suite.
- Performance and load testing for the backend API.
- End-to-end SSO login flow testing.

## Related Enterprise Standards

- Software testing standard
- Test coverage requirements
- CI/CD quality gate policy
- Accessibility testing requirements
