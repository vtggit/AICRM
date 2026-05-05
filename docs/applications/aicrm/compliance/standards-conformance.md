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

**Implementation notes:**

- **Backend platform**: FastAPI application serves CRUD endpoints for all domains (Contacts, Templates, Leads, Activities, Settings). All domains use backend APIs with PostgreSQL persistence.
- **Database standard**: PostgreSQL is used for `contacts`, `templates`, `leads`, `activities`, `settings`, and `audit_log` tables. Schema evolution is managed through Alembic migrations (versioned files in `backend/migrations/versions/`). A baseline migration captures the current schema state. Migrations are applied automatically during container startup via `start.sh`. The legacy schema helper in `backend/app/db/schema.py` is deprecated and retained only as reference material.
- **Authentication**: Two-mode auth is implemented (development shared token, production JWT with JWKS validation). All backend API endpoints are protected. End-to-end SSO login UX (redirect, logout, refresh) is not yet built.
- **Authorization**: Basic role-based authorization via `require_role()` dependencies. Templates, Leads, Activities, and Settings mutations require admin role. Not yet a full RBAC engine.
- **Audit logging**: All domain create/update/delete operations are recorded in a PostgreSQL `audit_log` table with actor context. Settings mutations are audited alongside other domains.
- **Observability**: Structured backend logging with per-request correlation IDs (`X-Request-ID`) is in place. Auth failures, mutation failures, and audit write failures are logged. No metrics collection, alerting, or log aggregation yet. All domains generate backend observability signals.
- **Deployment**: The application is containerized with Docker Compose (frontend, backend, PostgreSQL). Startup order is enforced via health checks and a DB readiness wait script (`start.sh`), which also runs Alembic migrations before starting the application. Configuration is environment-driven via `.env.example`. This is reproducible local/dev containerization, not yet a full CI/CD or cloud deployment pipeline.

## Target Direction

Each non-conforming area will be addressed incrementally. The application is in a stable steady state — the current frontend will remain functional as a thin client while backend infrastructure enhancements are introduced alongside it.

## Related Enterprise Standards

- Backend platform standard
- Database standard
- Identity and access management standard
- Observability and monitoring standard
- Containerized deployment standard
