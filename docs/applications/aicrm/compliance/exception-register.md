# Exception Register

## Purpose

This document records any approved exceptions to enterprise standards for AICRM. Exceptions are temporary deviations that require justification and a plan for remediation.

## Current State

No formal exceptions have yet been approved. AICRM has completed its domain migration — all business domains use backend APIs with PostgreSQL persistence, JWT authentication, role-based authorization, and audit logging. Remaining gaps (containerization, SSO UX, centralized observability) are addressed through the target direction below rather than as exceptions.

## Gaps

- The exception register is not yet actively used. It will become relevant when specific, time-bound deviations from enterprise standards are requested during future enhancement phases.

## Target Direction

Likely future exceptions that may need to be evaluated during future enhancements include:

| Exception | Justification | Expiry | Status |
|---|---|---|---|
| Gradual test coverage ramp-up | Full coverage thresholds may not be achievable in the first enhancement sprint | TBD | Not yet requested |
| Legacy browser support window | Existing users may need a transition period before dropping older browser versions | TBD | Not yet requested |

No exceptions have been submitted or approved at this time.

## Related Enterprise Standards

- Exception management process
- Risk acceptance and mitigation policy
- Standards waiver procedure
