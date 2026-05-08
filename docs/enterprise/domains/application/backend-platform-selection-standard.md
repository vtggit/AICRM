# Backend Platform Selection Standard

## Purpose
This standard defines the default backend approach for company applications and the conditions under which teams may choose a traditional application backend, a serverless platform, or a backend-as-a-service platform.

## Default Position
The company default is a containerized application backend deployed on Linux using open standards and open source tools where practical.

For most internal business systems, the preferred starting point is:
- modular monolith architecture
- PostgreSQL as the primary relational database
- standards-based REST APIs
- centralized identity and access management
- containerized deployment using Docker Compose for small deployments

## Preferred Default
Teams should default to a traditional backend service when any of the following are true:
- the application contains meaningful domain logic
- the application requires custom workflows or complex authorization
- the application needs tight integration with enterprise services
- the application is expected to evolve over time into a strategic system
- the application must remain portable across hosting providers

Acceptable default backend frameworks:
- Python with FastAPI for API-centric services, workflow-heavy systems, data-oriented systems, and teams with strong Python skills
- Node.js for teams that benefit from full-stack TypeScript/JavaScript consistency, real-time workloads, or frontend-heavy delivery models

## When to Prefer FastAPI
FastAPI is preferred when:
- the team is strong in Python
- the system includes workflow logic, data transformation, or analytical processing
- clear request and response contracts are important
- high developer velocity with typed models and automatic OpenAPI generation is valuable

## When to Prefer Node.js
Node.js is preferred when:
- the team is strong in TypeScript or JavaScript
- the same team owns frontend and backend delivery
- the application needs real-time or event-driven web communication
- a shared language across UI and backend materially improves delivery

## When Serverless or BaaS May Be Considered
Serverless or backend-as-a-service options may be considered when:
- the workload is small, bursty, or event-driven
- the application is a prototype, pilot, or departmental utility with limited business criticality
- the team has limited operational capacity and can accept platform constraints
- the solution does not require deep custom domain logic
- vendor lock-in is understood and accepted by the business sponsor
- data residency, privacy, and integration concerns have been reviewed

## Required Evaluation Criteria
Before selecting a backend platform, the team must evaluate:
1. business criticality
2. domain complexity
3. data model complexity
4. authorization complexity
5. integration requirements
6. observability requirements
7. portability and exit strategy
8. operating model and support ownership
9. cost at expected scale
10. team skills and long-term maintainability

## Approval Rules
The following choices are approved by default:
- containerized Python/FastAPI backend
- containerized Node.js backend

The following choices require architecture review and a recorded ADR:
- Supabase for production systems
- Firebase for production systems
- any provider-specific serverless platform that becomes the primary system backend

## Explicit Guidance for Common Question
Question: Is the team prepared to introduce a Node.js/FastAPI backend or should we evaluate serverless options like Supabase/Firebase?

Baseline answer:
- assume a Node.js or FastAPI backend is the default choice
- evaluate Supabase or Firebase only if the team can demonstrate that lower operational overhead outweighs portability and control concerns
- prefer Supabase over Firebase when a BaaS approach is justified because Supabase aligns better with PostgreSQL, open source preferences, and SQL-based data models
- do not choose Firebase for systems that are expected to become strategic systems of record without explicit architecture approval

## Documentation Required
The application team must record the decision in:
- application ADR for backend platform selection
- standards conformance document
- exception register if a non-default platform is chosen
