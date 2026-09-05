# AICRM Product Vision — operator steering for panel answers

## North star

AICRM's trajectory is to displace enterprise CRMs (SAP CRM, Salesforce) for organizations that
want an AI-operated, self-hosted system. Every design answer leans toward **enterprise
capability**: auditability, multi-tenancy-readiness, compliance-first communication, and
API-contract discipline — delivered incrementally, never speculatively.

## Standing decisions (answer consistently with these)

- **Audit everything that changes state.** The audit_log is append-only by construction;
  state-changing features write an event with source and actor. NOTE the shipped detail shapes
  differ by path: update events record CHANGED FIELD NAMES ONLY, not values
  (contacts_service.py:150-167); only the consent path records old/new status. **PII
  minimization in audit details is a TARGET, NOT today's behaviour** — create/delete/bulk-delete
  events persist names, emails, company and free-text descriptions (contacts_service.py:90-94,
  :190-193, :215-218; leads_service.py:71-76, :158-162; companies_service.py:51-55;
  activities_service.py:73-77; templates_service.py:66-69), and every row also stores
  actor_username and actor_email. There is no redaction/scrubbing code anywhere in the backend.
  **Treat audit_log as PII-BEARING for any retention, erasure (RTBF/DSR) or export design**
  until a scrubbing pass ships.
- **Consent & compliance before communication.** Nothing sends email (or any outbound
  channel) without consulting the may_send gate (suppression list + per-channel consent,
  opted_in required — CASL-conservative). Public unsubscribe links and ESP webhooks belong to
  the ESP integration epic, not earlier.
- **Pagination contract (shipped on 9 of the 10 list endpoints — every one EXCEPT
  `GET /api/audit`):** offset pagination — limit default 20, hard cap 100, non-negative
  validation (422), X-Total-Count header, bare-array responses. `GET /api/audit` predates the
  contract and does NOT follow it: bare `limit: int = 100` (backend/app/api/audit.py:20) — no
  offset parameter, no cap, no 422 validation, no X-Total-Count. Migrate it before designing any
  audit-history paging, and do not specify audit paging against offset/X-Total-Count today. New
  list endpoints follow the contract exactly. Response envelopes are deferred to the
  API-versioning epic (v2).
- **Duplicates return 409** through the central UniqueViolation handler; bad references 422
  via the FK handler; both name the offending value from driver diagnostics.
- **Soft-delete semantics:** deleted_at timestamps, list/get exclusion by default,
  include_deleted as an explicit opt-in parameter.
- **Schema style:** normalized relational tables with FK constraints — never embedded JSONB
  for domain state. Satellite tables (per-channel consent) over column sprawl when future
  expansion is named. Flat v1 API surfaces over the normalized storage.
- **Auth:** AUTH_MODE=development with AUTH_DEV_TOKEN is untouchable (the whole test suite
  depends on it). New auth arrives as coexisting modes (e.g. AUTH_MODE=oidc as an OIDC
  RELYING PARTY only — never an authorization server; that half holds: Keycloak is the AS).
  **SHIPPED SHAPE (PR #217, deployed): OIDC IMPLICIT flow** — the raw access token returns in the
  URL hash, is held by the frontend in sessionStorage (app/js/auth.js:166, :227) and is sent as a
  Bearer header to a STATELESS backend. There are NO server-side sessions and NO httpOnly session
  cookie anywhere in the backend today. Moving to authorization-code + PKCE (or a BFF with opaque
  httpOnly sessions) is a **KNOWN DEVIATION and a DECIDED TARGET** needing its own hardening
  issue — do not assume it is in place and do not write acceptance criteria against it.
  Admin-only management endpoints; role model reused.
- **Multi-tenancy is kept OPEN, not built:** answer per-tenant questions with "tenant-global
  now; the schema/index shape must not block a later tenant_id migration — recorded for the
  multi-tenancy epic."
- **Scale posture:** early-stage — synchronous COUNT(*) and direct DB lookups are fine;
  caching layers (Redis) are recorded as scale triggers, not built. Postgres server-side
  state over new infrastructure.
- **Frontend:** framework-free vanilla JS (ApiClient + per-entity data sources + app.js
  views); no SPA framework, no query/cache libraries. Paged fetching in capped 100-row chunks.
- **Breaking changes land once, atomically**, with the frontend updated in the same PR, and
  are called out explicitly.

## The benchmark method (operator-set policy)

When a question has no recorded fact and no standing decision, DO NOT defer it to a human by
default. Answer it by COMPARATIVE RESEARCH: **what capability do publicly documented
practices across multiple established products in this category converge on**, scaled
honestly to our current stage — then state that as the DECIDED TARGET. Identify the
expected capability and the established domain concepts; design the implementation,
UX, terminology, defaults, and data model INDEPENDENTLY. No single named product is
the design ground truth, and matching a specific product is never the goal. Examples:
backup posture, session design, rate limiting, retention, rotation policies. Two rules keep
this honest:

1. A benchmark answer is a DECISION, not a provisioned fact. If it requires infrastructure
   that does not exist yet, say so and name (or propose) the tracking issue — never imply the
   capability already runs.
2. Only ENVIRONMENTAL IDENTIFIERS are irreducibly human (a domain name, an account, a
   purchased credential): answer the decision rule around them and mark the literal value as
   pending assignment by the operator.

## How to defer

A valid answer is an explicit deferral: name the epic it belongs to (multi-tenancy, API
versioning/v2 envelope, ESP integration, SOC2 hardening) and state that nothing in today's
shape blocks it. Never let a question silently disappear.

## Hard boundaries (never answer around these)

- Draft-only PRs; every merge requires explicit per-PR human authorization.
- Governance blockers are respected, not argued away — a blocked contract goes to a human.
- No production data destruction; migrations must succeed on existing (dirty) data.
