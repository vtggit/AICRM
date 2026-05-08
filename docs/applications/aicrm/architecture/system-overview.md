# System Overview

## Purpose

This document describes the current high-level architecture of AICRM and outlines the target future architecture.

## Current State

AICRM is a **fully backend-owned** application. All business domains are managed by a FastAPI backend with PostgreSQL persistence. The frontend is a thin client that communicates exclusively with the backend API for all business data.

### Business Domains (All Backend-Owned)

- **Contacts**: Stored in PostgreSQL, accessed through a FastAPI REST API. The browser is not the system of record.
- **Templates**: Stored in PostgreSQL, accessed through the same FastAPI API. Admin-only write access.
- **Leads**: Stored in PostgreSQL, accessed through the same FastAPI API. Admin-only write access.
- **Activities**: Stored in PostgreSQL, accessed through the same FastAPI API. Admin-only write access.
- **Settings**: Stored in PostgreSQL, accessed through the same FastAPI API. Authenticated users may read; admins may update.

### Architecture Components

- **Frontend**: A single `index.html` file with CSS (`css/styles.css`) and JavaScript modules (`js/app.js`, `js/api.js`, `js/auth.js`, `js/config.js`, `js/version.js`, `js/contacts-data-source.js`, `js/templates-data-source.js`, `js/leads-data-source.js`, `js/activities-data-source.js`, `js/settings-data-source.js`).
- **Backend**: FastAPI application (`backend/`) with PostgreSQL-backed repositories for Contacts, Templates, Leads, Activities, and Settings, JWT-based authentication, role-based authorization, and audit logging.
- **Persistence**: PostgreSQL is the single system of record for all business domains. The browser uses sessionStorage only for transient auth tokens; no business data is stored client-side.
- **Data Flow**:
  - All domains: User interactions → JavaScript → domain data source → `ApiClient` → FastAPI → PostgreSQL.

### Known Limitations

- No concurrent user support or data synchronization guarantees beyond the backend API.
- No service discovery, load balancing, or horizontal scaling.

## Gaps

- No service discovery, load balancing, or horizontal scaling.
- No centralized log aggregation, metrics collection, or alerting.

## Target Direction

The domain migration is complete. All business domains (Contacts, Templates, Leads, Activities, and Settings) are backend-owned with PostgreSQL as the system of record. The frontend communicates exclusively with a REST API for all business data. Future work focuses on SSO, containerization, and observability.

### API Contract Discipline

The backend API is treated as an explicit contract, not just a set of working routes. All domain endpoints use explicit Pydantic request/response models consistently. A committed OpenAPI schema artifact (`backend/openapi.json`) serves as the authoritative contract document. CI validates that the artifact stays in sync with the live application, preventing silent backend/frontend drift.

The frontend consumes the governed API through a centralized, deliberate pattern:

- **`api.js`** is the single contract boundary for all frontend backend interactions. It centralizes HTTP execution, auth header injection, JSON parsing, error classification (auth/validation/network/server), and response-shape validation.
- **Domain data-source files** (`*-data-source.js`) are thin wrappers that call `ApiClient` methods and normalize entity shapes. They use `ApiError.fromResult()` for consistent error handling and should not call `fetch()` directly.
- **Response-shape validators** (`assertList`, `assertEntity`, `assertObject`, `assertAuthMe`) make frontend contract assumptions explicit at runtime. Backend drift fails fast with a clear error instead of producing confusing UI bugs.
- **`auth.js`** consumes `/api/auth/me` through a centralized parser (`assertAuthMe`) with explicit response-shape expectations.

When the backend API contract changes, both the OpenAPI artifact and the frontend API consumption layer should be updated together.

## Related Enterprise Standards

- Backend platform standard (FastAPI or Node.js)
- Database standard (PostgreSQL)
- API design and versioning guidelines
- API contract governance (OpenAPI schema artifact + CI drift detection)
- Containerized deployment standard
