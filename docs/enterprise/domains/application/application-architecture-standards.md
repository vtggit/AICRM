# Application Architecture Standards

## Core Rules
- Prefer modular monoliths for small teams unless service decomposition is clearly justified.
- Use domain-oriented modules and explicit interfaces between major components.
- Separate user interface, business logic, persistence, and integration concerns.
- Record material application decisions in ADRs.

## Backend Default
The default backend for business systems is a containerized application service using Node.js or Python/FastAPI.

## Serverless and BaaS
Serverless and backend-as-a-service platforms are not the default for strategic business systems. Teams must consult:
- `backend-platform-selection-standard.md`
- `serverless-and-baas-standard.md`

## Common Decision Answer
When a team asks whether it should introduce a Node.js or FastAPI backend or instead use Supabase or Firebase, the default answer is:
- build a Node.js or FastAPI backend
- evaluate Supabase only for low-complexity, fast-delivery cases
- require explicit exception approval for Firebase in production business systems
