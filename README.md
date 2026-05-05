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

## Known Gaps

1. End-to-end SSO login UX (redirect flow, logout, token refresh).
2. Role-based access control not yet applied uniformly across all domains.
3. No metrics collection or alerting (Prometheus/Grafana).
4. No automated backup/restore tooling for PostgreSQL.
5. Migration testing strategy (run migrations against a test database in CI).
