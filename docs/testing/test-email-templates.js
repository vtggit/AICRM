/**
 * Test: Email Templates Feature
 * Tests template CRUD, category filtering, and variable insertion
 */
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Clear localStorage first
    await page.goto('http://localhost:8080/app/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);

    const results = [];

    // TEST 1: Navigate to Templates page
    try {
        await page.click('.nav-item[data-page="templates"]');
        await page.waitForTimeout(300);
        const title = await page.locator('#page-title').textContent();
        console.log(`TEST 1: Navigate to Templates`);
        console.log(`  Page title: "${title}"`);
        results.push({ name: 'Templates page loads', pass: title === 'Email Templates' });
    } catch (e) {
        console.log(`TEST 1: FAILED - ${e.message}`);
        results.push({ name: 'Templates page loads', pass: false });
    }

    // TEST 2: Empty state shows
    try {
        const emptyText = await page.locator('#templates-list .empty-state-card p').textContent();
        console.log(`TEST 2: Empty state`);
        console.log(`  Empty text: "${emptyText}"`);
        results.push({ name: 'Empty state shows', pass: emptyText.includes('No templates') });
    } catch (e) {
        console.log(`TEST 2: FAILED - ${e.message}`);
        results.push({ name: 'Empty state shows', pass: false });
    }

    // TEST 3: Add a template
    try {
        await page.click('#btn-add-template');
        await page.waitForTimeout(200);
        await page.fill('#template-name', 'Welcome Email');
        await page.selectOption('#template-category', 'introduction');
        await page.fill('#template-subject', 'Welcome to {{contact_company}}!');
        await page.fill('#template-body', 'Dear {{contact_name}},\n\nThank you for joining {{contact_company}}. We look forward to working with you.\n\nBest regards,\nYour Team');
        await page.locator('#template-form button.btn-primary').click();
        await page.waitForTimeout(500);

        const cardCount = await page.locator('.template-card').count();
        console.log(`TEST 3: Add a template`);
        console.log(`  Template cards after add: ${cardCount}`);
        results.push({ name: 'Template created', pass: cardCount === 1 });
    } catch (e) {
        console.log(`TEST 3: FAILED - ${e.message}`);
        results.push({ name: 'Template created', pass: false });
    }

    // TEST 4: Template card shows correct data
    try {
        const name = await page.locator('.template-card h4').first().textContent();
        const badge = await page.locator('.template-category-badge').first().textContent();
        const subject = await page.locator('.template-subject').first().textContent();
        console.log(`TEST 4: Template card data`);
        console.log(`  Name: "${name}", Badge: "${badge}", Subject: "${subject}"`);
        results.push({ name: 'Template card shows correct data', pass: name === 'Welcome Email' && badge === 'introduction' });
    } catch (e) {
        console.log(`TEST 4: FAILED - ${e.message}`);
        results.push({ name: 'Template card shows correct data', pass: false });
    }

    // TEST 5: Add second template with different category
    try {
        await page.click('#btn-add-template');
        await page.waitForTimeout(200);
        await page.fill('#template-name', 'Follow-up Call');
        await page.selectOption('#template-category', 'follow-up');
        await page.fill('#template-subject', 'Following up on our conversation');
        await page.fill('#template-body', 'Hi {{contact_name}},\n\nJust following up on our last call. Please let me know if you have any questions.\n\nPhone: {{contact_phone}}');
        await page.locator('#template-form button.btn-primary').click();
        await page.waitForTimeout(500);

        const cardCount = await page.locator('.template-card').count();
        console.log(`TEST 5: Add second template`);
        console.log(`  Template cards: ${cardCount}`);
        results.push({ name: 'Second template created', pass: cardCount === 2 });
    } catch (e) {
        console.log(`TEST 5: FAILED - ${e.message}`);
        results.push({ name: 'Second template created', pass: false });
    }

    // TEST 6: Filter by category
    try {
        await page.selectOption('#template-filter-category', 'follow-up');
        await page.waitForTimeout(300);
        const followUpCount = await page.locator('.template-card').count();
        
        await page.selectOption('#template-filter-category', 'introduction');
        await page.waitForTimeout(300);
        const introCount = await page.locator('.template-card').count();
        
        // Reset filter
        await page.selectOption('#template-filter-category', '');
        await page.waitForTimeout(300);

        console.log(`TEST 6: Filter by category`);
        console.log(`  Follow-up count: ${followUpCount}, Introduction count: ${introCount}`);
        results.push({ name: 'Category filter works', pass: followUpCount === 1 && introCount === 1 });
    } catch (e) {
        console.log(`TEST 6: FAILED - ${e.message}`);
        results.push({ name: 'Category filter works', pass: false });
    }

    // TEST 7: Edit template
    try {
        await page.click('.btn-edit-template');
        await page.waitForTimeout(200);
        await page.fill('#template-name', 'Welcome Email v2');
        await page.locator('#template-form button.btn-primary').click();
        await page.waitForTimeout(500);

        const name = await page.locator('.template-card h4').first().textContent();
        console.log(`TEST 7: Edit template`);
        console.log(`  Updated name: "${name}"`);
        results.push({ name: 'Template edited', pass: name === 'Welcome Email v2' });
    } catch (e) {
        console.log(`TEST 7: FAILED - ${e.message}`);
        results.push({ name: 'Template edited', pass: false });
    }

    // TEST 8: Delete template
    try {
        // Delete the second template (follow-up)
        await page.locator('.template-card').last().locator('.btn-delete-template').click();
        await page.evaluate(() => window.confirm = () => true);
        await page.locator('.template-card').last().locator('.btn-delete-template').click();
        await page.waitForTimeout(500);

        const cardCount = await page.locator('.template-card').count();
        console.log(`TEST 8: Delete template`);
        console.log(`  Template cards after delete: ${cardCount}`);
        results.push({ name: 'Template deleted', pass: cardCount === 1 });
    } catch (e) {
        console.log(`TEST 8: FAILED - ${e.message}`);
        results.push({ name: 'Template deleted', pass: false });
    }

    // TEST 9: Variable chips in editor
    try {
        await page.click('#btn-add-template');
        await page.waitForTimeout(200);
        const chipCount = await page.locator('.variable-chip').count();
        console.log(`TEST 9: Variable chips`);
        console.log(`  Variable chips found: ${chipCount}`);
        results.push({ name: 'Variable chips present', pass: chipCount === 7 });
        await page.click('#modal-close');
        await page.waitForTimeout(200);
    } catch (e) {
        console.log(`TEST 9: FAILED - ${e.message}`);
        results.push({ name: 'Variable chips present', pass: false });
    }

    // TEST 10: Preview text truncates variables
    try {
        const preview = await page.locator('.template-preview').first().textContent();
        console.log(`TEST 10: Preview text`);
        console.log(`  Preview: "${preview}"`);
        results.push({ name: 'Preview truncates variables', pass: preview.includes('[var]') && !preview.includes('{{') });
    } catch (e) {
        console.log(`TEST 10: FAILED - ${e.message}`);
        results.push({ name: 'Preview truncates variables', pass: false });
    }

    // Print results
    console.log('\n=== EMAIL TEMPLATES TEST RESULTS ===');
    let passed = 0;
    let failed = 0;
    results.forEach(r => {
        const icon = r.pass ? '✅' : '❌';
        console.log(`  ${icon} ${r.pass ? 'PASS' : 'FAIL'}: ${r.name}`);
        if (r.pass) passed++; else failed++;
    });
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
