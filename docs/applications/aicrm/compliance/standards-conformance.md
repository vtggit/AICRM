# Standards Conformance

## Purpose

This document tracks AICRM's conformance against enterprise standards and identifies areas requiring migration.

## Current State

AICRM is a **fully backend-owned** application. All business domains (Contacts, Templates, Leads, Activities, and Settings) are backend-backed with auth, audit, and observability. Conformance is consistent across all domains.

## Conformance Status

This section distinguishes between **conformance by decision** (the application has formally adopted the enterprise standard via ADR) and **conformance by implementation** (the standard is technically in place).

| Standard Area | Current State | Decision Status | Implementation Status | Target |
|---|---|---|---|---|
| Backend platform | FastAPI backend running (all domains) | Conforms via ADR-0002 | Conforming | Enterprise default backend approach |
| Database standard | PostgreSQL for all domains + audit | Conforms via ADR-0003 | Conforming | Enterprise default relational database |
| Authentication provider | JWT validation (dev + production modes) | Conforms via ADR-0004 | Partially conforming | Enterprise default identity and authentication approach |
| Authorization | Basic role-based (admin/user) | No formal adoption yet | Partially conforming | Full RBAC per enterprise IAM standard |
| Audit logging | All domain mutations audited to PostgreSQL | No formal adoption yet | Conforming | Comprehensive audit across all domains |
| Observability | Structured logs + request IDs | No formal adoption yet | Partially conforming | Structured logs/metrics/alerting |
| Deployment standard | Containerized via Docker Compose | No formal adoption yet | Partially conforming | Containerized deployment |
| Testing | Automated backend test suite with CI (pytest + GitHub Actions) | No formal adoption yet | Conforming | Full test coverage with CI/CD quality gates |
| Code quality | Automated quality gates in CI (black, ruff, shellcheck) | No formal adoption yet | Conforming | Repo hygiene enforced by CI |
| Security hygiene | Dependency vulnerability scanning + secret detection in CI (pip-audit, gitleaks) | No formal adoption yet | Conforming | Supply-chain and secret-leak prevention |
| Version and release management | Single shared app version via VERSION file, changelog, health endpoint exposure, CI-enforced metadata consistency | No formal adoption yet | Conforming | Versioned releases with traceability |
| API contract governance | Explicit Pydantic request/response models, committed OpenAPI schema artifact, CI drift detection, consistent response conventions | No formal adoption yet | Conforming | Governed API surface with visible contract changes |

**Implementation notes:**

