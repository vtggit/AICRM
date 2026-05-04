from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.contacts import router as contacts_router
from app.api.templates import router as templates_router
from app.api.audit import router as audit_router
from app.api.leads import router as leads_router
from app.api.activities import router as activities_router
from app.api.settings import router as settings_router
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

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
)

# Request correlation — must be added before CORS so it wraps every request
app.add_middleware(RequestIDMiddleware)

# Per-request logging — logs method, path, status, and duration
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(contacts_router)
app.include_router(templates_router)
app.include_router(leads_router)
app.include_router(activities_router)
app.include_router(settings_router)
app.include_router(audit_router)


@app.on_event("startup")
def on_startup():
    """Initialize database schema on startup."""
    from app.db.schema import create_schema

    create_schema()
    logger.info("AICRM backend started (version=%s)", APP_VERSION)


@app.get("/")
def root():
    return {"message": f"{APP_NAME} backend is running"}
