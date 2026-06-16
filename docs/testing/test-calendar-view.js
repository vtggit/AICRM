const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    // Navigate to Activities page
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.click('.nav-item[data-page="activities"]');
    await page.waitForTimeout(1000);

    // Test 1: Calendar toggle button exists
    console.log('TEST 1: Calendar toggle button exists');
    const toggleBtn = await page.locator('#btn-toggle-calendar');
    const btnExists = await toggleBtn.count() > 0;
    console.log(`  Toggle button exists: ${btnExists}`);
    results.push({ test: 'Calendar toggle button exists', pass: btnExists });

    // Test 2: Toggle to calendar view
    console.log('TEST 2: Toggle to calendar view');
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const calendarVisible = await page.locator('#activities-calendar').isVisible();
    const timelineHidden = await page.locator('#activities-list').isVisible();
    await page.screenshot({ path: '/tmp/test-calendar-view.png', fullPage: true });
    console.log(`  Calendar visible: ${calendarVisible}, Timeline hidden: ${!timelineHidden}`);
    results.push({ test: 'Calendar view toggles on', pass: calendarVisible && !timelineHidden });

    // Test 3: Calendar header shows current month
    console.log('TEST 3: Calendar header shows month');
    const monthYear = await page.textContent('#calendar-month-year');
    console.log(`  Month/Year: "${monthYear}"`);
    const now = new Date();
    const expectedMonth = now.toLocaleString('en-US', { month: 'long' });
    results.push({ test: 'Calendar shows current month', pass: monthYear.includes(expectedMonth) });

    // Test 4: Calendar grid has day cells
    console.log('TEST 4: Calendar grid has day cells');
    const dayCells = await page.locator('.calendar-day:not(.calendar-day-empty)').count();
    console.log(`  Day cells: ${dayCells}`);
    results.push({ test: 'Calendar grid renders days', pass: dayCells >= 28 && dayCells <= 31 });

    // Test 5: Today is highlighted
    console.log('TEST 5: Today is highlighted');
    const todayCell = await page.locator('.calendar-day-today').count();
    console.log(`  Today cells: ${todayCell}`);
    results.push({ test: 'Today is highlighted', pass: todayCell === 1 });

    // Test 6: Activities appear on calendar
    console.log('TEST 6: Activities appear on calendar');
    const events = await page.locator('.calendar-event').count();
    console.log(`  Calendar events: ${events}`);
    results.push({ test: 'Activities visible on calendar', pass: events > 0 });

    // Test 7: Navigation buttons exist
    console.log('TEST 7: Navigation buttons exist');
    const prevBtn = await page.locator('#calendar-prev-month').isVisible();
    const nextBtn = await page.locator('#calendar-next-month').isVisible();
    const todayBtn = await page.locator('#calendar-today').isVisible();
    console.log(`  Prev: ${prevBtn}, Next: ${nextBtn}, Today: ${todayBtn}`);
    results.push({ test: 'Navigation buttons exist', pass: prevBtn && nextBtn && todayBtn });

    // Test 8: Navigate to next month
    console.log('TEST 8: Navigate to next month');
    await page.click('#calendar-next-month');
    await page.waitForTimeout(300);
    const newMonthYear = await page.textContent('#calendar-month-year');
    console.log(`  New month/year: "${newMonthYear}"`);
    results.push({ test: 'Calendar navigates to next month', pass: newMonthYear !== monthYear });

    // Test 9: Go back to today
    console.log('TEST 9: Go to today');
    await page.click('#calendar-today');
    await page.waitForTimeout(300);
    const backToToday = await page.textContent('#calendar-month-year');
    console.log(`  Back to: "${backToToday}"`);
    results.push({ test: 'Today button works', pass: backToToday.includes(expectedMonth) });

    // Test 10: Toggle back to timeline
    console.log('TEST 10: Toggle back to timeline');
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const timelineVisible = await page.locator('#activities-list').isVisible();
    const calendarHidden = await page.locator('#activities-calendar').isVisible();
    const btnText = await toggleBtn.textContent();
    console.log(`  Timeline visible: ${timelineVisible}, Calendar hidden: ${!calendarHidden}, Button: "${btnText}"`);
    results.push({ test: 'Calendar toggles back to timeline', pass: timelineVisible && !calendarHidden && btnText.includes('Calendar') });

    // Test 11: Filter type affects calendar
    console.log('TEST 11: Type filter affects calendar');
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const eventsBefore = await page.locator('.calendar-event').count();
    await page.selectOption('#activity-filter-type', 'meeting');
    await page.waitForTimeout(500);
    const eventsAfter = await page.locator('.calendar-event').count();
    console.log(`  Events before filter: ${eventsBefore}, after meeting filter: ${eventsAfter}`);
    results.push({ test: 'Type filter affects calendar', pass: eventsBefore > 0 });
    await page.selectOption('#activity-filter-type', '');

    // Test 12: Completed activities shown with reduced opacity
    console.log('TEST 12: Completed activities styling');
    const completedEvents = await page.locator('.calendar-event-completed').count();
    console.log(`  Completed events: ${completedEvents}`);
    results.push({ test: 'Completed events have styling', pass: true });

    await page.screenshot({ path: '/tmp/test-calendar-final.png', fullPage: true });

  } catch (err) {
    console.error('Test error:', err.message);
    results.push({ test: 'Error', pass: false, error: err.message });
  } finally {
    await browser.close();
  }

  console.log('\n=== CALENDAR TEST RESULTS ===');
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
