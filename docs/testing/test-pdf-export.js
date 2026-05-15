/**
 * Test: Dashboard PDF Report Export (Item 16)
 * Tests the PDF export button exists and triggers print dialog
 */
const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    // Test 1: PDF Export Button Exists
    console.log('TEST 1: PDF Export Button Exists');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });
    
    const pdfBtn = page.locator('#btn-export-pdf');
    const isVisible = await pdfBtn.isVisible();
    const btnText = await pdfBtn.textContent();
    console.log(`  Button visible: ${isVisible}, text: "${btnText}"`);
    results.push({ test: 'PDF export button exists', pass: isVisible && btnText.includes('Export PDF Report') });

    // Test 2: Button Styling
    console.log('TEST 2: Button Styling');
    const classes = await pdfBtn.getAttribute('class');
    console.log(`  Classes: "${classes}"`);
    results.push({ test: 'Button has correct classes', pass: classes.includes('btn-secondary') });

    // Test 3: Dashboard Header Actions Container
    console.log('TEST 3: Dashboard Header Actions Container');
    const headerActions = page.locator('.dashboard-header-actions');
    const headerVisible = await headerActions.isVisible();
    console.log(`  Header actions visible: ${headerVisible}`);
    results.push({ test: 'Dashboard header actions container exists', pass: headerVisible });

    // Test 4: Print Class Toggle
    console.log('TEST 4: Print Class Toggle on Body');
    await page.evaluate(() => {
        window._printCalled = false;
        window.print = function() { window._printCalled = true; };
    });
    
    const beforeClass = await page.evaluate(() => document.body.className);
    console.log(`  Body class before: "${beforeClass}"`);
    
    await pdfBtn.click();
    await page.waitForTimeout(200);
    
    const afterClass = await page.evaluate(() => document.body.className);
    const printCalled = await page.evaluate(() => window._printCalled);
    console.log(`  Body class after: "${afterClass}", print called: ${printCalled}`);
    results.push({ test: 'Print class added and window.print() called', pass: afterClass.includes('printing-report') && printCalled });

    // Test 5: Print CSS Media Queries Present
    console.log('TEST 5: Print CSS Media Queries Present');
    const hasPrintStyles = await page.evaluate(() => {
        for (const sheet of document.styleSheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.media && rule.media.toString().includes('print')) {
                        return true;
                    }
                }
            } catch (e) {}
        }
        return false;
    });
    console.log(`  Print styles present: ${hasPrintStyles}`);
    results.push({ test: 'Print CSS media queries present', pass: hasPrintStyles });

    // Test 6: Screenshot verification
    console.log('TEST 6: Screenshot Verification');
    await page.screenshot({ path: '/tmp/test-pdf-export.png', fullPage: true });
    console.log('  Screenshot saved to /tmp/test-pdf-export.png');
    results.push({ test: 'Screenshot captured', pass: true });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'No errors during test', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n========== RESULTS ==========');
  let passed = 0;
  results.forEach(r => {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${icon} ${r.test}${r.error ? ` — ${r.error}` : ''}`);
    if (r.pass) passed++;
  });
  console.log(`\n  ${passed}/${results.length} tests passed`);
  process.exit(passed === results.length ? 0 : 1);
})();
