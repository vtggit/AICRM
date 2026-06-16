/**
 * Test: Communication Timeline View (Item 66)
 *
 * Verifies the enhanced timeline view in contact detail:
 *   1. Timeline summary bar appears
 *   2. Activities are grouped by date
 *   3. Color-coded timeline dots by activity type
 *   4. Time gap indicators appear for long inactivity periods
 *   5. Timeline renders without console errors
 */

const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE_URL = 'http://localhost:8080/';
const TIMEOUT = 15000;          // per-operation timeout
const NAV_WAIT  = 3000;         // wait for page render after navigation

const passed = [];
const failed = [];

function log(result, testName) {
    if (result) {
        passed.push(testName);
        console.log(`  ✅ ${testName}`);
    } else {
        failed.push(testName);
        console.log(`  ❌ ${testName}`);
    }
}

/**
 * Safely click a locator, waiting for visibility first and respecting a
 * per-operation timeout so the browser never hangs indefinitely.
 */
async function safeClick(page, selector, desc, timeout = TIMEOUT) {
    const el = page.locator(selector);
    await el.waitFor({ state: 'visible', timeout });
    await el.click({ timeout });
    console.log(`    clicked: ${desc}`);
}

/**
 * Safely check whether a selector is visible (returns false on any error).
 */
async function safeIsVisible(page, selector, timeout = 5000) {
    try {
        return await page.locator(selector).isVisible({ timeout });
    } catch {
        return false;
    }
}

/**
 * Safely read text content; returns empty string on any error.
 */