- **Backend platform**: FastAPI application serves CRUD endpoints for all domains (Contacts, Templates, Leads, Activities, Settings). All domains use backend APIs with PostgreSQL persistence.
- **Database standard**: PostgreSQL is used for `contacts`, `templates`, `leads`, `activities`, `settings`, and `audit_log` tables. Schema evolution is managed through Alembic migrations (versioned files in `backend/migrations/versions/`). A baseline migration captures the current schema state. Migrations are applied automatically during container startup via `start.sh`. The legacy schema helper in `backend/app/db/schema.py` is deprecated and retained only as reference material.
- **Authentication**: Two-mode auth is implemented (development shared token, production JWT with JWKS validation). All backend API endpoints are protected. End-to-end SSO login UX (redirect, logout, refresh) is not yet built.
- **Authorization**: Basic role-based authorization via `require_role()` dependencies. Templates, Leads, Activities, and Settings mutations require admin role. Not yet a full RBAC engine.
- **Audit logging**: All domain create/update/delete operations are recorded in a PostgreSQL `audit_log` table with actor context. Settings mutations are audited alongside other domains.
- **Observability**: Structured backend logging with per-request correlation IDs (`X-Request-ID`) is in place. Auth failures, mutation failures, and audit write failures are logged. No metrics collection, alerting, or log aggregation yet. All domains generate backend observability signals.
- **Deployment**: The application is containerized with Docker Compose (frontend, backend, PostgreSQL). Startup order is enforced via health checks and a DB readiness wait script (`start.sh`), which also runs Alembic migrations before starting the application. Configuration is environment-driven via `.env.example`. This is reproducible local/dev containerization, not yet a full CI/CD or cloud deployment pipeline.
- **Testing**: Automated backend test suite using pytest with httpx covers API behavior, authentication, authorization, audit logging, and database migrations. Tests use an isolated test database (`aicrm_test_db`) and development-mode auth tokens. The suite includes 10 test modules covering health checks, auth/authz, CRUD operations for all 5 domains, audit record verification, and migration apply/downgrade/re-upgrade cycles. Backend CI runs automatically via GitHub Actions on every push and pull request, executing the same DB-backed test suite (migration validation + full pytest run) against a PostgreSQL service container. Migration and test failures block the CI check, making regressions visible before merge. Frontend UI automation exists but is lighter than backend coverage.
- **Code quality**: CI enforces automated quality gates beyond runtime tests. Python formatting is checked with black, linting with ruff (unused imports, undefined names, simplifications, common bug patterns), and shell scripts with shellcheck. Quality gates run in a dedicated CI job without requiring a database, so they complete quickly and fail fast. Configuration lives in `pyproject.toml`. Developers can run the same checks locally before pushing.
- **Security hygiene**: CI enforces lightweight security checks in a dedicated job before the test suite. Python dependencies are scanned for known vulnerabilities using pip-audit against `backend/requirements.txt`. Secret-pattern scanning with gitleaks detects accidentally committed API keys, tokens, and credentials across the repository. Both checks run without a database and fail fast. Documentation and template files containing example values are excluded via `.gitleaks.toml`. Developers can run the same checks locally before pushing.
- **Version and release management**: The application uses a single shared version defined in the `VERSION` file at repo root. The backend reads this file at startup (with `APP_VERSION` env var override) and exposes it via `GET /api/health`. The frontend fetches the version from the backend at runtime, preventing version drift. Release notes are tracked in `CHANGELOG.md`. CI enforces release metadata consistency through a dedicated `release-metadata` job that validates version format (`MAJOR.MINOR.PATCH`), changelog existence, version-changelog cross-reference consistency, and PR-level drift detection (VERSION changes require CHANGELOG.md changes). Runtime traceability is supported via optional `GIT_SHA` and `BUILD_TIMESTAMP` environment variables that are exposed through the health endpoint. Tagging and full release automation remain manual.
- **API contract governance**: All migrated domain endpoints use explicit Pydantic request/response models consistently (create/update/response models per domain). Response shapes follow stable conventions: list endpoints return raw arrays, detail/mutation endpoints return authoritative record objects. The OpenAPI schema generated by FastAPI is exported to a committed artifact (`backend/openapi.json`) via `scripts/export_openapi.py`. CI runs a dedicated `contract-check` job that generates the schema from the live application and compares it to the committed artifact — failing if they diverge. Contract-oriented tests in `test_openapi_contract.py` verify that OpenAPI generation succeeds and critical paths are registered. Backend route changes are now treated as contract changes that require regenerating and committing the OpenAPI artifact. **Frontend contract consumption is deliberate and centralized**: `api.js` serves as the single frontend contract boundary with normalized error handling (`ApiError` class), response-shape validators (`assertList`, `assertEntity`, `assertObject`, `assertAuthMe`), and centralized auth header injection. Domain data-source files are thin wrappers that consume `ApiClient` methods and use `ApiError.fromResult()` for consistent error handling. Auth response parsing is centralized in `auth.js` via `assertAuthMe()`. Backend drift now fails fast in the frontend with clear errors instead of producing confusing UI bugs.

## Target Direction

Each non-conforming area will be addressed incrementally. The application is in a stable steady state — the current frontend will remain functional as a thin client while backend infrastructure enhancements are introduced alongside it.

## Related Enterprise Standards

- Backend platform standard
- Database standard
- Identity and access management standard
- Observability and monitoring standard
- Containerized deployment standard
