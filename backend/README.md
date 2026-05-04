# AICRM Backend

This folder contains the backend API for AICRM, built with **FastAPI**.

## Architecture Overview

AICRM is a **backend-owned application**. All business data — Contacts, Leads, Activities, Templates, and Settings — is managed by the backend and persisted in PostgreSQL. The frontend is a client that communicates exclusively through this API.

### Domains

All major domains are PostgreSQL-backed:

| Domain      | Status    | CRUD Endpoints                          |
|-------------|-----------|------------------------------------------|
| Contacts    | Complete  | GET/POST/PUT/DELETE `/api/contacts`      |
| Leads       | Complete  | GET/POST/PUT/DELETE `/api/leads`         |
| Activities  | Complete  | GET/POST/PUT/DELETE `/api/activities`    |
| Templates   | Complete  | GET/POST/PUT/DELETE `/api/templates`     |
| Settings    | Complete  | GET/PUT `/api/settings`                  |

### Authentication

Two modes are supported:

- **Development mode** (`AUTH_MODE=development`): accepts a simple shared bearer token (`AUTH_DEV_TOKEN`).
- **Production mode** (`AUTH_MODE=production`): validates real JWTs against a configured identity provider using JWKS-based signature verification, issuer/audience validation, and token expiry checks.
- Roles and groups are normalized from IdP claims into a consistent application user context.
- Unknown `AUTH_MODE` values fail closed (no silent fallback to dev mode).

### Authorization

Role-based authorization is available via `require_role()` and `require_any_role()` dependencies.

### Audit Logging

Audit logging records mutations (create, update, delete) across all domains in a PostgreSQL `audit_log` table.

### Observability

Structured logging with per-request correlation IDs (`X-Request-ID`) is in place for operational observability.

## Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI application entry point
│   ├── config.py           # Application and database configuration
│   ├── auth/               # Authentication and authorization layer
│   │   ├── __init__.py
│   │   ├── config.py       # Auth configuration (env-driven)
│   │   ├── models.py       # AuthUser model
│   │   ├── security.py     # Token validation helpers
│   │   ├── dependencies.py # FastAPI route dependencies
│   │   └── authorization.py # Role-based authorization helpers
│   ├── db/                 # Database connection and schema
│   │   ├── __init__.py
│   │   ├── connection.py   # PostgreSQL connection helper
│   │   └── schema.py       # Table creation SQL (all domains)
│   ├── api/                # API route modules
│   │   ├── health.py       # Health check endpoint
│   │   ├── auth.py         # Auth endpoints (/me, /config)
│   │   ├── contacts.py     # Contacts CRUD endpoints
│   │   ├── leads.py        # Leads CRUD endpoints
│   │   ├── activities.py   # Activities CRUD endpoints
│   │   ├── templates.py    # Templates CRUD endpoints
│   │   ├── settings.py     # Settings endpoints
│   │   └── audit.py        # Audit log query endpoints
│   ├── services/           # Business logic layer
│   │   ├── contacts_service.py
│   │   ├── leads_service.py
│   │   ├── activities_service.py
│   │   ├── templates_service.py
│   │   ├── settings_service.py
│   │   └── audit_service.py
│   ├── repositories/       # Data access layer (all PostgreSQL-backed)
│   │   ├── contacts_repository.py
│   │   ├── contacts_postgres_repository.py
│   │   ├── leads_repository.py
│   │   ├── leads_postgres_repository.py
│   │   ├── activities_repository.py
│   │   ├── activities_postgres_repository.py
│   │   ├── templates_repository.py
│   │   ├── templates_postgres_repository.py
│   │   ├── settings_repository.py
│   │   ├── settings_postgres_repository.py
│   │   ├── audit_repository.py
│   │   └── audit_postgres_repository.py
│   ├── models/             # Pydantic data models
│   │   ├── contacts.py
│   │   ├── leads.py
│   │   ├── activities.py
│   │   ├── templates.py
│   │   ├── settings.py
│   │   └── audit.py
│   └── observability/      # Operational observability
│       ├── __init__.py
│       ├── logging.py      # Structured logging configuration
│       └── middleware.py   # Request ID middleware
├── requirements.txt
└── README.md
```

## Prerequisites

- **PostgreSQL** 12+ running locally (or accessible remotely)

### Running PostgreSQL Locally

The easiest way is via Docker:

```bash
docker run --name aicrm-postgres \
  -e POSTGRES_DB=aicrm \
  -e POSTGRES_USER=aicrm \
  -e POSTGRES_PASSWORD=aicrm \
  -p 5432:5432 \
  -d postgres:15
