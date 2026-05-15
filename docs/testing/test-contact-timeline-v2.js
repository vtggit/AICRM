/**
 * Test: Contact Activity History Timeline Feature
 */

const { createAuthSession } = require('./auth-helper');

(async () => {
    const { browser, page } = await createAuthSession();
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);

    let passed = 0;
    let failed = 0;

    try {
        // Navigate to contacts
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(2000);

        // Test 1: Create a contact
        console.log('\n=== Test 1: Create test contact ===');
        const timestamp = Date.now();
        const contactName = `Timeline Test ${timestamp}`;

        await page.click('#btn-add-contact');
        await page.waitForSelector('#contact-form', { timeout: 5000 });
        await page.fill('#contact-name', contactName);
        await page.fill('#contact-email', `timeline${timestamp}@test.com`);
        await page.fill('#contact-phone', '555-TIMELINE');
        await page.fill('#contact-company', 'Timeline Corp');
        await page.fill('#contact-notes', 'Test contact for timeline feature');
        await page.click('#contact-form button.btn-primary');
        await page.waitForTimeout(2000);

        const contactCard = page.locator('.contact-card').filter({ hasText: contactName }).first();
        const contactFound = await contactCard.isVisible().catch(() => false);
        if (contactFound) {
            console.log('PASS: Test 1 - Contact created');
            passed++;
        } else {
            console.log('FAIL: Test 1 - Contact not found');
            failed++;
        }

        // Test 2: Create activities for contact
        console.log('\n=== Test 2: Create activities ===');
        await page.click('.nav-item[data-page="activities"]');
        await page.waitForTimeout(1000);
        const actBefore = await page.locator('.timeline-item').count().catch(() => 0);

        for (const [type, desc] of [['call', 'Timeline test call'], ['meeting', 'Timeline test meeting'], ['email', 'Timeline test email']]) {
            await page.click('#btn-add-activity');
            await page.waitForSelector('#activity-form', { timeout: 5000 });
            await page.selectOption('#activity-type', type);
            await page.fill('#activity-description', desc);
            await page.selectOption('#activity-contact', contactName);
            await page.click('#activity-form button.btn-primary');
            await page.waitForTimeout(1000);
        }

        const actAfter = await page.locator('.timeline-item').count().catch(() => 0);
        if (actAfter >= actBefore + 3) {
            console.log(`PASS: Test 2 - Activities created (${actBefore} -> ${actAfter})`);
            passed++;
        } else {
            console.log(`FAIL: Test 2 - Expected >= ${actBefore + 3}, got ${actAfter}`);
            failed++;
        }

        // Test 3: Activity count badge on card
        console.log('\n=== Test 3: Activity count badge ===');
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(2000);

        const badgeVisible = await contactCard.locator('.activity-count-badge').isVisible().catch(() => false);
        if (badgeVisible) {
            const badgeText = await contactCard.locator('.activity-count-badge').textContent();
            console.log(`PASS: Test 3 - Badge visible: "${badgeText}"`);
            passed++;
        } else {
            console.log('FAIL: Test 3 - Badge not visible');
            failed++;
        }

        // Test 4: View button opens detail modal
        console.log('\n=== Test 4: View detail modal ===');
        await contactCard.locator('button[title="View Details"]').click();
        await page.waitForTimeout(1500);

        const modalVisible = await page.locator('#modal-overlay.active').isVisible().catch(() => false);
        const modalTitle = await page.locator('#modal-title').textContent().catch(() => '');
        if (modalVisible && modalTitle === 'Contact Details') {
            console.log(`PASS: Test 4 - Detail modal opened: "${modalTitle}"`);
            passed++;
        } else {
            console.log(`FAIL: Test 4 - Modal issue: visible=${modalVisible}, title="${modalTitle}"`);
            failed++;
        }

        // Test 5: Contact detail fields
        console.log('\n=== Test 5: Detail fields ===');
        const detailVisible = await page.locator('.contact-detail-view').isVisible().catch(() => false);
        const emailVisible = await page.locator('.field-value:has-text("timeline")').first().isVisible().catch(() => false);
        if (detailVisible && emailVisible) {
            console.log('PASS: Test 5 - Detail fields visible');
            passed++;
        } else {
            console.log(`FAIL: Test 5 - detail=${detailVisible}, email=${emailVisible}`);
            failed++;
        }

        // Test 6: Activity timeline in modal
        console.log('\n=== Test 6: Activity timeline ===');
        const timelineVisible = await page.locator('.contact-activity-timeline').isVisible().catch(() => false);
        const timelineItems = await page.locator('.contact-activity-timeline .timeline-item').count().catch(() => 0);
        if (timelineVisible && timelineItems >= 3) {
            console.log(`PASS: Test 6 - Timeline visible with ${timelineItems} items`);
            passed++;
        } else {
            console.log(`FAIL: Test 6 - visible=${timelineVisible}, items=${timelineItems}`);
            failed++;
        }

        // Test 7: Activity count label
        console.log('\n=== Test 7: Count label ===');
        const countLabel = await page.locator('.activity-count-label').textContent().catch(() => '');
        if (countLabel.includes('(3)')) {
            console.log(`PASS: Test 7 - Count label: "${countLabel}"`);
            passed++;
        } else {
            console.log(`FAIL: Test 7 - "${countLabel}"`);
            failed++;
        }

        // Test 8: Mark complete from modal
        console.log('\n=== Test 8: Mark complete ===');
        const markBtn = page.locator('.contact-activity-timeline .btn-mark-complete').first();
        if (await markBtn.isVisible().catch(() => false)) {
            await markBtn.click();
            await page.waitForTimeout(1500);
            await page.locator('#modal-close').click();
            await page.waitForTimeout(500);
            await contactCard.locator('button[title="View Details"]').click();
            await page.waitForTimeout(1500);
            const completed = await page.locator('.contact-activity-timeline .timeline-item.activity-completed').count().catch(() => 0);
            if (completed >= 1) {
                console.log(`PASS: Test 8 - ${completed} completed`);
                passed++;
            } else {
                console.log('FAIL: Test 8 - No completed found');
                failed++;
            }
        } else {
            console.log('FAIL: Test 8 - Mark button not visible');
            failed++;
        }

        // Test 9: Add Activity pre-fills contact
        console.log('\n=== Test 9: Add Activity prefill ===');
        const addBtn = page.locator('.contact-detail-actions button:has-text("Add Activity")');
        if (await addBtn.isVisible().catch(() => false)) {
            await addBtn.click();
            await page.waitForSelector('#activity-form', { timeout: 5000 });
            const selected = await page.locator('#activity-contact').inputValue();
            if (selected === contactName) {
                console.log(`PASS: Test 9 - Prefilled: "${selected}"`);
                passed++;
            } else {
                console.log(`FAIL: Test 9 - "${selected}" != "${contactName}"`);
                failed++;
            }
            await page.locator('#activity-form button.btn-secondary').click();
            await page.waitForTimeout(500);
        } else {
            console.log('FAIL: Test 9 - Add button not visible');
            failed++;
        }

        // Test 10: Modal-wide class
        console.log('\n=== Test 10: Modal-wide class ===');
        await contactCard.locator('button[title="View Details"]').click();
        await page.waitForTimeout(1000);
        const classes = await page.locator('#modal-container').getAttribute('class');
        if (classes && classes.includes('modal-wide')) {
            console.log('PASS: Test 10 - modal-wide class present');
            passed++;
        } else {
            console.log(`FAIL: Test 10 - classes: "${classes}"`);
            failed++;
        }

        await page.screenshot({ path: 'docs/testing/screenshots/test-contact-timeline.png', fullPage: false });
        console.log('\nScreenshot: docs/testing/screenshots/test-contact-timeline.png');

    } catch (err) {
        console.error('Test error:', err.message);
        await page.screenshot({ path: 'docs/testing/screenshots/test-contact-timeline-error.png', fullPage: false });
    }

    console.log(`\n========================================`);
    console.log(`Contact Timeline Tests: ${passed}/${passed + failed} passed`);
    console.log(`========================================\n`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
