const { chromium } = require('playwright');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8080/app/index.html', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });

    // Test 1: Sidebar version displays
    console.log('TEST 1: Sidebar version displays');
    const sidebarVersion = await page.textContent('#app-version-sidebar');
    console.log(`  Sidebar version: "${sidebarVersion}"`);
    results.push({ test: 'Sidebar version displays', pass: sidebarVersion === 'v0.0.5' });

    // Test 2: Settings version displays
    console.log('TEST 2: Settings version displays');
    await page.click('.nav-item[data-page="settings"]');
    await page.waitForTimeout(300);
    const settingsVersion = await page.textContent('#app-version-settings');
    console.log(`  Settings version: "${settingsVersion}"`);
    results.push({ test: 'Settings version displays', pass: settingsVersion === '0.0.5' });

    // Test 3: Both versions are consistent
    console.log('TEST 3: Version consistency');
    const consistent = sidebarVersion === 'v0.0.5' && settingsVersion === '0.0.5';
    console.log(`  Versions consistent: ${consistent}`);
    results.push({ test: 'Version consistency', pass: consistent });

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
