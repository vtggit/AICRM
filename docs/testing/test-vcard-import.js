/**
 * Test vCard (.vcf) import functionality.
 * Tests: Parse vCard file, import contacts, verify in UI.
 */

const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/';
const SCREENSHOTS_DIR = '/home/aicrm/workspace/AICRM/docs/testing/screenshots/';

const TEST_VCARD = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
ORG:Acme Corporation
TITLE:Sales Director
TEL;TYPE=WORK,VOICE:+1-555-123-4567
TEL;TYPE=CELL:+1-555-987-6543
EMAIL;TYPE=WORK:john.doe@acme.com
NOTE:Met at TechConf 2024\\nInterested in enterprise plan
URL:https://www.linkedin.com/in/johndoe
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Smith;Jane;;;
FN:Jane Smith
ORG:TechStart Inc
TITLE:CTO
TEL;TYPE=WORK:+1-555-222-3333
EMAIL;TYPE=WORK:jane@techstart.io
NOTE:Referred by John Doe
END:VCARD
BEGIN:VCARD
VERSION:2.1
N:Wilson;Bob;;;
FN:Bob Wilson
TEL:555-444-5555
EMAIL:bob.wilson@example.com
END:VCARD`;

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForAuthReady(page, true, 15000);

    // Navigate to Contacts
    console.log('Navigating to Contacts page...');
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 15000 }).catch(() => {});

    const contactsBefore = await page.locator('.contact-card').count();
    console.log('Contacts before import:', contactsBefore);

    // Write vCard file to temp
    const vcfPath = '/tmp/test-import.vcf';
    fs.writeFileSync(vcfPath, TEST_VCARD);

    // Set up file chooser handler
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#btn-import-vcard'),
    ]);

    await fileChooser.setFiles(vcfPath);

    // Wait for notification
    await page.waitForSelector('.notification, .toast', { state: 'visible', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Check contacts count after import
    const contactsAfter = await page.locator('.contact-card').count();
    console.log('Contacts after import:', contactsAfter);

    // Test 1: Import button exists
    const importBtnExists = await page.locator('#btn-import-vcard').count();
    results.push({ test: 'Import vCard button exists', pass: importBtnExists >= 1 });
    console.log('TEST: Import vCard button exists -', importBtnExists >= 1 ? 'PASS' : 'FAIL');

    // Test 2: Contacts were imported
    const newContacts = contactsAfter - contactsBefore;
    results.push({ test: `Contacts imported (${newContacts} new)`, pass: newContacts >= 2 });
    console.log('TEST: Contacts imported -', newContacts >= 2 ? 'PASS' : 'FAIL', `(${newContacts} new)`);

    // Test 3: John Doe contact exists
    await page.waitForTimeout(500);
    const hasJohnDoe = await page.locator('.contact-card:has-text("John Doe")').count();
    results.push({ test: 'John Doe contact exists', pass: hasJohnDoe >= 1 });
    console.log('TEST: John Doe exists -', hasJohnDoe >= 1 ? 'PASS' : 'FAIL');

    // Test 4: Jane Smith contact exists
    const hasJaneSmith = await page.locator('.contact-card:has-text("Jane Smith")').count();
    results.push({ test: 'Jane Smith contact exists', pass: hasJaneSmith >= 1 });
    console.log('TEST: Jane Smith exists -', hasJaneSmith >= 1 ? 'PASS' : 'FAIL');

    // Test 5: Bob Wilson contact exists (v2.1 format)
    const hasBobWilson = await page.locator('.contact-card:has-text("Bob Wilson")').count();
    results.push({ test: 'Bob Wilson contact exists (v2.1 format)', pass: hasBobWilson >= 1 });
    console.log('TEST: Bob Wilson exists -', hasBobWilson >= 1 ? 'PASS' : 'FAIL');

    // Test 6: Screenshot
    await page.screenshot({
      path: SCREENSHOTS_DIR + 'vcard-import-verification.png',
      fullPage: true,
    });
    results.push({ test: 'Screenshot captured', pass: true });
    console.log('TEST: Screenshot captured - PASS');

    // Cleanup: Delete imported contacts
    console.log('\nCleaning up imported contacts...');
    const deleteToken = 'dev-secret-token:admin';
    const baseUrl = 'http://localhost:9000';

    for (const name of ['John Doe', 'Jane Smith', 'Bob Wilson']) {
      try {
        const resp = await fetch(baseUrl + '/api/contacts', {
          headers: { 'Authorization': 'Bearer ' + deleteToken }
        });
        const contacts = await resp.json();
        const toDelete = contacts.find(c => c.name === name);
        if (toDelete) {
          await fetch(baseUrl + '/api/contacts/' + toDelete.id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + deleteToken }
          });
          console.log('  Deleted:', name);
        }
      } catch (e) {
        console.log('  Cleanup warning for', name, ':', e.message);
      }
    }

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  // Results summary
  console.log('\n==============================');
  console.log('=== vCard IMPORT TEST RESULTS ===');
  console.log('==============================');
  let passed = 0;
  let failed = 0;
  results.forEach(r => {
    const status = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log('  ' + status + ': ' + r.test + (r.error ? ' — ' + r.error : ''));
    if (r.pass) passed++; else failed++;
  });
  console.log('\nTotal: ' + results.length + ' | Passed: ' + passed + ' | Failed: ' + failed);
  console.log('==============================');

  process.exit(failed > 0 ? 1 : 0);
})();