```

Or install PostgreSQL natively and create the database:

```bash
sudo -u postgres psql -c "CREATE USER aicrm WITH PASSWORD 'aicrm';"
sudo -u postgres psql -c "CREATE DATABASE aicrm OWNER aicrm;"
```

## Configuration

### Database

Database connection settings can be overridden via environment variables:

| Variable       | Default     | Description          |
|----------------|-------------|----------------------|
| `DB_HOST`      | `localhost` | PostgreSQL host      |
| `DB_PORT`      | `5432`      | PostgreSQL port      |
| `DB_NAME`      | `aicrm`     | Database name        |
| `DB_USER`      | `aicrm`     | Database username    |
| `DB_PASSWORD`  | `aicrm`     | Database password    |

### Authentication

| Variable             | Default                                              | Description                                      |
|----------------------|------------------------------------------------------|--------------------------------------------------|
| `AUTH_ENABLED`       | `true`                                               | Enable/disable auth boundary                     |
| `AUTH_MODE`          | `development`                                        | `development` or `production` (fail closed for unknown values) |
| `AUTH_DEV_TOKEN`     | `dev-secret-token`                                   | Shared bearer token for dev mode                 |
| `AUTH_ISSUER`        | `https://dev.example.com/realms/aicrm`               | IdP issuer URL (production mode)                 |
| `AUTH_CLIENT_ID`     | `aicrm-backend`                                      | Client ID / audience                             |
| `AUTH_AUDIENCE`      | (same as `AUTH_CLIENT_ID`)                           | JWT audience claim to validate                   |
| `AUTH_JWKS_URL`      | (derived from `AUTH_ISSUER`)                         | JWKS discovery URL                               |
| `AUTH_ALGORITHMS`    | `RS256`                                              | Comma-separated list of allowed JWT algorithms   |
| `AUTH_JWKS_CACHE_TTL`| `3600`                                               | JWKS cache TTL in seconds                        |
| `AUTH_ROLE_CLAIMS`   | `roles,realm_access.roles,resource_access.{client_id}.roles` | Dot-notation claim paths to scan for roles |
| `AUTH_GROUP_CLAIMS`  | `groups`                                             | Dot-notation claim paths to scan for groups      |

**Development mode example:**

```bash
export AUTH_MODE=development
export AUTH_DEV_TOKEN=my-dev-token
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

Logs are written to stdout in a structured format that includes timestamp, level, request ID, logger name, and message. Example:

```
2024-01-15T10:30:00+0000 INFO   [a1b2c3d4-...] app.auth.security: JWT validation failed — token expired request_id=a1b2c3d4-...
```

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The server starts at `http://localhost:9000`.

On startup, the backend automatically creates all required tables (contacts, leads, activities, templates, settings, audit_log) if they do not already exist. No manual schema initialization is required.

## Available Endpoints

