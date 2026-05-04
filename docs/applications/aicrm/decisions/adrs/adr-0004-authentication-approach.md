# ADR-0004 Authentication Approach

## Status
Proposed

## Enterprise Default
The enterprise architecture documentation defines the preferred identity provider, authentication protocol family, and standard application authentication pattern for enterprise applications.

## Application Decision
AICRM adopts the enterprise default authentication and identity approach.
AICRM will use the enterprise-approved identity provider and enterprise-approved authentication standard and will not request an authentication exception at this stage.

## Rationale
The application is moving from a non-centralized current state toward enterprise-aligned identity, role-based access control, and standardized authentication patterns. This ADR records conformance to that enterprise direction.

## Alternatives Considered
- No authentication exception requested at this stage
- Application-local authentication is not being selected as the target-state model

## Conformance / Exception Status
Conforms

## Related Enterprise Standards
- identity and access management standard
- authentication provider standard
- application authentication standard
- approved products list
- ADR-0002 standard identity provider
- ADR-0007 standard application auth pattern

## Next Implementation Impact
A future implementation step will define role mapping, protected routes, backend validation behavior, and the concrete login/session flow according to enterprise standards.
