# Executive Summary

## Purpose

This document provides a high-level overview of AICRM, its business purpose, and the rationale for aligning it with enterprise standards.

## Current State

AICRM is a lightweight Customer Relationship Management application designed for managing contacts, tracking leads through a sales pipeline, recording activities, and maintaining email templates. The application is a **fully backend-owned service**: all business domains — Contacts, Templates, Leads, Activities, and Settings — are served via a FastAPI REST API with PostgreSQL persistence, JWT authentication, role-based authorization, and audit logging. The frontend is a vanilla HTML/CSS/JavaScript SPA (v0.0.6) that communicates exclusively with the backend API for all business data, with features including lead scoring, CSV import/export, keyboard shortcuts, theme toggle, and backup/restore (backend-managed data only).

## Gaps

- No end-to-end SSO login UX (redirect, logout, refresh) — authentication is token-based only.
- No centralized log aggregation, metrics collection, or alerting.
- No containerization or CI/CD pipeline.

## Target Direction

Enterprise alignment is being introduced incrementally. The domain migration phase is complete — all business domains (Contacts, Templates, Leads, Activities, and Settings) are backend-owned with PostgreSQL as the system of record. The remaining work focuses on:

- Adding end-to-end SSO login UX (redirect, logout, token refresh).
- Containerizing the application for standardized deployment.
- Introducing centralized log aggregation, metrics, and alerting.

## Related Enterprise Standards

- Enterprise backend platform requirements
- Identity and access management standards
- Data persistence and backup standards
- Application security baseline
- Deployment and operations standards
