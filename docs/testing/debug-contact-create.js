const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });
    
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 10000 });
    
    await page.click('#btn-add-contact');
    await page.waitForSelector('#modal-overlay', { state: 'visible', timeout: 5000 });
    
    const ts = Date.now();
    await page.fill('#contact-name', `Debug Contact ${ts}`);
    await page.fill('#contact-email', `debug${ts}@example.com`);
    await page.fill('#contact-phone', `555-${ts.toString().slice(-4)}`);
    await page.fill('#contact-company', `Debug Corp ${ts}`);
    await page.selectOption('#contact-status', 'active');
    await page.fill('#contact-notes', 'Debug test contact');
    
    await page.screenshot({ path: '/tmp/before-submit.png', fullPage: true });
    console.log('Form filled, clicking submit...');
    
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/contacts') && resp.status() >= 400, { timeout: 10000 }).catch(() => null),
      page.click('#contact-form .btn-primary')
    ]);
    
    if (response) {
      console.log(`API Error Response: ${response.status()} ${response.url()}`);
      console.log(`Response body: ${await response.text()}`);
    }
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/after-submit.png', fullPage: true });
    
    const modalVisible = await page.locator('#modal-overlay').isVisible();
    console.log(`Modal still visible: ${modalVisible}`);
    
    const toastVisible = await page.locator('.notification').isVisible().catch(() => false);
    if (toastVisible) {
      const toastText = await page.locator('.notification').textContent();
      console.log(`Toast message: ${toastText}`);
    }
    
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
})();
