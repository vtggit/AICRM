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
- **Health Checks**: A basic `GET /api/health` endpoint is available. Docker Compose uses a health check on the backend container that polls this endpoint.
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
- No health check endpoints beyond the basic `/api/health` ping.
- No log shipping or log retention management.
- No migration testing strategy (migrations are applied at startup but not tested against a clean database in CI).

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

## Related Enterprise Standards

- Observability and monitoring standard
- Log management and retention policy
- Backup and disaster recovery requirements
- Incident response and alerting standards
