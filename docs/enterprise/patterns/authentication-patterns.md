# Authentication Patterns

## Summary
Preferred enterprise pattern:
- centralized identity provider using OIDC for user authentication
- secure HTTP-only cookie-backed sessions for browser-facing enterprise applications
- short-lived JWT bearer tokens for APIs and service-to-service calls

## Direct Answer
When teams ask whether the preference is OAuth2, JWT sessions, or a third-party auth service, interpret the question as follows:
- **preferred provider model:** centralized third-party identity provider
- **preferred provider product:** Keycloak
- **preferred protocol family:** OIDC / OAuth 2.0
- **preferred browser session model:** cookie-backed server-managed session
- **preferred API access model:** short-lived JWT bearer tokens

See `session-and-token-patterns.md` for the detailed breakdown.
