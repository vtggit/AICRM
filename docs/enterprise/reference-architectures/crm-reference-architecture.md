# CRM Reference Architecture

## Preferred Small-Company Stack
- frontend: standards-based web app
- backend: Python with FastAPI or Node.js service
- database: PostgreSQL
- auth: Keycloak
- cache: Redis
- queue: RabbitMQ
- metrics: Prometheus
- dashboards: Grafana
- logs: OpenSearch or Loki

## Default Structural Pattern
A CRM should usually start as a modular monolith unless scale or organizational boundaries justify service decomposition.

## Explicit Guidance on Backend Versus BaaS
For CRM-style systems, a traditional backend is the preferred default because CRMs commonly accumulate:
- custom workflows
- role-based access control
- reporting requirements
- integration requirements
- long-lived domain logic

Supabase may be considered for a very small or early-stage CRM only when speed is more important than portability and the business accepts future migration risk.

Firebase is generally not recommended as the primary backend for a CRM because CRM systems usually benefit from relational modeling, SQL-based reporting, and lower provider lock-in.
