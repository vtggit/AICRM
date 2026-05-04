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

## Related Enterprise Standards

- Backend platform standard (FastAPI or Node.js)
- Database standard (PostgreSQL)
- API design and versioning guidelines
- Containerized deployment standard
