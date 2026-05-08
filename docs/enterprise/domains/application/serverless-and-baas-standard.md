# Serverless and BaaS Standard

## Purpose
This standard defines how the company evaluates and governs serverless and backend-as-a-service platforms.

## Position
Serverless and BaaS platforms are allowed selectively. They are not the default for strategic business applications.

The company prefers:
- open standards
- cloud portability
- explicit ownership of core domain logic
- relational data models where appropriate
- centralized identity and authorization

Because of those preferences, serverless and BaaS must be used carefully.

## Approved Usage Patterns
Serverless may be appropriate for:
- event handlers
- scheduled jobs
- webhook receivers
- lightweight automation
- image or file processing
- prototypes and pilots
- low-risk internal tools

BaaS may be appropriate for:
- small internal tools with simple CRUD requirements
- prototypes that need rapid delivery
- temporary products with clear retirement or migration plans
- isolated experiences with limited integration complexity

## Not Appropriate Without Review
Serverless or BaaS should not be the default for:
- systems of record
- applications with complex approval workflows
- applications with deep cross-system integrations
- applications with custom authorization models
- products that require high portability or a clear exit path
- multi-team platforms expected to grow significantly in business importance

## Platform Guidance
### Supabase
Supabase may be considered conditionally for small applications because:
- it aligns with PostgreSQL
- it uses open technologies
- it is more compatible with open source preferences than many fully proprietary alternatives

Supabase still requires review for production use when:
- row-level security becomes complex
- the application will become a system of record
- portability or self-hosting viability is uncertain
- the team plans to depend on platform-specific features

### Firebase
Firebase may be used only with architecture approval for production business systems.
Firebase is generally less preferred because:
- it increases provider lock-in
- its data and service model may fit poorly for relational business workflows
- migration away from Firebase can be costly
- enterprise integration and reporting needs often become more difficult over time

Firebase is more acceptable for:
- proofs of concept
- mobile-centric prototypes
- narrowly scoped apps with minimal domain complexity

## Decision Rules
If a team asks whether to adopt Node.js or FastAPI versus Supabase or Firebase, the standard answer is:
- choose Node.js or FastAPI by default
- consider Supabase only for small, low-complexity, fast-delivery use cases with clear constraints
- consider Firebase only for exceptional cases with strong product justification and accepted lock-in

## Required Controls
Any approved serverless or BaaS implementation must document:
- identity integration approach
- authorization model
- backup and export strategy
- observability coverage
- vendor exit strategy
- cost scaling assumptions
- ownership and support model
