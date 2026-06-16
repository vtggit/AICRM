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

/**
 * Create contacts via API and return the created contact objects.
 */
async function createContactsViaApi(page, contacts) {
    const results = await page.evaluate(async (contacts) => {
        const token = sessionStorage.getItem('aicrm_token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const created = [];
        for (const c of contacts) {
            const resp = await fetch(Config.API_BASE_URL + '/contacts', {
                method: 'POST', headers, body: JSON.stringify(c),
            });
            created.push(await resp.json());
        }
        return created;
    }, contacts);
    return results;
}

/**
 * Delete all contacts via API.
 */
async function deleteAllContacts(page) {
    await page.evaluate(async () => {
        const token = sessionStorage.getItem('aicrm_token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
        const contacts = await resp.json();
        for (const c of contacts) {
            await fetch(Config.API_BASE_URL + '/contacts/' + c.id, { method: 'DELETE', headers });
        }
    });
}

/**
 * Fetch all contacts via API and return them.
 */
async function fetchContacts(page) {
    return await page.evaluate(async () => {
        const token = sessionStorage.getItem('aicrm_token');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
        const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
        return await resp.json();
    });
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

        // === Setup: Clean slate and inject unique contacts via API ===
        await deleteAllContacts(page);
        await createContactsViaApi(page, [
            { name: 'Alice Smith', email: 'alice@example.com', phone: '555-0101', company: 'TechCorp' },
            { name: 'Bob Jones', email: 'bob@example.com', phone: '555-0102', company: 'DataInc' },
            { name: 'Carol White', email: 'carol@example.com', phone: '555-0103', company: 'CloudSys' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        // === Test 2: findDuplicateContacts returns empty for unique contacts ===
        const uniqueDupCheck = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            if (contacts.length < 2) return false;
            const c = contacts[0];
            const dupes = App.findDuplicateContacts(c.name, c.email, c.company, c.phone, c.id, contacts);
            return dupes.length === 0;
        });
        log(uniqueDupCheck, 'T2: findDuplicateContacts returns empty for unique contact');

        // === Setup: Add contact with duplicate email via API ===
        await createContactsViaApi(page, [
            { name: 'Alice S.', email: 'alice@example.com', phone: '555-0199', company: 'OtherCo' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        // === Test 3: findDuplicateContacts detects email duplicates ===
        const emailDupCheck = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            const alice = contacts.find(c => c.name === 'Alice Smith');
            if (!alice) return false;
            const dupes = App.findDuplicateContacts(alice.name, alice.email, alice.company, alice.phone, alice.id, contacts);
            return dupes.length >= 1;
        });
        log(emailDupCheck, 'T3: findDuplicateContacts detects email duplicate');

        // === Test 4: getDuplicateGroups returns groups ===
        const dupGroups = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            const groups = App.getDuplicateGroups(contacts);
            return { count: groups.length, size: groups.reduce((s, g) => s + g.length, 0) };
        });
        log(dupGroups.count >= 1 && dupGroups.size >= 2, 'T4: getDuplicateGroups returns 1+ group with 2+ contacts');

        // === Test 5: Duplicate badges appear on contact cards ===
        const badgeCount = await page.locator('.duplicate-badge').count();
        log(badgeCount >= 2, 'T5: Duplicate badges appear on contact cards (expected 2+, got ' + badgeCount + ')');

        // === Setup: Clean and test name+company duplicate detection ===
        await deleteAllContacts(page);
        await createContactsViaApi(page, [
            { name: 'John Doe', email: 'john1@example.com', phone: '555-1001', company: 'Acme Corp' },
            { name: 'John Doe', email: 'john2@example.com', phone: '555-1002', company: 'Acme Corp' },
            { name: 'Jane Doe', email: 'jane@example.com', phone: '555-1003', company: 'Acme Corp' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        // === Test 6: findDuplicateContacts detects name+company duplicates ===
        const nameCompanyDup = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            const john = contacts.find(c => c.name === 'John Doe' && c.email === 'john1@example.com');
            if (!john) return false;
            const dupes = App.findDuplicateContacts(john.name, john.email, john.company, john.phone, john.id, contacts);
            return dupes.length >= 1;
        });
        log(nameCompanyDup, 'T6: findDuplicateContacts detects name+company duplicate');

        // === Test 7: Different name+same company is NOT a duplicate ===
        const notDup = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            const jane = contacts.find(c => c.name === 'Jane Doe');
            if (!jane) return false;
            const dupes = App.findDuplicateContacts(jane.name, jane.email, jane.company, jane.phone, jane.id, contacts);
            return dupes.length === 0;
        });
        log(notDup, 'T7: Different name with same company is NOT flagged as duplicate');

        // === Setup: Test merge functionality ===
        await deleteAllContacts(page);
        await createContactsViaApi(page, [
            { name: 'Merge Target', email: 'merge@example.com', phone: '555-0001', company: 'MergeCo', notes: 'Target notes' },
            { name: 'Merge Source', email: 'merge@example.com', phone: '555-0002', company: 'MergeCo', notes: 'Source notes' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        // === Test 8 & 9: mergeContacts merges two contacts ===
        const mergeResult = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
            const target = contacts.find(c => c.name === 'Merge Target');
            const source = contacts.find(c => c.name === 'Merge Source');
            if (!target || !source) return { error: 'contacts not found' };

            const beforeCount = contacts.length;
            // Call mergeContacts which uses the API internally
            await App.mergeContacts(target.id, source.id);
            
            // Fetch updated contacts
            const resp2 = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const after = await resp2.json();
            const remaining = after.find(c => c.id === target.id);
            return {
                beforeCount,
                afterCount: after.length,
                notes: remaining?.notes || '',
                sourceGone: !after.find(c => c.id === source.id),
            };
        });
        log(
            mergeResult.afterCount === 1 && mergeResult.sourceGone,
            'T8: mergeContacts reduces count and removes source contact'
        );
        log(
            mergeResult.notes.includes('Target notes') && mergeResult.notes.includes('Source notes'),
            'T9: mergeContacts combines notes from both contacts'
        );

        // === Test 10: findDuplicates shows "no duplicates" notification ===
        await deleteAllContacts(page);
        await createContactsViaApi(page, [
            { name: 'Unique One', email: 'u1@example.com', phone: '', company: 'Co1' },
            { name: 'Unique Two', email: 'u2@example.com', phone: '', company: 'Co2' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        // Call findDuplicates via evaluate to avoid modal overlay issues
        const noDupNotif = await page.evaluate(async () => {
            // Clear any existing notifications
            document.querySelectorAll('.notification').forEach(n => n.remove());
            await App.findDuplicates();
            // Check immediately - notification should exist synchronously
            await new Promise(r => setTimeout(r, 300));
            const notifs = document.querySelectorAll('.notification');
            if (notifs.length === 0) return false;
            return notifs[0].textContent.includes('No duplicate');
        });
        log(noDupNotif, 'T10: "No duplicates found" notification shown for unique contacts');

        // === Test 11: findDuplicates opens modal when duplicates exist ===
        await deleteAllContacts(page);
        await createContactsViaApi(page, [
            { name: 'Dup One', email: 'dup@example.com', phone: '', company: 'Co1' },
            { name: 'Dup Two', email: 'dup@example.com', phone: '', company: 'Co2' },
        ]);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForTimeout(500);

        await page.evaluate(async () => {
            await App.findDuplicates();
        });
        await page.waitForTimeout(500);

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
        const savedAfterKeepBoth = await page.evaluate(async () => {
            const token = sessionStorage.getItem('aicrm_token');
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const resp = await fetch(Config.API_BASE_URL + '/contacts', { headers });
            const contacts = await resp.json();
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
