# ADR-0007 Standard Application Authentication Pattern

## Status
Accepted

## Context
Teams need a direct enterprise answer to questions such as: “What authentication provider is preferred: OAuth2, JWT sessions, or third-party auth service?” The organization needs one approved interpretation that distinguishes provider selection from protocol and token/session handling.

## Decision
The standard enterprise authentication pattern is:
- use a centralized third-party identity provider
- prefer Keycloak as the default provider
- use OIDC built on OAuth 2.0 as the authentication and authorization protocol family
- use secure, HTTP-only cookie-backed sessions for browser-facing enterprise web applications whenever practical
- use short-lived JWT bearer tokens for API access and service-to-service communication

## Rationale
This decision:
- provides one company-wide authentication model
- reduces application-specific auth implementations
- supports single sign-on and centralized policy
- limits browser exposure to tokens for standard internal applications
- preserves open-source alignment and portability

## Consequences
### Positive
- more consistent security model across applications
- simpler onboarding for application teams
- clearer distinction between provider, protocol, and token pattern
- reduced duplicate auth logic in application code

### Negative
- some front-end architectures may require additional integration work compared with embedded auth services
- teams may need help integrating OIDC correctly
- exceptions still need review for mobile, public consumer apps, and platform-coupled products

## Non-Preferred Approaches
The following are not the default enterprise answer:
- custom local authentication systems
- long-lived JWT-only browser session models as the standard for internal apps
- selecting an auth provider solely because it is bundled with a broader backend platform

## Related Documents
- `docs/enterprise/domains/security/application-authentication-standard.md`
- `docs/enterprise/patterns/session-and-token-patterns.md`
- `docs/enterprise/vendors/authentication-platforms.md`
