from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.observability.logging import setup_logging
from app.observability.middleware import (
    RequestIDMiddleware,
    RequestLoggingMiddleware,
)

# ---------------------------------------------------------------------------
# Bootstrap logging before anything else runs
# ---------------------------------------------------------------------------
setup_logging()

import logging

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory — returns a configured FastAPI instance.

    Exists primarily so tests can create isolated app instances after
    mutating environment variables.  The module-level ``app`` variable
    calls this factory for normal startup.
    """
    application = FastAPI(
        title=APP_NAME,
        version=APP_VERSION,
    )

    # Request correlation — must be added before CORS so it wraps every request
    application.add_middleware(RequestIDMiddleware)

    # Per-request logging — logs method, path, status, and duration
    application.add_middleware(RequestLoggingMiddleware)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Import routers inside the factory so they capture the current
    # app instance when reloaded between tests.
    from app.api.activities import router as activities_router
    from app.api.audit import router as audit_router
    from app.api.auth import router as auth_router
    from app.api.contacts import router as contacts_router
    from app.api.health import router as health_router
    from app.api.leads import router as leads_router
    from app.api.settings import router as settings_router
    from app.api.templates import router as templates_router

    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(contacts_router)
    application.include_router(templates_router)
    application.include_router(leads_router)
    application.include_router(activities_router)
    application.include_router(settings_router)
    application.include_router(audit_router)

    @application.on_event("startup")
    def on_startup():
        """Log startup — schema migrations are handled by Alembic in start.sh."""
        logger.info("AICRM backend started (version=%s)", APP_VERSION)

    @application.get("/")
    def root():
        return {"message": f"{APP_NAME} backend is running"}

    return application


# Module-level app for normal uvicorn startup
app = create_app()
