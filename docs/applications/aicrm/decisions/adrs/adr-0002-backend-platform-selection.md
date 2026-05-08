# ADR-0002 Backend Platform Selection

## Status
Proposed

## Enterprise Default
The enterprise architecture documentation defines the default backend approach for business applications as a traditional backend service using the approved default backend architecture and approved backend frameworks. The enterprise guidance also states that serverless and BaaS platforms are not the default for strategic business systems.

## Application Decision
AICRM adopts the enterprise default backend approach.
AICRM will use the approved default backend path for business applications and will not request an exception for Supabase, Firebase, or another non-default primary backend platform at this stage.

## Rationale
This application is being migrated from a frontend-only architecture toward enterprise alignment. The application ADR records adoption of the enterprise default rather than introducing an application-specific exception.

## Alternatives Considered
- No exception requested at this stage
- Non-default serverless or BaaS approaches are not being selected for this application ADR

## Conformance / Exception Status
Conforms

## Related Enterprise Standards
- backend platform selection standard
- serverless and BaaS standard
- approved products list
- ADR-0005 default backend architecture
- ADR-0006 policy on serverless and BaaS

## Next Implementation Impact
Implementation planning should proceed using the enterprise default backend direction. A future implementation step may still choose between the enterprise-approved backend framework options if the enterprise documentation leaves that choice open.
