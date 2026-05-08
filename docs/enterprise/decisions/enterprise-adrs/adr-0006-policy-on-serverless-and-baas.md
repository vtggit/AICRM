# ADR-0006 Policy on Serverless and BaaS

## Status
Accepted

## Context
Teams need clear guidance on when to choose a traditional backend versus serverless or backend-as-a-service platforms such as Supabase or Firebase.

## Decision
The company will use serverless and BaaS selectively, not as the default for core business systems.

The policy is:
- Node.js and FastAPI backends are approved by default
- Supabase is conditionally approved for suitable low-complexity use cases after architecture review
- Firebase requires explicit exception approval for production business systems

## Rationale
This policy supports:
- cloud portability
- open-source alignment
- maintainable domain logic
- clearer integration and observability
- better long-term control of strategic systems

## Consequences
Teams may still use serverless for supporting workloads, automation, event handlers, or prototypes, but they must not assume BaaS is the enterprise default.
