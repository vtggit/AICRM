/**
 * Test: Contact Activity History Timeline Feature
 *
 * Tests:
 * 1. Activity count badges appear on contact cards
 * 2. View button opens contact detail modal
 * 3. Contact detail modal shows contact info fields
 * 4. Contact detail modal shows activity history timeline
 * 5. Activity count label matches actual activity count
 * 6. "Add Activity" button from detail modal pre-fills contact name
 * 7. Mark activity complete from detail modal works
 */

const { chromium } = require('playwright');
const { createAuthSession } = require('./auth-helper');

(async () => {
    const { browser, context, page } = await createAuthSession();
    await page.goto('http://localhost:8000');
    await page.waitForSelector('.page[data-page="dashboard"]', { timeout: 10000 }).catch(async () => {
        await page.waitForTimeout(3000);
    });
    let passed = 0;
    let failed = 0;
    const results = [];

    try {
        // ===== Test 1: Create a contact =====
    console.log('\n=== Test 1: Create test contact ===');
    try {
        const timestamp = Date.now();
        const contactName = `Timeline Test ${timestamp}`;

        await page.click('#btn-add-contact');
        await page.waitForSelector('#contact-form', { timeout: 5000 });
        await page.fill('#contact-name', contactName);
        await page.fill('#contact-email', `timeline${timestamp}@test.com`);
        await page.fill('#contact-phone', '555-TIMELINE');
        await page.fill('#contact-company', 'Timeline Corp');
        await page.fill('#contact-notes', 'Test contact for timeline feature');
        await page.press('#contact-name', 'Enter');
        // Wait for modal to close and contact to appear
        await page.waitForSelector('#modal-overlay.hidden', { timeout: 5000 }).catch(async () => {
            // If hidden class doesn't appear, wait for modal to be gone
            await page.waitForTimeout(2000);
        });

        // Verify contact was created
        const contactFound = await page.locator('.contact-card').filter({ hasText: contactName }).first().isVisible().catch(() => false);
        if (contactFound) {
            console.log('PASS: Test 1 - Contact created successfully');
            passed++;
        } else {
            console.log('FAIL: Test 1 - Contact not found after creation');
            failed++;
        }

        // ===== Test 2: Create activities linked to this contact =====
        console.log('\n=== Test 2: Create activities for contact ===');
        await page.click('nav a[href="#activities"], nav a[data-page="activities"]');
        await page.waitForTimeout(1000);

        const activityCountBefore = await page.locator('.timeline-item').count().catch(() => 0);

        // Create activity 1
        await page.click('#btn-add-activity');
        await page.waitForSelector('#activity-form', { timeout: 5000 });
        await page.selectOption('#activity-type', 'call');
        await page.fill('#activity-description', 'Timeline test call activity 1');
        await page.selectOption('#activity-contact', contactName);
        await page.press('#activity-description', 'Enter');
        await page.waitForTimeout(1500);

        // Create activity 2
        await page.click('#btn-add-activity');
        await page.waitForSelector('#activity-form', { timeout: 5000 });
        await page.selectOption('#activity-type', 'meeting');
        await page.fill('#activity-description', 'Timeline test meeting activity 2');
        await page.selectOption('#activity-contact', contactName);
        await page.press('#activity-description', 'Enter');
        await page.waitForTimeout(1500);

        // Create activity 3
        await page.click('#btn-add-activity');
        await page.waitForSelector('#activity-form', { timeout: 5000 });
        await page.selectOption('#activity-type', 'email');
        await page.fill('#activity-description', 'Timeline test email activity 3');
        await page.selectOption('#activity-contact', contactName);
        await page.press('#activity-description', 'Enter');
        await page.waitForTimeout(1500);

        const activityCountAfter = await page.locator('.timeline-item').count().catch(() => 0);
        if (activityCountAfter >= activityCountBefore + 3) {
            console.log(`PASS: Test 2 - Activities created (${activityCountBefore} → ${activityCountAfter})`);
            passed++;
        } else {
            console.log(`FAIL: Test 2 - Expected at least ${activityCountBefore + 3} activities, got ${activityCountAfter}`);
            failed++;
        }

        // ===== Test 3: Activity count badge on contact card =====
        console.log('\n=== Test 3: Activity count badge on contact card ===');
        await page.click('nav a[href="#contacts"], nav a[data-page="contacts"]');
        await page.waitForTimeout(2000);

        const contactCard = page.locator('.contact-card').filter({ hasText: contactName }).first();
        const badgeVisible = await contactCard.locator('.activity-count-badge').isVisible().catch(() => false);
        if (badgeVisible) {
            const badgeText = await contactCard.locator('.activity-count-badge').textContent();
            console.log(`PASS: Test 3 - Activity count badge visible: "${badgeText}"`);
            passed++;
        } else {
            console.log('FAIL: Test 3 - Activity count badge not visible on contact card');
            failed++;
        }

        // ===== Test 4: View button opens contact detail modal =====
        console.log('\n=== Test 4: View button opens contact detail modal ===');
        await contactCard.locator('button[title="View Details"]').click();
        await page.waitForSelector('#modal-overlay.active', { timeout: 5000 }).catch(async () => {
            await page.waitForTimeout(2000);
        });

        const modalVisible = await page.locator('#modal-overlay.active').isVisible().catch(() => false);
        const modalTitle = await page.locator('#modal-title').textContent().catch(() => '');
        if (modalVisible && modalTitle === 'Contact Details') {
            console.log(`PASS: Test 4 - Contact detail modal opened with title: "${modalTitle}"`);
            passed++;
        } else {
            console.log(`FAIL: Test 4 - Modal not visible or wrong title: "${modalTitle}"`);
            failed++;
        }

        // ===== Test 5: Contact detail shows info fields =====
        console.log('\n=== Test 5: Contact detail shows info fields ===');
        const detailViewVisible = await page.locator('.contact-detail-view').isVisible().catch(() => false);
        const emailVisible = await page.locator('.field-value:has-text("timeline")').isVisible().catch(() => false);
        const companyVisible = await page.locator('.field-value:has-text("Timeline Corp")').isVisible().catch(() => false);

        if (detailViewVisible && emailVisible && companyVisible) {
            console.log('PASS: Test 5 - Contact detail fields visible (email, company)');
            passed++;
        } else {
            console.log(`FAIL: Test 5 - Detail fields missing: view=${detailViewVisible}, email=${emailVisible}, company=${companyVisible}`);
            failed++;
        }

        // ===== Test 6: Activity history timeline in detail modal =====
        console.log('\n=== Test 6: Activity history timeline in detail modal ===');
        const timelineVisible = await page.locator('.contact-activity-timeline').isVisible().catch(() => false);
        const timelineItems = await page.locator('.contact-activity-timeline .timeline-item').count().catch(() => 0);

        if (timelineVisible && timelineItems >= 3) {
            console.log(`PASS: Test 6 - Activity timeline visible with ${timelineItems} items`);
            passed++;
        } else {
            console.log(`FAIL: Test 6 - Timeline not visible or insufficient items: visible=${timelineVisible}, count=${timelineItems}`);
            failed++;
        }

        // ===== Test 7: Activity count label matches =====
        console.log('\n=== Test 7: Activity count label matches actual count ===');
        const countLabel = await page.locator('.activity-count-label').textContent().catch(() => '');
        const expectedPattern = /\(3\)/;
        if (expectedPattern.test(countLabel)) {
            console.log(`PASS: Test 7 - Activity count label correct: "${countLabel}"`);
            passed++;
        } else {
            console.log(`FAIL: Test 7 - Activity count label unexpected: "${countLabel}" (expected "(3))"`);
            failed++;
        }

        // ===== Test 8: Mark activity complete from detail modal =====
        console.log('\n=== Test 8: Mark activity complete from detail modal ===');
        const markCompleteBtn = page.locator('.contact-activity-timeline .btn-mark-complete').first();
        const markBtnVisible = await markCompleteBtn.isVisible().catch(() => false);

        if (markBtnVisible) {
            await markCompleteBtn.click();
            await page.waitForTimeout(1500);

            // Refresh the detail view
            await page.locator('#modal-close').click();
            await page.waitForTimeout(500);
            await contactCard.locator('button[title="View Details"]').click();
            await page.waitForTimeout(1500);

            const completedItems = await page.locator('.contact-activity-timeline .timeline-item.activity-completed').count().catch(() => 0);
            if (completedItems >= 1) {
                console.log(`PASS: Test 8 - Activity marked complete (${completedItems} completed)`);
                passed++;
            } else {
                console.log(`FAIL: Test 8 - No completed activities found after marking`);
                failed++;
            }
        } else {
            console.log('FAIL: Test 8 - Mark complete button not visible in detail modal');
            failed++;
        }

        // ===== Test 9: Add Activity button pre-fills contact =====
        console.log('\n=== Test 9: Add Activity button pre-fills contact ===');
        const addActivityBtn = page.locator('.contact-detail-actions button:has-text("Add Activity")');
        const addBtnVisible = await addActivityBtn.isVisible().catch(() => false);

        if (addBtnVisible) {
            await addActivityBtn.click();
            await page.waitForSelector('#activity-form', { timeout: 5000 });

            const selectedContact = await page.locator('#activity-contact').inputValue();
            if (selectedContact === contactName) {
                console.log(`PASS: Test 9 - Contact pre-filled in activity form: "${selectedContact}"`);
                passed++;
            } else {
                console.log(`FAIL: Test 9 - Contact not pre-filled: "${selectedContact}" (expected "${contactName}")`);
                failed++;
            }
            // Cancel the form
            await page.locator('#activity-form button.btn-secondary').click();
            await page.waitForTimeout(500);
        } else {
            console.log('FAIL: Test 9 - Add Activity button not visible in detail modal');
            failed++;
        }

        // ===== Test 10: Modal-wide class applied =====
        console.log('\n=== Test 10: Modal-wide class for wider modal ===');
        await contactCard.locator('button[title="View Details"]').click();
        await page.waitForTimeout(1000);

        const modalContainer = await page.locator('#modal-container');
        const classes = await modalContainer.getAttribute('class');
        if (classes && classes.includes('modal-wide')) {
            console.log(`PASS: Test 10 - Modal has modal-wide class`);
            passed++;
        } else {
            console.log(`FAIL: Test 10 - Modal missing modal-wide class: "${classes}"`);
            failed++;
        }

        // Screenshot for visual verification
        await page.screenshot({ path: 'docs/testing/screenshots/test-contact-timeline.png', fullPage: false });
        console.log('\nScreenshot saved: docs/testing/screenshots/test-contact-timeline.png');
    } catch (err) {
        console.error('Test error:', err.message);
        console.error(err.stack);
    }

    console.log(`\n========================================`);
    console.log(`Contact Activity Timeline Tests: ${passed}/${passed + failed} passed`);
    console.log(`========================================\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
