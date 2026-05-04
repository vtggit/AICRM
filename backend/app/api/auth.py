# Authentication-facing API endpoints

from fastapi import APIRouter, Depends

from app.auth.config import (
    AUTH_ALGORITHMS,
    AUTH_AUDIENCE,
    AUTH_CLIENT_ID,
    AUTH_ENABLED,
    AUTH_ISSUER,
    AUTH_JWKS_URL,
    AUTH_MODE,
)
from app.auth.dependencies import require_authenticated_user
from app.auth.models import AuthUser, MeResponse

router = APIRouter(prefix="/api/auth")


@router.get("/me")
def get_me(current_user: AuthUser = Depends(require_authenticated_user)) -> MeResponse:
    """
    Return the currently authenticated user's context.

    Requires a valid Bearer token.  The response contains normalised
    roles and groups derived from the IdP token claims.  Used by the
    frontend to establish auth state at startup and by future RBAC work
    to inspect roles.
    """
    return MeResponse(authenticated=True, user=current_user)


@router.get("/config")
def get_auth_config():
    """
    Public (unauthenticated) endpoint that exposes non-sensitive frontend
    auth configuration.

    Only public client metadata is returned — no secrets, keys, or tokens.
    """
    return {
        "authEnabled": AUTH_ENABLED,
        "authMode": AUTH_MODE,
        "issuer": AUTH_ISSUER,
        "clientId": AUTH_CLIENT_ID,
        "audience": AUTH_AUDIENCE,
        "jwksUrl": AUTH_JWKS_URL,
        "algorithms": AUTH_ALGORITHMS,
    }
