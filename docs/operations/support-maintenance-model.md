# AICRM Support and Maintenance Model

This document defines the steady-state operational ownership, recurring maintenance, and support expectations for AICRM. It is the primary sustainment guide for anyone responsible for keeping the application healthy over time.

## Purpose

AICRM is no longer a project in progress  —  it is a sustained operational system. This document makes explicit:

- Who owns which areas
- What recurring tasks keep the system healthy
- What happens when something goes wrong
- What "good" looks like for normal operations

## Ownership Areas

Ownership is defined by role, not by individual name. Assign actual people to these roles as your team evolves.

| Area | Owner Role | Responsibility |
|------|-----------|----------------|
| **Application Code** | Application Owner | All frontend and backend source code, feature development, bug fixes, code quality gates |
| **Backend Operations** | Backend Maintainer | Backend process health, container runtime, environment configuration, dependency management |
| **Database** | Database Owner | PostgreSQL instance health, schema integrity, migration execution, data integrity, backup verification |
| **Auth / Configuration** | Auth/Config Owner | Authentication configuration (dev and production modes), environment variable management, secret rotation, IdP configuration |
| **Releases** | Release Owner | Version bumps, changelog updates, release readiness decisions, git tagging, release coordination |
| **Incident Triage** | Operational Responder | First response to incidents, runbook execution, escalation decisions, post-incident documentation |
| **Documentation** | Documentation Owner | Keeping runbooks, architecture docs, API docs, and this support model current when operational behavior changes |

### Role Overlap

In a small team, one person may hold multiple roles. That is fine  —  the goal is clarity about what areas exist, not headcount. The key rule is: **every area has a named owner, even if that person owns several areas.**

### Escalation Path

When an owner role is unavailable:

1. The Operational Responder handles immediate triage
2. If the issue requires domain expertise the responder lacks, escalate to the Application Owner
3. If the Application Owner is unavailable, the next available maintainer with write access acts as proxy

---

## Recurring Maintenance Tasks

These are the normal, expected tasks required to keep AICRM healthy. They are not incidents  —  they are routine upkeep.

| Task | Frequency | Owner Role | What "Done" Looks Like |
|------|-----------|-----------|----------------------|
| Review failed CI runs | Every merge / as they occur | Application Owner | Failed CI is investigated and resolved; no silently ignored failures |
| Review dependency and security hygiene findings | Monthly | Backend Maintainer | pip-audit and gitleaks findings are reviewed; critical vulnerabilities are patched or documented |
| Review release and version metadata before releases | Every release | Release Owner | VERSION and CHANGELOG.md are consistent; CI release-metadata job passes |
| Monitor migration changes before schema updates | Every schema change | Database Owner | Migration files are reviewed for correctness, rollback safety, and data impact before merging |
| Verify backup and recovery approach | Quarterly | Database Owner | Backup method is confirmed working; a recovery test is attempted on a non-production copy |
| Review audit behavior and auth configuration changes | Monthly | Auth/Config Owner | Audit logging is writing correctly; auth configuration has not drifted from intended settings |
| Keep docs and runbooks updated | When operational behavior changes | Documentation Owner | Runbooks, architecture docs, and this support model reflect current reality |

---

## Maintenance Calendar

A lightweight, cadence-based checklist to make the support model real.

### Every Release

- [ ] Confirm `VERSION` file and `CHANGELOG.md` are consistent
- [ ] Verify CI is green (all jobs pass, including release-metadata, quality gates, security hygiene, contract check, and backend tests)
- [ ] Verify migration state if schema changed in the release
- [ ] Verify `backend/openapi.json` is updated if API changed
- [ ] Create and push annotated git tag (`v<VERSION>`)
- [ ] Confirm the running instance reports the correct version via `/api/health`

### Monthly

- [ ] Review dependency and security hygiene findings (pip-audit, gitleaks)
- [ ] Review open operational issues (GitHub issues, known-issues list)
- [ ] Review backup and recovery assumptions (is the volume still being persisted? is the backup approach still valid?)
- [ ] Review auth and configuration drift (have environment variables or auth settings changed unexpectedly?)
- [ ] Review audit log behavior (are mutations still being recorded correctly?)

### Quarterly

- [ ] Verify backup and recovery approach end-to-end (attempt a restore on a non-production copy)
- [ ] Review this support and maintenance model for accuracy
- [ ] Review the runbook (`docs/operations/runbook.md`)  —  add entries for new failure modes encountered
- [ ] Review migration history and consider cleanup of old migration files if appropriate
- [ ] Review application health endpoints and confirm monitoring assumptions are still valid

### After Incidents

- [ ] Update the runbook if the incident revealed a gap in first-response guidance
- [ ] Capture root cause and mitigation in `docs/operations/known-issues.md` or a post-incident note
- [ ] Add a test, guardrail, or CI check if the incident could be prevented automatically
- [ ] Update this document if the incident revealed unclear ownership or missing responsibilities

---

## Backup and Recovery Responsibility

### System of Record

