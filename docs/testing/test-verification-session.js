const { chromium } = require('playwright');
const { setPageAuth, waitForAuthReady } = require('./auth-helper');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];

function report(name, pass, detail) {
    detail = detail || '';
    const symbol = pass ? 'PASS' : 'FAIL';
    console.log('  [' + symbol + '] ' + name + (detail ? ' - ' + detail : ''));
    results.push({ name, pass, detail });
}

(async () => {
    console.log('=======================================================');
    console.log('  AICRM Verification Test Session');
    console.log('=======================================================\n');

    var browser, context, page;
    var consoleErrors = [];
    var consoleWarnings = [];
    var pageErrors = [];
    var filteredErrors = [];
    var filteredWarnings = [];

    try {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await setPageAuth(context, 'dev-secret-token:admin');
        page = await context.newPage();

        page.on('console', function(msg) {
            var type = msg.type();
            var text = msg.text();
            if (type === 'error') consoleErrors.push(text);
            else if (type === 'warning') consoleWarnings.push(text);
        });

        page.on('pageerror', function(err) {
            pageErrors.push(err.message);
        });

        // 1. Navigate to dashboard
        console.log('Step 1: Navigate to dashboard\n');
        await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 15000 });

        // 2. Wait for auth ready
        console.log('Step 2: Wait for auth ready');
        var user = await waitForAuthReady(page, true, 15000);
        report('Auth initialized', user !== null, 'user: ' + JSON.stringify(user).slice(0, 120));

        // 3. Wait for dashboard content
        console.log('Step 3: Wait for dashboard content');
        await page.waitForSelector('#page-dashboard', { state: 'visible', timeout: 10000 });
        var pageTitle = await page.textContent('#page-title');
        report('Dashboard page visible', pageTitle === 'Dashboard', 'title=' + pageTitle);

        // 4. Screenshot dashboard
        console.log('Step 4: Dashboard screenshot');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify-dashboard.png'), fullPage: true });
        var dashExists = fs.existsSync(path.join(SCREENSHOT_DIR, 'verify-dashboard.png'));
        report('Dashboard screenshot saved', dashExists);

        // 5. Verify stat cards
        console.log('Step 5: Verify stat cards');
        var statCards = await page.locator('.stat-card').count();
        report('Stat cards present', statCards >= 6, 'found ' + statCards + ' stat-card elements');

        var statCardTexts = await page.locator('.stat-card .stat-info h3').allTextContents();
        var hasValidStats = statCardTexts.some(function(t) { return t && t.trim().length > 0; });
        report('Stat cards have content', hasValidStats, statCardTexts.filter(function(t){return t;}).length + ' cards with text');

        // 6. Navigate to Contacts
        console.log('Step 6: Navigate to Contacts');
        await page.click('.nav-item[data-page="contacts"]');
        await page.waitForSelector('.contact-card', { state: 'visible', timeout: 15000 });

        // 7. Screenshot contacts
        console.log('Step 7: Contacts screenshot');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify-contacts.png'), fullPage: true });
        var contactsExists = fs.existsSync(path.join(SCREENSHOT_DIR, 'verify-contacts.png'));
        report('Contacts screenshot saved', contactsExists);

        // 8. Verify contact cards
        console.log('Step 8: Verify contact cards');
        var contactCards = await page.locator('.contact-card').count();
        report('Contact cards visible', contactCards >= 1, 'found ' + contactCards + ' contact-card elements');

        var contactsTitle = await page.textContent('#page-title');
        report('Contacts page title', contactsTitle === 'Contacts', 'title=' + contactsTitle);

        // 9. Visual issue checks
        console.log('\nStep 9: Visual issue checks');

        var whiteOnWhite = await page.evaluate(function() {
            var issues = [];
            var allElements = document.querySelectorAll('*');
            var checked = 0;
            for (var i = 0; i < allElements.length; i++) {
                var el = allElements[i];
                if (el.children.length > 0) continue;
                checked++;
                try {
                    var style = window.getComputedStyle(el);
                    var color = style.color;
                    var bgColor = style.backgroundColor;
                    var toHex = function(c) {
                        var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                        if (m) {
                            var r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
                            return (r * 299 + g * 587 + b * 114) / 1000;
                        }
                        return -1;
                    };
                    var textBrightness = toHex(color);
                    var bgBrightness = toHex(bgColor);
                    if (textBrightness > 200 && bgBrightness > 200 && textBrightness >= 0 && bgBrightness >= 0) {
                        var textContent = el.textContent.trim();
                        if (textContent.length > 0 && textContent.length < 100) {
                            issues.push({ text: textContent.slice(0, 50), textBrightness: Math.round(textBrightness), bgBrightness: Math.round(bgBrightness) });
                        }
                    }
                } catch (e) {}
                if (checked > 500) break;
            }
            return issues.slice(0, 5);
        });
        report('No white-on-white text', whiteOnWhite.length === 0,
            whiteOnWhite.length > 0 ? whiteOnWhite.length + ' potential issues found' : '');

        var garbledText = await page.evaluate(function() {
            var issues = [];
            var selectors = ['.stat-card h3', '.stat-card p', '.contact-card h4', '.contact-card p', '#page-title'];
            for (var s = 0; s < selectors.length; s++) {
                var sel = selectors[s];
                var els = document.querySelectorAll(sel);
                for (var i = 0; i < els.length; i++) {
                    var el = els[i];
                    var text = el.textContent.trim();
                    if (text.length > 0) {
                        var garbled = text.match(/[\u200B-\u200D\uFEFF\u00AD]/g);
                        if (garbled && garbled.length > 0) {
                            issues.push({ selector: sel, text: text.slice(0, 50), garbledCount: garbled.length });
                        }
                    }
                }
            }
            return issues;
        });
        report('No garbled characters', garbledText.length === 0,
            garbledText.length > 0 ? garbledText.length + ' elements with garbled chars' : '');

        var overflowIssues = await page.evaluate(function() {
            var issues = [];
            var body = document.body;
            if (body.scrollWidth > body.clientWidth + 50) {
                issues.push('Horizontal overflow: body is ' + body.scrollWidth + 'px wide but viewport is ' + body.clientWidth + 'px');
            }
            var main = document.querySelector('.main-content') || document.querySelector('.container');
            if (main) {
                var rect = main.getBoundingClientRect();
                if (rect.right > window.innerWidth + 50) {
                    issues.push('Main content extends beyond viewport: right=' + Math.round(rect.right) + 'px, viewport=' + window.innerWidth + 'px');
                }
            }
            return issues;
        });
        report('No layout overflow', overflowIssues.length === 0,
            overflowIssues.length > 0 ? overflowIssues.join('; ') : '');

        // 10. Console errors check
        console.log('\nStep 10: Console errors');
        await page.waitForTimeout(1000);

        filteredErrors = consoleErrors.filter(function(e) {
            return !e.includes('NetInfo') && !e.includes('favicon') && !e.includes('chrome-extension') && !e.includes('Sentry');
        });
        report('No console errors', filteredErrors.length === 0,
            filteredErrors.length > 0 ? filteredErrors.length + ' errors found' : '');

        filteredWarnings = consoleWarnings.filter(function(e) {
            return !e.includes('NetInfo') && !e.includes('deprecated') && !e.includes('chrome-extension');
        });
        report('No console warnings', filteredWarnings.length === 0,
            filteredWarnings.length > 0 ? filteredWarnings.length + ' warnings found' : '');

        report('No unhandled page errors', pageErrors.length === 0,
            pageErrors.length > 0 ? pageErrors.length + ' unhandled errors' : '');

    } catch (err) {
        report('Test execution', false, err.message);
    } finally {
        if (browser) await browser.close();
    }

    // Summary
    console.log('\n=======================================================');
    console.log('  RESULTS SUMMARY');
    console.log('=======================================================');

    var passed = results.filter(function(r) { return r.pass; }).length;
    var failed = results.filter(function(r) { return !r.pass; }).length;

    results.forEach(function(r) {
        console.log('  ' + (r.pass ? 'PASS' : 'FAIL') + '  ' + r.name + (r.detail ? ' - ' + r.detail : ''));
    });

    console.log('\n  Total: ' + results.length + '  |  Passed: ' + passed + '  |  Failed: ' + failed);
    console.log('=======================================================\n');

    if (filteredErrors.length > 0) {
        console.log('Console errors detail:');
        filteredErrors.forEach(function(e) { console.log('  ERROR: ' + e); });
    }
    if (filteredWarnings.length > 0) {
        console.log('Console warnings detail:');
        filteredWarnings.forEach(function(e) { console.log('  WARN: ' + e); });
    }
    if (pageErrors.length > 0) {
        console.log('Page errors detail:');
        pageErrors.forEach(function(e) { console.log('  PAGE_ERROR: ' + e); });
    }

    process.exit(failed > 0 ? 1 : 0);
})();
