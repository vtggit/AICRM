# AICRM Application Documentation

## Purpose

This directory contains enterprise-aligned documentation for the AICRM application. It captures the current steady-state architecture, identifies remaining gaps against enterprise standards, and defines the target direction.

## Current State

AICRM is a **fully backend-owned** Customer Relationship Management application (v0.0.6). All business domains — Contacts, Templates, Leads, Activities, and Settings — are managed by a FastAPI REST API with PostgreSQL persistence, JWT authentication, role-based authorization, and audit logging. The frontend is a vanilla HTML/CSS/JavaScript SPA that communicates exclusively with the backend API for all business data. Session storage is used only for transient auth tokens; no business data is stored client-side.

## Remaining Gaps

- No end-to-end SSO login UX (redirect, logout, token refresh).
- No centralized log aggregation, metrics collection, or alerting.
- No containerization or CI/CD pipeline.
- Role-based access control is basic — not yet a full RBAC engine with hierarchical roles or resource-scoped permissions.
- No data encryption at rest.

## Target Direction

The domain migration is complete. All business domains are backend-owned with PostgreSQL as the system of record. Future work focuses on:

- Adding end-to-end SSO login UX (redirect, logout, token refresh).
- Containerizing the application for standardized deployment.
- Introducing centralized log aggregation, metrics, and alerting.
- Upgrading RBAC to a full role-based access control engine.

## Related Enterprise Standards

- Backend platform standard (FastAPI or Node.js)
- Database standard (PostgreSQL)
- Authentication provider (Keycloak or equivalent IdP)
- Observability standard (structured logs, metrics, alerting)
- Deployment standard (containerized, CI/CD pipeline)

### Documentation Index

**Product**

- [Executive Summary](product/executive-summary.md)

**Architecture**

- [System Overview](architecture/system-overview.md)
- [Technical Stack](architecture/technical-stack.md)

**Security**

- [Application Security Model](security/application-security-model.md)

**Deployment**

- [Deployment Architecture](deployment/deployment-architecture.md)

**Operations**

- [Monitoring & Observability](operations/monitoring-observability.md)

**Testing**

- [Testing Strategy](testing/testing-strategy.md)

**Compliance**

- [Standards Conformance](compliance/standards-conformance.md)
- [Exception Register](compliance/exception-register.md)

**Decisions**

- [ADR-0001: Current State Baseline](decisions/adrs/adr-0001-current-state-baseline.md)
