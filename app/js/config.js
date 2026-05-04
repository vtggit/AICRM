/**
 * Frontend Configuration
 *
 * Central place for runtime configuration.  Override any value by setting
 * the matching key on `window.AICRM_CONFIG` *before* this script loads,
 * or by injecting a small <script> block in index.html:
 *
 *   <script>
 *     window.AICRM_CONFIG = { API_BASE_URL: 'http://localhost:9000/api' };
 *   </script>
 */
const Config = Object.freeze({
    /**
     * Base URL for the AICRM backend API (must end with /api).
     *
     * Resolution order:
     *   1. window.AICRM_CONFIG.API_BASE_URL  (manual override)
     *   2. explicit default below
     *   3. same-origin fallback  (window.location.origin + '/api')
     */
    API_BASE_URL: (function () {
        const manual = (typeof window.AICRM_CONFIG !== 'undefined')
            && window.AICRM_CONFIG.API_BASE_URL;
        if (manual) return manual.replace(/\/+$/, '');          // strip trailing slashes

        // Default: assume the backend runs on localhost:9000
        const defaultUrl = 'http://localhost:9000/api';

        // If we happen to be served from the same origin as the backend,
        // prefer same-origin so the app also works when served by FastAPI
        // itself (e.g. behind a reverse proxy or during local dev).
        if (window.location.origin === 'http://localhost:9000') {
            return window.location.origin + '/api';
        }

        return defaultUrl;
    })(),

    /** Human-readable environment label (shown in settings, logs, etc.) */
    ENVIRONMENT: 'development',

    // -----------------------------------------------------------------------
    // Authentication (public client configuration only — no secrets)
    // -----------------------------------------------------------------------

    /**
     * Whether the backend enforces authentication.
     * Overridden at runtime by /api/auth/config; the default is a safe
     * fallback so the UI can render before the network call completes.
     */
    AUTH_ENABLED: true,

    /** Identity Provider issuer URL (Keycloak, Entra ID, Auth0, …) */
    AUTH_ISSUER: (function () {
        const manual = (typeof window.AICRM_CONFIG !== 'undefined')
            && window.AICRM_CONFIG.AUTH_ISSUER;
        return manual || 'https://dev.example.com/realms/aicrm';
    })(),

    /** Public client ID — safe to expose in frontend code. */
    AUTH_CLIENT_ID: (function () {
        const manual = (typeof window.AICRM_CONFIG !== 'undefined')
            && window.AICRM_CONFIG.AUTH_CLIENT_ID;
        return manual || 'aicrm-frontend';
    })(),

    /** Redirect URI for code-flow login (placeholder for future SSO). */
    AUTH_REDIRECT_URI: (function () {
        const manual = (typeof window.AICRM_CONFIG !== 'undefined')
            && window.AICRM_CONFIG.AUTH_REDIRECT_URI;
        return manual || window.location.origin + window.location.pathname;
    })(),
});
