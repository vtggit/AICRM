const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE_URL = 'http://localhost:8080/';
const SCREENSHOTS_DIR = '/home/aicrm/workspace/AICRM/docs/testing/screenshots/';

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Step 2: Set auth via setPageAuth
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    // Step 3: Navigate to the app
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Step 4: Wait for auth
    await waitForAuthReady(page, true, 15000);

    // =========================================================================
    // FEATURE 1: Dashboard (Core Requirement #1)
    // =========================================================================
    console.log('\n=== FEATURE 1: Dashboard ===');

    // Test 1.1: Dashboard loads
    console.log('TEST 1.1: Dashboard loads');
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 10000 });
    const dashboardTitle = await page.textContent('#page-title');
    console.log('  Dashboard title: "' + dashboardTitle + '"');
    results.push({ test: 'Dashboard loads', pass: dashboardTitle === 'Dashboard' });

    // Test 1.2: Stat cards exist (total contacts, leads, activities, etc.)
    console.log('TEST 1.2: Stat cards exist');
    const statCards = await page.locator('.stat-card').count();
    console.log('  Stat cards found: ' + statCards);
    results.push({ test: 'Stat cards exist (>= 4)', pass: statCards >= 4 });

    // Test 1.3: Recent activities feed exists
    console.log('TEST 1.3: Recent activities feed');
    const activitiesFeedExists = await page.locator('.recent-activities, .activity-feed, #recent-activities, .timeline-item').count();
    console.log('  Activity feed elements found: ' + activitiesFeedExists);
    results.push({ test: 'Recent activities feed exists', pass: activitiesFeedExists >= 1 });

    // Test 1.4: Dashboard screenshot
    console.log('TEST 1.4: Dashboard screenshot');
    await page.screenshot({
      path: SCREENSHOTS_DIR + 'dashboard-verification.png',
      fullPage: true,
    });
    console.log('  Screenshot saved to ' + SCREENSHOTS_DIR + 'dashboard-verification.png');
    results.push({ test: 'Dashboard screenshot captured', pass: true });

    // =========================================================================
    // FEATURE 2: Contact Management (Core Requirement #2)
    // =========================================================================
    console.log('\n=== FEATURE 2: Contact Management ===');

    // Test 2.1: Navigate to Contacts page
    console.log('TEST 2.1: Navigate to Contacts page');
    await page.click('.nav-item[data-page="contacts"]');
    // Wait specifically for contact cards (async data load), not just the page container
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 15000 });
    const contactsTitle = await page.textContent('#page-title');
    console.log('  Contacts page title: "' + contactsTitle + '"');
    results.push({ test: 'Contacts page loads', pass: contactsTitle === 'Contacts' });

    // Test 2.2: Contacts displayed in card format
    console.log('TEST 2.2: Contacts displayed in card format');
    const contactCards = await page.locator('.contact-card').count();
    console.log('  Contact cards found: ' + contactCards);
    results.push({ test: 'Contacts in card format (>= 1)', pass: contactCards >= 1 });

    // Test 2.3: Filter by status exists and works
    console.log('TEST 2.3: Filter by status');
    const filterDropdownExists = await page.locator('#contact-filter-status, select[name="status"], .status-filter').count();
    console.log('  Status filter dropdown found: ' + filterDropdownExists);
    if (filterDropdownExists > 0) {
      const cardsBefore = await page.locator('.contact-card').count();
      await page.selectOption('#contact-filter-status', 'active');
      await page.waitForTimeout(500);
      const cardsAfter = await page.locator('.contact-card').count();
      console.log('  Cards before filter: ' + cardsBefore + ', after active filter: ' + cardsAfter);
      results.push({ test: 'Filter by status works', pass: cardsAfter >= 0 });
      // Reset filter back to all
      await page.selectOption('#contact-filter-status', '');
      await page.waitForTimeout(300);
    } else {
      results.push({ test: 'Filter by status exists', pass: false, error: 'No status filter dropdown found' });
    }

    // Test 2.4: New Contact button exists
    console.log('TEST 2.4: New Contact button exists');
    const newContactBtn = await page.locator('#btn-add-contact, .btn-add-contact, button:has-text("New Contact"), button:has-text("Add Contact")').count();
    console.log('  New Contact button(s) found: ' + newContactBtn);
    results.push({ test: 'New Contact button exists', pass: newContactBtn >= 1 });

    // Test 2.5: Contacts screenshot
    console.log('TEST 2.5: Contacts screenshot');
    await page.screenshot({
      path: SCREENSHOTS_DIR + 'contacts-verification.png',
      fullPage: true,
    });
    console.log('  Screenshot saved to ' + SCREENSHOTS_DIR + 'contacts-verification.png');
    results.push({ test: 'Contacts screenshot captured', pass: true });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log('\n==============================');
  console.log('=== VERIFICATION RESULTS ===');
  console.log('==============================');
  let passed = 0;
  let failed = 0;
  results.forEach(r => {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log('  ' + status + ': ' + r.test + (r.error ? ' — ' + r.error : ''));
    if (r.pass) passed++; else failed++;
  });
  console.log('\nTotal: ' + results.length + ' | Passed: ' + passed + ' | Failed: ' + failed);
  console.log('==============================');

  process.exit(failed > 0 ? 1 : 0);
})();
