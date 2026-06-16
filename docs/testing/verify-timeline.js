const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    
    // Check if timeline methods exist
    const hasMethod = await page.evaluate(() => typeof App._renderTimelineView);
    console.log('T1: _renderTimelineView exists:', hasMethod === 'function' ? 'PASS' : 'FAIL (' + hasMethod + ')');
    const hasGroup = await page.evaluate(() => typeof App._groupActivitiesByDate);
    console.log('T2: _groupActivitiesByDate exists:', hasGroup === 'function' ? 'PASS' : 'FAIL (' + hasGroup + ')');
    const hasColor = await page.evaluate(() => typeof App.getActivityColor);
    console.log('T3: getActivityColor exists:', hasColor === 'function' ? 'PASS' : 'FAIL (' + hasColor + ')');
    
    // Navigate to contacts
    await page.click('.nav-item[data-page="contacts"]');
    await page.waitForTimeout(2000);
    
    // Click View Details on first contact
    await page.click('.card-action-btn[title="View Details"]');
    await page.waitForTimeout(3000);
    
    // Check for timeline elements
    const summaryCount = await page.locator('.timeline-summary').count();
    console.log('T4: Timeline summary bar exists:', summaryCount > 0 ? 'PASS (' + summaryCount + ')' : 'FAIL (0)');
    
    const groupCount = await page.locator('.timeline-group').count();
    console.log('T5: Timeline date groups exist:', groupCount > 0 ? 'PASS (' + groupCount + ')' : 'FAIL (0)');
    
    const eventCount = await page.locator('.timeline-item').count();
    console.log('T6: Timeline events rendered:', eventCount > 0 ? 'PASS (' + eventCount + ')' : 'FAIL (0)');
    
    // Check for JS errors
    const errorCount = await page.evaluate(() => {
        // Check for any visible error indicators on the page
        const errorEls = document.querySelectorAll('.error, .error-message, [role="alert"]');
        return errorEls.length;
    });
    console.log('T7: JS errors on page:', errorCount === 0 ? 'PASS (0 errors)' : 'FAIL (' + errorCount + ' errors)');
    
    // Screenshot
    await page.screenshot({ path: '/home/aicrm/workspace/AICRM/docs/testing/screenshots/timeline-view-test.png', fullPage: true });
    console.log('Screenshot captured: PASS');
    
    // Summary
    const tests = [
        hasMethod === 'function',
        hasGroup === 'function',
        hasColor === 'function',
        summaryCount > 0,
        groupCount > 0,
        eventCount > 0,
        errorCount === 0,
    ];
    const passed = tests.filter(Boolean).length;
    console.log(`\nTotal: ${tests.length} | Passed: ${passed} | Failed: ${tests.length - passed}`);
    
    await browser.close();
    process.exit(tests.length - passed > 0 ? 1 : 0);
})();
