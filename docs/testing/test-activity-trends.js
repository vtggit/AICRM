const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');

(async () => {
  const results = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setPageAuth(context, 'dev-secret-token:admin');
  const page = await context.newPage();

  try {
    // Test 1: Dashboard loads with Activity Trends card
    console.log('TEST 1: Dashboard loads with Activity Trends card');
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await waitForAuthReady(page);
    await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 5000 });
    // Wait for activity trends data to render (async API call)
    await page.waitForFunction(() => {
      const el = document.getElementById('activity-trend-overview');
      return el && el.textContent.trim().length > 0;
    }, { timeout: 10000 });
    await page.screenshot({ path: '/tmp/test-activity-trends-1.png', fullPage: true });
    const overviewText = await page.locator('#activity-trend-overview').textContent();
    const cardExists = overviewText.trim().length > 0;
    console.log(`  Activity Trends section visible: ${cardExists}`);
    results.push({ test: 'Activity Trends section visible on dashboard', pass: cardExists });

    // Test 2: Range selector exists with correct options
    console.log('TEST 2: Range selector exists');
    const rangeSelector = await page.locator('#trend-range').isVisible();
    const options = await page.locator('#trend-range option').allTextContents();
    console.log(`  Range selector visible: ${rangeSelector}, options: ${JSON.stringify(options)}`);
    results.push({ test: 'Range selector with options', pass: rangeSelector && options.length >= 3 });

    // Test 3: Grouping selector exists
    console.log('TEST 3: Grouping selector exists');
    const groupSelector = await page.locator('#trend-group').isVisible();
    const groupOptions = await page.locator('#trend-group option').allTextContents();
    console.log(`  Grouping selector visible: ${groupSelector}, options: ${JSON.stringify(groupOptions)}`);
    results.push({ test: 'Grouping selector with options', pass: groupSelector && groupOptions.length >= 2 });

    // Test 4: API endpoint returns data
    console.log('TEST 4: API endpoint returns data');
    const apiResult = await page.evaluate(async () => {
        const result = await ApiClient.get('/analytics/activity-trends?range=30d&grouping=day');
        return {
            ok: result.ok,
            hasBuckets: result.data && Array.isArray(result.data.buckets),
            bucketCount: result.data && result.data.buckets ? result.data.buckets.length : 0,
            totalActivities: result.data && result.data.total_activities || 0,
        };
    });
    console.log(`  API ok: ${apiResult.ok}, buckets: ${apiResult.bucketCount}, total activities: ${apiResult.totalActivities}`);
    results.push({ test: 'Activity trends API returns data', pass: apiResult.ok && apiResult.hasBuckets && apiResult.bucketCount > 0 });

    // Test 5: Chart grid renders
    console.log('TEST 5: Chart grid renders');
    const chartGrid = await page.locator('.trend-chart-grid').isVisible();
    console.log(`  Chart grid visible: ${chartGrid}`);
    results.push({ test: 'Chart grid renders', pass: chartGrid });

    // Test 6: Activity type legend renders
    console.log('TEST 6: Activity type legend renders');
    const legendItems = await page.locator('.trend-legend-item').count();
    console.log(`  Legend items found: ${legendItems}`);
    results.push({ test: 'Activity type legend renders', pass: legendItems >= 3 });

    // Test 7: Range change triggers data refresh
    console.log('TEST 7: Range change triggers data refresh');
    await page.selectOption('#trend-range', '7d');
    await page.waitForTimeout(1000);
    const barsAfterChange = await page.locator('.trend-bar').count();
    console.log(`  Bars after range change (7d): ${barsAfterChange}`);
    results.push({ test: 'Range change updates chart', pass: barsAfterChange > 0 });

    // Test 8: Screenshot of full dashboard with trends
    console.log('TEST 8: Full dashboard screenshot');
    await page.selectOption('#trend-range', '30d');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test-activity-trends-final.png', fullPage: true });
    results.push({ test: 'Dashboard screenshot captured', pass: true });

  } catch (e) {
    console.error('Test error:', e.message);
    results.push({ test: 'No errors during execution', pass: false });
  } finally {
    await browser.close();
  }

  console.log('\n=== TEST RESULTS ===');
  let passed = 0;
  results.forEach((r) => {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${icon} ${r.pass ? 'PASS' : 'FAIL'}: ${r.test}`);
    if (r.pass) passed++;
  });
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
  process.exit(results.length - passed > 0 ? 1 : 0);
})();
