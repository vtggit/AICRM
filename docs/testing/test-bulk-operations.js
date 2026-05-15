const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });

    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('#page-contacts', { state: 'visible', timeout: 5000 });
    // Wait for contact cards to render
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 5000 });

    // TEST 1: Contact cards have checkboxes
    console.log('TEST 1: Contact cards have checkboxes');
    const checkboxes = page.locator('.contact-checkbox');
    const cbCount = await checkboxes.count();
    console.log(`  Checkboxes found: ${cbCount}`);
    results.push({ test: 'Contact cards have checkboxes', pass: cbCount > 0 });
    await page.screenshot({ path: '/tmp/test-bulk-1-checkboxes.png', fullPage: true });

    // TEST 2: Bulk action bar hidden initially
    console.log('TEST 2: Bulk action bar hidden initially');
    const bulkBar = page.locator('#bulk-action-bar');
    const barHidden = await bulkBar.isVisible().catch(() => false);
    console.log(`  Bulk bar hidden: ${!barHidden}`);
    results.push({ test: 'Bulk bar hidden initially', pass: !barHidden });

    // TEST 3: Selecting a contact shows bulk action bar
    console.log('TEST 3: Selecting a contact shows bulk action bar');
    await checkboxes.first().click();
    await page.waitForTimeout(300);
    const barVisible = await bulkBar.isVisible();
    console.log(`  Bulk bar visible: ${barVisible}`);
    results.push({ test: 'Bulk bar visible after selection', pass: barVisible });

    // TEST 4: Selection count updates
    console.log('TEST 4: Selection count updates');
    const countEl = page.locator('#bulk-selection-count');
    const countText = await countEl.textContent();
    console.log(`  Selection count: "${countText}"`);
    results.push({ test: 'Selection count shows 1', pass: countText.includes('1') });
    await page.screenshot({ path: '/tmp/test-bulk-2-bar-visible.png', fullPage: true });

    // TEST 5: Selecting multiple contacts updates count
    console.log('TEST 5: Selecting multiple contacts updates count');
    if (cbCount >= 2) {
      await checkboxes.nth(1).click();
      await page.waitForTimeout(300);
      const count2 = await countEl.textContent();
      console.log(`  Selection count after 2nd: "${count2}"`);
      results.push({ test: 'Selection count updates for 2 contacts', pass: count2.includes('2') });
    } else {
      results.push({ test: 'Selection count updates for 2 contacts', pass: true, note: 'skipped' });
    }

    // TEST 6: Selected cards have visual highlight
    console.log('TEST 6: Selected cards have visual highlight');
    const selectedCards = page.locator('.contact-card-selected');
    const selCount = await selectedCards.count();
    console.log(`  Selected cards: ${selCount}`);
    results.push({ test: 'Selected cards have highlight class', pass: selCount > 0 });
    await page.screenshot({ path: '/tmp/test-bulk-3-card-highlight.png', fullPage: true });

    // TEST 7: Select All selects all visible contacts
    console.log('TEST 7: Select All selects all visible contacts');
    await page.click('#btn-select-all');
    await page.waitForTimeout(500);
    const allChecked = page.locator('.contact-checkbox:checked');
    const allCount = await allChecked.count();
    console.log(`  All checked: ${allCount} / ${cbCount}`);
    results.push({ test: 'Select All checks all contacts', pass: allCount === cbCount });
    await page.screenshot({ path: '/tmp/test-bulk-4-select-all.png', fullPage: true });

    // TEST 8: Select None clears all selections
    console.log('TEST 8: Select None clears all selections');
    await page.click('#btn-select-none');
    await page.waitForTimeout(500);
    const noChecked = page.locator('.contact-checkbox:checked');
    const noCount = await noChecked.count();
    const barGone = await bulkBar.isVisible().catch(() => false);
    console.log(`  Checked after none: ${noCount}, bar hidden: ${!barGone}`);
    results.push({ test: 'Select None clears all', pass: noCount === 0 && !barGone });
    await page.screenshot({ path: '/tmp/test-bulk-5-select-none.png', fullPage: true });

    // TEST 9: Bulk bar has all elements
    console.log('TEST 9: Bulk bar has all elements');
    await checkboxes.first().click();
    await page.waitForTimeout(300);
    const hasSelectAll = await page.locator('#btn-select-all').isVisible();
    const hasSelectNone = await page.locator('#btn-select-none').isVisible();
    const hasStatusChange = await page.locator('#bulk-status-change').isVisible();
    const hasStatusBtn = await page.locator('#btn-bulk-status').isVisible();
    const hasDeleteBtn = await page.locator('#btn-bulk-delete').isVisible();
    const allElements = hasSelectAll && hasSelectNone && hasStatusChange && hasStatusBtn && hasDeleteBtn;
    console.log(`  All elements present: ${allElements}`);
    results.push({ test: 'Bulk bar has all elements', pass: allElements });
    await page.screenshot({ path: '/tmp/test-bulk-6-layout.png', fullPage: true });

    // TEST 10: Deselecting last contact hides bulk bar
    console.log('TEST 10: Deselecting last contact hides bulk bar');
    await checkboxes.first().click();
    await page.waitForTimeout(300);
    const barAfterDeselect = await bulkBar.isVisible().catch(() => false);
    console.log(`  Bar hidden after deselect: ${!barAfterDeselect}`);
    results.push({ test: 'Deselecting last hides bar', pass: !barAfterDeselect });
    await page.screenshot({ path: '/tmp/test-bulk-7-bar-hidden.png', fullPage: true });

    // TEST 11: Bulk status change workflow
    console.log('TEST 11: Bulk status change workflow');
    await checkboxes.first().click();
    await page.waitForTimeout(300);
    await page.selectOption('#bulk-status-change', 'vip');
    await page.waitForTimeout(300);
    const statusBtn = page.locator('#btn-bulk-status');
    const btnEnabled = await statusBtn.isEnabled();
    console.log(`  Status apply button enabled: ${btnEnabled}`);
    results.push({ test: 'Status change button enabled', pass: btnEnabled });
    await statusBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/test-bulk-8-status-change.png', fullPage: true });

    // TEST 12: Bulk delete with confirmation
    console.log('TEST 12: Bulk delete with confirmation');
    // Re-navigate to contacts to get fresh state
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForSelector('.contact-card', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);

    page.on('dialog', async dialog => {
      console.log(`  Confirmation dialog: "${dialog.message()}"`);
      await dialog.accept();
    });

    const freshCheckboxes = page.locator('.contact-checkbox');
    const freshCount = await freshCheckboxes.count();
    await freshCheckboxes.first().click();
    await page.waitForTimeout(500);

    const beforeDelete = await freshCheckboxes.count();
    await page.click('#btn-bulk-delete');
    await page.waitForTimeout(2000);

    const afterDelete = await freshCheckboxes.count();
    console.log(`  Contacts before: ${beforeDelete}, after: ${afterDelete}`);
    results.push({ test: 'Bulk delete removes contact', pass: afterDelete < beforeDelete });
    await page.screenshot({ path: '/tmp/test-bulk-9-delete.png', fullPage: true });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'No unhandled errors', pass: false, error: err.message });
  }

  console.log('\n=== BULK OPERATIONS TEST RESULTS ===');
  let passed = 0;
  results.forEach(r => {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${icon} ${r.test}${r.note ? ' (' + r.note + ')' : ''}`);
    if (r.pass) passed++;
  });
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);

  await browser.close();
  process.exit(results.length - passed > 0 ? 1 : 0);
})();
