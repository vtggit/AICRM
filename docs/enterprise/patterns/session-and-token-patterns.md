# Session and Token Patterns

## Purpose
This document describes the approved enterprise patterns for managing user sessions, API access tokens, and machine identities.

## Default Pattern Summary
| Use case | Preferred pattern | Why |
|---|---|---|
| Internal web app | OIDC login plus secure HTTP-only cookie session | minimizes browser token exposure and fits enterprise admin apps |
| SPA with backend APIs | OIDC Authorization Code Flow with PKCE and short-lived access tokens | standards-based and suitable for modern front ends |
| Service-to-service | OAuth 2.0 client credentials or workload identity | avoids custom shared authentication |
| Legacy federation | SAML only by exception or compatibility requirement | legacy interoperability |

## Pattern 1: Web session with centralized identity provider
Use for:
- internal line-of-business applications
- CRM systems
- admin portals
- applications with browser-driven workflows

Pattern:
1. redirect user to Keycloak or approved enterprise IdP
2. complete OIDC authentication
3. application establishes server-side session
4. browser receives secure, HTTP-only, same-site cookie
5. application refreshes or re-establishes IdP tokens on the server side as needed

Preferred because:
- limits token exposure in the browser
- fits traditional enterprise access control models
- simplifies logout, revocation, and role refresh patterns

## Pattern 2: Access token for API calls
Use for:
- API gateways
- backend APIs
- SPA-to-API calls when justified
- mobile APIs

Pattern:
- issue short-lived JWT bearer access tokens
- validate issuer, audience, expiry, and signature
- keep scopes and claims minimal
- rotate signing keys under centralized IdP control

Guardrails:
- keep lifetimes short
- do not rely on browser local storage for long-lived tokens
- do not embed sensitive application state in tokens

## Pattern 3: Refresh token usage
Refresh tokens are allowed only when:
- the application type requires them
- secure storage is defined
- rotation and revocation are supported
- the security review approves the design

For standard server-rendered or backend-managed web apps, prefer server-managed sessions over direct browser refresh token handling.

## Pattern 4: Service identity
Preferred patterns:
- OAuth 2.0 client credentials
- workload identity federation
- mTLS only when clearly justified by integration design

Avoid:
- long-lived shared API keys as the default authentication mechanism
- secrets committed into repositories

## Anti-Patterns
- application-specific local password stores for new enterprise systems
- long-lived tokens in browser storage
- ad hoc JWT issuance by individual applications when a central IdP already exists
- using “JWT sessions” as a catch-all replacement for proper web session design

## Direct Answer for Teams
If a team asks what is preferred between OAuth2, JWT sessions, or a third-party auth service, use this interpretation:
- **third-party auth service:** yes, use a centralized IdP such as Keycloak
- **OAuth2/OIDC:** yes, this is the required protocol family
- **JWT sessions:** only as part of short-lived token-based API access where appropriate; not the default answer for browser session management