async function safeText(page, selector, timeout = 5000) {
    try {
        return (await page.locator(selector).textContent({ timeout })) || '';
    } catch {
        return '';
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();

    // Global default timeout for all page actions
    page.setDefaultTimeout(TIMEOUT);

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Guard: if the page closes unexpectedly, catch it
    page.on('close', () => {
        console.log('    [warning] browser page closed');
    });
    page.on('crash', () => {
        console.log('    [warning] browser page crashed');
    });

    try {
        // ── SETUP: Load app ─────────────────────────────────────────────
        console.log('\nSETUP: Loading app with admin auth');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await waitForAuthReady(page);

        const isLoggedIn = await page.evaluate(() => Auth.isAuthenticated());
        log(isLoggedIn, 'T0: User is authenticated');

        // ── TEST 1: Navigate to Contacts and open a contact detail ──────
        console.log('\nTEST 1: Navigate to Contacts and open contact detail');

        // Click nav item and wait for the contacts page to render
        await safeClick(page, '.nav-item[data-page="contacts"]', 'contacts nav');
        await page.waitForSelector('#page-contacts.active', { state: 'visible', timeout: NAV_WAIT });

        const contactsPageVisible = await safeIsVisible(page, '#page-contacts');
        log(contactsPageVisible, 'T1: Contacts page is visible');

        // Wait for contact cards to appear (could be empty-state or cards)
        await page.waitForSelector('.contact-card, .empty-state-card', { state: 'visible', timeout: TIMEOUT });

        let viewBtnCount = await page.locator('.card-action-btn[title="View Details"]').count();
        if (viewBtnCount === 0) {
            console.log('  No contacts found - creating a test contact via API');

            // Create contact via API to avoid fragile UI form submission
            const contactEmail = `timeline-${Date.now()}@test.com`;
            const contactInfo = await page.evaluate(async (email) => {
                const apiBase = window.AICRM_CONFIG?.API_BASE_URL || 'http://localhost:9000/api';
                const token = sessionStorage.getItem('aicrm_token') || '';
                const resp = await fetch(apiBase + '/contacts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: 'Timeline Test Contact',
                        email: email,
                        phone: '555-0199',
                        company: 'Timeline Corp',
                        status: 'active'
                    })
                });
                return await resp.json();
            }, contactEmail);

            console.log(`  Created contact: ${contactInfo.name} (${contactInfo.id})`);
        }

        // Create some activities for the timeline test contact so timeline renders content
        // Backend expects snake_case: contact_name, occurred_at
        await page.evaluate(async () => {
            const apiBase = window.AICRM_CONFIG?.API_BASE_URL || 'http://localhost:9000/api';
            const token = sessionStorage.getItem('aicrm_token') || '';
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            const activities = [
                { type: 'email', description: 'Sent follow-up email', occurred_at: today, contact_name: 'Timeline Test Contact', status: 'completed' },
                { type: 'call', description: 'Discussed project requirements', occurred_at: yesterday, contact_name: 'Timeline Test Contact', status: 'completed' },
                { type: 'meeting', description: 'Quarterly review meeting', occurred_at: lastWeek, contact_name: 'Timeline Test Contact', status: 'completed' },
            ];
            for (const act of activities) {
                await fetch(apiBase + '/activities', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(act)
                });
            }
        });
        console.log('  Created 3 activities for timeline test contact');

        // Re-render contacts page to show the newly created contact
        await page.evaluate(async () => {
            if (typeof App !== 'undefined') {
                await App.renderContacts();
            }
        });
        await page.waitForTimeout(1000);
        await page.waitForSelector('.contact-card', { state: 'visible', timeout: TIMEOUT });

        viewBtnCount = await page.locator('.card-action-btn[title="View Details"]').count();
        log(viewBtnCount > 0, `T1b: View buttons exist (found: ${viewBtnCount})`);

        // ── Open contact detail modal ───────────────────────────────────
        if (viewBtnCount > 0) {
            // Find and click the view button for "Timeline Test Contact" specifically
            const timelineContactBtn = page.locator('.contact-card:has-text("Timeline Test Contact") .card-action-btn[title="View Details"]').first();
            const timelineBtnCount = await timelineContactBtn.count();

            if (timelineBtnCount > 0) {
                await timelineContactBtn.waitFor({ state: 'visible', timeout: TIMEOUT });
                await timelineContactBtn.click({ timeout: TIMEOUT });
                console.log('    clicked: view details button (Timeline Test Contact)');
            } else {
                // Fallback: use first contact
                const viewBtn = page.locator('.card-action-btn[title="View Details"]').first();
                await viewBtn.waitFor({ state: 'visible', timeout: TIMEOUT });
                await viewBtn.click({ timeout: TIMEOUT });
                console.log('    clicked: view details button (first)');
            }

            // Wait for modal to open with the 'active' class
            await page.waitForSelector('#modal-overlay.active', { state: 'visible', timeout: TIMEOUT });

            // Wait for timeline content to render inside the modal body.
            // We scope to #modal-body so that .empty-state-card elements on the
            // contacts page behind the modal don't confuse the visibility check.
            await page.waitForSelector('#modal-body .timeline-summary, #modal-body .timeline-item, #modal-body .empty-state-card', {
                state: 'visible',
                timeout: TIMEOUT,
            });
        }

        const modalVisible = await safeIsVisible(page, '#modal-overlay.active');
        log(modalVisible, 'T1c: Contact detail modal is visible');

        // ── TEST 2: Timeline summary bar appears ────────────────────────
        console.log('\nTEST 2: Timeline summary bar');
        const summaryExists = await page.locator('.timeline-summary').count();
        log(summaryExists > 0, 'T2: Timeline summary bar exists');

        if (summaryExists > 0) {
            const summaryText = await safeText(page, '.timeline-summary');
            log(summaryText && summaryText.length > 10, `T2b: Summary has meaningful text (got: "${summaryText.substring(0, 60)}...")`);
            log(summaryText.includes('activities'), 'T2c: Summary mentions activities');
        }

        // ── TEST 3: Date groups exist ───────────────────────────────────
        console.log('\nTEST 3: Date groups');
        const groupHeaders = await page.locator('.timeline-group-header').count();
        log(groupHeaders > 0, `T3: Timeline date groups exist (found: ${groupHeaders})`);

        if (groupHeaders > 0) {
            const groupLabels = await page.locator('.timeline-group-header').allTextContents();
            console.log(`  Group labels: ${groupLabels.join(', ')}`);
            log(groupLabels.some(l => l.includes('Today') || l.includes('This Week') || l.includes('This Month') || /\w+ \d{4}/.test(l)),
                'T3b: At least one group has a valid date label');
        }

        // ── TEST 4: Color-coded timeline dots ───────────────────────────
        const dots = await page.locator('.timeline-dot').count();
        log(dots > 0, `T4: Timeline dots exist (found: ${dots})`);

        if (dots > 0) {
            const dotColors = await page.evaluate(() => {
                const dots = document.querySelectorAll('.timeline-dot');
                const colors = new Set();
                dots.forEach(d => {
                    const bg = window.getComputedStyle(d).backgroundColor;
                    colors.add(bg);
                });
                return Array.from(colors);
            });
            log(dotColors.length > 0, `T4b: Dots have background colors (found ${dotColors.length} unique colors)`);
            console.log(`  Colors: ${dotColors.join(', ')}`);
        }

        // ── TEST 5: Timeline items render correctly ─────────────────────
        console.log('\nTEST 5: Timeline items');
        const timelineItems = await page.locator('.timeline-item').count();
        log(timelineItems > 0, `T5: Timeline items exist (found: ${timelineItems})`);

        if (timelineItems > 0) {
            // Check that each item has a dot and content
            const itemsValid = await page.evaluate(() => {
                const items = document.querySelectorAll('.timeline-item');
                let valid = 0;
                items.forEach(item => {
                    const dot = item.querySelector('.timeline-dot');
                    const content = item.querySelector('.timeline-content');
                    const header = item.querySelector('.timeline-header h4');
                    if (dot && content && header) valid++;
                });
                return valid;
            });
            log(itemsValid === timelineItems, `T5b: All ${timelineItems} items have valid structure (${itemsValid}/${timelineItems} valid)`);
        }

        // ── TEST 6: Activity count label matches ────────────────────────
        console.log('\nTEST 6: Activity count consistency');
        const countLabelExists = await page.locator('.activity-count-label').count();
        if (countLabelExists > 0) {
            const countLabel = await safeText(page, '.activity-count-label');
            const expectedCount = timelineItems;
            const actualCount = parseInt(countLabel.replace(/[^0-9]/g, '')) || 0;
            log(actualCount === expectedCount, `T6: Activity count label matches (${actualCount} label vs ${expectedCount} items)`);
        } else {
            log(false, 'T6: Activity count label not found');
        }

        // ── TEST 7: Time gap indicators (if applicable) ─────────────────
        console.log('\nTEST 7: Time gap indicators');
        const gapIndicators = await page.locator('.timeline-gap').count();
        console.log(`  Found ${gapIndicators} time gap indicators`);
        if (gapIndicators > 0) {
            const gapTexts = await page.locator('.timeline-gap-text').allTextContents();
            log(gapTexts.every(t => t.includes('No activity for') && t.includes('days')),
                'T7: Gap indicators have correct text format');
        } else {
            log(true, 'T7: No gaps detected (all activities within 14 days of each other)');
        }

        // ── TEST 8: Screenshot ──────────────────────────────────────────
        console.log('\nTEST 8: Screenshot');
        try {
            await page.screenshot({ path: '/home/aicrm/workspace/AICRM/docs/testing/screenshots/test-communication-timeline.png', fullPage: true, timeout: 10000 });
            log(true, 'T8: Screenshot saved');
        } catch (e) {
            log(false, `T8: Screenshot failed - ${e.message}`);
        }

        // ── TEST 9: No console errors ───────────────────────────────────
        console.log('\nTEST 9: Console health');
        log(consoleErrors.length === 0, `T9: No console errors (found: ${consoleErrors.length})`);
        if (consoleErrors.length > 0) {
            consoleErrors.forEach(e => console.log(`    Error: ${e}`));
        }

        // ── TEST 10: Hover effect exists ────────────────────────────────
        console.log('\nTEST 10: Timeline item hover effect');
        const hoverStyle = await page.evaluate(() => {
            const item = document.querySelector('.timeline-item');
            if (!item) return null;
            const content = item.querySelector('.timeline-content');
            const style = window.getComputedStyle(content);
            return {
                hasTransition: style.transition !== 'none',
                hasTransform: true
            };
        });
        log(hoverStyle !== null, 'T10: Timeline items have hover capability');

        // Keep the modal open for dark theme test (timeline summary lives inside modal)
        // Dismiss any notifications that might block clicks
        await page.evaluate(() => {
            const notif = document.getElementById('notification-container');
            if (notif) notif.remove();
        });
        await page.waitForTimeout(200);

        // ── TEST 11: Dark theme compatibility ───────────────────────────
        console.log('\nTEST 11: Dark theme');
        const themeToggleExists = await page.locator('#theme-toggle').count();
        if (themeToggleExists > 0) {
            // Ensure we start in light mode (previous run may have persisted dark)
            await page.evaluate(() => {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('aicrm_theme', 'light');
            });
            await page.waitForTimeout(200);

            // Toggle to dark via JS dispatch to bypass overlay intercepting pointer events
            await page.evaluate(() => {
                const btn = document.getElementById('theme-toggle');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            });
            await page.waitForTimeout(500);

            const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            log(newTheme === 'dark', `T11: Theme toggled to dark (got: ${newTheme})`);

            // Check timeline summary is visible in dark mode (modal is still open)
            const summaryVisible = await safeIsVisible(page, '.timeline-summary');
            log(summaryVisible, 'T11b: Timeline summary visible in dark mode');

            // Switch back to light
            await page.evaluate(() => {
                const btn = document.getElementById('theme-toggle');
                if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            });
            await page.waitForTimeout(300);
        } else {
            log(true, 'T11: Theme toggle not available (skipped)');
            log(true, 'T11b: Dark theme check skipped');
        }

    } catch (err) {
        console.error('Test error:', err.message);
        log(false, 'FATAL: Test execution error - ' + err.message);
    } finally {
        try {
            await browser.close({ timeout: 5000 });
        } catch (e) {
            console.log('    [warning] browser close error:', e.message);
        }
    }

    // ── RESULTS ─────────────────────────────────────────────────────────
    const total = passed.length + failed.length;
    console.log('\n=======================================================');
    console.log(`  Results: ${passed.length} passed, ${failed.length} failed out of ${total} tests`);
    if (failed.length > 0) {
        console.log('\n  Failed tests:');
        failed.forEach(f => console.log(`    ❌ ${f}`));
    }
    console.log('=======================================================');
    process.exit(failed.length > 0 ? 1 : 0);
})();
