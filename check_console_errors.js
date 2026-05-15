const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      errors.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });
  
  await page.goto('http://localhost:8080/app/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Navigate through all pages
  await page.click('li[data-page="contacts"]');
  await page.waitForTimeout(1000);
  await page.click('li[data-page="leads"]');
  await page.waitForTimeout(1000);
  await page.click('li[data-page="activities"]');
  await page.waitForTimeout(1000);
  await page.click('li[data-page="templates"]');
  await page.waitForTimeout(1000);
  
  if (errors.length === 0) {
    console.log('No console errors or warnings detected.');
  } else {
    console.log('Console errors/warnings found:');
    errors.forEach(e => console.log('  ' + e));
  }
  
  await browser.close();
})();
