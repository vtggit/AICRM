# Application Security Model

## Purpose

This document describes the current security posture of AICRM, identifies gaps, and defines the target enterprise security model.

## Current State

- **Authentication**: Implemented with two modes:
  - **Development mode** (`AUTH_MODE=development`): accepts a simple shared bearer token (`AUTH_DEV_TOKEN`).
  - **Production mode** (`AUTH_MODE=production`): validates real JWTs against a configured identity provider using JWKS-based signature verification, issuer/audience validation, and token expiry checks.
  - Authentication is enforced via FastAPI route dependencies. Unknown `AUTH_MODE` values fail closed (no silent fallback to dev mode).
  - Auth failures are logged with clear diagnostics (missing header, malformed token, invalid signature, wrong issuer/audience, expired token) without exposing sensitive token contents.
- **Authorization**: Basic role-based authorization is implemented:
  - `require_role()` and `require_any_role()` FastAPI dependencies enforce role requirements on protected routes.
  - Recognized roles: `admin` (full access, including mutations) and `user` (read-only access).
  - Roles and groups are normalized from IdP claims into a consistent application user context using configurable claim paths.
  - Authorization failures are logged with user subject, required role, and actual roles.
- **Audit Trail**: Audit logging for all domain mutations is implemented:
  - Every create, update, and delete operation across Contacts, Templates, Leads, Activities, and Settings is recorded in a PostgreSQL `audit_log` table.
  - Audit events capture entity type, entity ID, action, actor identity (subject, username, email, roles), timestamp, and change details.
  - A read-only audit log API (`GET /api/audit`) allows querying recent events.
  - Audit write failures are logged with entity/action context and the underlying error.
- **Data Protection**: Data resides in PostgreSQL. No encryption at rest is configured yet. No HTTPS enforcement at the application layer (expected to be handled by reverse proxy / ingress).
- **Input Validation**: Server-side validation exists per domain (e.g. Contacts: name required, status enum; Leads: status enum, stage validation; Activities: type enum). No comprehensive sanitization against XSS or injection beyond parameterized SQL queries.

## Gaps

- No end-to-end SSO login UX (redirect flow, logout, token refresh).
- Role-based access control is basic — not yet a full RBAC engine with hierarchical roles or resource-scoped permissions.
- No data encryption at rest.
- No HTTPS enforcement at the application level (reverse proxy expected).
- No CSRF protection (relevant if the frontend shares cookies with the backend).

- No session management or token lifecycle controls beyond JWT expiry.
- No rate limiting or brute-force protection.

## Target Direction

The target security model will include:

- Centralized identity provider (Keycloak or equivalent) for authentication with full SSO flow.
- Full role-based access control (RBAC) with hierarchical roles and resource-scoped permissions.
- HTTPS-only communication with TLS enforcement at the application or ingress level.
- Encrypted data at rest in the database.
- Comprehensive audit logging of all data mutations and access events across all domains.
- Input validation and sanitization at the API layer with OWASP guidance.
- Rate limiting, brute-force protection, and session management.

## Related Enterprise Standards

- Identity and access management standard
- Application security baseline
- Data classification and encryption policy
- Audit and compliance logging requirements
