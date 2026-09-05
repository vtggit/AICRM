# AICRM Deployment Facts — authoritative answers for factual panel questions

The auto-operator treats every statement here as GROUND TRUTH when answering panel questions.
Keep it current: a wrong fact here becomes a confidently wrong answer. Lines marked
`[OPERATOR: fill in]` are unknown to the automation and should be completed by a human.

## Hosting & infrastructure

- Deployment model: **self-hosted, on-premises** (VTG lab infrastructure). There is NO public
  cloud provider — questions about AWS/Azure/GCP region alignment do not apply; region
  placement is not a constraint.
- Orchestration: **plain docker-compose**. No Kubernetes, no ECS, no service mesh.
- PostgreSQL: runs as a **Docker container (postgres:15) via docker-compose on the same host
  as the application**. Not managed/RDS.
- CI: GitHub Actions (six checks on PRs, five on main).

## Application stack

- Backend: FastAPI (Python 3.11), psycopg2 with raw SQL repositories, Alembic migrations.
- Frontend: framework-free vanilla JS (ApiClient + per-entity data sources), served with the app.
- Auth today: **AUTH_MODE=production** — real OIDC/JWT validation (RS256, JWKS-cached) against a
  self-hosted **Keycloak** IdP, realm `vtg`, on the same host (:8081); AUTH_ENABLED=true. The
  browser login shipped in PR #217 (commit 96a59c7) and is deployed. AUTH_MODE=development with
  AUTH_DEV_TOKEN still exists as a code path but is used ONLY by the backend test suite
  (backend/tests/conftest.py) — it is NOT the deployment's auth story, and a dev token 401s
  against the running backend. #120 stays open for the residual SSO scope (authorization-code +
  PKCE, refresh-token rotation/revocation, external IdP federation, server-side sessions/single
  logout). It is NOT the record for "adding an IdP" — the IdP is provisioned, live and enforcing.

## Communication / external services

- Email/ESP: **none provisioned**. No sending domain, no DKIM/SPF configured, no ESP account.
  (#184 is blocked on this; the consent + suppression infrastructure from #185/#186 is live.)
- Secrets today: **.env files on the host** — migrating them is exactly issue #121's scope.
  No secret manager is provisioned yet.

## Decided targets (comparative-research method, scaled to stage)

- **Secret manager: self-hosted HashiCorp Vault** — decided (panel recommendation + the
  self-hosted/no-lock-in vision align). Provisioning is #121's scope; NOT yet provisioned.
- **PostgreSQL backup/restore: nightly pg_dump + WAL archiving for point-in-time recovery,
  with periodically TESTED restores** (the Salesforce/SAP-grade benchmark, compose-scale).
  DECIDED TARGET ONLY — no automated backup is known to be provisioned today; provisioning is
  tracked as its own infrastructure issue.
- **TLS/ingress: a TLS-terminating reverse proxy in front of the app** — decided rule. The
  production domain itself is an environmental identifier pending operator assignment; it
  becomes load-bearing only when the ESP epic (#184: DKIM/SPF records) and OIDC (#120:
  redirect URIs) build against it.

## Environmental identifiers pending operator assignment

- Production domain name: [OPERATOR: fill in — needed by #184/#120 when they build]
