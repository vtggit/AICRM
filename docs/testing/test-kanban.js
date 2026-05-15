const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setPageAuth(context, 'dev-secret-token:admin');
    const page = await context.newPage();
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    
    let passed = 0;
    let failed = 0;
    
    // T1: Navigate to Leads page
    await page.click('.nav-item[data-page="leads"]');
    await page.waitForTimeout(2000);
    const pageTitle = await page.locator('h2').first().textContent();
    if (pageTitle === 'Leads') { passed++; console.log('T1: Leads page loaded: PASS'); }
    else { failed++; console.log('T1: Leads page loaded: FAIL (' + pageTitle + ')'); }
    
    // T2: Kanban toggle button exists
    const kanbanBtn = await page.locator('#btn-toggle-kanban').count();
    if (kanbanBtn > 0) { passed++; console.log('T2: Kanban toggle button exists: PASS'); }
    else { failed++; console.log('T2: Kanban toggle button exists: FAIL'); }
    
    // T3: Click Kanban toggle - board appears
    await page.click('#btn-toggle-kanban');
    await page.waitForTimeout(3000);
    const boardVisible = await page.locator('#kanban-board').isVisible();
    if (boardVisible) { passed++; console.log('T3: Kanban board visible after toggle: PASS'); }
    else { failed++; console.log('T3: Kanban board visible after toggle: FAIL'); }
    
    // T4: Grid view hidden when kanban visible
    const gridHidden = await page.locator('#leads-list').isVisible();
    if (!gridHidden) { passed++; console.log('T4: Grid view hidden in kanban mode: PASS'); }
    else { failed++; console.log('T4: Grid view hidden in kanban mode: FAIL'); }
    
    // T5: Toggle button text changed to Grid
    const btnText = await page.locator('#btn-toggle-kanban').textContent();
    if (btnText.includes('Grid')) { passed++; console.log('T5: Button text changed to Grid: PASS'); }
    else { failed++; console.log('T5: Button text changed to Grid: FAIL (' + btnText + ')'); }
    
    // T6: 6 kanban columns exist
    const colCount = await page.locator('.kanban-column').count();
    if (colCount === 6) { passed++; console.log('T6: 6 Kanban columns exist: PASS'); }
    else { failed++; console.log('T6: 6 Kanban columns exist: FAIL (' + colCount + ')'); }
    
    // T7: Kanban cards rendered
    const cardCount = await page.locator('.kanban-card').count();
    if (cardCount > 0) { passed++; console.log('T7: Kanban cards rendered: PASS (' + cardCount + ' cards)'); }
    else { failed++; console.log('T7: Kanban cards rendered: FAIL (0 cards)'); }
    
    // T8: Column headers show counts
    const counts = await page.locator('.kanban-count').allTextContents();
    const totalCards = counts.reduce((sum, c) => sum + parseInt(c || '0'), 0);
    if (totalCards === cardCount) { passed++; console.log('T8: Column counts match cards: PASS (' + totalCards + ')'); }
    else { failed++; console.log('T8: Column counts match cards: FAIL (counts=' + totalCards + ' cards=' + cardCount + ')'); }
    
    // T9: Column headers show values
    const values = await page.locator('.kanban-value').allTextContents();
    const hasValues = values.some(v => v.includes('$'));
    if (hasValues) { passed++; console.log('T9: Column values displayed: PASS'); }
    else { failed++; console.log('T9: Column values displayed: FAIL'); }
    
    // T10: Cards have stage select dropdowns
    const selects = await page.locator('.kanban-card-stage-select').count();
    if (selects === cardCount) { passed++; console.log('T10: Stage select dropdowns on cards: PASS'); }
    else { failed++; console.log('T10: Stage select dropdowns on cards: FAIL (selects=' + selects + ' cards=' + cardCount + ')'); }
    
    // T11: Toggle back to grid view
    await page.click('#btn-toggle-kanban');
    await page.waitForTimeout(1000);
    const gridVisible = await page.locator('#leads-list').isVisible();
    const boardHidden = await page.locator('#kanban-board').isVisible();
    if (gridVisible && !boardHidden) { passed++; console.log('T11: Toggle back to grid view: PASS'); }
    else { failed++; console.log('T11: Toggle back to grid view: FAIL (grid=' + gridVisible + ' board=' + boardHidden + ')'); }
    
    // T12: Score badges visible on kanban cards
    const scoreBadges = await page.locator('.kanban-card-score').count();
    await page.click('#btn-toggle-kanban');
    await page.waitForTimeout(1000);
    const scoreBadgesKanban = await page.locator('.kanban-card-score').count();
    if (scoreBadgesKanban > 0) { passed++; console.log('T12: Score badges on kanban cards: PASS (' + scoreBadgesKanban + ')'); }
    else { failed++; console.log('T12: Score badges on kanban cards: FAIL'); }
    
    // Screenshot
    await page.screenshot({ path: '/home/aicrm/workspace/AICRM/docs/testing/screenshots/kanban-board-test.png', fullPage: true });
    console.log('\nScreenshot saved: kanban-board-test.png');
    
    await browser.close();
    console.log('\n=== Results: ' + passed + '/' + (passed + failed) + ' passed ===');
    process.exit(failed > 0 ? 1 : 0);
})();
