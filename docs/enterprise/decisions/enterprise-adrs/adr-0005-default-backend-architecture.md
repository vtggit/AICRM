# ADR-0005 Default Backend Architecture

## Status
Accepted

## Context
The company needs a default backend architecture that supports open-source preferences, portability, maintainability, and steady evolution for internal business systems.

## Decision
The default backend architecture for business applications is a containerized application service using a modular monolith design.

Approved implementation languages and frameworks:
- Python with FastAPI
- Node.js

The default operating model is:
- Linux containers
- PostgreSQL
- centralized identity and access management
- REST APIs
- standard observability

## Consequences
### Positive
- strong portability
- easier alignment with enterprise controls
- better fit for evolving domain logic
- reduced dependence on vendor-specific services

### Negative
- more operational responsibility than BaaS
- slightly slower initial setup for very small prototypes

## Notes
BaaS or serverless may still be used where justified, but they are not the primary default for strategic applications.
