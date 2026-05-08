# Monitoring and Observability

## Purpose

This document captures the current state of monitoring and observability for AICRM and defines the target direction.

## Current State

- **Logging**: Structured backend logging is in place. All log lines include a timestamp, log level, logger name, and — when available — a per-request correlation ID. Key operational events are logged:
  - Auth failures (missing header, malformed token, invalid signature, wrong issuer/audience, expired token, forbidden role).
  - All domain mutation failures (create, update, delete DB errors) across Contacts, Templates, Leads, Activities, and Settings.
  - Audit write failures (with entity type, entity ID, and action context).
  - Log level is configurable via `LOG_LEVEL` environment variable (default: `INFO`).
- **Request Correlation**: Every backend request is assigned a unique `X-Request-ID` (UUID). The ID is propagated from incoming requests or generated on-the-fly, included in response headers, and embedded in all log lines for the duration of the request.
- **Audit API**: A read-only audit log endpoint (`GET /api/audit`) exposes recent mutations across all domains (Contacts, Templates, Leads, Activities, Settings — create, update, delete) with actor context and timestamps, backed by PostgreSQL.
- **Health Checks**: Two health endpoints are available:
  - `GET /api/health` — Basic liveness check. Returns service status, application version (`app_version`), and build/revision traceability metadata (`git_sha`, `build_timestamp`) when available via environment variables. Docker Compose health checks poll this endpoint.
  - `GET /api/health/ready` — Readiness check with dependency status. Includes a `dependencies` object reporting database connectivity. Returns `"status": "degraded"` if the database is unreachable, even though the process is running. The frontend uses this at startup to detect backend availability.
- **Failure Handling**: The application handles common runtime failure modes with clear behavior:
  - **Backend unavailable**: Frontend shows a "Backend server is unreachable" banner at startup. All API requests fail with a clear "service temporarily unavailable" message.
  - **Database unavailable**: Health readiness reports degraded status. API requests return 503 with a meaningful error. Backend startup fails clearly if DB is unreachable within 60 seconds.
  - **Migration failure**: Backend startup stops with a clear `[startup] ERROR: Database migrations failed` log line. The process exits with a non-zero code.
  - **Auth failures**: Distinguished between 401 (unauthenticated) and 403 (forbidden). Backend logs include specific failure reasons (expired token, invalid signature, issuer/audience mismatch, JWKS fetch failure). Frontend shows appropriate user-facing messages.
  - **Audit write failure**: Policy is Option B — audit failure causes the entire business mutation to fail, ensuring audit completeness. See `backend/app/services/audit_service.py` for rationale.
- **Containerized Runtime**: The application runs as three Docker containers (frontend, backend, db) orchestrated by `docker-compose.yml`. All containers write logs to stdout, which Docker captures and can be inspected with `docker compose logs`.
- **Monitoring**: No uptime monitoring, performance monitoring, or application performance monitoring (APM).
- **Alerting**: No alerting mechanism. No automated incident response.
- **Metrics**: No Prometheus metrics, custom counters, or dashboards yet.
- **Backup/Recovery**: Manual only. Database data is persisted in a Docker named volume (`aicrm-postgres-data`). No automated PostgreSQL backups, retention policies, or recovery procedures.
- **Schema Versioning**: Database schema changes are managed through Alembic migrations. Migration execution is part of the container startup sequence (`start.sh` runs `alembic upgrade head`). Migration history is tracked in the `alembic_version` table. Migration failures during startup will prevent the backend from starting, which is visible via container logs.
- **Domain-Specific Observability**:
  - **Contacts, Templates, Leads, Activities, Settings** (all backend-owned): Generate operational and audit-relevant backend activity. All mutations are logged and audited.

## Gaps

- No centralized log aggregation (ELK, Loki, or equivalent). Logs are written to stdout only.
- No metrics collection (request rates, error rates, latency, resource usage).
- No distributed tracing or request correlation beyond the single backend process.
- No automated backup or disaster recovery plan.
- No log shipping or log retention management.
- No automated retry or circuit breaker logic for transient failures (DB, auth provider).
- Frontend error handling is improving but not yet comprehensive for all failure modes.

## Target Direction

The target observability model will include:

- Structured logging (JSON format) at the application and API layers.
- Centralized log aggregation (ELK stack, Loki, or equivalent).
- Application metrics collection and dashboards (Prometheus, Grafana, or equivalent).
- Automated database backups with retention and recovery testing.
- Health check endpoints and uptime monitoring with alerting.
- Distributed tracing for request flow visibility across services.
- Migration testing in CI (run migrations against a clean test database before deployment).
- Full observability coverage across all business domains (Contacts, Templates, Leads, Activities, Settings).

## Steady-State Support

The application now has a documented support and maintenance model that covers:

- **Operational ownership** — defined roles for application code, backend operations, database, auth/configuration, releases, incident triage, and documentation upkeep
- **Recurring maintenance** — scheduled tasks for CI review, dependency hygiene, migration monitoring, backup verification, and documentation updates
- **Incident response expectations** — triage process, escalation guidance, and post-incident documentation workflow

Ownership and recurring maintenance are now part of steady-state operation. The application is not just built; it is maintained.

See [docs/operations/support-maintenance-model.md](../../operations/support-maintenance-model.md) for the full model, including the maintenance calendar and responsibility assignments.

## Related Enterprise Standards

- Observability and monitoring standard
- Log management and retention policy
- Backup and disaster recovery requirements
- Incident response and alerting standards
