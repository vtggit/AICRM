# Technical Stack

## Purpose

This document captures the current technical stack of AICRM and defines the target stack for the enterprise migration.

## Current State

AICRM is a **fully backend-owned** application: all business domains (Contacts, Templates, Leads, Activities, Settings) use backend APIs backed by PostgreSQL.

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) | No framework, no build tool; thin client |
| Backend | FastAPI (Python) | Contacts + Templates + Leads + Activities + Settings CRUD, JWT auth, RBAC, audit logging |
| Database | PostgreSQL | `contacts`, `templates`, `leads`, `activities`, `settings`, `audit_log` tables; auto-created on startup |
| Session state | Browser `sessionStorage` | Transient only — auth token; no business data stored client-side |
| Authentication | JWT (two-mode: dev shared token, production JWKS) | Protects all backend API endpoints |
| Authorization | Role-based (admin/user) | `require_role()` FastAPI dependencies |
| Testing | Playwright (E2E) | Browser automation tests in `docs/testing/` |
| Package Manager | npm | Used only for devDependencies (markdownlint, playwright) |
| Deployment | Static file serving (frontend) + uvicorn (backend) | Frontend: any HTTP server; Backend: `uvicorn` on localhost |

## Gaps

- No unit or integration test layer — only E2E browser tests exist.
- No containerization or orchestration.
- No centralized log aggregation or metrics collection.

## Target Direction

| Layer | Target |
|---|---|
| Backend | Enterprise default backend approach (see ADR-0002) |
| Database | Enterprise default relational database (see ADR-0003) |
| Identity | Enterprise default identity and authentication approach (see ADR-0004) |
| Frontend | TBD (evolve current SPA or adopt framework) |
| Containerization | Enterprise default containerized deployment approach |

The target stack for backend, database, and identity is no longer a set of open candidates. AICRM has formally adopted the enterprise defaults in the corresponding application ADRs. All business domains (Contacts, Templates, Leads, Activities, and Settings) use backend APIs + PostgreSQL.

## Related Enterprise Standards

- Approved technology stack register
- Backend platform standard
- Database standard
- Identity and access management standard

## Application ADRs

- ADR-0002 — Backend Platform Selection
- ADR-0003 — Primary Database Selection
- ADR-0004 — Authentication Approach
