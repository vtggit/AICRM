/**
 * Test: Dashboard Revenue Summary (Priority 12)
 * Tests revenue stat cards and pipeline revenue breakdown
 */
const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
    const results = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    const errors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    try {
        await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);

        // Navigate to Leads and create test leads with values
        await page.click('.nav-item[data-page="leads"]');
        await page.waitForTimeout(200);

        // Lead 1: Won deal, $50,000
        console.log('SETUP: Create Won lead ($50,000)');
        await page.click('#btn-add-lead');
        await page.waitForSelector('#lead-form');
        await page.fill('#lead-name', 'Won Deal');
        await page.fill('#lead-company', 'Big Corp');
        await page.fill('#lead-value', '50000');
        await page.selectOption('#lead-stage', 'won');
        await page.selectOption('#lead-source', 'referral');
        await page.fill('#lead-email', 'won@bigcorp.com');
        await page.click('#lead-form .btn-primary');
        await page.waitForTimeout(300);

        // Lead 2: Proposal stage, $30,000
        console.log('SETUP: Create Proposal lead ($30,000)');
        await page.click('#btn-add-lead');
        await page.waitForSelector('#lead-form');
        await page.fill('#lead-name', 'Proposal Deal');
        await page.fill('#lead-company', 'Medium Inc');
        await page.fill('#lead-value', '30000');
        await page.selectOption('#lead-stage', 'proposal');
        await page.selectOption('#lead-source', 'website');
        await page.click('#lead-form .btn-primary');
        await page.waitForTimeout(300);

        // Lead 3: Qualified stage, $15,000
        console.log('SETUP: Create Qualified lead ($15,000)');
        await page.click('#btn-add-lead');
        await page.waitForSelector('#lead-form');
        await page.fill('#lead-name', 'Qualified Deal');
        await page.fill('#lead-value', '15000');
        await page.selectOption('#lead-stage', 'qualified');
        await page.click('#lead-form .btn-primary');
        await page.waitForTimeout(300);

        // Lead 4: Lost deal, $10,000 (should NOT count in pipeline)
        console.log('SETUP: Create Lost lead ($10,000)');
        await page.click('#btn-add-lead');
        await page.waitForSelector('#lead-form');
        await page.fill('#lead-name', 'Lost Deal');
        await page.fill('#lead-value', '10000');
        await page.selectOption('#lead-stage', 'lost');
        await page.click('#lead-form .btn-primary');
        await page.waitForTimeout(300);

        // Navigate to Dashboard
        await page.click('.nav-item[data-page="dashboard"]');
        await page.waitForTimeout(300);

        // TEST 1: Revenue stat cards exist
        console.log('\nTEST 1: Revenue stat cards exist');
        const pipelineValueEl = await page.$('#stat-pipeline-value');
        const wonRevenueEl = await page.$('#stat-won-revenue');
        results.push({ name: 'Pipeline value stat exists', pass: !!pipelineValueEl });
        results.push({ name: 'Won revenue stat exists', pass: !!wonRevenueEl });

        // TEST 2: Pipeline value is correct ($30k + $15k = $45k, excludes lost)
        console.log('TEST 2: Pipeline value calculation');
        const pipelineValueText = await page.$eval('#stat-pipeline-value', el => el.textContent);
        console.log(`  Pipeline value: ${pipelineValueText}`);
        results.push({ name: 'Pipeline value is $45,000', pass: pipelineValueText === '$45,000' });

        // TEST 3: Won revenue is correct ($50k)
        console.log('TEST 3: Won revenue calculation');
        const wonRevenueText = await page.$eval('#stat-won-revenue', el => el.textContent);
        console.log(`  Won revenue: ${wonRevenueText}`);
        results.push({ name: 'Won revenue is $50,000', pass: wonRevenueText === '$50,000' });

        // TEST 4: Revenue cards have special styling
        console.log('TEST 4: Revenue card styling');
        const revenueCards = await page.$$('.revenue-card');
        results.push({ name: 'Revenue cards have revenue-card class', pass: revenueCards.length === 2 });

        // TEST 5: Pipeline stage values are displayed
        console.log('TEST 5: Pipeline stage revenue values');
        const wonValue = await page.$eval('#pipeline-won-value', el => el.textContent);
        const proposalValue = await page.$eval('#pipeline-proposal-value', el => el.textContent);
        const qualifiedValue = await page.$eval('#pipeline-qualified-value', el => el.textContent);
        const newValue = await page.$eval('#pipeline-new-value', el => el.textContent);
        console.log(`  Won: ${wonValue}, Proposal: ${proposalValue}, Qualified: ${qualifiedValue}, New: "${newValue}"`);
        results.push({ name: 'Won stage shows $50,000', pass: wonValue === '$50,000' });
        results.push({ name: 'Proposal stage shows $30,000', pass: proposalValue === '$30,000' });
        results.push({ name: 'Qualified stage shows $15,000', pass: qualifiedValue === '$15,000' });
        results.push({ name: 'New stage with no value is empty', pass: newValue === '' });

        // TEST 6: Pipeline counts still correct
        console.log('TEST 6: Pipeline stage counts');
        const wonCount = await page.$eval('#pipeline-won', el => el.textContent);
        const proposalCount = await page.$eval('#pipeline-proposal', el => el.textContent);
        const qualifiedCount = await page.$eval('#pipeline-qualified', el => el.textContent);
        console.log(`  Won: ${wonCount}, Proposal: ${proposalCount}, Qualified: ${qualifiedCount}`);
        results.push({ name: 'Won count is 1', pass: wonCount === '1' });
        results.push({ name: 'Proposal count is 1', pass: proposalCount === '1' });
        results.push({ name: 'Qualified count is 1', pass: qualifiedCount === '1' });

        // TEST 7: Console has no errors
        console.log('TEST 7: No console errors');
        results.push({ name: 'No console errors', pass: errors.length === 0 });
        if (errors.length > 0) console.log(`  Errors: ${errors.join(', ')}`);

        // Screenshot
        await page.screenshot({ path: 'test-results/revenue-summary.png', fullPage: true });
        console.log('\nScreenshot saved to test-results/revenue-summary.png');

    } catch (err) {
        console.error('Test error:', err.message);
    } finally {
        await browser.close();
    }

    // Report
    console.log('\n=== REVENUE SUMMARY TEST RESULTS ===');
    let passed = 0;
    let failed = 0;
    results.forEach(r => {
        const icon = r.pass ? '✅' : '❌';
        console.log(`  ${icon} ${r.pass ? 'PASS' : 'FAIL'}: ${r.name}`);
        if (r.pass) passed++; else failed++;
    });
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
})();
