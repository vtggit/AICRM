/**
 * Test: Keyboard Shortcuts
 * Tests all keyboard shortcuts work correctly
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE = 'http://localhost:8080/';
const results = [];

function log(msg) { console.log(msg); }

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    const errors = [];

    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { timeout: 10000 });

    // TEST 1: Shortcuts button exists
    log('\nTEST 1: Shortcuts button exists');
    const btnVisible = await page.isVisible('#shortcuts-toggle');
    results.push({ name: 'Shortcuts button visible', pass: btnVisible });
    log(`  Button visible: ${btnVisible}`);

    // TEST 2: Click shortcuts button opens modal
    log('\nTEST 2: Click shortcuts button opens modal');
    await page.click('#shortcuts-toggle');
    await page.waitForSelector('.shortcuts-help', { state: 'visible' });
    const modalVisible = await page.isVisible('#modal-overlay');
    const title = await page.$eval('#modal-title', el => el.textContent);
    results.push({ name: 'Shortcuts modal opens on button click', pass: modalVisible && title === 'Keyboard Shortcuts' });
    log(`  Modal visible: ${modalVisible}, Title: "${title}"`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal-overlay', { state: 'hidden' });

    // TEST 3: Press ? opens shortcuts modal (or verify via button)
    log('\nTEST 3: Shortcuts modal can be opened');
    // Button click already verified in TEST 2 - verify modal content instead
    await page.click('#shortcuts-toggle');
    await page.waitForSelector('.shortcuts-help', { state: 'visible' });
    const modalOpen = await page.isVisible('.shortcuts-help');
    const hasNavSection = await page.$eval('.shortcut-section h4', el => el.textContent === 'Navigation');
    const hasActionsSection = await page.evaluate(() => {
        const sections = document.querySelectorAll('.shortcut-section h4');
        return sections.length >= 2 && sections[1].textContent === 'Actions';
    });
    results.push({ name: 'Shortcuts modal has Navigation and Actions sections', pass: modalOpen && hasNavSection && hasActionsSection });
    log(`  Modal open: ${modalOpen}, Nav section: ${hasNavSection}, Actions section: ${hasActionsSection}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal-overlay', { state: 'hidden' });

    // TEST 4: Press / focuses search bar
    log('\nTEST 4: Press / focuses search bar');
    await page.keyboard.press('/');
    const focused = await page.evaluate(() => document.activeElement?.id === 'global-search');
    results.push({ name: '/ focuses search bar', pass: focused });
    log(`  Search focused: ${focused}`);
    // Blur search bar so subsequent tests work
    await page.evaluate(() => document.getElementById('global-search').blur());

    // TEST 5: Number key navigation (1 = Dashboard)
    log('\nTEST 5: Number key 1 navigates to Dashboard');
    await page.click('#page-title'); // ensure body focus
    await page.keyboard.press('1');
    await page.waitForTimeout(200);
    const dashActive = await page.$eval('#page-dashboard', el => el.classList.contains('active'));
    const dashTitle = await page.$eval('#page-title', el => el.textContent);
    results.push({ name: 'Key 1 navigates to Dashboard', pass: dashActive && dashTitle === 'Dashboard' });
    log(`  Dashboard active: ${dashActive}, Title: "${dashTitle}"`);

    // TEST 6: Number key 2 navigates to Contacts
    log('\nTEST 6: Number key 2 navigates to Contacts');
    await page.click('#page-title');
    await page.keyboard.press('2');
    await page.waitForTimeout(200);
    const contactsActive = await page.$eval('#page-contacts', el => el.classList.contains('active'));
    const contactsTitle = await page.$eval('#page-title', el => el.textContent);
    results.push({ name: 'Key 2 navigates to Contacts', pass: contactsActive && contactsTitle === 'Contacts' });
    log(`  Contacts active: ${contactsActive}, Title: "${contactsTitle}"`);

    // TEST 7: Number key 3 navigates to Leads
    log('\nTEST 7: Number key 3 navigates to Leads');
    await page.click('#page-title');
    await page.keyboard.press('3');
    await page.waitForTimeout(200);
    const leadsActive = await page.$eval('#page-leads', el => el.classList.contains('active'));
    const leadsTitle = await page.$eval('#page-title', el => el.textContent);
    results.push({ name: 'Key 3 navigates to Leads', pass: leadsActive && leadsTitle === 'Leads' });
    log(`  Leads active: ${leadsActive}, Title: "${leadsTitle}"`);

    // TEST 8: Ctrl+N opens new contact modal
    log('\nTEST 8: Ctrl+N opens new contact modal');
    await page.keyboard.press('2'); // go to contacts first
    await page.waitForTimeout(200);
    await page.click('#page-title');
    await page.keyboard.press('Control+n');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    const modalTitle = await page.$eval('#modal-title', el => el.textContent);
    const formVisible = await page.isVisible('#contact-form');
    results.push({ name: 'Ctrl+N opens new contact modal', pass: modalTitle === 'Add Contact' && formVisible });
    log(`  Modal title: "${modalTitle}", Form visible: ${formVisible}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal-overlay', { state: 'hidden' });

    // TEST 9: Ctrl+L opens new lead modal
    log('\nTEST 9: Ctrl+L opens new lead modal');
    await page.keyboard.press('3'); // go to leads
    await page.waitForTimeout(200);
    await page.click('#page-title');
    await page.keyboard.press('Control+l');
    await page.waitForSelector('#modal-overlay', { state: 'visible' });
    const leadModalTitle = await page.$eval('#modal-title', el => el.textContent);
    const leadFormVisible = await page.isVisible('#lead-form');
    results.push({ name: 'Ctrl+L opens new lead modal', pass: leadModalTitle === 'Add Lead' && leadFormVisible });
    log(`  Modal title: "${leadModalTitle}", Form visible: ${leadFormVisible}`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal-overlay', { state: 'hidden' });

    // TEST 10: Shortcuts modal contains all expected shortcuts
    log('\nTEST 10: Shortcuts modal contains all expected shortcuts');
    await page.keyboard.press('?');
    await page.waitForSelector('.shortcuts-help', { state: 'visible' });
    const shortcutText = await page.$eval('.shortcuts-help', el => el.textContent);
    const expectedShortcuts = ['Dashboard', 'Contacts', 'Leads', 'Activities', 'Templates', 'Focus search bar', 'New Contact', 'New Lead', 'Export CSV', 'Close modal', 'Show this help'];
    const allFound = expectedShortcuts.every(s => shortcutText.includes(s));
    results.push({ name: 'All shortcuts listed in modal', pass: allFound });
    log(`  All shortcuts found: ${allFound}`);
    await page.keyboard.press('Escape');

    // TEST 11: No console errors
    log('\nTEST 11: No console errors');
    results.push({ name: 'No console errors', pass: errors.length === 0 });
    log(`  Console errors: ${errors.length}`);

    // Screenshot
    await page.screenshot({ path: 'test-results/keyboard-shortcuts.png', fullPage: false });
    log('\nScreenshot saved to test-results/keyboard-shortcuts.png');

    // Summary
    log('\n=== KEYBOARD SHORTCUTS TEST RESULTS ===');
    results.forEach(r => {
        log(`  ${r.pass ? '✅' : '❌'} ${r.pass ? 'PASS' : 'FAIL'}: ${r.name}`);
    });
    const passed = results.filter(r => r.pass).length;
    log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);

    await browser.close();
    process.exit(results.length - passed > 0 ? 1 : 0);
})().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
