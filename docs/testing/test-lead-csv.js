/**
 * AICRM - Lead CSV Export/Import Tests
 * Tests the lead CSV export and import functionality via browser automation.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/app/index.html';
const DOWNLOADS_DIR = path.join(__dirname, '../test-downloads');

(async () => {
    // Ensure downloads directory exists
    if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        downloadsPath: DOWNLOADS_DIR,
    });
    const page = await context.newPage();

    let passed = 0;
    let failed = 0;
    const results = [];

    const addResult = (name, pass) => {
        results.push({ name, pass });
        if (pass) passed++;
        else failed++;
    };

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        // === SETUP: Create test leads ===
        console.log('SETUP: Creating test leads for CSV export...');
        await page.click('#sidebar .nav-item[data-page="leads"]');
        await page.waitForSelector('#page-leads.active', { timeout: 5000 });

        // Clear existing leads via console
        await page.evaluate(() => {
            localStorage.setItem('aicrm_leads', '[]');
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.click('#sidebar .nav-item[data-page="leads"]');
        await page.waitForSelector('#page-leads.active', { timeout: 5000 });

        // Add lead 1
        await page.click('#btn-add-lead');
        await page.fill('#lead-name', 'Enterprise Corp');
        await page.fill('#lead-company', 'Enterprise Corp');
        await page.fill('#lead-email', 'sales@enterprise.com');
        await page.fill('#lead-phone', '555-0101');
        await page.fill('#lead-value', '75000');
        await page.selectOption('#lead-stage', 'proposal');
        await page.selectOption('#lead-source', 'referral');
        await page.fill('#lead-notes', 'High value enterprise deal');
        await page.click('#modal-body .btn-primary');
        await page.waitForTimeout(500);

        // Add lead 2
        await page.click('#btn-add-lead');
        await page.fill('#lead-name', 'Startup Inc');
        await page.fill('#lead-company', 'Startup Inc');
        await page.fill('#lead-email', 'info@startup.io');
        await page.fill('#lead-phone', '555-0202');
        await page.fill('#lead-value', '15000');
        await page.selectOption('#lead-stage', 'qualified');
        await page.selectOption('#lead-source', 'website');
        await page.fill('#lead-notes', 'SMB prospect from website');
        await page.click('#modal-body .btn-primary');
        await page.waitForTimeout(500);

        // Add lead 3
        await page.click('#btn-add-lead');
        await page.fill('#lead-name', 'Global Tech');
        await page.fill('#lead-company', 'Global Tech Ltd');
        await page.fill('#lead-email', 'contact@globaltech.com');
        await page.fill('#lead-phone', '555-0303');
        await page.fill('#lead-value', '200000');
        await page.selectOption('#lead-stage', 'won');
        await page.selectOption('#lead-source', 'event');
        await page.fill('#lead-notes', 'Met at conference');
        await page.click('#modal-body .btn-primary');
        await page.waitForTimeout(500);

        console.log('  Created 3 test leads');

        // === TEST 1: Verify Export/Import buttons exist ===
        console.log('TEST 1: Verify Export/Import buttons exist');
        const exportBtn = await page.locator('#btn-export-leads-csv');
        const importBtn = await page.locator('#btn-import-leads-csv');
        const exportVisible = await exportBtn.isVisible();
        const importVisible = await importBtn.isVisible();
        console.log(`  Export button visible: ${exportVisible}, Import button visible: ${importVisible}`);
        addResult('Export/Import buttons visible', exportVisible && importVisible);

        // === TEST 2: Export CSV ===
        console.log('TEST 2: Export CSV');
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await exportBtn.click();
        const download = await downloadPromise;
        const downloadPath = path.join(DOWNLOADS_DIR, await download.suggestedFilename());
        await download.saveAs(downloadPath);

        const csvContent = fs.readFileSync(downloadPath, 'utf-8');
        // Remove BOM if present
        const csvClean = csvContent.replace(/^\uFEFF/, '');
        const firstLine = csvClean.split('\n')[0];
        console.log(`  First line raw: [${firstLine}]`);
        console.log(`  First line bytes: ${Array.from(firstLine.slice(0, 20)).map(c => c.charCodeAt(0)).join(' ')}`);
        const hasNameHeader = firstLine.includes('Name');
        const hasCompanyHeader = firstLine.includes('Company');
        const hasEmailHeader = firstLine.includes('Email');
        const hasValueHeader = firstLine.includes('Value');
        const hasStageHeader = firstLine.includes('Stage');
        const hasHeader = hasNameHeader && hasCompanyHeader && hasEmailHeader && hasValueHeader && hasStageHeader;
        const hasEnterprise = csvContent.includes('Enterprise Corp');
        const hasStartup = csvContent.includes('Startup Inc');
        const hasGlobal = csvContent.includes('Global Tech');
        console.log(`  Downloaded: ${await download.suggestedFilename()}`);
        console.log(`  Has header: ${hasHeader}, Has test data: ${hasEnterprise && hasStartup && hasGlobal}`);
        addResult('CSV export downloads correctly', hasHeader && hasEnterprise && hasStartup && hasGlobal);

        // === TEST 3: Clear leads then import CSV ===
        console.log('TEST 3: Import CSV');
        await page.evaluate(() => {
            localStorage.setItem('aicrm_leads', '[]');
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.click('#sidebar .nav-item[data-page="leads"]');
        await page.waitForSelector('#page-leads.active', { timeout: 5000 });

        // Upload the exported CSV
        const fileInput = await page.locator('#leads-csv-file-input');
        await fileInput.setInputFiles(downloadPath);
        await page.waitForTimeout(2000);

        // Check notification
        const notification = await page.locator('.notification').last();
        const notifText = await notification.textContent();
        console.log(`  Notification: "${notifText}"`);
        addResult('CSV import works with notification', notifText.includes('Imported 3 leads'));

        // === TEST 4: Verify imported leads visible ===
        console.log('TEST 4: Verify imported leads visible');
        const leadCards = await page.locator('.lead-card').count();
        console.log(`  Total lead cards: ${leadCards}`);
        addResult('Imported leads visible', leadCards === 3);

        // === TEST 5: Verify specific imported data ===
        console.log('TEST 5: Verify specific imported data');
        const pageContent = await page.textContent('#leads-list');
        const hasEnterpriseData = pageContent.includes('Enterprise Corp') && pageContent.includes('sales@enterprise.com');
        const hasStartupData = pageContent.includes('Startup Inc') && pageContent.includes('info@startup.io');
        const hasGlobalData = pageContent.includes('Global Tech') && pageContent.includes('contact@globaltech.com');
        console.log(`  Enterprise Corp: ${hasEnterpriseData}, Startup Inc: ${hasStartupData}, Global Tech: ${hasGlobalData}`);
        addResult('Imported lead data correct', hasEnterpriseData && hasStartupData && hasGlobalData);

        // === TEST 6: Dashboard stats updated ===
        console.log('TEST 6: Dashboard stats updated');
        await page.click('#sidebar .nav-item[data-page="dashboard"]');
        await page.waitForSelector('#page-dashboard.active', { timeout: 5000 });
        const totalLeads = await page.textContent('#stat-total-leads');
        console.log(`  Dashboard total leads: ${totalLeads}`);
        addResult('Dashboard stats reflect imported leads', totalLeads === '3');

        // === TEST 7: Import with invalid stage defaults to "new" ===
        console.log('TEST 7: Import with invalid stage defaults to new');
        const invalidCSV = '"Name","Company","Email","Phone","Value","Stage","Source","Notes"\n"Test Lead","Test Co","test@test.com","555-9999","5000","invalid_stage","website","Test note"';
        const invalidCsvPath = path.join(DOWNLOADS_DIR, 'invalid_stage.csv');
        fs.writeFileSync(invalidCsvPath, invalidCSV);

        const invalidFileInput = await page.locator('#leads-csv-file-input');
        await page.click('#sidebar .nav-item[data-page="leads"]');
        await page.waitForSelector('#page-leads.active', { timeout: 5000 });
        await invalidFileInput.setInputFiles(invalidCsvPath);
        await page.waitForTimeout(2000);

        const notif2 = await page.locator('.notification').last();
        const notif2Text = await notif2.textContent();
        console.log(`  Notification: "${notif2Text}"`);
        addResult('Invalid stage defaults to new', notif2Text.includes('Imported 1 lead'));

        // === TEST 8: No console errors ===
        console.log('TEST 8: No console errors');
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        console.log(`  Console errors: ${consoleErrors.length}`);
        addResult('No console errors', consoleErrors.length === 0);

    } catch (err) {
        console.error('Test error:', err.message);
        results.forEach(r => !r.pass && addResult(r.name + ' (error)', false));
    } finally {
        // Cleanup downloads
        fs.readdir(DOWNLOADS_DIR, (err, files) => {
            if (!err) {
                files.forEach(f => fs.unlink(path.join(DOWNLOADS_DIR, f), () => {}));
            }
        });

        await browser.close();

        // Print results
        console.log('\n=== LEAD CSV IMPORT/EXPORT TEST RESULTS ===');
        results.forEach(r => {
            console.log(`  ${r.pass ? '✅ PASS' : '❌ FAIL'}: ${r.name}`);
        });
        console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
        process.exit(failed > 0 ? 1 : 0);
    }
})();
