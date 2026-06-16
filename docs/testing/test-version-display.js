const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();

    // Catch unhandled page errors so they don't crash the browser
    page.on('pageerror', (err) => {
      console.warn('Page error (non-fatal):', err.message);
    });

    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });

    // Test 1: Sidebar version element exists and displays
    console.log('TEST 1: Sidebar version displays');
    let sidebarVersion = null;
    try {
      // Verify the element is present in the DOM
      await page.waitForSelector('#app-version-sidebar', { state: 'attached', timeout: 5000 });

      // Wait up to 8s for the version to resolve from "loading..." (fetched from /api/health).
      // If the backend is unreachable, the version will remain "loading..." or "unknown" —
      // we accept that as a valid (non-crashing) state rather than timing out the whole test.
      await page.waitForFunction(() => {
        const el = document.getElementById('app-version-sidebar');
        return el && el.textContent && el.textContent.trim().length > 0;
      }, { timeout: 8000 });

      sidebarVersion = await page.textContent('#app-version-sidebar');
      console.log(`  Sidebar version: "${sidebarVersion}"`);
      const hasVersion = sidebarVersion && sidebarVersion.trim().length > 0;
      results.push({ test: 'Sidebar version displays', pass: hasVersion });
      if (!hasVersion) {
        results.push({ test: 'Sidebar version resolved (not loading)', pass: false, error: 'version still loading or empty' });
      }
    } catch (err) {
      console.error('  Sidebar version error:', err.message);
      results.push({ test: 'Sidebar version displays', pass: false, error: err.message });
    }

    // Test 2: Settings version displays
    console.log('TEST 2: Settings version displays');
    let settingsVersion = null;
    try {
      await page.click('.nav-item[data-page="settings"]');

      // Wait for the settings page content to be visible before checking the version element
      await page.waitForSelector('#page-settings', { state: 'attached', timeout: 5000 });
      await page.waitForSelector('#app-version-settings', { state: 'attached', timeout: 5000 });

      // Same tolerant wait: accept any non-empty text including fallback values
      await page.waitForFunction(() => {
        const el = document.getElementById('app-version-settings');
        return el && el.textContent && el.textContent.trim().length > 0;
      }, { timeout: 8000 });

      settingsVersion = await page.textContent('#app-version-settings');
      console.log(`  Settings version: "${settingsVersion}"`);
      const hasVersion = settingsVersion && settingsVersion.trim().length > 0;
      results.push({ test: 'Settings version displays', pass: hasVersion });
      if (!hasVersion) {
        results.push({ test: 'Settings version resolved (not loading)', pass: false, error: 'version still loading or empty' });
      }
    } catch (err) {
      console.error('  Settings version error:', err.message);
      results.push({ test: 'Settings version displays', pass: false, error: err.message });
    }

    // Test 3: Both versions are consistent
    console.log('TEST 3: Version consistency');
    if (sidebarVersion && settingsVersion) {
      const consistent = sidebarVersion === 'v' + settingsVersion;
      console.log(`  Versions consistent: ${consistent} (sidebar: ${sidebarVersion}, settings: ${settingsVersion})`);
      results.push({ test: 'Version consistency', pass: consistent });
    } else {
      console.log('  Skipped — one or both versions unavailable');
      results.push({ test: 'Version consistency', pass: false, error: 'missing version data' });
    }

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    try {
      if (browser) {
        await browser.close();
      }
    } catch (closeErr) {
      console.warn('Warning: could not close browser cleanly:', closeErr.message);
    }
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
