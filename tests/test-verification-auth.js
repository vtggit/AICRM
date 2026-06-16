const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Collect console messages
  const errors = [];
  const warnings = [];
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') errors.push(text);
    else if (type === 'warn') warnings.push(text);
    else logs.push(text);
  });

  // Collect page-level JS errors
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  // Track network failures
  const networkErrors = [];
  page.on('requestfailed', req => {
    networkErrors.push(`${req.failure().errorText}: ${req.url()}`);
  });

  console.log('=== AICRM Auth Verification Tests ===\n');

  // -------------------------------------------------------
  // STEP 1: Navigate to the app
  // -------------------------------------------------------
  console.log('[1] Navigating to http://localhost:8080 ...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check initial page state
  const pageTitle = await page.title();
  console.log(`    Page title: "${pageTitle}"`);

  const initialAuthStatus = await page.locator('#auth-status').first().innerText();
  console.log(`    Auth status text: "${initialAuthStatus.trim()}"`);

  // Take pre-login screenshot
  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-pre-login.png', fullPage: true });
  console.log('    Screenshot: verification-pre-login.png\n');

  // -------------------------------------------------------
  // STEP 2: Click the "Log In" button to open login modal
  // -------------------------------------------------------
  console.log('[2] Clicking Log In button ...');

  // The login button can be the auth-status indicator or the explicit login button
  const loginBtnSelector = '#auth-banner-login-btn, #auth-status';
  const loginBtn = page.locator(loginBtnSelector).first();

  if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await loginBtn.click();
    console.log('    Login button clicked.');
  } else {
    console.log('    WARNING: Login button not found. Checking auth status...');
    // Maybe already showing auth banner
    await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-no-login-btn.png', fullPage: true });
  }

  await page.waitForTimeout(500);

  // -------------------------------------------------------
  // STEP 3: Fill in the dev token in the login modal
  // -------------------------------------------------------
  console.log('[3] Entering dev token ...');

  // Wait for login modal to appear
  const modalVisible = await page.locator('#login-modal').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Login modal visible: ${modalVisible}`);

  if (modalVisible) {
    const tokenInput = page.locator('#login-token');
    await tokenInput.fill('dev-secret-token:admin');
    console.log('    Token entered.');

    // Click Sign In button
    console.log('[4] Clicking Sign In ...');
    await page.locator('#login-submit').click();
    await page.waitForTimeout(3000);

    // Close the modal if it's still open
    const modalStillOpen = await page.locator('#login-modal').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (modalStillOpen) {
      await page.locator('#modal-close, #login-cancel').first().click();
      await page.waitForTimeout(500);
    }
  } else {
    console.log('    WARNING: Login modal did not appear.');
  }

  // Check auth status after login
  const postLoginAuthStatus = await page.locator('#auth-status').first().innerText();
  console.log(`    Post-login auth status: "${postLoginAuthStatus.trim()}"\n`);

  // -------------------------------------------------------
  // STEP 4: Verify Dashboard loads with stat cards
  // -------------------------------------------------------
  console.log('[5] Verifying Dashboard ...');

  // Ensure we're on dashboard
  const dashboardPage = page.locator('#page-dashboard');
  const dashboardVisible = await dashboardPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Dashboard page visible: ${dashboardVisible}`);

  // Check stat cards
  const statCards = await page.locator('.stat-card').count();
  console.log(`    Stat cards found: ${statCards}`);

  // Read individual stat values
  const stats = {
    'Total Contacts': await page.locator('#stat-total-contacts').innerText(),
    'Total Leads': await page.locator('#stat-total-leads').innerText(),
    'Converted Leads': await page.locator('#stat-converted-leads').innerText(),
    "Today's Activities": await page.locator('#stat-today-activities').innerText(),
    'Pipeline Value': await page.locator('#stat-pipeline-value').innerText(),
    'Won Revenue': await page.locator('#stat-won-revenue').innerText(),
    'Overdue Activities': await page.locator('#stat-overdue-activities').innerText(),
  };
  console.log('    Stat values:');
  for (const [name, value] of Object.entries(stats)) {
    console.log(`      ${name}: ${value}`);
  }

  // Check dashboard cards (recent activities, pipeline, etc.)
  const dashboardCards = await page.locator('.dashboard-card').count();
  console.log(`    Dashboard info cards: ${dashboardCards}`);

  // Check page title
  const pageTitleAfterLogin = await page.locator('#page-title').innerText();
  console.log(`    Page title element: "${pageTitleAfterLogin}"`);

  // Take dashboard screenshot
  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-dashboard-auth.png', fullPage: true });
  console.log('    Screenshot: verification-dashboard-auth.png\n');

  // -------------------------------------------------------
  // STEP 5: Navigate to Contacts page
  // -------------------------------------------------------
  console.log('[6] Navigating to Contacts ...');

  await page.locator('li.nav-item[data-page="contacts"]').click();
  await page.waitForTimeout(2000);

  // Verify contacts page is active
  const contactsPage = page.locator('#page-contacts');
  const contactsVisible = await contactsPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Contacts page visible: ${contactsVisible}`);

  // Check contacts page elements
  const contactsTitle = await page.locator('#page-title').innerText();
  console.log(`    Page title element: "${contactsTitle}"`);

  const addContactBtn = await page.locator('#btn-add-contact').isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`    "Add Contact" button visible: ${addContactBtn}`);

  const contactsList = await page.locator('#contacts-list').innerText();
  const hasContacts = !contactsList.includes('No contacts yet');
  console.log(`    Contacts list has data: ${hasContacts}`);
  console.log(`    Contacts list content preview: "${contactsList.substring(0, 100)}..."`);

  // Check filter controls
  const filterSelect = await page.locator('#contact-filter-status').isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`    Status filter visible: ${filterSelect}`);

  const sortSelect = await page.locator('#contact-sort').isVisible({ timeout: 1000 }).catch(() => false);
  console.log(`    Sort dropdown visible: ${sortSelect}`);

  // Take contacts screenshot
  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-contacts-auth.png', fullPage: true });
  console.log('    Screenshot: verification-contacts-auth.png\n');

  // -------------------------------------------------------
  // STEP 6: Navigate to Leads page (bonus)
  // -------------------------------------------------------
  console.log('[7] Navigating to Leads ...');

  await page.locator('li.nav-item[data-page="leads"]').click();
  await page.waitForTimeout(2000);

  const leadsPage = page.locator('#page-leads');
  const leadsVisible = await leadsPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Leads page visible: ${leadsVisible}`);

  const leadsTitle = await page.locator('#page-title').innerText();
  console.log(`    Page title element: "${leadsTitle}"`);

  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-leads-auth.png', fullPage: true });
  console.log('    Screenshot: verification-leads-auth.png\n');

  // -------------------------------------------------------
  // STEP 7: Navigate to Analytics page (bonus)
  // -------------------------------------------------------
  console.log('[8] Navigating to Analytics ...');

  await page.locator('li.nav-item[data-page="analytics"]').click();
  await page.waitForTimeout(2000);

  const analyticsPage = page.locator('#page-analytics');
  const analyticsVisible = await analyticsPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Analytics page visible: ${analyticsVisible}`);

  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-analytics-auth.png', fullPage: true });
  console.log('    Screenshot: verification-analytics-auth.png\n');

  // -------------------------------------------------------
  // STEP 8: Navigate to Activities page (bonus)
  // -------------------------------------------------------
  console.log('[9] Navigating to Activities ...');

  await page.locator('li.nav-item[data-page="activities"]').click();
  await page.waitForTimeout(2000);

  const activitiesPage = page.locator('#page-activities');
  const activitiesVisible = await activitiesPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Activities page visible: ${activitiesVisible}`);

  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-activities-auth.png', fullPage: true });
  console.log('    Screenshot: verification-activities-auth.png\n');

  // -------------------------------------------------------
  // STEP 9: Navigate to Settings page (bonus)
  // -------------------------------------------------------
  console.log('[10] Navigating to Settings ...');

  await page.locator('li.nav-item[data-page="settings"]').click();
  await page.waitForTimeout(2000);

  const settingsPage = page.locator('#page-settings');
  const settingsVisible = await settingsPage.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`    Settings page visible: ${settingsVisible}`);

  await page.screenshot({ path: '/home/aicrm/workspace/AICRM/screenshots/verification-settings-auth.png', fullPage: true });
  console.log('    Screenshot: verification-settings-auth.png\n');

  // -------------------------------------------------------
  // FINAL: Report all results
  // -------------------------------------------------------
  console.log('========================================');
  console.log('=== TEST RESULTS SUMMARY ===');
  console.log('========================================');
  console.log('');

  // Page navigation results
  console.log('--- Page Navigation ---');
  console.log(`  Dashboard:     ${dashboardVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Contacts:      ${contactsVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Leads:         ${leadsVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Analytics:     ${analyticsVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Activities:    ${activitiesVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Settings:      ${settingsVisible ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Dashboard content
  console.log('--- Dashboard Content ---');
  console.log(`  Stat cards:    ${statCards >= 7 ? '✅ PASS (' + statCards + ')' : '❌ FAIL (' + statCards + ')'}`);
  console.log(`  Info cards:    ${dashboardCards >= 3 ? '✅ PASS (' + dashboardCards + ')' : '❌ FAIL (' + dashboardCards + ')'}`);
  console.log('');

  // Contacts features
  console.log('--- Contacts Features ---');
  console.log(`  Add button:    ${addContactBtn ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Status filter: ${filterSelect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Sort control:  ${sortSelect ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Console errors
  console.log('--- Console Messages ---');
  if (errors.length === 0) {
    console.log('  Console errors:  ✅ None');
  } else {
    console.log(`  Console errors:  ❌ ${errors.length} found:`);
    errors.forEach(e => console.log(`    - ${e}`));
  }

  if (warnings.length === 0) {
    console.log('  Console warns:   ✅ None');
  } else {
    console.log(`  Console warns:   ⚠️  ${warnings.length} found:`);
    warnings.forEach(w => console.log(`    - ${w}`));
  }

  if (pageErrors.length === 0) {
    console.log('  Page errors:     ✅ None');
  } else {
    console.log(`  Page errors:     ❌ ${pageErrors.length} found:`);
    pageErrors.forEach(e => console.log(`    - ${e}`));
  }

  if (networkErrors.length === 0) {
    console.log('  Network errors:  ✅ None');
  } else {
    console.log(`  Network errors:  ❌ ${networkErrors.length} found:`);
    networkErrors.forEach(e => console.log(`    - ${e}`));
  }

  console.log('');
  console.log('========================================');
  const totalIssues = errors.length + pageErrors.length + networkErrors.length;
  if (totalIssues === 0 && dashboardVisible && contactsVisible) {
    console.log('  OVERALL: ✅ ALL TESTS PASSED');
  } else {
    console.log(`  OVERALL: ⚠️  ${totalIssues} issue(s) detected`);
  }
  console.log('========================================');

  await browser.close();
})();