| Method | Path                        | Auth     | Description                |
|--------|-----------------------------|----------|----------------------------|
| GET    | `/`                         | No       | Root endpoint              |
| GET    | `/api/health`               | No       | Health check               |
| GET    | `/api/auth/config`          | No       | Public auth config         |
| GET    | `/api/auth/me`              | Yes      | Current user context       |
| GET    | `/api/contacts`             | Yes      | List all contacts          |
| POST   | `/api/contacts`             | Yes      | Create a contact           |
| PUT    | `/api/contacts/{id}`        | Yes      | Update a contact           |
| DELETE | `/api/contacts/{id}`        | Yes      | Delete a contact           |
| GET    | `/api/leads`                | Yes      | List all leads             |
| POST   | `/api/leads`                | Yes      | Create a lead              |
| GET    | `/api/leads/{id}`           | Yes      | Get a lead by ID           |
| PUT    | `/api/leads/{id}`           | Yes      | Update a lead              |
| DELETE | `/api/leads/{id}`           | Yes      | Delete a lead              |
| GET    | `/api/activities`           | Yes      | List all activities        |
| POST   | `/api/activities`           | Yes      | Create an activity         |
| PUT    | `/api/activities/{id}`      | Yes      | Update an activity         |
| DELETE | `/api/activities/{id}`      | Yes      | Delete an activity         |
| GET    | `/api/templates`            | Yes      | List all templates         |
| POST   | `/api/templates`            | Yes      | Create a template          |
| PUT    | `/api/templates/{id}`       | Yes      | Update a template          |
| DELETE | `/api/templates/{id}`       | Yes      | Delete a template          |
| GET    | `/api/settings`             | Yes      | Get application settings   |
| PUT    | `/api/settings`             | Yes      | Update application settings |
| GET    | `/api/audit`                | Yes      | List audit events          |

Routes marked **Yes** require a valid Bearer token. In development mode, use the value of `AUTH_DEV_TOKEN` (default: `dev-secret-token`).

## Request Correlation

Every request is assigned a unique correlation ID, exposed in the `X-Request-ID` response header. If the incoming request already carries an `X-Request-ID` header, it is preserved; otherwise a new UUID is generated. This ID is included in all backend log lines, making it easy to trace a single request through the full stack:

```bash
curl -v http://localhost:9000/api/contacts \
  -H "Authorization: Bearer dev-secret-token"
# Response header: X-Request-ID: <uuid>
```

## Troubleshooting

### Backend unreachable

- Verify the server is running: `curl http://localhost:9000/api/health`
- Check the port is not already in use: `lsof -i :9000`
- Confirm the Python process started without import errors

### Invalid token

- In development mode, ensure `Authorization: Bearer <AUTH_DEV_TOKEN>` matches the configured token.
- In production mode, check the logs for specific JWT validation failures:
  - `token expired` — the token's `exp` claim is in the past.
  - `invalid audience` — the token's `aud` claim does not match `AUTH_AUDIENCE`.
  - `invalid issuer` — the token's `iss` claim does not match `AUTH_ISSUER`.
  - `no matching key in JWKS` — the token's `kid` header does not match any key in the JWKS set.
- Logs include the request ID so you can correlate the failure with the HTTP request.

### Forbidden action

- The request is authenticated but the user lacks the required role.
- Check the log line prefixed with `authz: forbidden` to see the user's subject, required role, and actual roles.

### Database connection issue

- Verify PostgreSQL is running and accessible at the configured `DB_HOST`/`DB_PORT`.
- Check credentials: `PGPASSWORD=aicrm psql -h localhost -U aicrm -d aicrm -c "SELECT 1;"`
- Connection errors are logged at ERROR level with the request ID and exception details.

### Audit write failure

- If an audit write fails, the error is logged at ERROR level with entity type, entity ID, action, and the underlying exception.
- The mutation that triggered the audit write will also fail (the audit is part of the same transaction boundary).

## Known Gaps and Future Work

1. End-to-end SSO login UX (redirect flow, logout, token refresh).
2. Expand role-based access control to cover all domains uniformly.
3. Metrics collection and alerting (Prometheus/Grafana).
4. Automated backup and restore tooling for PostgreSQL.
