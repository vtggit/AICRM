# Approved Products List

## Identity and Access
- Preferred identity provider: Keycloak
- Acceptable commercial alternative when justified: Microsoft Entra ID
- Preferred authentication protocol family: OIDC / OAuth 2.0
- Preferred browser-facing web application auth pattern: secure HTTP-only cookie-backed sessions after centralized login
- Preferred API and service token pattern: short-lived JWT bearer tokens issued by the approved identity provider
- Secret storage: HashiCorp Vault or cloud-native secrets manager when platform requires it

## Databases
- Preferred relational database: PostgreSQL
- Acceptable relational alternative for lightweight or embedded use: MariaDB
- Preferred cache: Redis
- Preferred search platform when needed: OpenSearch

## Messaging and Integration
- Preferred message broker for common asynchronous workloads: RabbitMQ
- Preferred event streaming platform for advanced use cases: Redpanda or Apache Kafka when scale requires it
- Preferred API style: REST with OpenAPI documentation

## Backend Platforms
- Approved default backend frameworks: FastAPI and Node.js
- Conditionally approved BaaS platform: Supabase, after architecture review
- Exception-only BaaS platform for production business systems: Firebase

## Observability
- Metrics: Prometheus
- Dashboards: Grafana
- Logs: OpenSearch or Loki
- Tracing: OpenTelemetry with Tempo or Jaeger

## Delivery and Platform
- Source control: GitHub or GitLab
- CI/CD: GitHub Actions or GitLab CI
- Containers: OCI-compatible images
- Orchestration: Docker Compose initially; Kubernetes only when maturity and scale justify it