PostgreSQL is the system of record for all AICRM business data. All domains (Contacts, Leads, Activities, Templates, Settings) and the audit log are persisted there.

### Current Backup Approach

- Database data is persisted in a Docker named volume (`aicrm-postgres-data` in `docker-compose.yml`).
- **No automated PostgreSQL backup tooling exists.**
- The Docker volume persists across container restarts but is not backed up to external storage.
- This is a modest backup model  —  it protects against container crashes but not against volume loss or accidental data deletion.

### Responsibility

| Aspect | Owner |
|--------|-------|
| Ensuring the Docker volume exists and is healthy | Database Owner |
| Verifying the backup approach is adequate | Database Owner |
| Performing backup verification tests | Database Owner |
| Defining backup strategy improvements (e.g., pg_dump, external storage) | Database Owner, in coordination with Backend Maintainer |

### Recovery Expectation

- **Container restart:** Data survives container restarts because of the named volume. Recovery is automatic.
- **Volume loss:** No automated recovery exists. Recovery would require restoring from the most recent manual backup (if one exists) or accepting data loss.
- **Target:** The target state includes automated PostgreSQL backups with retention policies and tested recovery procedures. This is tracked as a known gap.

---

## Migration and Release Responsibility

### Schema Changes (Migrations)

| Step | Responsibility |
|------|---------------|
| Authoring a new migration file | Application Owner (developer making the schema change) |
| Reviewing migration correctness and rollback safety | Database Owner |
| Verifying migrations apply cleanly in CI | CI (automated)  —  Application Owner investigates failures |
| Approving schema changes for merge | Database Owner (review approval) |

**Rules:**
- Schema changes are introduced through Alembic migration files only  —  never by editing the legacy schema helper.
- Migration files are reviewed before merge. The Database Owner verifies correctness.
- CI validates that migrations apply cleanly against a fresh database.
- Migration failures during startup prevent the backend from starting, making failures visible immediately.

### Releases

| Step | Responsibility |
|------|---------------|
| Deciding when a release is ready | Release Owner |
| Bumping the VERSION file | Release Owner |
| Updating CHANGELOG.md | Release Owner |
| Verifying CI passes on the release branch | Release Owner |
| Creating and pushing the git tag | Release Owner |
| Coordinating migration steps during release if schema changed | Release Owner, in coordination with Database Owner |

**Rules:**
- CI enforces VERSION format, changelog consistency, and drift detection.
- If VERSION changes in a PR, CHANGELOG.md must also change.
- Releases are not considered ready until CI is fully green.

---

## Incident Response Expectations

### What Counts as an Incident

| Type | Examples | Response Level |
|------|----------|---------------|
| **Routine** | Failed CI run, dependency warning, documentation drift, expired dev token | Addressed during normal work; no urgency |
| **Incident** | Backend not starting, database connection failure, migration failure, auth system failure, data loss | Immediate triage via runbook |

### Triage Process

1. **Operational Responder** is the first point of contact for incidents.
2. Check the runbook (`docs/operations/runbook.md`) for first-response guidance.
3. If the runbook covers the issue, follow it.
4. If the runbook does not cover the issue:
   - Assess severity and impact
   - Escalate to the relevant owner role (Backend Maintainer, Database Owner, Auth/Config Owner)
   - Document the gap for later runbook update

### When to Escalate

Escalate when:
- The runbook does not address the failure mode
- The incident affects data integrity
- The incident requires schema or configuration changes to resolve
- The Operational Responder lacks the domain knowledge to diagnose

### Post-Incident

After every incident:
- Update the runbook if new guidance is needed
- Capture root cause and mitigation in `docs/operations/known-issues.md`
- Consider adding automated guardrails (tests, CI checks, monitoring) to prevent recurrence
- Update this document if ownership or process was unclear

---

## Support Workflow Expectations

### Normal Operations

During normal operations:
- CI runs automatically on every push and pull request.
- The Operational Responder or Application Owner reviews CI failures as they occur.
- Routine maintenance tasks follow the calendar above.
- Documentation is updated when operational behavior changes.

### When Something Breaks

1. Check the runbook first (`docs/operations/runbook.md`).
2. If the runbook resolves it, document what happened and move on.
3. If it does not, escalate to the relevant owner.
4. After resolution, update documentation to close the gap.

### Handoff

When ownership of a role changes:
- The incoming owner should review this document, the runbook, and the known issues list.
- The outgoing owner should brief the incoming owner on any ongoing operational context.
- This document should be updated if roles or responsibilities change.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [Runbook](runbook.md) | First-response guidance for common incidents |
| [Release Process](release-process.md) | Version management, tagging, and release workflow |
| [Known Issues](known-issues.md) | Track of known operational issues and workarounds |
| [Monitoring and Observability](../applications/aicrm/operations/monitoring-observability.md) | Current and target observability state |
| [Deployment Architecture](../applications/aicrm/deployment/deployment-architecture.md) | How the application is deployed and configured |
| [Standards Conformance](../applications/aicrm/compliance/standards-conformance.md) | Enterprise standards alignment |
