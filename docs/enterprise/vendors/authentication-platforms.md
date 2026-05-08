# Authentication Platforms

## Purpose
This document compares approved and exception-only authentication platform choices.

## Enterprise Recommendation
### Preferred platform
**Keycloak** is the preferred authentication platform for new enterprise applications.

Why:
- open source and self-hostable
- supports OIDC, OAuth 2.0, and SAML
- centralizes authentication, federation, and role/claim management
- aligns with an open-source-first and portability-oriented strategy

### Acceptable alternative
**Microsoft Entra ID** is acceptable when:
- the company relies heavily on Microsoft 365 and Entra directory services
- operational support is already centered on Microsoft identity tooling
- enterprise support expectations outweigh open-source-first preferences

### Exception-only platforms
Consumer-oriented or application-specific authentication services are exception-only for core business systems unless architecture review approves them.

## Category Comparison
### Centralized identity provider platform
Examples:
- Keycloak
- Microsoft Entra ID

Use when:
- multiple business applications need a common login and policy surface
- RBAC, SSO, federation, and centralized policy are required
- enterprise lifecycle control matters

Status:
- **Preferred category**

### Embedded or product-specific auth platform
Examples:
- Supabase Auth
- Firebase Authentication

Use when:
- the application is low-complexity
- the platform selection has already been justified
- the team accepts tighter coupling to a managed platform

Status:
- **Conditional or exception-only category** for core enterprise systems

## Explicit Answer
The preferred “authentication provider” is not OAuth2 or JWT by themselves. The preferred provider is a **centralized identity platform**, with **Keycloak** as the default choice.

OIDC/OAuth 2.0 are the required protocols used with that provider. JWT is an implementation artifact used for token-based API access, not the preferred provider.
