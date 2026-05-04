# Deployment Architecture

## Purpose

This document describes how AICRM is currently deployed and defines the target deployment architecture.

## Current State

AICRM is a **two-component application** with both frontend and backend runtime components.

- **Frontend Runtime**: The frontend is a static single-page application served as plain HTML, CSS, and JavaScript files. It can be served by any static file server.
- **Backend Runtime**: A FastAPI application (Python) serves the REST API for all business domains (Contacts, Templates, Leads, Activities, Settings). It runs via `uvicorn` and depends on PostgreSQL.
- **Data Location**: All business data lives in PostgreSQL (backend-owned). The browser uses sessionStorage only for transient auth tokens; no business data is stored client-side.
- **Deployment Method**: Two components must be deployed together:
  - Frontend: serve the `app/` directory with any static file server.
  - Backend: run the FastAPI application (`uvicorn`) with PostgreSQL connection configured.
- **Configuration**: Backend configuration is handled via environment variables (database URL, auth mode, JWT settings). Frontend reads API base URL from `js/config.js`.
- **Auth Path**: All backend API endpoints require a valid JWT. The frontend includes auth helpers (`js/auth.js`) that read the token from sessionStorage and attach it to API requests.

## Gaps

- No containerization (no Dockerfile, no container image).
- No CI/CD pipeline for automated build, test, and deployment.
- No environment separation (dev, staging, production).
- No infrastructure-as-code or deployment manifests.
- No health checks, readiness probes, or rolling update strategy.

## Target Direction

The target deployment will introduce:

- Containerized frontend and backend services (Docker).
- CI/CD pipeline for automated testing and deployment.
- Environment separation with configuration management.
- Centralized database deployment (managed PostgreSQL or equivalent).
- Identity provider deployment (Keycloak or equivalent).
- Infrastructure-as-code for reproducible environments.

## Related Enterprise Standards

- Containerized deployment standard
- CI/CD pipeline requirements
- Environment management policy
- Infrastructure-as-code guidelines
