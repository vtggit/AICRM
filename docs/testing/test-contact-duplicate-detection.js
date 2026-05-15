/**
 * Test: Contact Duplicate Detection
 * 
 * Tests the duplicate detection feature that warns users when creating
 * contacts with matching email or name+company, and provides merge options.
 */

const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE_URL = 'http://localhost:8080/';
const passed = [];
const failed = [];

function log(result, testName) {
    if (result) {
        passed.push(testName);
        console.log(`✅ ${testName}`);
    } else {
        failed.push(testName);
        console.log(`❌ ${testName}`);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`  [BROWSER ERROR] ${msg.text()}`);
    });

    page.on('dialog', dialog => dialog.accept());

    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await waitForAuthReady(page);

        // Navigate to contacts
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(300);

        // === Test 1: Find Duplicates button exists ===
        const findDupBtn = await page.locator('#btn-find-duplicates');
        log(await findDupBtn.isVisible(), 'T1: Find Duplicates button exists in contacts toolbar');

        // === Setup: Inject unique contacts (no duplicates) ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'c1', name: 'Alice Smith', email: 'alice@example.com', phone: '555-0101', company: 'TechCorp', status: 'active', notes: '', createdAt: '2024-01-01' },
                { id: 'c2', name: 'Bob Jones', email: 'bob@example.com', phone: '555-0102', company: 'DataInc', status: 'active', notes: '', createdAt: '2024-01-02' },
                { id: 'c3', name: 'Carol White', email: 'carol@example.com', phone: '555-0103', company: 'CloudSys', status: 'inactive', notes: '', createdAt: '2024-01-03' },
            ]));
            App.renderContacts();
        });
        await page.waitForTimeout(300);

        // === Test 2: findDuplicateContacts returns empty for unique contacts ===
        const uniqueDupCheck = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const c = contacts[0];
            const dupes = App.findDuplicateContacts(c.name, c.email, c.company, c.id);
            return dupes.length === 0;
        });
        log(uniqueDupCheck, 'T2: findDuplicateContacts returns empty for unique contact');

        // === Setup: Inject contacts with duplicate email ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'c1', name: 'Alice Smith', email: 'alice@example.com', phone: '555-0101', company: 'TechCorp', status: 'active', notes: '', createdAt: '2024-01-01' },
                { id: 'c2', name: 'Bob Jones', email: 'bob@example.com', phone: '555-0102', company: 'DataInc', status: 'active', notes: '', createdAt: '2024-01-02' },
                { id: 'c3', name: 'Carol White', email: 'carol@example.com', phone: '555-0103', company: 'CloudSys', status: 'inactive', notes: '', createdAt: '2024-01-03' },
                { id: 'c4', name: 'Alice S.', email: 'alice@example.com', phone: '555-0199', company: 'OtherCo', status: 'active', notes: '', createdAt: '2024-01-04' },
            ]));
            App.renderContacts();
        });
        await page.waitForTimeout(300);

        // === Test 3: findDuplicateContacts detects email duplicates ===
        const emailDupCheck = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const c = contacts[0];
            const dupes = App.findDuplicateContacts(c.name, c.email, c.company, c.id);
            return dupes.length === 1 && dupes[0].id === 'c4';
        });
        log(emailDupCheck, 'T3: findDuplicateContacts detects email duplicate');

        // === Test 4: getDuplicateGroups returns groups ===
        const dupGroups = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const groups = App.getDuplicateGroups(contacts);
            return { count: groups.length, size: groups.reduce((s, g) => s + g.length, 0) };
        });
        log(dupGroups.count === 1 && dupGroups.size === 2, 'T4: getDuplicateGroups returns 1 group with 2 contacts');

        // === Test 5: Duplicate badges appear on contact cards ===
        const badgeCount = await page.locator('.duplicate-badge').count();
        log(badgeCount === 2, 'T5: Duplicate badges appear on contact cards (expected 2, got ' + badgeCount + ')');

        // === Setup: Test name+company duplicate detection ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'n1', name: 'John Doe', email: 'john1@example.com', phone: '555-1001', company: 'Acme Corp', status: 'active', notes: '', createdAt: '2024-01-01' },
                { id: 'n2', name: 'John Doe', email: 'john2@example.com', phone: '555-1002', company: 'Acme Corp', status: 'active', notes: '', createdAt: '2024-01-02' },
                { id: 'n3', name: 'Jane Doe', email: 'jane@example.com', phone: '555-1003', company: 'Acme Corp', status: 'active', notes: '', createdAt: '2024-01-03' },
            ]));
            App.renderContacts();
        });
        await page.waitForTimeout(300);

        // === Test 6: findDuplicateContacts detects name+company duplicates ===
        const nameCompanyDup = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const c = contacts[0];
            const dupes = App.findDuplicateContacts(c.name, c.email, c.company, c.id);
            return dupes.length === 1 && dupes[0].id === 'n2';
        });
        log(nameCompanyDup, 'T6: findDuplicateContacts detects name+company duplicate');

        // === Test 7: Different name+same company is NOT a duplicate ===
        const notDup = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const c = contacts[2]; // Jane Doe, Acme Corp
            const dupes = App.findDuplicateContacts(c.name, c.email, c.company, c.id);
            return dupes.length === 0;
        });
        log(notDup, 'T7: Different name with same company is NOT flagged as duplicate');

        // === Setup: Test merge functionality ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'm1', name: 'Merge Target', email: 'merge@example.com', phone: '555-0001', company: 'MergeCo', status: 'active', notes: 'Target notes', createdAt: '2024-01-01' },
                { id: 'm2', name: 'Merge Source', email: 'merge@example.com', phone: '555-0002', company: 'MergeCo', status: 'active', notes: 'Source notes', createdAt: '2024-01-02' },
            ]));
            App.renderContacts();
        });
        await page.waitForTimeout(300);

        // === Test 8: mergeContacts merges two contacts ===
        const mergeResult = await page.evaluate(() => {
            const before = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            const beforeCount = before.length;
            App.mergeContacts('m1', 'm2');
            const after = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            return {
                beforeCount,
                afterCount: after.length,
                notes: after.find(c => c.id === 'm1')?.notes || '',
                m2Gone: !after.find(c => c.id === 'm2'),
            };
        });
        log(
            mergeResult.afterCount === 1 && mergeResult.m2Gone,
            'T8: mergeContacts reduces count and removes source contact'
        );
        log(
            mergeResult.notes.includes('Target notes') && mergeResult.notes.includes('Source notes'),
            'T9: mergeContacts combines notes from both contacts'
        );

        // === Test 10: findDuplicates shows "no duplicates" notification ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'u1', name: 'Unique One', email: 'u1@example.com', phone: '', company: 'Co1', status: 'active', notes: '', createdAt: '2024-01-01' },
                { id: 'u2', name: 'Unique Two', email: 'u2@example.com', phone: '', company: 'Co2', status: 'active', notes: '', createdAt: '2024-01-02' },
            ]));
            App.renderContacts();
            // Clear any existing notifications
            document.querySelectorAll('.notification').forEach(n => n.remove());
        });
        await page.waitForTimeout(300);

        // Call findDuplicates via evaluate to avoid modal overlay issues
        const noDupNotif = await page.evaluate(() => {
            App.findDuplicates();
            // Check immediately - notification should exist synchronously
            const notifs = document.querySelectorAll('.notification');
            if (notifs.length === 0) return false;
            return notifs[0].textContent.includes('No duplicate');
        });
        log(noDupNotif, 'T10: "No duplicates found" notification shown for unique contacts');

        // === Test 11: findDuplicates opens modal when duplicates exist ===
        await page.evaluate(() => {
            localStorage.setItem('aicrm_contacts', JSON.stringify([
                { id: 'd1', name: 'Dup One', email: 'dup@example.com', phone: '', company: 'Co1', status: 'active', notes: '', createdAt: '2024-01-01' },
                { id: 'd2', name: 'Dup Two', email: 'dup@example.com', phone: '', company: 'Co2', status: 'active', notes: '', createdAt: '2024-01-02' },
            ]));
            App.renderContacts();
            document.querySelectorAll('.notification').forEach(n => n.remove());
        });
        await page.waitForTimeout(300);

        await page.evaluate(() => {
            App.findDuplicates();
        });
        await page.waitForTimeout(300);

        const modalOpen = await page.locator('#modal-overlay').isVisible();
        log(modalOpen, 'T11: Duplicate modal opens when duplicates are detected');

        // === Test 12: Modal contains merge buttons ===
        const mergeBtnCount = await page.locator('.duplicate-match-card .btn-primary').count();
        log(mergeBtnCount > 0, 'T12: Merge buttons visible in duplicate modal (found ' + mergeBtnCount + ')');

        // Close modal
        await page.evaluate(() => {
            document.getElementById('modal-overlay').classList.remove('active');
            document.querySelectorAll('.notification').forEach(n => n.remove());
        });
        await page.waitForTimeout(200);

        // === Test 13: Duplicate warning on contact creation ===
        // Open new contact form and fill in duplicate email
        await page.evaluate(() => {
            App.showContactModal();
        });
        await page.waitForTimeout(300);

        await page.fill('#contact-name', 'Dup Three');
        await page.fill('#contact-email', 'dup@example.com');
        await page.fill('#contact-phone', '555-9999');
        await page.fill('#contact-company', 'DupCo');

        // Submit the form
        await page.evaluate(() => {
            const form = document.getElementById('contact-form');
            if (form) form.requestSubmit();
        });
        await page.waitForTimeout(500);

        const dupWarning = await page.evaluate(() => {
            const title = document.getElementById('modal-title');
            return title ? title.textContent.includes('Duplicate') : false;
        });
        log(dupWarning, 'T13: Duplicate warning modal shown when creating contact with existing email');

        // === Test 14: "Keep Both" button exists in warning modal ===
        const keepBothExists = await page.locator('#btn-keep-both').isVisible();
        log(keepBothExists, 'T14: "Keep Both" button available in duplicate warning modal');

        // Click "Keep Both"
        await page.click('#btn-keep-both');
        await page.waitForTimeout(500);

        // Close any remaining modals/notifications
        await page.evaluate(() => {
            document.getElementById('modal-overlay').classList.remove('active');
            document.querySelectorAll('.notification').forEach(n => n.remove());
        });
        await page.waitForTimeout(200);

        // === Test 15: Contact was saved after "Keep Both" ===
        const savedAfterKeepBoth = await page.evaluate(() => {
            const contacts = JSON.parse(localStorage.getItem('aicrm_contacts') || '[]');
            return contacts.some(c => c.name === 'Dup Three');
        });
        log(savedAfterKeepBoth, 'T15: Contact saved after clicking "Keep Both"');

    } catch (err) {
        console.error(`\n❌ Test error: ${err.message}`);
    } finally {
        await browser.close();
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed.length} passed, ${failed.length} failed out of ${passed.length + failed.length} tests`);
    if (failed.length > 0) {
        console.log(`Failed tests:`);
        failed.forEach(f => console.log(`  - ${f}`));
    }
    console.log('='.repeat(50));
    process.exit(failed.length > 0 ? 1 : 0);
})();
