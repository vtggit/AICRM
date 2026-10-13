/**
 * AICRM Version Configuration
 *
 * The canonical version source is the VERSION file at repo root.
 * The backend reads it and exposes it via /api/health.
 * This module fetches the version from the backend at runtime to
 * avoid frontend/backend version drift.
 *
 * Contract consumption:
 *   • Uses ApiClient.get() instead of raw fetch() for consistency
 *   • Health endpoint response shape: { status, app_version, ... }
 *
 * Load-order independence (issue #349): this file is loaded before
 * api.js, so the fetch is deferred until the ApiClient global exists.
 * APP_VERSION is a promise that resolves to the version string, or to
 * null when the request fails or the payload carries no version. It
 * never rejects, so consumers can attach a .then() without risking a
 * page error. While it is pending the UI shows nothing; on failure the
 * sidebar stays empty and the Settings page reports "unavailable".
 */

/**
 * Wait until the ApiClient global (defined in api.js) is available.
 * Resolves with the client; rejects after a generous timeout if api.js
 * never defined it, so a broken script load degrades to "unavailable"
 * instead of hanging the UI.
 */
async function waitForApiClient(timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (typeof ApiClient !== 'undefined' && ApiClient) {
            return ApiClient;
        }
        if (Date.now() >= deadline) {
            throw new Error('ApiClient is not available');
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
}

/**
 * Fetch the current application version from the backend.
 * Resolves to the app_version string, or to null when the request
 * fails or the response has no usable version.
 */
async function fetchAppVersion() {
    try {
        const client = await waitForApiClient();
        const result = await client.get('/health');
        if (result && result.ok && result.data) {
            // app_version may legitimately be the number 0 — only null,
            // undefined or the empty string mean "no version".
            const version = result.data.app_version;
            if (version !== null && version !== undefined && version !== '') {
                return String(version);
            }
        }
    } catch (_error) {
        // Backend unreachable (or api.js failed to load); report unavailable.
    }
    return null;
}

// Expose APP_VERSION as a promise that resolves to the version string
// (or null when the backend does not provide one). Consumers must show
// nothing while it is pending and must never render a "loading" placeholder.
const APP_VERSION = fetchAppVersion();
