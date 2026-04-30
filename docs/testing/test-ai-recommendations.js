/**
 * Test: AI-Powered Lead Recommendations (Priority 15)
 * 
 * Tests:
 * 1. Recommendation card exists on dashboard
 * 2. Empty state shows when no active leads
 * 3. Recommendations appear when active leads exist
 * 4. Recommendation items have correct structure
 * 5. Urgency indicators work correctly (stale leads)
 * 6. Recommendation values display correctly
 * 7. Score badges appear on recommendations
 * 8. Clicking recommendation navigates to leads page
 * 9. No console errors
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';
const RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results');

if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const results = [];

function pass(test, detail) { results.push({ test, detail, status: 'PASS' }); }
function fail(test, detail) { results.push({ test, detail, status: 'FAIL' }); }

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const consoleErrors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        await page.goto(BASE_URL + '/app/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        // === TEST 1: Recommendation card exists ===
        console.log('TEST 1: Recommendation card exists on dashboard');
        const recCard = await page.locator('#recommended-actions').first();
        const recCardVisible = await recCard.isVisible();
        if (recCardVisible) pass('Recommendation card exists', '#recommended-actions is visible');
        else fail('Recommendation card exists', '#recommended-actions not found');

        // === TEST 2: Empty state when no active leads ===
        console.log('TEST 2: Empty state shows when no active leads');
        const emptyText = await recCard.innerText();
        if (emptyText.includes('No recommendations') || emptyText.includes('Add leads')) {
            pass('Empty state shown', `Text: "${emptyText.trim().substring(0, 60)}..."`);
        } else {
            fail('Empty state shown', `Unexpected text: "${emptyText.trim()}"`);
        }

        // === TEST 3: Create test leads and verify recommendations appear ===
        console.log('TEST 3: Create test leads for recommendations');
        await page.evaluate(() => {
            Storage.set(Storage.KEYS.LEADS, [
                { id: 'rec-1', name: 'Enterprise Corp', company: 'Enterprise Corp', email: 'ceo@enterprise.com', phone: '555-0101', value: 500000, stage: 'proposal', source: 'referral', notes: 'High value deal', createdAt: '2026-04-15T10:00:00Z' },
                { id: 'rec-2', name: 'Startup Inc', company: 'Startup Inc', email: 'founder@startup.io', phone: '555-0102', value: 50000, stage: 'qualified', source: 'website', notes: 'Growing fast', createdAt: '2026-04-20T10:00:00Z' },
                { id: 'rec-3', name: 'Global Tech', company: 'Global Tech', email: 'sales@globaltech.com', value: 200000, stage: 'new', source: 'cold-call', notes: '', createdAt: '2026-04-25T10:00:00Z' },
                { id: 'rec-4', name: 'Won Deal', company: 'Won Corp', email: 'won@corp.com', value: 100000, stage: 'won', source: 'referral', notes: '', createdAt: '2026-04-01T10:00:00Z' },
                { id: 'rec-5', name: 'Lost Deal', company: 'Lost Corp', email: 'lost@corp.com', value: 75000, stage: 'lost', source: 'website', notes: '', createdAt: '2026-04-01T10:00:00Z' },
            ]);
            Storage.set(Storage.KEYS.CONTACTS, []);
            Storage.set(Storage.KEYS.ACTIVITIES, []);
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        const recItems = await page.locator('.recommendation-item').count();
        if (recItems >= 1 && recItems <= 3) {
            pass('Recommendations appear for active leads', `Found ${recItems} recommendations (excludes won/lost)`);
        } else {
            fail('Recommendations appear for active leads', `Expected 1-3, got ${recItems}`);
        }

        // === TEST 4: Recommendation items have correct structure ===
        console.log('TEST 4: Recommendation items have correct structure');
        const hasHeader = await page.locator('.recommendation-header').first().isVisible().catch(() => false);
        const hasBody = await page.locator('.recommendation-body').first().isVisible().catch(() => false);
        const hasName = await page.locator('.recommendation-name').first().isVisible().catch(() => false);
        const hasSuggestion = await page.locator('.recommendation-suggestion').first().isVisible().catch(() => false);
        if (hasHeader && hasBody && hasName && hasSuggestion) {
            pass('Recommendation structure correct', 'Has header, body, name, and suggestion');
        } else {
            fail('Recommendation structure correct', `header:${hasHeader} body:${hasBody} name:${hasName} suggestion:${hasSuggestion}`);
        }

        // === TEST 5: Urgency indicators (stale leads get urgent class) ===
        console.log('TEST 5: Urgency indicators work correctly');
        // Enterprise Corp was created on April 15, which is 15 days ago -> should be urgent
        const urgentItems = await page.locator('.recommendation-urgent').count();
        if (urgentItems >= 1) {
            pass('Urgency indicators present', `Found ${urgentItems} urgent recommendations`);
        } else {
            fail('Urgency indicators present', 'No urgent recommendations found for stale leads');
        }

        // === TEST 6: Recommendation values display correctly ===
        console.log('TEST 6: Recommendation values display correctly');
        const valueItems = await page.locator('.recommendation-value').count();
        if (valueItems >= 1) {
            const firstValue = await page.locator('.recommendation-value').first().innerText();
            if (firstValue.includes('$')) {
                pass('Values display correctly', `First value: ${firstValue}`);
            } else {
                fail('Values display correctly', `Value missing $ sign: ${firstValue}`);
            }
        } else {
            fail('Values display correctly', 'No value items found');
        }

        // === TEST 7: Score badges appear on recommendations ===
        console.log('TEST 7: Score badges appear on recommendations');
        const scoreBadges = await page.locator('#recommended-actions .score-badge').count();
        if (scoreBadges === recItems) {
            pass('Score badges on recommendations', `${scoreBadges} badges for ${recItems} items`);
        } else {
            fail('Score badges on recommendations', `${scoreBadges} badges for ${recItems} items`);
        }

        // === TEST 8: Clicking recommendation name navigates to leads page ===
        console.log('TEST 8: Clicking recommendation navigates to leads');
        await page.locator('.recommendation-name').first().click();
        await page.waitForTimeout(300);
        const leadsPageVisible = await page.locator('#page-leads').first().isVisible().catch(() => false);
        if (leadsPageVisible) {
            pass('Navigate to leads on click', 'Clicked recommendation name -> leads page visible');
        } else {
            fail('Navigate to leads on click', 'Leads page not visible after click');
        }

        // Navigate back to dashboard for screenshot
        await page.locator('[data-page="dashboard"]').click();
        await page.waitForTimeout(300);

        // === TEST 9: No console errors ===
        console.log('TEST 9: No console errors');
        if (consoleErrors.length === 0) {
            pass('No console errors', 'Zero errors');
        } else {
            fail('No console errors', `${consoleErrors.length} errors: ${consoleErrors.join('; ')}`);
        }

        // Screenshot
        await page.screenshot({ path: path.join(RESULTS_DIR, 'ai-recommendations.png'), fullPage: false });
        console.log('\nScreenshot saved to test-results/ai-recommendations.png');

    } catch (err) {
        console.error('Test error:', err.message);
        fail('Test execution', err.message);
    } finally {
        await browser.close();
    }

    // Print results
    console.log('\n=== AI-POWERED LEAD RECOMMENDATIONS TEST RESULTS ===');
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        const detail = r.detail ? ` - ${r.detail}` : '';
        console.log(`  ${icon} ${r.status}: ${r.test}${detail}`);
    });
    const passed = results.filter(r => r.status === 'PASS').length;
    console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${results.length - passed}`);
    process.exit(results.length - passed > 0 ? 1 : 0);
})();
