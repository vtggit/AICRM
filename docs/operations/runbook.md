# AICRM Operations Runbook

Practical first-response guidance for common incidents.

## Table of Contents

- [Backend Not Starting](#backend-not-starting)
- [Database Connection Failure](#database-connection-failure)
- [Migration Failure](#migration-failure)
- [Auth Failure / Invalid Token](#auth-failure--invalid-token)
- [Forbidden Action Confusion](#forbidden-action-confusion)
- [Backend Reachable but Domain Request Failing](#backend-reachable-but-domain-request-failing)
- [Audit Logging Issues](#audit-logging-issues)

---

## Backend Not Starting

**Symptoms:**
- Backend container exits immediately or fails to start
- Frontend shows "Backend server is unreachable" banner
- `/api/health` returns no response

**Where to look:**
```bash
docker logs aicrm-backend --tail 50
```

**First checks:**
1. Is the container running? `docker ps -a | grep aicrm-backend`
2. Check startup logs for `[startup] ERROR:` lines
3. Verify environment variables are set (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)

**Likely causes and resolution:**
- **Database not ready:** Backend waits 60s for PostgreSQL. If DB is down, startup fails with a clear error. Start the database first.
- **Port conflict:** Another process is using port 9000. Check with `lsof -i :9000`.
- **Missing dependencies:** Python packages not installed. Rebuild the container.
- **Configuration error:** Invalid env vars. Check `docker inspect aicrm-backend` for Environment section.

---

## Database Connection Failure

**Symptoms:**
- Backend logs show `[startup] ERROR: PostgreSQL ... did not become ready`
- Frontend shows "The service is temporarily unavailable" on API requests
- `/api/health/ready` returns `status: "degraded"` with database error

**Where to look:**
```bash
docker logs aicrm-backend --tail 50 | grep -i "database\|postgres\|psycopg"
docker logs aicrm-db --tail 50
```

**First checks:**
1. Is PostgreSQL running? `docker ps | grep aicrm-db`
2. Can you connect manually? `docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT 1"`
3. Are connection parameters correct? Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

**Likely causes and resolution:**
- **Database container not started:** `docker start aicrm-db`
- **Database not accepting connections yet:** Wait for PostgreSQL to fully initialize (can take 10-30s).
- **Wrong credentials:** Verify environment variables match database configuration.
- **Network issue:** If using Docker networks, verify containers are on the same network.

---

## Migration Failure

**Symptoms:**
- Backend logs show `[startup] ERROR: Database migrations failed`
- Backend process exits with non-zero code
- Error mentions specific migration file or SQL error

**Where to look:**
```bash
docker logs aicrm-backend --tail 100 | grep -A 20 "migration"
```

**First checks:**
1. Check the specific migration error in logs
2. Verify database schema version: `docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT version_num FROM alembic_version"`
3. Check if migration files exist: `docker exec aicrm-backend find /app/alembic/versions -name "*.py"`

**Likely causes and resolution:**
- **Stale schema:** Database was modified outside of migrations. Run `alembic current` and `alembic heads` to diagnose.
- **Conflicting migration:** Two HEAD revisions. Run `alembic merge` to resolve.
- **Missing migration file:** New code references tables not yet created. Create and run the migration.
- **Database permissions:** PostgreSQL user lacks CREATE/ALTER permissions. Grant required privileges.

**Recovery steps:**
```bash
# Inspect migration state
docker exec aicrm-backend alembic current
docker exec aicrm-backend alembic history

# If safe to stamp (e.g., schema manually matches a revision)
docker exec aicrm-backend alembic stamp <revision>

# Re-run migrations
docker exec aicrm-backend alembic upgrade head
```

---

## Auth Failure / Invalid Token

**Symptoms:**
- Frontend shows "You must sign in to perform this action"
- API returns 401 responses
- Backend logs show `auth: unauthenticated access attempt` or `auth: token validation failed`

**Where to look:**
```bash
docker logs aicrm-backend --tail 50 | grep -i "auth\|token\|401"
```

**First checks:**
1. Is the user logged in? Check browser dev tools → Application → LocalStorage for `token`
2. Is the token expired? Check token expiry in dev tools
3. What auth mode is configured? Check AUTH_MODE environment variable

**Auth failure types and meanings:**

| Log message | Meaning | Resolution |
|---|---|---|
| `auth: unauthenticated access attempt` | No token provided | User needs to log in |
| `auth: token validation failed — ExpiredSignatureError` | Token expired | User needs to log in again |
| `auth: token validation failed — InvalidSignatureError` | Token is invalid | Clear local storage, log in again |
| `auth: token validation failed — InvalidIssuerError` | Issuer mismatch | Check AUTH_ISSUER config |
| `auth: token validation failed — InvalidAudienceError` | Audience mismatch | Check AUTH_AUDIENCE config |
| `auth: JWKS fetch failed` | Can't reach auth provider | Check network connectivity to auth provider |
| `auth: development mode — accepting any token` | Dev mode active | Expected in development; use production mode for real auth |

**Likely causes and resolution:**
- **Expired token:** Normal occurrence. User logs in again.
- **Auth mode misconfiguration:** AUTH_MODE should be "development" or "production". Check environment.
- **JWKS endpoint unreachable:** Production auth can't fetch signing keys. Check network and AUTH_JWKS_URI.
- **Stale token in localStorage:** Clear browser localStorage and log in again.

---

## Forbidden Action Confusion

**Symptoms:**
- Frontend shows "You do not have permission to perform this action"
- API returns 403 responses
- User is logged in but can't access certain features

**Where to look:**
```bash
docker logs aicrm-backend --tail 50 | grep -i "forbidden\|403\|admin"
```

**First checks:**
1. Is the user an admin? Check `is_admin` claim in their token
2. Are they trying to access admin-only features? (settings, audit log)
3. Is the route protected? Check backend route decorators for `require_admin`

**Likely causes and resolution:**
- **Non-admin user accessing admin features:** Expected behavior. Only admin users can access settings and audit logs.
- **Token missing is_admin claim:** If the user should be admin, re-authenticate with correct claims.
- **Frontend not hiding admin UI:** Admin-only elements should be hidden for non-admin users. If visible, it's a frontend bug.

---

## Backend Reachable but Domain Request Failing

**Symptoms:**
- `/api/health` returns 200 OK
- Specific API endpoints return 500, 503, or other errors
- Frontend shows error notifications for specific actions

**Where to look:**
```bash
# Check backend logs for the specific error
docker logs aicrm-backend --tail 100 | grep -i "error\|exception\|500"

# Check readiness (includes database connectivity)
curl http://localhost:9000/api/health/ready
```

**First checks:**
1. Is the database actually reachable? Check `/api/health/ready`
2. Is there a specific request ID in the error? Search logs for that request ID
3. Are there database connection errors? Check for `psycopg2` errors in logs

**Likely causes and resolution:**
- **Database connection dropped:** Backend process is running but DB connection failed. Restart backend.
- **Schema mismatch:** Code expects columns that don't exist. Run migrations.
- **Application bug:** Check backend logs for stack traces. Fix the bug.
- **Data validation error:** Check request payload matches API contract.

---

## Audit Logging Issues

**Symptoms:**
- API mutations fail with 500 errors
- Backend logs show `audit: failed to write event`
- Audit log endpoint returns errors

**Current behavior (Option B):**
When audit writing fails, the entire business mutation fails. This ensures audit completeness but means audit failures block data changes.

**Where to look:**
```bash
docker logs aicrm-backend --tail 50 | grep -i "audit"
```

**First checks:**
1. Is the audit_log table accessible? `docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT count(*) FROM audit_log"`
2. Are there database permission issues on the audit_log table?
3. Is the database disk full?

**Likely causes and resolution:**
- **Audit table missing:** Run migrations to create the table.
- **Database permissions:** Grant INSERT on audit_log to the application user.
- **Database disk full:** Free disk space or expand volume.
- **Constraint violation:** Check audit_log table constraints for conflicts.

**Policy note:** If audit failures are causing too many business disruptions, the policy can be changed to Option A (business succeeds, audit failure is logged) by modifying `audit_service.py` to catch and log instead of re-raising. See the module docstring for details.

---

## General Troubleshooting Commands

```bash
# View all container logs
docker logs aicrm-backend --tail 100
docker logs aicrm-db --tail 50

# Check container health
docker ps
docker inspect aicrm-backend | grep -A 5 State

# Test backend connectivity
curl http://localhost:9000/api/health
curl http://localhost:9000/api/health/ready

# Test database connectivity
docker exec -it aicrm-db psql -U aicrm -d aicrm -c "SELECT 1"

# Check environment variables
docker inspect aicrm-backend | grep -A 20 Environment

# Restart the stack
docker compose restart backend
```

## Request ID Tracing

Every request to the backend includes a unique `request_id` in both logs and error responses. Use this to trace a specific request through the system:

1. Note the `request_id` from the frontend error message or response headers
2. Search backend logs: `docker logs aicrm-backend | grep "<request_id>"`
3. This shows the complete log trail for that specific request
