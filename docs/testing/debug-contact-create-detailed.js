const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  // Log ALL console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  // Intercept API calls
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log(`[REQUEST] ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', async resp => {
    if (resp.url().includes('/api/')) {
      try {
        const body = await resp.text();
        console.log(`[RESPONSE] ${resp.status()} ${resp.url()} -> ${body.substring(0, 200)}`);
      } catch (e) {
        console.log(`[RESPONSE] ${resp.status()} ${resp.url()}`);
      }
    }
  });

  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });

    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('#page-contacts', { state: 'visible', timeout: 5000 });

    await page.click('#btn-add-contact');
    await page.waitForSelector('#modal-overlay', { state: 'visible', timeout: 5000 });

    const ts = Date.now();
    await page.fill('#contact-name', `Debug Contact ${ts}`);
    await page.fill('#contact-email', `debug${ts}@example.com`);
    await page.fill('#contact-phone', '555-0123');
    await page.fill('#contact-company', 'Debug Corp');
    await page.selectOption('#contact-status', 'active');
    await page.fill('#contact-notes', 'Debug test contact');

    console.log('Form filled, checking button...');

    // Check what buttons exist in the form
    const buttons = await page.locator('#contact-form .form-actions button').allTextContents();
    console.log('Form buttons:', buttons);

    // Also check modal-body buttons
    const modalButtons = await page.locator('#modal-body .form-actions button').allTextContents();
    console.log('Modal body buttons:', modalButtons);

    // Click the primary submit button
    await page.click('#contact-form .btn-primary');

    console.log('Submit clicked, waiting...');
    await page.waitForTimeout(3000);

    // Check modal content
    const modalContent = await page.locator('#modal-title').textContent();
    console.log(`Modal title: ${modalContent}`);

    const modalBody = await page.locator('#modal-body').textContent();
    console.log(`Modal body (first 200 chars): ${modalBody.substring(0, 200)}`);

    const modalVisible = await page.locator('#modal-overlay').isVisible();
    console.log(`Modal still visible: ${modalVisible}`);

    const toastVisible = await page.locator('.notification').isVisible().catch(() => false);
    if (toastVisible) {
      const toastText = await page.locator('.notification').textContent();
      console.log(`Toast message: ${toastText}`);
    }

    // Check if contact was created
    const contactCount = await page.locator('.contact-card').count();
    console.log(`Contact cards visible: ${contactCount}`);

    await page.screenshot({ path: '/tmp/debug-final.png', fullPage: true });
    console.log('Screenshot saved to /tmp/debug-final.png');

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
})();
