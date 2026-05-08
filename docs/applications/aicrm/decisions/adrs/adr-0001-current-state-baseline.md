# ADR-0001: Current State Baseline

## Purpose

This Architecture Decision Record (ADR) establishes the original architecture of AICRM as the accepted starting point for the enterprise migration, and records the completed migration outcome.

## Original State

AICRM was a client-side-only single-page application (v0.0.6) built with vanilla HTML, CSS, and JavaScript. It used browser `localStorage` for all data persistence and had no backend server, no authentication, and no centralized data store. The application provided contact management, lead pipeline tracking, activity logging, email templates, and basic dashboard analytics.

## Migration Approach

**Decision**: The original architecture was accepted as the migration starting point. The migration was incremental, not rewrite-based. The strategy was to:

1. Preserve the original frontend as a working client.
2. Introduce a backend API layer (FastAPI) alongside it.
3. Gradually shift data operations from localStorage to the new backend.
4. Add authentication, authorization, and observability as the backend matured.
5. Containerize and deploy the full stack according to enterprise standards.

This approach minimized risk by maintaining a functional application throughout the migration and avoided the cost and complexity of a full rewrite.

## Current State (Post-Migration)

The domain migration is **complete**. AICRM is now a fully backend-owned application:

- **Backend**: FastAPI REST API serving all business domains (Contacts, Templates, Leads, Activities, Settings).
- **Database**: PostgreSQL as the system of record. All business data is persisted server-side.
- **Authentication**: JWT-based (development shared token or production JWKS).
- **Authorization**: Role-based (admin/user) with route-level enforcement.
- **Audit**: All domain mutations logged to `audit_log` table with actor details and action type.
- **Frontend**: Vanilla HTML/CSS/JS SPA — thin client that communicates exclusively with the backend API. Session storage is used only for transient auth tokens; no business data is stored client-side.

## Remaining Gaps

- No end-to-end SSO login UX (redirect, logout, token refresh).
- No centralized log aggregation, metrics collection, or alerting.
- No containerization or CI/CD pipeline.
- Role-based access control is basic — not yet a full RBAC engine with hierarchical roles or resource-scoped permissions.
- No data encryption at rest.

## Related Enterprise Standards

- Backend platform standard
- Database standard
- Identity and access management standard
- Deployment standard
- Application lifecycle management policy
