/**
 * Test: Add Contact Button Flow
 *
 * Verifies the complete "Add Contact" flow as an admin user:
 *   1. Login with admin token
 *   2. Navigate to Contacts
 *   3. Click "Add Contact" button
 *   4. Verify modal opens
 *   5. Fill in contact form
 *   6. Submit and verify contact appears in the list
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

    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`    [BROWSER ERROR] ${msg.text()}`);
    });

    try {
        // ── SETUP: Load app (auth token pre-injected) ────────────────────
        console.log('\nSETUP: Loading app with admin auth');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await waitForAuthReady(page);

        // Verify login succeeded
        const isLoggedIn = await page.evaluate(() => Auth.isAuthenticated());
        log(isLoggedIn, 'T0: User is authenticated');

        const isAdmin = await page.evaluate(() => Auth.isAdmin());
        log(isAdmin, 'T0b: User has admin role');

        // ── TEST 1: Navigate to Contacts page ───────────────────────────
        console.log('\nTEST 1: Navigate to Contacts page');
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        const contactsPageVisible = await page.locator('#page-contacts').isVisible();
        log(contactsPageVisible, 'T1: Contacts page is visible after navigation');

        const pageTitle = await page.textContent('#page-title');
        log(pageTitle === 'Contacts', 'T1b: Page title is "Contacts"');

        // ── TEST 2: "Add Contact" button exists and is visible ──────────
        console.log('\nTEST 2: "Add Contact" button visibility');
        const addBtnExists = await page.locator('#btn-add-contact').count();
        log(addBtnExists === 1, 'T2: #btn-add-contact button exists in DOM');

        const addBtnVisible = await page.locator('#btn-add-contact').isVisible();
        log(addBtnVisible, 'T2b: "Add Contact" button is visible');

        // ── TEST 3: Click "Add Contact" opens the modal ─────────────────
        console.log('\nTEST 3: Click "Add Contact" opens modal');
        const addBtnBefore = await page.locator('#btn-add-contact').boundingBox();
        log(!!addBtnBefore, 'T3a: Button is clickable (has bounding box)');

        await page.click('#btn-add-contact');
        await page.waitForTimeout(500);

        const modalOverlayVisible = await page.locator('#modal-overlay').isVisible();
        log(modalOverlayVisible, 'T3b: #modal-overlay is visible after clicking "Add Contact"');

        const modalBoxVisible = await page.locator('#modal-overlay .modal').isVisible();
        log(modalBoxVisible, 'T3c: Modal box is rendered inside overlay');

        // ── TEST 4: Modal title is correct ──────────────────────────────
        console.log('\nTEST 4: Modal title');
        const modalTitle = await page.textContent('#modal-title');
        log(modalTitle === 'Add Contact', `T4: Modal title is correct (got: "${modalTitle}")`);

        // ── TEST 5: Form fields are present and editable ────────────────
        console.log('\nTEST 5: Form fields present and editable');

        const fields = [
            { selector: '#contact-name', label: 'Name' },
            { selector: '#contact-email', label: 'Email' },
            { selector: '#contact-phone', label: 'Phone' },
            { selector: '#contact-company', label: 'Company' },
            { selector: '#contact-status', label: 'Status' },
            { selector: '#contact-notes', label: 'Notes' },
        ];

        for (const { selector, label } of fields) {
            const visible = await page.locator(selector).isVisible();
            log(visible, `T5: "${label}" field (${selector}) is visible`);
        }

        // ── TEST 6: Fill in and submit the form ─────────────────────────
        console.log('\nTEST 6: Fill form and submit');

        const ts = Date.now();
        const testContact = {
            name: `Playwright Test ${ts}`,
            email: `playwright-${ts}@test.com`,
            phone: '555-PLAY',
            company: 'Test Corp',
            status: 'active',
            notes: 'Created by Playwright QA test',
        };

        await page.fill('#contact-name', testContact.name);
        await page.fill('#contact-email', testContact.email);
        await page.fill('#contact-phone', testContact.phone);
        await page.fill('#contact-company', testContact.company);
        await page.selectOption('#contact-status', testContact.status);
        await page.fill('#contact-notes', testContact.notes);

        // Take screenshot after filling
        await page.screenshot({ path: '/tmp/test-add-contact-filled.png', fullPage: true });
        console.log('  Screenshot saved: /tmp/test-add-contact-filled.png');

        // Submit the form
        await page.click('#contact-form .btn-primary');
        await page.waitForTimeout(1500);

        // ── TEST 7: Modal closes after submission ───────────────────────
        console.log('\nTEST 7: Modal closes after submission');
        const modalClosed = await page.evaluate(() => {
            const overlay = document.getElementById('modal-overlay');
            return overlay && overlay.classList.contains('hidden');
        });
        log(modalClosed, 'T7: Modal overlay is hidden after form submission');

        // ── TEST 8: Contact appears in the list ─────────────────────────
        console.log('\nTEST 8: Contact appears in the list');
        await page.screenshot({ path: '/tmp/test-add-contact-submitted.png', fullPage: true });
        console.log('  Screenshot saved: /tmp/test-add-contact-submitted.png');

        const contactCardCount = await page.locator('.contact-card').count();
        log(contactCardCount >= 1, `T8: At least 1 contact card visible (found: ${contactCardCount})`);

        // ── TEST 9: Contact data is correct in the card ─────────────────
        console.log('\nTEST 9: Contact data rendered correctly');

        const foundName = await page.evaluate((name) => {
            const cards = document.querySelectorAll('.contact-card');
            for (const card of cards) {
                if (card.textContent.includes(name)) return true;
            }
            return false;
        }, testContact.name);
        log(foundName, `T9a: Contact name "${testContact.name}" appears in a card`);

        const foundEmail = await page.evaluate((email) => {
            const cards = document.querySelectorAll('.contact-card');
            for (const card of cards) {
                if (card.textContent.includes(email)) return true;
            }
            return false;
        }, testContact.email);
        log(foundEmail, `T9b: Contact email "${testContact.email}" appears in a card`);

        // ── TEST 10: Cancel button closes modal without saving ──────────
        console.log('\nTEST 10: Cancel button closes modal');
        await page.click('#btn-add-contact');
        await page.waitForTimeout(300);

        const modalReopened = await page.locator('#modal-overlay').isVisible();
        log(modalReopened, 'T10a: Modal re-opens on second click');

        await page.fill('#contact-name', 'Should Not Save');
        await page.click('#contact-form .btn-secondary');
        await page.waitForTimeout(300);

        const modalCancelled = await page.evaluate(() => {
            const overlay = document.getElementById('modal-overlay');
            return overlay && overlay.classList.contains('hidden');
        });
        log(modalCancelled, 'T10b: Cancel button closes modal');

        // Verify the "Should Not Save" contact was NOT created
        const unsavedContactExists = await page.evaluate(() => {
            const cards = document.querySelectorAll('.contact-card');
            for (const card of cards) {
                if (card.textContent.includes('Should Not Save')) return true;
            }
            return false;
        });
        log(!unsavedContactExists, 'T10c: Cancelled contact was NOT saved');

        // ── TEST 11: Name field is required ─────────────────────────────
        console.log('\nTEST 11: Name field validation');
        await page.click('#btn-add-contact');
        await page.waitForTimeout(300);

        // Clear name and try to submit
        await page.fill('#contact-name', '');
        await page.fill('#contact-email', '');

        const submitResult = await page.evaluate(() => {
            const form = document.getElementById('contact-form');
            return form.checkValidity();
        });
        log(!submitResult, 'T11: Form is invalid when name is empty');

        // Close modal cleanly
        await page.evaluate(() => {
            const overlay = document.getElementById('modal-overlay');
            if (overlay) overlay.classList.add('hidden');
        });
        await page.waitForTimeout(200);

    } catch (err) {
        console.error(`\n❌ Test error: ${err.message}`);
        console.error(err.stack);
        // Take a screenshot on error for debugging
        try {
            await page.screenshot({ path: '/tmp/test-add-contact-error.png', fullPage: true });
            console.log('  Error screenshot saved: /tmp/test-add-contact-error.png');
        } catch (_) {}
    } finally {
        await browser.close();
    }

    // ── SUMMARY ─────────────────────────────────────────────────────────
    const total = passed.length + failed.length;
    console.log(`\n${'='.repeat(55)}`);
    console.log(`  Results: ${passed.length} passed, ${failed.length} failed out of ${total} tests`);
    if (failed.length > 0) {
        console.log(`\n  Failed tests:`);
        failed.forEach(f => console.log(`    ❌ ${f}`));
    }
    console.log('='.repeat(55));
    process.exit(failed.length > 0 ? 1 : 0);
})();
