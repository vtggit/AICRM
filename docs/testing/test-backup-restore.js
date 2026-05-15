/**
 * Test: Data Backup and Restore (Priority 24)
 * 
 * Tests:
 * 1. Backup section exists on settings page
 * 2. Create Backup button exists and is visible
 * 3. Restore from Backup button exists and is visible
 * 4. Last backup display shows "Never" initially
 * 5. Backup file downloads with correct naming format
 * 6. Backup file contains metadata and data sections
 * 7. Restore dialog appears with backup details
 * 8. Replace mode restores all data correctly
 * 9. Merge mode only adds new items
 * 10. No console errors
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results');
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'test-downloads');

if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const results = [];

function pass(test, detail) { results.push({ test, detail, status: 'PASS' }); }
function fail(test, detail) { results.push({ test, detail, status: 'FAIL' }); }

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
    });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    const consoleErrors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await waitForAuthReady(page);
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        // Navigate to settings
        await page.locator('[data-page="settings"]').click();
        await page.waitForTimeout(300);

        // === TEST 1: Backup section exists ===
        console.log('TEST 1: Backup section exists on settings page');
        const backupCard = await page.locator('h3').filter({ hasText: 'Backup and Restore' }).first();
        const backupCardVisible = await backupCard.isVisible().catch(() => false);
        if (backupCardVisible) pass('Backup section exists', 'Backup and Restore card is visible');
        else fail('Backup section exists', 'Backup and Restore card not found');

        // === TEST 2: Create Backup button exists ===
        console.log('TEST 2: Create Backup button exists');
        const createBtn = await page.locator('#btn-create-backup');
        const createBtnVisible = await createBtn.isVisible().catch(() => false);
        if (createBtnVisible) pass('Create Backup button exists', 'Button is visible');
        else fail('Create Backup button exists', 'Button not found');

        // === TEST 3: Restore from Backup button exists ===
        console.log('TEST 3: Restore from Backup button exists');
        const restoreBtn = await page.locator('#btn-restore-backup');
        const restoreBtnVisible = await restoreBtn.isVisible().catch(() => false);
        if (restoreBtnVisible) pass('Restore button exists', 'Button is visible');
        else fail('Restore button exists', 'Button not found');

        // === TEST 4: Last backup display shows "Never" initially ===
        console.log('TEST 4: Last backup display shows Never initially');
        const lastBackupText = await page.locator('#last-backup-date').innerText();
        if (lastBackupText === 'Never') {
            pass('Last backup shows Never', 'Correct initial state');
        } else {
            fail('Last backup shows Never', `Got: "${lastBackupText}"`);
        }

        // === TEST 5 & 6: Create backup and verify file structure ===
        console.log('TEST 5: Create backup and verify download');
        // Set up test data first
        await page.evaluate(() => {
            Storage.set(Storage.KEYS.CONTACTS, [
                { id: 'b-1', name: 'Backup Contact 1', email: 'backup1@test.com', phone: '555-0201', company: 'Backup Corp', notes: 'Test contact' },
                { id: 'b-2', name: 'Backup Contact 2', email: 'backup2@test.com', phone: '555-0202', company: 'Backup Inc', notes: '' },
            ]);
            Storage.set(Storage.KEYS.LEADS, [
                { id: 'b-3', name: 'Backup Lead', company: 'Lead Corp', email: 'lead@test.com', value: 50000, stage: 'qualified', source: 'website' },
            ]);
            Storage.set(Storage.KEYS.ACTIVITIES, [
                { id: 'b-4', type: 'call', contactId: 'b-1', title: 'Test Call', notes: 'Backup test', createdAt: '2026-04-30T10:00:00Z' },
            ]);
            Storage.set(Storage.KEYS.TEMPLATES, []);
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);
        await page.locator('[data-page="settings"]').click();
        await page.waitForTimeout(300);

        // Intercept download
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await page.locator('#btn-create-backup').click();
        await page.waitForTimeout(1000);
        const download = await downloadPromise;

        if (download) {
            const fileName = download.suggestedFilename();
            if (fileName.startsWith('aicrm_backup_') && fileName.endsWith('.json')) {
                pass('Backup downloads with correct format', `Filename: ${fileName}`);
            } else {
                fail('Backup downloads with correct format', `Filename: ${fileName}`);
            }

            // Save and inspect the backup file
            const filePath = path.join(DOWNLOADS_DIR, fileName);
            await download.saveAs(filePath);
            const backupContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // TEST 6: Verify backup structure
            console.log('TEST 6: Backup file contains metadata and data');
            if (backupContent.metadata && backupContent.data) {
                const meta = backupContent.metadata;
                const hasAppName = meta.appName === 'AICRM';
                const hasVersion = meta.version !== undefined;
                const hasDate = meta.createdAt !== undefined;
                const hasSummary = meta.summary !== undefined;
                if (hasAppName && hasVersion && hasDate && hasSummary) {
                    pass('Backup has correct metadata', `appName:${meta.appName} version:${meta.version} contacts:${meta.summary.contacts} leads:${meta.summary.leads}`);
                } else {
                    fail('Backup has correct metadata', `appName:${hasAppName} version:${hasVersion} date:${hasDate} summary:${hasSummary}`);
                }
                // Verify data counts
                if (backupContent.data.CONTACTS?.length === 2 && backupContent.data.LEADS?.length === 1 && backupContent.data.ACTIVITIES?.length === 1) {
                    pass('Backup data counts correct', '2 contacts, 1 lead, 1 activity');
                } else {
                    fail('Backup data counts correct', `contacts:${backupContent.data.CONTACTS?.length} leads:${backupContent.data.LEADS?.length} activities:${backupContent.data.ACTIVITIES?.length}`);
                }
            } else {
                fail('Backup has metadata and data sections', 'Missing metadata or data');
            }

            // Clean up download
            fs.unlinkSync(filePath);
        } else {
            fail('Backup downloads', 'No download event captured');
        }

        // === TEST 7: Last backup timestamp updated after backup ===
        console.log('TEST 7: Last backup timestamp updated');
        const updatedBackupText = await page.locator('#last-backup-date').innerText();
        if (updatedBackupText !== 'Never' && updatedBackupText.length > 5) {
            pass('Last backup timestamp updated', `Shows: "${updatedBackupText}"`);
        } else {
            fail('Last backup timestamp updated', `Still shows: "${updatedBackupText}"`);
        }

        // === TEST 8: Restore dialog appears ===
        console.log('TEST 8: Restore dialog appears with backup details');
        // Create a test backup file for restore
        const testBackup = {
            metadata: {
                appName: 'AICRM',
                version: '0.0.5',
                createdAt: '2026-04-29T12:00:00Z',
                summary: { contacts: 3, leads: 2, activities: 1, templates: 0 }
            },
            data: {
                CONTACTS: [
                    { id: 'r-1', name: 'Restored Contact', email: 'restored@test.com', phone: '555-0301', company: 'Restore Corp', notes: '' },
                ],
                LEADS: [
                    { id: 'r-2', name: 'Restored Lead', company: 'Restore Lead Corp', email: 'rlead@test.com', value: 25000, stage: 'new', source: 'referral' },
                ],
                ACTIVITIES: [],
                TEMPLATES: [],
            }
        };
        const restoreFilePath = path.join(DOWNLOADS_DIR, 'test-restore-backup.json');
        fs.writeFileSync(restoreFilePath, JSON.stringify(testBackup, null, 2));

        // Use page.setInputFiles to upload the file
        const fileInput = await page.locator('#backup-file-input');
        await fileInput.setInputFiles(restoreFilePath);
        await page.waitForTimeout(500);

        // Check if modal appeared
        const modalVisible = await page.locator('#modal-overlay').first().isVisible().catch(() => false);
        if (modalVisible) {
            const modalTitle = await page.locator('#modal-title').innerText();
            if (modalTitle === 'Restore Backup') {
                pass('Restore dialog appears', 'Modal title: "Restore Backup"');
            } else {
                fail('Restore dialog appears', `Wrong title: "${modalTitle}"`);
            }
            // Check restore options are present
            const hasReplace = await page.locator('#btn-restore-replace').isVisible().catch(() => false);
            const hasMerge = await page.locator('#btn-restore-merge').isVisible().catch(() => false);
            if (hasReplace && hasMerge) {
                pass('Restore options present', 'Both Replace and Merge buttons visible');
            } else {
                fail('Restore options present', `replace:${hasReplace} merge:${hasMerge}`);
            }
        } else {
            fail('Restore dialog appears', 'Modal not visible');
        }

        // === TEST 9: Replace mode restores data ===
        console.log('TEST 9: Replace mode restores data');
        await page.locator('#btn-restore-replace').click();
        await page.waitForTimeout(500);

        // Navigate to contacts and verify
        await page.locator('[data-page="contacts"]').click();
        await page.waitForTimeout(300);
        const contactCount = await page.locator('.contact-card').count();
        if (contactCount === 1) {
            const contactName = await page.locator('.contact-card').first().innerText();
            if (contactName.includes('Restored Contact')) {
                pass('Replace mode restores data', '1 contact found: Restored Contact');
            } else {
                fail('Replace mode restores data', `Wrong contact: "${contactName}"`);
            }
        } else {
            fail('Replace mode restores data', `Expected 1 contact, got ${contactCount}`);
        }

        // === TEST 10: Merge mode only adds new items ===
        console.log('TEST 10: Merge mode only adds new items');
        // Set up existing data
        await page.evaluate(() => {
            Storage.set(Storage.KEYS.CONTACTS, [
                { id: 'existing-1', name: 'Existing Contact', email: 'existing@test.com', phone: '555-0401', company: 'Existing Corp', notes: '' },
            ]);
            Storage.set(Storage.KEYS.LEADS, []);
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        // Upload the same backup file again for merge
        await fileInput.setInputFiles(restoreFilePath);
        await page.waitForTimeout(500);

        // Click merge
        await page.locator('#btn-restore-merge').click();
        await page.waitForTimeout(500);

        // Check contacts page
        await page.locator('[data-page="contacts"]').click();
        await page.waitForTimeout(300);
        const mergedCount = await page.locator('.contact-card').count();
        if (mergedCount === 2) {
            pass('Merge mode adds new items', '2 contacts: existing + restored');
        } else {
            fail('Merge mode adds new items', `Expected 2 contacts, got ${mergedCount}`);
        }

        // Clean up
        fs.unlinkSync(restoreFilePath);

        // === TEST 11: No console errors ===
        console.log('TEST 11: No console errors');
        if (consoleErrors.length === 0) {
            pass('No console errors', 'Zero errors');
        } else {
            fail('No console errors', `${consoleErrors.length} errors: ${consoleErrors.join('; ')}`);
        }

        // Navigate back to settings for screenshot
        await page.locator('[data-page="settings"]').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(RESULTS_DIR, 'backup-restore.png'), fullPage: false });
        console.log('\nScreenshot saved to test-results/backup-restore.png');

    } catch (err) {
        console.error('Test error:', err.message);
        fail('Test execution', err.message);
    } finally {
        await browser.close();
    }

    // Print results
    console.log('\n=== DATA BACKUP AND RESTORE TEST RESULTS ===');
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        const detail = r.detail ? ` - ${r.detail}` : '';
        console.log(`  ${icon} ${r.status}: ${r.test}${detail}`);
    });
    const passed = results.filter(r => r.status === 'PASS').length;
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
    process.exit(results.length - passed > 0 ? 1 : 0);
})();
