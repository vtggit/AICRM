const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // Prevent unhandled page errors from crashing the test
  page.on('pageerror', (err) => {
    console.log('Page error (non-fatal):', err.message);
  });

  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);

    // Navigate to Leads
    console.log('SETUP: Navigate to Leads');
    await page.click('.nav-item[data-page="leads"]');
    await page.waitForSelector('#page-leads', { state: 'visible', timeout: 5000 });

    // Clear existing leads via API for deterministic test results
    await page.evaluate(async () => {
      const token = sessionStorage.getItem('aicrm_token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const resp = await fetch(Config.API_BASE_URL + '/leads', { headers });
      const leads = await resp.json();
      for (const l of leads) {
        await fetch(Config.API_BASE_URL + '/leads/' + l.id, { method: 'DELETE', headers });
      }
    });
    await page.waitForTimeout(500);
    // Re-render leads list to reflect cleared state
    await page.evaluate(async () => { if (App && App.renderLeads) App.renderLeads(); });
    await page.waitForTimeout(300);

    // Add a high-scoring lead (referral, qualified, high value, with all contact info)
    console.log('TEST 1: Add high-scoring lead');
    await page.click('#btn-add-lead');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.fill('#lead-name', 'Enterprise Corp');
    await page.fill('#lead-company', 'Enterprise Corp');
    await page.fill('#lead-email', 'info@enterprise.com');
    await page.fill('#lead-phone', '555-0100');
    await page.fill('#lead-value', '150000');
    await page.selectOption('#lead-stage', 'qualified');
    await page.selectOption('#lead-source', 'referral');
    await page.fill('#lead-notes', 'Very interested in enterprise plan');
    await page.click('#lead-form button[type="submit"]');
    await page.waitForSelector('#modal-overlay', { state: 'hidden', timeout: 5000 });

    // Check score badge exists and shows correct tier
    const scoreBadge = await page.locator('.score-badge').first();
    const scoreText = await scoreBadge.textContent();
    console.log(`  Score badge text: "${scoreText}"`);
    // Referral(15) + Qualified(25) + Value>100k(35) + email(5) + phone(5) + company(10) + notes(5) = 100 -> capped at 100 -> Critical
    results.push({ test: 'High-scoring lead shows Critical tier', pass: scoreText.includes('Critical') });
    await page.screenshot({ path: '/tmp/test-lead-score-high.png', fullPage: true });

    // Add a low-scoring lead (website, new, no value, minimal info)
    console.log('TEST 2: Add low-scoring lead');
    await page.click('#btn-add-lead');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.fill('#lead-name', 'Small Biz');
    await page.fill('#lead-company', '');
    await page.fill('#lead-email', '');
    await page.fill('#lead-phone', '');
    await page.fill('#lead-value', '');
    await page.selectOption('#lead-stage', 'new');
    await page.selectOption('#lead-source', 'website');
    await page.fill('#lead-notes', '');
    await page.click('#lead-form button[type="submit"]');
    await page.waitForSelector('#modal-overlay', { state: 'hidden', timeout: 5000 });

    // Check Cold score badge
    const coldBadges = await page.locator('.score-cold').count();
    console.log(`  Cold score badges found: ${coldBadges}`);
    results.push({ test: 'Low-scoring lead shows Cold tier', pass: coldBadges >= 1 });
    await page.screenshot({ path: '/tmp/test-lead-score-cold.png', fullPage: true });

    // Test score filter
    console.log('TEST 3: Filter leads by score tier');
    await page.selectOption('#lead-filter-score', 'critical');
    await page.waitForTimeout(500);
    const criticalCards = await page.locator('.lead-card').count();
    console.log(`  Critical leads after filter: ${criticalCards}`);
    results.push({ test: 'Score filter (Critical) works', pass: criticalCards === 1 });

    // Reset filter and test Cold filter
    await page.selectOption('#lead-filter-score', 'cold');
    await page.waitForTimeout(500);
    const coldCards = await page.locator('.lead-card').count();
    console.log(`  Cold leads after filter: ${coldCards}`);
    results.push({ test: 'Score filter (Cold) works', pass: coldCards === 1 });

    // Reset filter
    await page.selectOption('#lead-filter-score', '');
    await page.waitForTimeout(200);

    // Test sort by score
    console.log('TEST 4: Sort leads by score');
    await page.selectOption('#lead-sort', 'score-desc');
    await page.waitForTimeout(500);
    // Wait for lead cards to re-render
    await page.waitForSelector('.lead-card', { timeout: 5000 });
    const cards = await page.locator('.lead-card').count();
    console.log(`  Lead cards visible: ${cards}`);
    if (cards > 0) {
        const firstLeadName = await page.locator('.lead-card .card-header h4').first().textContent();
        console.log(`  First lead after score sort: "${firstLeadName}"`);
        results.push({ test: 'Sort by score (highest first) works', pass: firstLeadName === 'Enterprise Corp' });
    } else {
        results.push({ test: 'Sort by score (highest first) works', pass: false, error: 'No lead cards found' });
    }

    // Test combined filter (stage + score)
    console.log('TEST 5: Combined stage + score filter');
    await page.selectOption('#lead-filter-stage', 'qualified');
    await page.selectOption('#lead-filter-score', 'critical');
    await page.waitForTimeout(500);
    const combinedCards = await page.locator('.lead-card').count();
    console.log(`  Combined filter results: ${combinedCards}`);
    results.push({ test: 'Combined stage + score filter works', pass: combinedCards === 1 });

    // Test score badge tooltip
    console.log('TEST 6: Score badge tooltip');
    await page.selectOption('#lead-filter-stage', '');
    await page.selectOption('#lead-filter-score', '');
    await page.waitForTimeout(200);
    const freshBadge = await page.locator('.score-badge').first();
    const tooltip = await freshBadge.getAttribute('title');
    console.log(`  Score badge tooltip: "${tooltip}"`);
    results.push({ test: 'Score badge has tooltip with score value', pass: tooltip && tooltip.includes('/100') });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    try {
      await browser.close();
    } catch { /* ignore close errors */ }
  }

  console.log('\n=== LEAD SCORING TEST RESULTS ===');
  let passed = 0;
  let failed = 0;
  results.forEach(r => {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}: ${r.test}${r.error ? ` - ${r.error}` : ''}`);
    if (r.pass) passed++; else failed++;
  });
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})();
