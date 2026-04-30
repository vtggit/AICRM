const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Capture downloads
  const downloadDir = '/tmp/aicrm-downloads';
  fs.mkdirSync(downloadDir, { recursive: true });

  try {
    await page.goto('http://localhost:8080/app/index.html', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Pre-condition: Add a contact for export testing
    console.log('SETUP: Add a contact for export testing');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(200);

    // Clear existing contacts by going to contacts page and checking count
    const existingCount = await page.locator('.contact-card').count();
    console.log(`  Existing contacts: ${existingCount}`);

    // Add a contact if none exist
    if (existingCount === 0) {
      await page.click('#btn-add-contact');
      await page.waitForSelector('#modal-overlay', { state: 'visible' });
      await page.fill('#contact-name', 'Test Export User');
      await page.fill('#contact-email', 'test@example.com');
      await page.fill('#contact-phone', '555-9999');
      await page.fill('#contact-company', 'Test Corp');
      await page.selectOption('#contact-status', 'active');
      await page.fill('#contact-notes', 'Test contact for CSV export');
      await page.click('#contact-form .btn-primary');
      await page.waitForTimeout(500);
    }

    // TEST 1: Verify Export CSV button exists
    console.log('TEST 1: Verify Export/Import buttons exist');
    const exportBtn = await page.locator('#btn-export-csv').count();
    const importBtn = await page.locator('#btn-import-csv').count();
    console.log(`  Export button: ${exportBtn}, Import button: ${importBtn}`);
    results.push({ test: 'Export/Import buttons visible', pass: exportBtn === 1 && importBtn === 1 });
    await page.screenshot({ path: '/tmp/test-csv-buttons.png', fullPage: true });

    // TEST 2: Export CSV
    console.log('TEST 2: Export CSV');
    let downloadPromise;
    downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.click('#btn-export-csv');
    const download = await downloadPromise;
    const downloadPath = path.join(downloadDir, 'exported_contacts.csv');
    await download.saveAs(downloadPath);
    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    const hasHeader = csvContent.includes('Name,Email,Phone,Company,Status,Notes');
    const hasTestData = csvContent.includes('Test Export User') || csvContent.includes('Test Corp');
    console.log(`  Downloaded: ${download.suggestedFilename()}`);
    console.log(`  Has header: ${hasHeader}, Has test data: ${hasTestData}`);
    results.push({ test: 'CSV export downloads correctly', pass: hasHeader && hasTestData });

    // TEST 3: Import CSV
    console.log('TEST 3: Import CSV');

    // Create a test CSV file with known data
    const testCSV = `Name,Email,Phone,Company,Status,Notes
"Jane Doe","jane@test.com","555-1111","Jane Inc","active","Imported via CSV test"
"Bob Smith","bob@test.com","555-2222","Bob LLC","vip","Another test import"
"Alice Johnson","alice@test.com","555-3333","Alice Co","inactive","Third test contact"`;
    const importCSVPath = path.join(downloadDir, 'import_test.csv');
    fs.writeFileSync(importCSVPath, testCSV);

    // Wait for previous notifications to fade out
    await page.waitForTimeout(3500);

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.click('#btn-import-csv');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(importCSVPath);
    await page.waitForTimeout(1500);

    // Verify notification appeared - get the LAST notification (most recent)
    const notifs = await page.locator('.notification-success').all();
    const lastNotif = notifs[notifs.length - 1];
    const notifText = await lastNotif.textContent();
    console.log(`  Notification: "${notifText}"`);
    const importedCount = notifText.includes('Imported 3') || notifText.includes('3 contacts');
    console.log(`  Correct count: ${importedCount}`);
    results.push({ test: 'CSV import works with notification', pass: importedCount });

    // TEST 4: Verify imported contacts are visible
    console.log('TEST 4: Verify imported contacts visible');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-csv-imported.png', fullPage: true });
    const contactCards = await page.locator('.contact-card').count();
    console.log(`  Total contact cards: ${contactCards}`);
    results.push({ test: 'Imported contacts visible', pass: contactCards >= 3 });

    // TEST 5: Verify specific imported data
    console.log('TEST 5: Verify specific imported data');
    const hasJane = await page.locator('text=Jane Doe').count() > 0;
    const hasBob = await page.locator('text=Bob Smith').count() > 0;
    const hasAlice = await page.locator('text=Alice Johnson').count() > 0;
    console.log(`  Jane Doe: ${hasJane}, Bob Smith: ${hasBob}, Alice Johnson: ${hasAlice}`);
    results.push({ test: 'Imported contact data correct', pass: hasJane && hasBob && hasAlice });

    // TEST 6: Dashboard stats updated after import
    console.log('TEST 6: Dashboard stats updated');
    await page.click('.nav-item[data-page="dashboard"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/test-csv-dashboard.png', fullPage: true });
    const totalContacts = await page.textContent('#stat-total-contacts');
    console.log(`  Dashboard total contacts: ${totalContacts}`);
    results.push({ test: 'Dashboard stats reflect imported contacts', pass: parseInt(totalContacts) >= 3 });

    // TEST 7: Notification system works
    console.log('TEST 7: Notification system styling');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(200);
    // Trigger another export notification and check immediately (before 3s fade)
    const [downloaded] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.click('#btn-export-csv')
    ]);
    await page.waitForTimeout(200);
    const notifVisible = await page.locator('.notification.notification-success').first();
    const notifBox = await notifVisible.boundingBox();
    console.log(`  Notification visible: ${!!notifBox}`);
    results.push({ test: 'Notification system displays correctly', pass: !!notifBox });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n=== CSV IMPORT/EXPORT TEST RESULTS ===');
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
