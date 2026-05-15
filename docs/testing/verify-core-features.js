const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    // Test 1: Load Dashboard
    console.log('TEST 1: Load Dashboard');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });
    await page.screenshot({ path: '/tmp/test-dashboard.png', fullPage: true });
    const title = await page.textContent('#page-title');
    console.log(`  Dashboard title: "${title}"`);
    results.push({ test: 'Dashboard loads', pass: title === 'Dashboard' });

    // Test 2: Check stat cards exist
    console.log('TEST 2: Check stat cards');
    const statCards = await page.locator('.stat-card').count();
    console.log(`  Stat cards found: ${statCards}`);
    results.push({ test: 'Stat cards visible', pass: statCards >= 6 });

    // Test 3: Navigate to Contacts
    console.log('TEST 3: Navigate to Contacts');
    await page.click('.nav-item[data-page="contacts"]');
    // Wait for contacts to actually render (async data load)
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 10000 });
    await page.screenshot({ path: '/tmp/test-contacts.png', fullPage: true });
    const contactsTitle = await page.textContent('#page-title');
    console.log(`  Contacts title: "${contactsTitle}"`);
    results.push({ test: 'Contacts page loads', pass: contactsTitle === 'Contacts' });

    // Test 4: Add a Contact
    console.log('TEST 4: Add a Contact');
    const contactsBefore = await page.locator('.contact-card').count();
    await page.click('#btn-add-contact');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    // Use unique name to avoid duplicate detection
    const ts = Date.now();
    const uniqueContactName = `Contact ${ts}`;
    await page.fill('#contact-name', uniqueContactName);
    await page.fill('#contact-email', `contact${ts}@example.com`);
    await page.fill('#contact-phone', `555-${ts.toString().slice(-4)}`);
    await page.fill('#contact-company', `Test Corp ${ts}`);
    await page.selectOption('#contact-status', 'active');
    await page.fill('#contact-notes', 'Test contact');
    await page.click('#contact-form .btn-primary');
    // Wait for modal to close
    await page.waitForSelector('#modal-overlay', { state: 'hidden', timeout: 5000 });
    // Wait for re-render
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test-contact-added.png', fullPage: true });
    const contactCard = await page.locator('.contact-card').count();
    console.log(`  Contact cards after add: ${contactCard} (was ${contactsBefore})`);
    results.push({ test: 'Contact created', pass: contactCard === contactsBefore + 1 });

    // Test 5: Navigate to Leads and Add a Lead
    console.log('TEST 5: Navigate to Leads and Add a Lead');
    await page.click('.nav-item[data-page="leads"]');
    // Wait for leads to render
    await page.waitForTimeout(1000);
    const leadsBefore = await page.locator('.lead-card').count();
    await page.click('#btn-add-lead');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    const leadTs = Date.now();
    const uniqueLeadName = `Lead ${leadTs}`;
    await page.fill('#lead-name', uniqueLeadName);
    await page.fill('#lead-company', `Lead Corp ${leadTs}`);
    await page.fill('#lead-email', `lead${leadTs}@example.com`);
    await page.fill('#lead-value', '50000');
    await page.selectOption('#lead-stage', 'qualified');
    await page.selectOption('#lead-source', 'website');
    await page.fill('#lead-notes', 'Test lead');
    await page.click('#lead-form .btn-primary');
    // Wait for modal to close
    await page.waitForSelector('#modal-overlay', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test-lead-added.png', fullPage: true });
    const leadCard = await page.locator('.lead-card').count();
    console.log(`  Lead cards after add: ${leadCard} (was ${leadsBefore})`);
    results.push({ test: 'Lead created', pass: leadCard === leadsBefore + 1 });

    // Test 6: Navigate to Activities and Add Activity
    console.log('TEST 6: Navigate to Activities and Add Activity');
    await page.click('.nav-item[data-page="activities"]');
    await page.waitForTimeout(1000);
    const activitiesBefore = await page.locator('.timeline-item').count();
    await page.click('#btn-add-activity');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.selectOption('#activity-type', 'meeting');
    await page.fill('#activity-description', 'Test activity description');
    // Don't select a specific contact to avoid dropdown issues
    await page.click('#activity-form .btn-primary');
    // Wait for modal to close
    await page.waitForSelector('#modal-overlay', { state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test-activity-added.png', fullPage: true });
    const timelineItems = await page.locator('.timeline-item').count();
    console.log(`  Timeline items after add: ${timelineItems} (was ${activitiesBefore})`);
    results.push({ test: 'Activity created', pass: timelineItems === activitiesBefore + 1 });

    // Test 7: Verify Dashboard Stats Updated
    console.log('TEST 7: Verify Dashboard Stats Updated');
    await page.click('.nav-item[data-page="dashboard"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/test-dashboard-updated.png', fullPage: true });
    const totalContacts = await page.textContent('#stat-total-contacts');
    const totalLeads = await page.textContent('#stat-total-leads');
    console.log(`  Total contacts: ${totalContacts}, Total leads: ${totalLeads}`);
    results.push({ test: 'Dashboard stats updated', pass: parseInt(totalContacts) > 0 && parseInt(totalLeads) > 0 });

    // Test 8: Search functionality
    console.log('TEST 8: Search functionality');
    await page.fill('#global-search', 'John');
    // Wait for debounce (300ms) + API calls + navigation render
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/test-search.png', fullPage: true });
    const searchPageTitle = await page.textContent('#page-title');
    console.log(`  After search, page: "${searchPageTitle}"`);
    results.push({ test: 'Search navigates to contacts', pass: searchPageTitle === 'Contacts' });

    // Test 9: Theme toggle
    console.log('TEST 9: Theme toggle');
    const currentTheme = await page.getAttribute('html', 'data-theme') || 'light';
    const expectedTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await page.click('#theme-toggle');
    await page.waitForTimeout(500);
    const newTheme = await page.getAttribute('html', 'data-theme');
    await page.screenshot({ path: '/tmp/test-dark-theme.png', fullPage: true });
    console.log(`  Theme changed from "${currentTheme}" to "${newTheme}"`);
    results.push({ test: 'Theme toggle works', pass: newTheme === expectedTheme });
    // Toggle back so subsequent tests have consistent state
    await page.click('#theme-toggle');
    await page.waitForTimeout(300);

    // Test 10: Filter contacts by status
    console.log('TEST 10: Filter contacts by status');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 10000 });
    await page.selectOption('#contact-filter-status', 'active');
    await page.waitForTimeout(500);
    const filteredCards = await page.locator('.contact-card').count();
    console.log(`  Filtered cards (active): ${filteredCards}`);
    results.push({ test: 'Filter by status works', pass: filteredCards > 0 });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST RESULTS ===');
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
