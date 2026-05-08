# Backend Selection Patterns

## Purpose
This document gives practical selection patterns for common backend choices.

## Pattern 1: Modular Monolith Backend
Use when:
- one team owns the application
- business rules are evolving
- multiple modules need to share a common data model
- the company wants the simplest operational model that still supports growth

Preferred technology choices:
- FastAPI or Node.js
- PostgreSQL
- Keycloak or enterprise identity platform
- Redis only when justified

This is the default for most internal business applications.

## Pattern 2: API-Centric Service
Use when:
- the application primarily exposes APIs
- multiple clients consume the backend
- contract clarity and schema discipline matter

Preferred technology choices:
- FastAPI when Python strengths matter
- Node.js when JavaScript ecosystem alignment matters

## Pattern 3: Serverless Utility
Use when:
- the workload is event-driven
- traffic is bursty
- the unit of work is simple and isolated
- the team needs low operational overhead

Do not use this as the primary pattern for a strategic CRM or ERP-style system without approval.

## Pattern 4: BaaS-Accelerated Prototype
Use when:
- the team is validating a concept quickly
- business risk is low
- future replacement is acceptable

Preferred vendor:
- Supabase over Firebase when the app fits PostgreSQL-backed CRUD and open-source preferences

## Pattern 5: Strategic Business System
Use when:
- the application may become a system of record
- the application will accumulate complex workflows
- the application requires integrations, reporting, and strong governance

Preferred pattern:
- modular monolith backend in Node.js or FastAPI
- avoid BaaS as the primary long-term platform unless a formal exception is granted
