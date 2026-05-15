const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE_URL = 'http://localhost:8080/app/index.html';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    // Navigate and wait for auth
    await page.goto(BASE_URL);
    await waitForAuthReady(page, true);
    await page.waitForTimeout(1000);

    // Navigate to contacts
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(2000);

    let passed = 0;
    let failed = 0;

    // TEST 1: Quick activity buttons exist on contact cards
    const contactCards = await page.$$('.contact-card');
    console.log('Contact cards found:', contactCards.length);

    if (contactCards.length === 0) {
        console.log('TEST 1: Quick activity buttons on cards - ❌ FAIL (no contact cards)');
        failed++;
        await page.screenshot({ path: 'screenshots/debug-no-contacts.png', fullPage: true });
    } else {
        const quickBtns = await page.$$('.quick-activity-btn');
        if (quickBtns.length > 0) {
            console.log('TEST 1: Quick activity buttons on cards - ✅ PASS (' + quickBtns.length + ' buttons found)');
            passed++;
        } else {
            console.log('TEST 1: Quick activity buttons on cards - ❌ FAIL (no buttons found)');
            failed++;
        }

        // TEST 2: Get first contact name and click Call button
        const firstCard = await page.$('.contact-card');
        const contactName = (await (await firstCard.$('h4')).textContent()).trim();
        console.log('  First contact:', contactName);

        const callBtn = await page.$('button[title="Quick log a call"]');
        if (callBtn) {
            await callBtn.click();
            await page.waitForTimeout(1500);

            // TEST 3: Modal opens with correct title
            const modalTitle = await page.$('#modal-title');
            const titleText = modalTitle ? (await modalTitle.textContent()).trim() : '';
            if (titleText.includes('Add Activity')) {
                console.log('TEST 3: Modal opens as "Add Activity" - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 3: Modal opens as "Add Activity" - ❌ FAIL (title: "' + titleText + '")');
                failed++;
            }

            // TEST 4: Activity type pre-filled to "call"
            const activityType = await page.$('#activity-type');
            const typeValue = activityType ? await activityType.inputValue() : '';
            if (typeValue === 'call') {
                console.log('TEST 4: Activity type pre-filled to "call" - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 4: Activity type pre-filled to "call" - ❌ FAIL (type: "' + typeValue + '")');
                failed++;
            }

            // TEST 5: Contact pre-selected
            const activityContact = await page.$('#activity-contact');
            const contactValue = activityContact ? await activityContact.inputValue() : '';
            if (contactValue === contactName) {
                console.log('TEST 5: Contact pre-selected correctly - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 5: Contact pre-selected correctly - ❌ FAIL (expected: "' + contactName + '", got: "' + contactValue + '")');
                failed++;
            }

            // TEST 6: Create the activity
            await page.fill('#activity-description', 'Quick logged call from contact card - ' + Date.now());
            await page.click('#activity-form button[type="submit"]');
            await page.waitForTimeout(2000);

            const notif = await page.$('.notification');
            const notifText = notif ? (await notif.textContent()).trim() : '';
            if (notifText.includes('created') || notifText.includes('Created')) {
                console.log('TEST 6: Activity created successfully - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 6: Activity created successfully - ❌ FAIL (notification: "' + notifText + '")');
                failed++;
            }
        } else {
            console.log('TEST 2-6: Skipped (Call button not found)');
            failed += 5;
        }

        // TEST 7: Test Email quick button
        await page.reload();
        await waitForAuthReady(page, true);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(2000);

        const emailBtn = await page.$('button[title="Quick log an email"]');
        if (emailBtn) {
            await emailBtn.click();
            await page.waitForTimeout(1500);

            const activityType = await page.$('#activity-type');
            const typeValue = activityType ? await activityType.inputValue() : '';
            if (typeValue === 'email') {
                console.log('TEST 7: Email quick button pre-fills type - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 7: Email quick button pre-fills type - ❌ FAIL (type: "' + typeValue + '")');
                failed++;
            }
            // Close modal
            await page.click('#modal-body button.btn-secondary');
            await page.waitForTimeout(500);
        } else {
            console.log('TEST 7: Email quick button - ❌ FAIL (not found)');
            failed++;
        }

        // TEST 8: Test Meeting quick button
        const meetingBtn = await page.$('button[title="Quick log a meeting"]');
        if (meetingBtn) {
            await meetingBtn.click();
            await page.waitForTimeout(1500);

            const activityType = await page.$('#activity-type');
            const typeValue = activityType ? await activityType.inputValue() : '';
            if (typeValue === 'meeting') {
                console.log('TEST 8: Meeting quick button pre-fills type - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 8: Meeting quick button pre-fills type - ❌ FAIL (type: "' + typeValue + '")');
                failed++;
            }
            await page.click('#modal-body button.btn-secondary');
            await page.waitForTimeout(500);
        } else {
            console.log('TEST 8: Meeting quick button - ❌ FAIL (not found)');
            failed++;
        }

        // TEST 9: Test Note quick button
        const noteBtn = await page.$('button[title="Quick add a note"]');
        if (noteBtn) {
            await noteBtn.click();
            await page.waitForTimeout(1500);

            const activityType = await page.$('#activity-type');
            const typeValue = activityType ? await activityType.inputValue() : '';
            if (typeValue === 'note') {
                console.log('TEST 9: Note quick button pre-fills type - ✅ PASS');
                passed++;
            } else {
                console.log('TEST 9: Note quick button pre-fills type - ❌ FAIL (type: "' + typeValue + '")');
                failed++;
            }
            await page.click('#modal-body button.btn-secondary');
            await page.waitForTimeout(500);
        } else {
            console.log('TEST 9: Note quick button - ❌ FAIL (not found)');
            failed++;
        }

        // TEST 10: Dark theme support
        await page.click('#theme-toggle');
        await page.waitForTimeout(1000);
        const darkBtns = await page.$$('.quick-activity-btn');
        if (darkBtns.length > 0) {
            console.log('TEST 10: Quick buttons visible in dark theme - ✅ PASS');
            passed++;
        } else {
            console.log('TEST 10: Quick buttons visible in dark theme - ❌ FAIL');
            failed++;
        }
    }

    // Check for JS errors
    const jsErrors = errors.filter(e => !e.includes('401') && !e.includes('Unexpected token'));
    console.log('\nJS Errors (non-auth):', jsErrors.length);
    if (jsErrors.length > 0) {
        jsErrors.forEach(e => console.log('  →', e));
    }

    // Screenshot
    await page.screenshot({ path: 'screenshots/quick-activity-logging.png', fullPage: false });
    console.log('Screenshot saved to screenshots/quick-activity-logging.png');

    console.log('\n=== QUICK ACTIVITY LOGGING TEST RESULTS ===');
    console.log('Total: ' + (passed + failed) + ' | Passed: ' + passed + ' | Failed: ' + failed);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
