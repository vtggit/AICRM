/**
 * Test: Activity Reminders and Notifications Feature
 * Tests: reminder settings UI, save/load settings, test notification, in-app reminders
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

let results = [];
let browser;
let passed = 0;
let failed = 0;

function log(test, ok, detail = '') {
    const status = ok ? 'PASS' : 'FAIL';
    results.push({ test, status, detail });
    if (ok) passed++; else failed++;
    console.log(`  [${status}] ${test}${detail ? ' - ' + detail : ''}`);
}

(async () => {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    const errors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    // Navigate to app and wait for auth
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle', timeout: 15000 });
    await waitForAuthReady(page);

    console.log('\n=== Activity Reminders and Notifications Tests ===\n');

    // --- Test 1: Navigate to Settings ---
    await page.click('.nav-item[data-page="settings"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    const settingsVisible = await page.isVisible('#page-settings');
    log('Navigate to Settings page', settingsVisible);

    // --- Test 2: Reminder settings card exists ---
    const reminderCardExists = await page.evaluate(() => {
        const cards = document.querySelectorAll('.settings-card h3');
        for (const card of cards) {
            if (card.textContent.includes('Activity Reminders')) return true;
        }
        return false;
    });
    log('Reminder settings card exists', reminderCardExists);

    // --- Test 3: Reminder enabled checkbox exists ---
    const enabledCheckboxExists = await page.isVisible('#reminder-enabled');
    log('Reminder enabled checkbox exists', enabledCheckboxExists);

    // --- Test 4: Reminder time input exists ---
    const timeInputExists = await page.isVisible('#reminder-time');
    const timeValue = await page.inputValue('#reminder-time');
    log('Reminder time input exists with default value', timeInputExists && timeValue === '09:00', `value=${timeValue}`);

    // --- Test 5: Reminder advance notice select exists ---
    const advanceSelectExists = await page.isVisible('#reminder-advance');
    const advanceValue = await page.inputValue('#reminder-advance');
    log('Reminder advance notice select exists', advanceSelectExists, `value=${advanceValue}`);

    // --- Test 6: Overdue notification checkbox exists ---
    const overdueCheckboxExists = await page.isVisible('#reminder-overdue');
    log('Overdue notification checkbox exists', overdueCheckboxExists);

    // --- Test 7: Save button exists ---
    const saveBtnExists = await page.isVisible('#btn-save-reminders');
    log('Save reminder settings button exists', saveBtnExists);

    // --- Test 8: Test notification button exists ---
    const testBtnExists = await page.isVisible('#btn-test-notification');
    log('Test notification button exists', testBtnExists);

    // --- Test 9: Notification permission display exists ---
    const permDisplayExists = await page.isVisible('#notif-permission');
    const permText = await page.textContent('#notif-permission');
    log('Notification permission display exists', permDisplayExists, `text="${permText}"`);

    // --- Test 10: Save reminder settings ---
    // Enable reminders (explicitly set checked=true rather than toggle)
    await page.evaluate(() => {
        const el = document.getElementById('reminder-enabled');
        if (el && !el.checked) el.click();
    });
    await page.selectOption('#reminder-advance', '2');
    await page.click('#btn-save-reminders');
    await page.waitForTimeout(1000);

    // Check for success notification
    const saveSuccess = await page.evaluate(() => {
        const notifs = document.querySelectorAll('.notification');
        for (const n of notifs) {
            if (n.textContent.includes('Reminder settings saved')) return true;
        }
        return false;
    });
    log('Save reminder settings shows success notification', saveSuccess);

    // --- Test 11: Reload and verify settings persist ---
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await waitForAuthReady(page);
    await page.click('.nav-item[data-page="settings"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    const enabledAfterReload = await page.$eval('#reminder-enabled', el => el.checked);
    const advanceAfterReload = await page.inputValue('#reminder-advance');
    log('Reminder settings persist after reload', enabledAfterReload && advanceAfterReload === '2', `enabled=${enabledAfterReload}, advance=${advanceAfterReload}`);

    // --- Test 12: Disable reminders ---
    await page.click('#reminder-enabled');
    await page.click('#btn-save-reminders');
    await page.waitForTimeout(1000);

    const disableSuccess = await page.evaluate(() => {
        const notifs = document.querySelectorAll('.notification');
        for (const n of notifs) {
            if (n.textContent.includes('Reminder settings saved')) return true;
        }
        return false;
    });
    log('Disable reminders shows success notification', disableSuccess);

    // --- Test 13: Test notification button ---
    await page.click('#btn-test-notification');
    await page.waitForTimeout(1000);

    // In headless Chromium, Notification.requestPermission may prompt or auto-deny
    // We check that the page didn't crash and some notification appeared
    const testNotifAppeared = await page.evaluate(() => {
        const notifs = document.querySelectorAll('.notification');
        for (const n of notifs) {
            if (n.textContent.includes('Browser notifications') ||
                n.textContent.includes('Test notification') ||
                n.textContent.includes('Permission') ||
                n.textContent.includes('blocked')) return true;
        }
        return false;
    });
    log('Test notification button produces feedback', testNotifAppeared);

    // --- Test 14: Reminder settings card styling ---
    const reminderStatusStyle = await page.evaluate(() => {
        const el = document.getElementById('reminder-status');
        return el && el.classList.contains('reminder-status');
    });
    log('Reminder status element has correct class', reminderStatusStyle);

    // --- Test 15: Create activity with today's due date and verify reminder check ---
    // Re-enable reminders
    await page.click('#reminder-enabled');
    await page.click('#btn-save-reminders');
    await page.waitForTimeout(500);

    // Navigate to activities and create one due today
    await page.click('.nav-item[data-page="activities"]');
    await page.waitForTimeout(500);
    await page.click('#btn-add-activity');
    await page.waitForSelector('#activity-form', { state: 'visible' });

    await page.selectOption('#activity-type', 'task');
    await page.fill('#activity-description', 'Today reminder test');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    await page.fill('#activity-due-date', `${yyyy}-${mm}-${dd}`);
    await page.click('#activity-form button[type="submit"]');
    await page.waitForTimeout(500);

    const activityCreated = await page.evaluate(() => {
        const items = document.querySelectorAll('.timeline-item');
        for (const item of items) {
            if (item.textContent.includes('Today reminder test')) return true;
        }
        return false;
    });
    log('Activity with today due date created', activityCreated);

    // --- Screenshot ---
    await page.click('.nav-item[data-page="settings"]');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/activity-reminders.png', fullPage: true });
    console.log('\n  Screenshot saved: test-results/activity-reminders.png');

    await browser.close();

    // Summary
    console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${passed + failed} total ===\n`);

    // Save results
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync('test-results/activity-reminders-results.json', JSON.stringify(results, null, 2));

    process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
    console.error('Test error:', err);
    if (browser) browser.close();
    process.exit(1);
});
