/**
 * Shared authentication helper for Playwright E2E tests.
 *
 * The AICRM frontend uses a token-based auth system.  The backend
 * accepts a development token (default: "dev-secret-token") with an
 * optional role suffix (e.g. "dev-secret-token:admin").
 *
 * This helper provides two strategies:
 *
 *   1. setPageAuth(context, token) — Inject the token into sessionStorage
 *      BEFORE the page loads, so Auth.init() picks it up automatically.
 *      This is the fastest and most reliable approach.
 *
 *   2. loginViaUI(page, token) — Use the UI login modal.  Useful for
 *      testing the login flow itself, but slower and more fragile.
 *
 * Usage:
 *   const { setPageAuth, loginViaUI } = require('./auth-helper');
 *
 *   // Preferred: inject token before page load
 *   await setPageAuth(context, 'dev-secret-token:admin');
 *   const page = await context.newPage();
 *   await page.goto(BASE_URL);
 *   // Auth.init() will resolve with the token already in sessionStorage
 */

/**
 * Default admin dev token.  Matches backend AUTH_DEV_TOKEN with
 * the admin role suffix so the user gets ["admin", "user"] roles.
 */
const DEFAULT_ADMIN_TOKEN = 'dev-secret-token:admin';
const DEFAULT_USER_TOKEN = 'dev-secret-token:user';

/**
 * Inject a bearer token into the browser context's sessionStorage
 * BEFORE any page is created.  When the page loads and calls
 * Auth.init(), the token will be found in sessionStorage and
 * /api/auth/me will be called with the Authorization header.
 *
 * This avoids the race condition of clicking login buttons and
 * waiting for async responses.
 */
async function setPageAuth(context, token = DEFAULT_ADMIN_TOKEN) {
    await context.addInitScript((tok) => {
        window.AICRM_TEST_TOKEN = tok;
        try {
            sessionStorage.setItem('aicrm_token', tok);
        } catch {
            // sessionStorage may not be available in init scripts
        }
    }, token);
}

/**
 * Ensure the page has finished initializing auth.  Waits for
 * Auth._initialized to be true and optionally for Auth.isAuthenticated()
 * to return true.
 *
 * Returns the current user object if authenticated, null otherwise.
 */
async function waitForAuthReady(page, expectAuthenticated = true, timeout = 10000) {
    const user = await page.waitForFunction(
        (expect) => {
            if (typeof Auth === 'undefined') return null;
            if (!Auth._initialized) return null;
            if (expect && !Auth.isAuthenticated()) return null;
            return Auth.getCurrentUser();
        },
        expectAuthenticated,
        { timeout }
    );
    return user.jsonValue();
}

/**
 * Login using the UI modal flow.  Opens the login modal, fills
 * the token, and waits for the auth state to update.
 *
 * Slower than setPageAuth but useful for testing the login UI itself.
 */
async function loginViaUI(page, token = DEFAULT_ADMIN_TOKEN) {
    // Click the auth status indicator to open the login modal
    await page.click('#auth-status');
    await page.waitForSelector('#login-modal', { timeout: 5000 });

    // Fill token and submit
    await page.fill('#login-token', token);
    await page.click('#login-submit');

    // Wait for the modal to close AND auth to be established
    await page.waitForFunction(() => {
        const modal = document.getElementById('login-modal');
        return !modal || !modal.classList.contains('active');
    }, { timeout: 10000 });

    // Wait for Auth state to be ready
    await waitForAuthReady(page, true);
}

/**
 * Create a fully authenticated browser context.  Convenience wrapper
 * that launches a browser, creates a context with the token pre-injected,
 * and returns both.
 *
 * Usage:
 *   const { browser, context, page } = await createAuthSession({ admin: true });
 *   // ... run tests ...
 *   await browser.close();
 */
async function createAuthSession(options = {}) {
    const { chromium } = require('playwright');
    const { admin = true, headless = true, viewport = { width: 1280, height: 900 } } = options;
    const token = admin ? DEFAULT_ADMIN_TOKEN : DEFAULT_USER_TOKEN;

    const browser = await chromium.launch({ headless });
    const context = await browser.newContext({ viewport });
    await setPageAuth(context, token);
    const page = await context.newPage();
    return { browser, context, page };
}

module.exports = {
    setPageAuth,
    waitForAuthReady,
    loginViaUI,
    createAuthSession,
    DEFAULT_ADMIN_TOKEN,
    DEFAULT_USER_TOKEN,
};
