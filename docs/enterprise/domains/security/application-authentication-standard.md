# Application Authentication Standard

## Purpose
This standard defines the approved application-level authentication model for enterprise applications. It separates three related but different choices:
- identity provider selection
- protocol selection
- session and token implementation pattern

## Standard Enterprise Answer
For new enterprise applications, the preferred model is:
- **Provider:** Keycloak
- **Protocol:** OpenID Connect (OIDC) built on OAuth 2.0
- **Web application session pattern:** server-managed session established after OIDC login, exposed to the browser through secure, HTTP-only cookies
- **API access token pattern:** short-lived JWT bearer tokens issued by the centralized identity provider

## Required Interpretation
The following terms are not interchangeable:
- **third-party auth service** means the identity provider or authentication platform
- **OAuth 2.0 / OIDC** means the protocol standard
- **JWT session** usually means a token handling pattern, not a provider choice

When teams ask, “What authentication provider is preferred: OAuth2, JWT sessions, or third-party auth service?” the enterprise answer is:
- choose a **centralized third-party identity provider** as the provider model
- use **OIDC/OAuth 2.0** as the protocol standard
- use **cookie-backed application sessions for web apps** and **short-lived JWT bearer tokens for API calls**

## Provider Standard
### Preferred default
Keycloak is the preferred identity provider for new enterprise applications.

### Acceptable alternative
Microsoft Entra ID may be used when Microsoft 365 integration, corporate directory alignment, or support expectations justify the choice.

### Exception-only choices
Application-local username and password stores, ad hoc authentication modules, and consumer-oriented authentication services are exception-only and must be approved through architecture review.

## Protocol Standard
### Required default
Applications must use OIDC for user authentication when supported by the selected identity provider.

### Allowed supporting standards
- OAuth 2.0 for delegated authorization and token issuance
- SAML only when a legacy integration requires it

### Discouraged approach
Custom authentication protocols or direct password handling in the application are discouraged and require explicit approval.

## Session and Token Standard
### Browser-based web applications
Preferred pattern:
- authenticate with OIDC using the centralized identity provider
- establish a server-managed application session
- store the browser-facing session in a secure, HTTP-only, same-site cookie
- keep token handling on the server side whenever practical

This is the preferred pattern for internal business applications, enterprise CRM systems, and admin tooling.

### Single-page applications and API-heavy front ends
Allowed pattern:
- authenticate with OIDC Authorization Code Flow with PKCE
- use short-lived access tokens
- use refresh tokens only when the security review approves storage and rotation controls
- avoid long-lived tokens in browser storage

### Service-to-service communication
Preferred pattern:
- use OAuth 2.0 client credentials or workload identity
- issue short-lived bearer tokens
- avoid shared static credentials when federated identity or vault-backed secrets are available

## Explicit Preferences
### Preferred answer by application type
#### Internal web applications
- provider: Keycloak
- protocol: OIDC
- session pattern: secure server-side session with HTTP-only cookies

#### API platforms
- provider: Keycloak
- protocol: OAuth 2.0 / OIDC
- token pattern: short-lived JWT bearer tokens

#### Machine-to-machine integrations
- provider: Keycloak or approved workload identity provider
- protocol: OAuth 2.0 client credentials or workload identity federation
- token pattern: short-lived bearer tokens

## Disallowed or discouraged patterns
- storing raw credentials in the application database for new enterprise applications
- creating a custom local authentication subsystem without architecture approval
- storing long-lived access tokens in browser local storage for standard enterprise web applications
- treating JWT as the default answer for all session management needs

## Decision Rule
If a team asks whether the company prefers OAuth2, JWT sessions, or a third-party auth service, the answer is:
1. choose a centralized third-party identity provider, preferably Keycloak
2. use OIDC/OAuth 2.0 as the protocol
3. use session cookies for browser-facing enterprise web applications
4. use short-lived JWT bearer tokens for API and service-to-service access

## Exceptions
Exceptions require documentation of:
- business driver
- security implications
- token storage model
- vendor lock-in impact
- migration and exit plan
- operational support owner

## Related Documents
- `docs/enterprise/domains/security/authentication-provider-standard.md`
- `docs/enterprise/domains/security/identity-and-access-management-standard.md`
- `docs/enterprise/patterns/session-and-token-patterns.md`
- `docs/enterprise/vendors/authentication-platforms.md`
- `docs/enterprise/decisions/enterprise-adrs/adr-0002-standard-identity-provider.md`
- `docs/enterprise/decisions/enterprise-adrs/adr-0007-standard-application-auth-pattern.md`
