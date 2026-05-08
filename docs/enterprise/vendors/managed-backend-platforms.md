# Managed Backend Platforms

## Purpose
This document compares managed backend platforms that teams may propose instead of a custom backend service.

## Supabase
Status: Conditionally approved with architecture review for production use

Summary:
Supabase is the preferred BaaS option when a BaaS approach is justified because it aligns with PostgreSQL and open-source preferences better than many alternatives.

Good fit:
- small internal tools
- prototypes
- CRUD-heavy applications with limited custom logic
- teams that need to move quickly and can accept platform coupling

Risks:
- increasing complexity in row-level security
- eventual coupling to platform-specific operational patterns
- long-term fit may degrade as business logic grows

## Firebase
Status: Exception-only for production business systems

Summary:
Firebase can enable rapid delivery but is less aligned with company preferences because of deeper provider coupling and a less natural fit for relational enterprise workloads.

Good fit:
- prototypes
- mobile-focused experiments
- limited-scope applications with simple data access patterns

Risks:
- strong vendor lock-in
- harder migration path
- weaker fit for relational and reporting-heavy systems
- increased complexity for enterprise governance over time

## Default Recommendation
For important business systems, prefer a custom backend in Node.js or FastAPI.
For small, low-risk, rapid-delivery use cases, Supabase may be evaluated.
Firebase should be rare and requires explicit approval.
