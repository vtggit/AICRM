const { chromium } = require('playwright');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Test 1: Load Dashboard
    console.log('TEST 1: Load Dashboard');
    await page.goto('http://localhost:8080/app/index.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });
    await page.screenshot({ path: '/tmp/test-dashboard.png', fullPage: true });
    const title = await page.textContent('#page-title');
    console.log(`  Dashboard title: "${title}"`);
    results.push({ test: 'Dashboard loads', pass: title === 'Dashboard' });

    // Test 2: Check stat cards exist
    console.log('TEST 2: Check stat cards');
    const statCards = await page.locator('.stat-card').count();
    console.log(`  Stat cards found: ${statCards}`);
    results.push({ test: 'Stat cards visible', pass: statCards === 6 });

    // Test 3: Navigate to Contacts
    console.log('TEST 3: Navigate to Contacts');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/test-contacts.png', fullPage: true });
    const contactsTitle = await page.textContent('#page-title');
    console.log(`  Contacts title: "${contactsTitle}"`);
    results.push({ test: 'Contacts page loads', pass: contactsTitle === 'Contacts' });

    // Test 4: Add a Contact
    console.log('TEST 4: Add a Contact');
    await page.click('#btn-add-contact');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.fill('#contact-name', 'John Smith');
    await page.fill('#contact-email', 'john@example.com');
    await page.fill('#contact-phone', '555-0123');
    await page.fill('#contact-company', 'Acme Corp');
    await page.selectOption('#contact-status', 'active');
    await page.fill('#contact-notes', 'Key client for Q1');
    await page.click('#contact-form .btn-primary');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-contact-added.png', fullPage: true });
    const contactCard = await page.locator('.contact-card').count();
    console.log(`  Contact cards after add: ${contactCard}`);
    results.push({ test: 'Contact created', pass: contactCard === 1 });

    // Test 5: Navigate to Leads and Add a Lead
    console.log('TEST 5: Navigate to Leads and Add a Lead');
    await page.click('.nav-item[data-page="leads"]');
    await page.waitForTimeout(300);
    await page.click('#btn-add-lead');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.fill('#lead-name', 'Tech Startup Inc');
    await page.fill('#lead-company', 'Tech Startup Inc');
    await page.fill('#lead-email', 'info@techstartup.io');
    await page.fill('#lead-value', '50000');
    await page.selectOption('#lead-stage', 'qualified');
    await page.selectOption('#lead-source', 'website');
    await page.fill('#lead-notes', 'Interested in enterprise plan');
    await page.click('#lead-form .btn-primary');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-lead-added.png', fullPage: true });
    const leadCard = await page.locator('.lead-card').count();
    console.log(`  Lead cards after add: ${leadCard}`);
    results.push({ test: 'Lead created', pass: leadCard === 1 });

    // Test 6: Navigate to Activities and Add Activity
    console.log('TEST 6: Navigate to Activities and Add Activity');
    await page.click('.nav-item[data-page="activities"]');
    await page.waitForTimeout(300);
    await page.click('#btn-add-activity');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    await page.selectOption('#activity-type', 'meeting');
    await page.fill('#activity-description', 'Discussed project requirements and timeline');
    await page.selectOption('#activity-contact', 'John Smith');
    await page.click('#activity-form .btn-primary');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-activity-added.png', fullPage: true });
    const timelineItems = await page.locator('.timeline-item').count();
    console.log(`  Timeline items after add: ${timelineItems}`);
    results.push({ test: 'Activity created', pass: timelineItems === 1 });

    // Test 7: Verify Dashboard Stats Updated
    console.log('TEST 7: Verify Dashboard Stats Updated');
    await page.click('.nav-item[data-page="dashboard"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/test-dashboard-updated.png', fullPage: true });
    const totalContacts = await page.textContent('#stat-total-contacts');
    const totalLeads = await page.textContent('#stat-total-leads');
    console.log(`  Total contacts: ${totalContacts}, Total leads: ${totalLeads}`);
    results.push({ test: 'Dashboard stats updated', pass: totalContacts === '1' && totalLeads === '1' });

    // Test 8: Search functionality
    console.log('TEST 8: Search functionality');
    await page.fill('#global-search', 'John');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-search.png', fullPage: true });
    const searchPageTitle = await page.textContent('#page-title');
    console.log(`  After search, page: "${searchPageTitle}"`);
    results.push({ test: 'Search navigates to contacts', pass: searchPageTitle === 'Contacts' });

    // Test 9: Theme toggle
    console.log('TEST 9: Theme toggle');
    await page.click('#theme-toggle');
    await page.waitForTimeout(300);
    const theme = await page.getAttribute('html', 'data-theme');
    await page.screenshot({ path: '/tmp/test-dark-theme.png', fullPage: true });
    console.log(`  Theme: "${theme}"`);
    results.push({ test: 'Dark theme applied', pass: theme === 'dark' });

    // Test 10: Filter contacts by status
    console.log('TEST 10: Filter contacts by status');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(200);
    await page.selectOption('#contact-filter-status', 'active');
    await page.waitForTimeout(300);
    const filteredCards = await page.locator('.contact-card').count();
    console.log(`  Filtered cards (active): ${filteredCards}`);
    results.push({ test: 'Filter by status works', pass: filteredCards === 1 });

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
