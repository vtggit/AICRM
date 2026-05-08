# Authentication Provider Standard

## Purpose
This standard identifies the preferred identity provider for enterprise applications.

## Preferred Default
Keycloak is the preferred authentication and identity brokering platform.

## Why
- open source and self-hostable
- supports OIDC, OAuth 2.0, and SAML
- supports federation and centralized role or claim management
- aligns with a portability-oriented architecture strategy

## Acceptable Alternative
Microsoft Entra ID may be used when company productivity tooling, directory integration, or support requirements make it the better choice.

## Important Clarification
This document answers **provider selection** only.
- OAuth 2.0 and OIDC are protocol standards, not providers
- JWT is a token format and implementation mechanism, not a provider

For the full enterprise answer on provider, protocol, and session/token pattern, see `application-authentication-standard.md`.
