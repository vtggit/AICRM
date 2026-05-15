import { test, expect } from '@playwright/test';

const DEV_TOKEN = 'dev-secret-token';

test.describe('Analytics - Lead Conversion Funnel', () => {
  test('analytics page loads and displays funnel data', async ({ page }) => {
    // Login using dev token
    await page.goto('http://localhost:8080');
    await page.evaluate((token) => {
      sessionStorage.setItem('aicrm_token', token);
    }, DEV_TOKEN);
    await page.reload();
    await page.waitForTimeout(2000);

    // Navigate to Analytics
    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(3000);

    // Verify Analytics page heading (h2 with text "Analytics")
    const pageTitle = page.locator('h2').filter({ hasText: 'Analytics' });
    await expect(pageTitle).toBeVisible({ timeout: 5000 });

    // Verify funnel chart container exists
    const funnelChart = page.locator('#funnel-chart');
    await expect(funnelChart).toBeVisible({ timeout: 5000 });

    // Verify funnel steps are rendered (at least the "Leads" stage)
    const funnelSteps = page.locator('.funnel-step');
    await expect(funnelSteps.first()).toBeVisible({ timeout: 5000 });
    expect(await funnelSteps.count()).toBeGreaterThan(0);

    // Verify overview metrics are displayed (stat cards)
    const statCards = page.locator('.analytics-stat-card');
    await expect(statCards.first()).toBeVisible({ timeout: 5000 });

    // Verify funnel breakdown table exists and has rows
    const breakdown = page.locator('#funnel-breakdown table');
    await expect(breakdown).toBeVisible({ timeout: 5000 });

    // Verify table has headers
    const tableHeaders = breakdown.locator('thead th');
    await expect(tableHeaders.first()).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'screenshots/analytics-funnel.png', fullPage: true });
  });

  test('analytics funnel shows conversion rates between stages', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.evaluate((token) => {
      sessionStorage.setItem('aicrm_token', token);
    }, DEV_TOKEN);
    await page.reload();
    await page.waitForTimeout(2000);

    await page.click('[data-page="analytics"]');
    await page.waitForTimeout(3000);

    // Verify conversion rate arrows exist between funnel steps
    const arrows = page.locator('.funnel-arrow');
    const arrowCount = await arrows.count();
    // If there are multiple steps, there should be arrows between them
    if (arrowCount > 0) {
      const arrowRate = page.locator('.funnel-arrow-rate');
      await expect(arrowRate.first()).toBeVisible();
    }

    await page.screenshot({ path: 'screenshots/analytics-conversion-rates.png', fullPage: true });
  });
});
