# Enterprise Architecture Documentation

This directory contains company-wide architecture guidance, standards, approved patterns, reference architectures, decision records, vendor preferences, and compliance mappings.

## How to Use This Documentation
A delivery team should usually read in this order:
1. governance and decision framework
2. approved products list
3. relevant domain standards
4. reference architecture for the product type
5. patterns and vendor guidance
6. enterprise ADRs
7. application template and local application ADRs

## Common Decision Questions
### Should the team build a Node.js or FastAPI backend, or evaluate Supabase or Firebase?
Read these documents in order:
1. `domains/application/backend-platform-selection-standard.md`
2. `domains/application/serverless-and-baas-standard.md`
3. `vendors/backend-frameworks.md`
4. `vendors/managed-backend-platforms.md`
5. `decisions/enterprise-adrs/adr-0005-default-backend-architecture.md`
6. `decisions/enterprise-adrs/adr-0006-policy-on-serverless-and-baas.md`

Baseline answer:
- choose a Node.js or FastAPI backend by default
- consider Supabase only for suitable low-complexity and rapid-delivery use cases
- use Firebase only by explicit exception for production business systems


## Additional Security and Authentication Guidance
- `domains/security/application-authentication-standard.md`
- `patterns/session-and-token-patterns.md`
- `vendors/authentication-platforms.md`
- `decisions/enterprise-adrs/adr-0007-standard-application-auth-pattern.md`
