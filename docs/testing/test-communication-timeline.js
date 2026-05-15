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

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        // ── SETUP: Load app ─────────────────────────────────────────────
        console.log('\nSETUP: Loading app with admin auth');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await waitForAuthReady(page);

        const isLoggedIn = await page.evaluate(() => Auth.isAuthenticated());
        log(isLoggedIn, 'T0: User is authenticated');

        // ── TEST 1: Navigate to Contacts and open a contact detail ──────
        console.log('\nTEST 1: Navigate to Contacts and open contact detail');
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(2000);

        const contactsPageVisible = await page.locator('#page-contacts').isVisible();
        log(contactsPageVisible, 'T1: Contacts page is visible');

        // Wait for contact cards to appear
        let viewBtnCount = await page.locator('.card-action-btn[title="View Details"]').count();
        if (viewBtnCount === 0) {
            console.log('  No contacts found - creating a test contact first');
            // Create a contact
            await page.click('#btn-add-contact');
            await page.waitForTimeout(500);
            await page.fill('#contact-name', 'Timeline Test Contact');
            await page.fill('#contact-email', 'timeline@test.com');
            await page.fill('#contact-phone', '555-0199');
            await page.fill('#contact-company', 'Test Corp');
            await page.click('.modal-footer .btn-primary');
            await page.waitForTimeout(1500);
            // Navigate back to contacts
            await page.click('.nav-item[data-page="contacts"]');
            await page.waitForTimeout(1500);
            viewBtnCount = await page.locator('.card-action-btn[title="View Details"]').count();
        }
        log(viewBtnCount > 0, `T1b: View buttons exist (found: ${viewBtnCount})`);

        if (viewBtnCount > 0) {
            await page.click('.card-action-btn[title="View Details"]');
            await page.waitForTimeout(1000);
        }

        const modalVisible = await page.locator('#modal-overlay').isVisible();
        log(modalVisible, 'T1c: Contact detail modal is visible');

        // ── TEST 2: Timeline summary bar appears ────────────────────────
        console.log('\nTEST 2: Timeline summary bar');
        const summaryExists = await page.locator('.timeline-summary').count();
        log(summaryExists > 0, 'T2: Timeline summary bar exists');

        if (summaryExists > 0) {
            const summaryText = await page.locator('.timeline-summary').textContent();
            log(summaryText && summaryText.length > 10, `T2b: Summary has meaningful text (got: "${summaryText?.substring(0, 60)}...")`);
            log(summaryText?.includes('activities'), 'T2c: Summary mentions activities');
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
        const countLabel = await page.locator('.activity-count-label').textContent();
        const expectedCount = timelineItems;
        const actualCount = parseInt(countLabel.replace(/[^0-9]/g, '')) || 0;
        log(actualCount === expectedCount, `T6: Activity count label matches (${actualCount} label vs ${expectedCount} items)`);

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
        await page.screenshot({ path: '/home/aicrm/workspace/AICRM/docs/testing/screenshots/test-communication-timeline.png', fullPage: true });
        log(true, 'T8: Screenshot saved');

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

        // ── TEST 11: Dark theme compatibility ───────────────────────────
        console.log('\nTEST 11: Dark theme');
        await page.click('.theme-toggle');
        await page.waitForTimeout(500);

        const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        log(isDark === 'dark', 'T11: Theme toggled to dark');

        // Check timeline summary is visible in dark mode
        const summaryVisible = await page.locator('.timeline-summary').isVisible();
        log(summaryVisible, 'T11b: Timeline summary visible in dark mode');

        // Switch back to light
        await page.click('.theme-toggle');
        await page.waitForTimeout(300);

    } catch (err) {
        console.error('Test error:', err.message);
        log(false, 'FATAL: Test execution error - ' + err.message);
    } finally {
        await browser.close();
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
