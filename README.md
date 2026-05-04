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

## Quick Start

### Prerequisites

- **Python 3.10+** (backend)
- **PostgreSQL 12+** (database)
- A local web server or browser to open `app/index.html` (frontend)

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
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

The backend serves at `http://localhost:9000` and auto-creates all required database tables on startup.

### 3. Open the Frontend

Open `app/index.html` in a browser. The frontend will connect to `http://localhost:9000/api` automatically.

For development, you can serve it with any static file server:

```bash
cd app
python -m http.server 8080
```

### 4. Authenticate

In development mode, authenticate by clicking the auth indicator (🔴) in the header and entering the dev token (`dev-secret-token` by default).

## Project Structure

```
AICRM/
├── app/                          # Frontend (static client)
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
├── docs/                         # Documentation
│   └── applications/aicrm/       # Architecture, security, operations
└── README.md                     # This file
```

## Domains

| Domain      | Description                    | API Endpoints                        |
|-------------|--------------------------------|--------------------------------------|
| Contacts    | CRM contact records            | GET/POST/PUT/DELETE `/api/contacts`  |
| Leads       | Sales lead pipeline            | GET/POST/PUT/DELETE `/api/leads`     |
| Activities  | Tasks, calls, meetings, emails | GET/POST/PUT/DELETE `/api/activities`|
| Templates   | Reusable email templates       | GET/POST/PUT/DELETE `/api/templates` |
| Settings    | Application configuration      | GET/PUT `/api/settings`              |

## Authentication Modes

| Mode          | Config                    | Description                           |
|---------------|---------------------------|---------------------------------------|
| Development   | `AUTH_MODE=development`   | Simple shared bearer token            |
| Production    | `AUTH_MODE=production`    | JWT validation against external IdP   |

See [backend/README.md](backend/README.md) for full configuration details.

## Key Design Decisions

- **PostgreSQL is the system of record.** No business data lives in browser storage.
- **Frontend is a client.** It renders UI and delegates all data operations to the backend.
- **Browser storage is session-only.** Auth tokens use `sessionStorage`; theme preferences are transient.
- **Audit logging** records all mutations (create, update, delete) across all domains.
- **Request correlation** via `X-Request-ID` headers for full-stack traceability.
- **Role-based authorization** via `require_role()` and `require_any_role()` dependencies.

## Documentation

- [Backend README](backend/README.md) — detailed backend setup, configuration, and troubleshooting
- [Architecture docs](docs/applications/aicrm/architecture/) — system overview and technical stack
- [Security model](docs/applications/aicrm/security/) — authentication, authorization, and audit
- [Operations](docs/applications/aicrm/operations/) — monitoring and observability

## Known Gaps

1. End-to-end SSO login UX (redirect flow, logout, token refresh).
2. Role-based access control not yet applied uniformly across all domains.
3. No metrics collection or alerting (Prometheus/Grafana).
4. No automated backup/restore tooling for PostgreSQL.
