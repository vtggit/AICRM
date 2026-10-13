// Proof for issue #344 — the Companies page (#page-companies) fits the window.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  Toolbar: one bar above the list holds #btn-add-company with its
//         data-admin-only gating; the label reads "Add company" — no "+",
//         no emoji. List (#companies-list): one compact row per company
//         (>= 52 px), keeping the class contact-card and its
//         data-company-id, showing in order the name (.company-row-name),
//         the industry (.company-row-industry), the website
//         (.company-row-website), the employee count
//         (.company-row-employees, with a thousands separator) and the
//         created date (.company-row-created, in the formatDate form),
//         with word-labelled Edit/Delete buttons (class card-action-btn,
//         data-action edit/delete) for an admin only. A company missing an
//         optional field has no element for it and the list never shows
//         "undefined", "null" or "Invalid Date". A 150-character name or
//         website is cut with an ellipsis on one line and never pushes the
//         buttons out. With no companies a centred empty state reads
//         "No companies found."; a failed load shows its message without
//         the warning emoji. At 1440x900 with 300 companies neither the
//         document nor the content region scrolls — only #companies-list
//         does. At 900 px and below the website is hidden and 390x844 has
//         no horizontal page scroll. The modal, create/update/delete and
//         every element id are unchanged, and API values pass through the
//         escaping helpers (a hostile name renders as text, without
//         executing). Styles live in css/companies.css, tokens only — no
//         raw colour values.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the rows render while the Edit,
// Delete and "Add company" controls are absent, including after a full
// reload.
//
// Review defects proven here:
//   • logging out hides the rows' Edit/Delete actions and "Add company"
//     (the admin-only company controls) without a reload, while the rows
//     keep rendering;
//   • a whitespace-only employeeCount renders no element — never
//     "0 employees";
//   • the row's Edit/Delete buttons are wired: Edit opens the modal
//     with that company's values (proven on a second row as well) and
//     Delete sends the delete for the row's id after the confirmation is
//     accepted.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// Emoji ranges: pictographs/symbols, arrows, misc technical, VS-16.
const EMOJI_SRC = '[\\u{1F000}-\\u{1FAFF}\\u{2190}-\\u{2BFF}\\u{2300}-\\u{23FF}\\uFE0F]';
const EMOJI_RE = new RegExp(EMOJI_SRC, 'u');

// Hostile, user-controllable company name: unescaped, it would inject an
// <img> element whose onerror handler sets window.__pwned.
const HOSTILE_NAME = '<img src=x onerror=window.__pwned=1>';
const LONG_NAME = 'L'.repeat(150);
const LONG_WEBSITE = 'https://' + 'w'.repeat(142); // 150 characters
const CREATED_ISO = '2026-02-10T09:30:00Z';
const LOAD_ERROR = 'The companies store is on fire.';

// The five companies the admin pass renders:
//   co-1 every field, co-2 only a name, co-3 a 150-char name + website,
//   co-4 a hostile name, co-5 a small employee count and no created date.
const COMPANIES = [
  {
    id: 'co-1',
    name: 'Fullfield Systems',
    website: 'https://fullfield.example.com',
    industry: 'Industrial software',
    employee_count: 1250,
    created_at: CREATED_ISO,
  },
  { id: 'co-2', name: 'Bare Bones Co', website: null, industry: null, employee_count: null, created_at: null },
  { id: 'co-3', name: LONG_NAME, website: LONG_WEBSITE, industry: null, employee_count: null, created_at: null },
  { id: 'co-4', name: HOSTILE_NAME, website: null, industry: null, employee_count: null, created_at: null },
  { id: 'co-5', name: 'Small Co', website: null, industry: 'Coffee', employee_count: 250, created_at: null },
];

function makeCompanies(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      id: 'c-' + String(i).padStart(3, '0'),
      name: 'Company ' + String(i).padStart(3, '0'),
      website: null,
      industry: i % 4 === 0 ? 'Logistics' : null,
      employee_count: i * 37,
      created_at: '2026-01-0' + ((i % 9) + 1) + 'T08:00:00Z',
    });
  }
  return out;
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * opts.companyError makes GET /companies fail with a 500 carrying that
 * detail message. Returns the recorded API calls (method, url, auth).
 */
async function boot(page, token, companies, opts = {}) {
  const user = token === VIEWER_TOKEN
    ? { username: 'plain-user', sub: 'u1', roles: ['user'], display_name: 'Viewer One' }
    : { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const calls = [];
  await page.addInitScript((cfg) => { window.AICRM_CONFIG = cfg; },
    { API_BASE_URL: 'http://localhost:9000/api' });
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  // Honour the limit/offset paging used by ApiClient.getAllPages.
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    calls.push({ method: req.method(), url, auth: req.headers()['authorization'] || '' });
    const json = (o, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/auth\/me/.test(url)) {
      // A foreign token does not authenticate.
      const auth = req.headers()['authorization'] || '';
      if (auth && !auth.includes(token)) return json({ authenticated: false, user: null });
      return json({ authenticated: true, user });
    }
    if (/\/auth\/config/.test(url)) return json({ auth_enabled: true });
    if (/\/health/.test(url)) return json({ status: 'ok', app_version: '0.2.3' });
    if (/\/companies(\b|\?|$)/.test(url)) {
      if (opts.companyError && req.method() === 'GET') {
        return json({ detail: opts.companyError }, 500);
      }
      if (req.method() === 'GET') {
        const u = new URL(url);
        const limit = Math.max(1, parseInt(u.searchParams.get('limit') || '100', 10) || 100);
        const offset = Math.max(0, parseInt(u.searchParams.get('offset') || '0', 10) || 0);
        return json(companies.slice(offset, offset + limit));
      }
      return json({ ok: true });
    }
    if (/\/settings/.test(url)) return json({ payload: {} });
    return json([]);
  });
  await page.goto(INDEX + '#access_token=' + encodeURIComponent(token));
  await page.waitForFunction(
    () => typeof App !== 'undefined' && !!document.getElementById('page-title'),
    { timeout: 20000 });
  await page.waitForFunction(
    () => typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  return calls;
}

test('issue344 freeform', async ({ page }) => {
  test.setTimeout(240000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  const calls = await boot(page, ADMIN_TOKEN, COMPANIES);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The production boot sent the hash token as a Bearer header.
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + ADMIN_TOKEN),
    { timeout: 10000 }).toBe(true);

  // ── AC-1: open the Companies page; five compact rows render ────────────
  await page.evaluate(() => { location.hash = '#/companies'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#companies-list .contact-card').length === 5,
    { timeout: 30000 });
  await expect(page.locator('#page-title')).toHaveText('Companies');

  // ── AC-1: one toolbar bar above the list; "Add company", no "+", no
  //    emoji; the data-admin-only gating is kept ──────────────────────────
  const toolbar = await page.evaluate(() => {
    const bars = document.querySelectorAll('#page-companies .page-actions');
    const bar = bars[0];
    const btn = document.getElementById('btn-add-company');
    const barRect = bar.getBoundingClientRect();
    const listRect = document.getElementById('companies-list').getBoundingClientRect();
    return {
      bars: bars.length,
      inBar: bar.contains(btn),
      barAboveList: barRect.bottom <= listRect.top + 1,
      label: btn.textContent.trim(),
      adminOnly: btn.getAttribute('data-admin-only'),
    };
  });
  expect(toolbar.bars, 'one toolbar bar above the list').toBe(1);
  expect(toolbar.inBar, '#btn-add-company sits in the bar').toBe(true);
  expect(toolbar.barAboveList, 'the bar is above the list').toBe(true);
  expect(toolbar.label, 'the label reads "Add company"').toBe('Add company');
  expect(toolbar.label.includes('+'), 'no "+" in the label').toBe(false);
  expect(EMOJI_RE.test(toolbar.label), 'no emoji in the label').toBe(false);
  expect(toolbar.adminOnly, '#btn-add-company keeps its data-admin-only gating').toBe('true');

  // ── AC-1: the full company — the five parts in order left to right,
  //    employee count with its thousands separator, created date in the
  //    formatDate form, word-labelled Edit/Delete with data-action ────────
  const fullRow = page.locator('#companies-list .contact-card[data-company-id="co-1"]');
  await expect(fullRow, 'the full company renders one row').toHaveCount(1);
  await expect(fullRow.locator('.company-row-name')).toHaveText('Fullfield Systems');
  await expect(fullRow.locator('.company-row-industry')).toHaveText('Industrial software');
  await expect(fullRow.locator('.company-row-website'))
    .toHaveText('https://fullfield.example.com');
  await expect(fullRow.locator('.company-row-employees'))
    .toHaveText('1,250 employees');

  const expectedCreated = await page.evaluate((iso) => App.formatDate(iso), CREATED_ISO);
  await expect(fullRow.locator('.company-row-created')).toHaveText(expectedCreated);

  const editBtn = fullRow.locator('button.card-action-btn[data-action="edit"]');
  const deleteBtn = fullRow.locator('button.card-action-btn[data-action="delete"]');
  await expect(editBtn).toHaveText('Edit');
  await expect(deleteBtn).toHaveText('Delete');
  await expect(editBtn).toHaveClass(/card-action-btn/);
  await expect(deleteBtn).toHaveClass(/card-action-btn/);
  expect(EMOJI_RE.test(await editBtn.textContent()), 'no emoji in the Edit label').toBe(false);
  expect(EMOJI_RE.test(await deleteBtn.textContent()), 'no emoji in the Delete label').toBe(false);

  const order = await page.evaluate(() => {
    const row = document.querySelector('#companies-list .contact-card[data-company-id="co-1"]');
    const left = (sel) => {
      const el = row.querySelector(sel);
      return el ? el.getBoundingClientRect().left : null;
    };
    return {
      name: left('.company-row-name'),
      industry: left('.company-row-industry'),
      website: left('.company-row-website'),
      employees: left('.company-row-employees'),
      created: left('.company-row-created'),
      edit: left('.card-action-btn[data-action="edit"]'),
      del: left('.card-action-btn[data-action="delete"]'),
    };
  });
  for (const key of ['name', 'industry', 'website', 'employees', 'created', 'edit', 'del']) {
    expect(order[key] !== null, `the ${key} part renders`).toBe(true);
  }
  expect(order.name < order.industry, 'the name is left of the industry').toBe(true);
  expect(order.industry < order.website, 'the industry is left of the website').toBe(true);
  expect(order.website < order.employees, 'the website is left of the employee count').toBe(true);
  expect(order.employees < order.created, 'the employee count is left of the created date').toBe(true);
  expect(order.created < order.edit, 'the created date is left of Edit').toBe(true);
  expect(order.edit < order.del, 'Edit is left of Delete').toBe(true);

  // ── AC-1: a company with only a name — none of the four optional
  //    elements; no "undefined", "null" or "Invalid Date" in the list ─────
  const bareRow = page.locator('#companies-list .contact-card[data-company-id="co-2"]');
  await expect(bareRow).toHaveCount(1);
  await expect(bareRow.locator('.company-row-name')).toHaveText('Bare Bones Co');
  for (const cls of ['.company-row-industry', '.company-row-website',
                     '.company-row-employees', '.company-row-created']) {
    expect(await bareRow.locator(cls).count(),
      `${cls} is absent for a company without it`).toBe(0);
  }
  const listText = await page.evaluate(() =>
    document.getElementById('companies-list').textContent);
  expect(/undefined/.test(listText), 'no "undefined" in the list').toBe(false);
  expect(/\bnull\b/.test(listText), 'no "null" in the list').toBe(false);
  expect(/Invalid Date/.test(listText), 'no "Invalid Date" in the list').toBe(false);

  // A small count formats without a separator.
  const smallRow = page.locator('#companies-list .contact-card[data-company-id="co-5"]');
  await expect(smallRow.locator('.company-row-employees')).toHaveText('250 employees');
  expect(await smallRow.locator('.company-row-created').count(),
    'no created element for a company without one').toBe(0);

  // ── AC-1: a hostile name renders as text, without executing ────────────
  const hostileRow = page.locator('#companies-list .contact-card[data-company-id="co-4"]');
  await expect(hostileRow, 'the hostile row renders as a row').toHaveCount(1);
  await expect(hostileRow.locator('.company-row-name')).toHaveText(HOSTILE_NAME);
  expect(await page.locator('#companies-list img').count(),
    'no <img> element in the list').toBe(0);
  const pwned = await page.evaluate(() =>
    (window.__pwned === undefined ? 'undefined' : String(window.__pwned)));
  expect(pwned, 'the hostile name never executes').toBe('undefined');

  // ── AC-1: Edit opens the modal with that company's values ──────────────
  await editBtn.click();
  await expect(page.locator('#modal-overlay')).toBeVisible();
  await expect(page.locator('#modal-title')).toHaveText('Edit Company');
  await expect(page.locator('#company-name')).toHaveValue('Fullfield Systems');
  await expect(page.locator('#company-website')).toHaveValue('https://fullfield.example.com');
  await expect(page.locator('#company-industry')).toHaveValue('Industrial software');
  await expect(page.locator('#company-employee_count')).toHaveValue('1250');
  await page.evaluate(() => { App.closeModal(); });
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── Review defect: the row buttons are actually wired — a second
  //    row's Edit resolves THAT company's values (the handler reads the
  //    clicked row's id, not a stale one) ────────────────
  await smallRow.locator('button.card-action-btn[data-action="edit"]').click();
  await expect(page.locator('#modal-title')).toHaveText('Edit Company');
  await expect(page.locator('#company-name')).toHaveValue('Small Co');
  await expect(page.locator('#company-website')).toHaveValue('');
  await expect(page.locator('#company-industry')).toHaveValue('Coffee');
  await expect(page.locator('#company-employee_count')).toHaveValue('250');
  await page.evaluate(() => { App.closeModal(); });
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: Delete sends the delete for the right id after the
  //    confirmation is accepted ────────────────────────────────────────────
  const deleteCallsBefore = calls.filter((c) => c.method === 'DELETE').length;
  await bareRow.locator('button.card-action-btn[data-action="delete"]').click();
  await expect.poll(
    () => calls.filter((c) => c.method === 'DELETE' && /\/companies\/co-2/.test(c.url)).length,
    { timeout: 10000 }).toBeGreaterThan(deleteCallsBefore);

  // ── AC-1: the long-name/long-website row stays one line, >= 52 px, with
  //    the buttons inside the row's right edge ─────────────────────────────
  const longMetrics = await page.evaluate(() => {
    const long = document.querySelector('#companies-list .contact-card[data-company-id="co-3"]');
    const bare = document.querySelector('#companies-list .contact-card[data-company-id="co-2"]');
    const name = long.querySelector('.company-row-name');
    const website = long.querySelector('.company-row-website');
    const del = long.querySelector('.card-action-btn[data-action="delete"]');
    const lr = long.getBoundingClientRect();
    return {
      longHeight: lr.height,
      bareHeight: bare.getBoundingClientRect().height,
      nameOneline: name.scrollHeight <= name.clientHeight + 1,
      websiteOneline: website.scrollHeight <= website.clientHeight + 1,
      nameEllipsis: name.scrollWidth > name.clientWidth,
      websiteEllipsis: website.scrollWidth > website.clientWidth,
      nameOverflow: getComputedStyle(name).textOverflow,
      websiteOverflow: getComputedStyle(website).textOverflow,
      deleteInside: del.getBoundingClientRect().right <= lr.right + 1,
    };
  });
  expect(longMetrics.longHeight, 'the row is at least 52 px tall').toBeGreaterThanOrEqual(52);
  expect(Math.abs(longMetrics.longHeight - longMetrics.bareHeight) <= 1,
    'the row stays on one line (same height as the one-line row)').toBe(true);
  expect(longMetrics.nameOneline, 'the long name is one line').toBe(true);
  expect(longMetrics.websiteOneline, 'the long website is one line').toBe(true);
  expect(longMetrics.nameEllipsis, 'the long name is cut').toBe(true);
  expect(longMetrics.websiteEllipsis, 'the long website is cut').toBe(true);
  expect(longMetrics.nameOverflow, 'the long name is cut with an ellipsis').toBe('ellipsis');
  expect(longMetrics.websiteOverflow, 'the long website is cut with an ellipsis')
    .toBe('ellipsis');
  expect(longMetrics.deleteInside, 'the buttons stay inside the row').toBe(true);

  // ── AC-1: with no companies a centred empty state reads
  //    "No companies found." ───────────────────────────────────────────────
  const emptyPage = await page.context().newPage();
  const emptyErrors = [];
  emptyPage.on('pageerror', (e) => emptyErrors.push(String(e)));
  await boot(emptyPage, ADMIN_TOKEN, []);
  await emptyPage.setViewportSize({ width: 1440, height: 900 });
  await emptyPage.evaluate(() => { location.hash = '#/companies'; });
  await emptyPage.waitForFunction(
    () => {
      const el = document.querySelector('#companies-list .empty-state-card p');
      return el && el.textContent.trim() === 'No companies found.';
    }, { timeout: 30000 });
  expect(await emptyPage.locator('#companies-list .contact-card').count(),
    'no rows with no companies').toBe(0);
  const centered = await emptyPage.evaluate(() => {
    const list = document.getElementById('companies-list');
    const el = list.querySelector('.empty-state-card p');
    const lr = list.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
      listHeight: lr.height,
      deltaX: (er.left + er.right) / 2 - (lr.left + lr.right) / 2,
      deltaY: (er.top + er.bottom) / 2 - (lr.top + lr.bottom) / 2,
    };
  });
  expect(centered.listHeight, 'the list region is laid out').toBeGreaterThan(200);
  expect(Math.abs(centered.deltaX), 'the empty state is centred horizontally')
    .toBeLessThanOrEqual(2);
  expect(Math.abs(centered.deltaY), 'the empty state is centred vertically')
    .toBeLessThanOrEqual(2);
  await emptyPage.close();

  // ── AC-1: a failed load shows the message without the warning emoji ────
  const errorPage = await page.context().newPage();
  const errorErrors = [];
  errorPage.on('pageerror', (e) => errorErrors.push(String(e)));
  await boot(errorPage, ADMIN_TOKEN, [], { companyError: LOAD_ERROR });
  await errorPage.setViewportSize({ width: 1440, height: 900 });
  await errorPage.evaluate(() => { location.hash = '#/companies'; });
  await errorPage.waitForFunction((msg) => {
    const el = document.querySelector('#companies-list .empty-state-card p');
    return el && el.textContent.includes(msg);
  }, LOAD_ERROR, { timeout: 30000 });
  const errorText = await errorPage.evaluate(() =>
    document.getElementById('companies-list').textContent);
  expect(errorText.includes(LOAD_ERROR), 'the failed-load message is shown').toBe(true);
  expect(EMOJI_RE.test(errorText), 'no emoji in the failed-load message').toBe(false);
  await errorPage.close();

  // ── Review defect: a whitespace-only employeeCount renders no
  //    element — never "0 employees" ──────────────────────────
  const wsPage = await page.context().newPage();
  const wsErrors = [];
  wsPage.on('pageerror', (e) => wsErrors.push(String(e)));
  await boot(wsPage, ADMIN_TOKEN, [
    { id: 'co-ws', name: 'Whitespace Inc', website: null, industry: null,
      employee_count: '   ', created_at: null },
  ]);
  await wsPage.setViewportSize({ width: 1440, height: 900 });
  await wsPage.evaluate(() => { location.hash = '#/companies'; });
  await wsPage.waitForFunction(
    () => document.querySelectorAll('#companies-list .contact-card').length === 1,
    { timeout: 30000 });
  const wsRow = await wsPage.evaluate(() => {
    const row = document.querySelector('#companies-list .contact-card[data-company-id="co-ws"]');
    const nameEl = row ? row.querySelector('.company-row-name') : null;
    return {
      name: nameEl ? nameEl.textContent : null,
      hasEmployeesEl: !!(row && row.querySelector('.company-row-employees')),
      listText: document.getElementById('companies-list').textContent,
    };
  });
  expect(wsRow.name, 'the row still renders its name').toBe('Whitespace Inc');
  expect(wsRow.hasEmployeesEl,
    'a whitespace-only employeeCount has no element').toBe(false);
  expect(/0 employees/.test(wsRow.listText), 'never "0 employees"').toBe(false);
  expect(/undefined/.test(wsRow.listText), 'no "undefined" in the list').toBe(false);
  expect(/\bnull\b/.test(wsRow.listText), 'no "null" in the list').toBe(false);
  expect(/Invalid Date/.test(wsRow.listText), 'no "Invalid Date" in the list').toBe(false);
  await wsPage.close();

  // ── AC-1: at 1440x900 with 300 companies, neither the document nor the
  //    content region scrolls — only #companies-list does ─────────────────
  const manyPage = await page.context().newPage();
  const manyErrors = [];
  manyPage.on('pageerror', (e) => manyErrors.push(String(e)));
  await boot(manyPage, ADMIN_TOKEN, makeCompanies(300));
  await manyPage.setViewportSize({ width: 1440, height: 900 });
  await manyPage.evaluate(() => { location.hash = '#/companies'; });
  await manyPage.waitForFunction(
    () => document.querySelectorAll('#companies-list .contact-card').length === 300,
    { timeout: 60000 });
  const scrollState = await manyPage.evaluate(() => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const list = document.getElementById('companies-list');
    return {
      docVertical: de.scrollHeight > de.clientHeight,
      docHorizontal: de.scrollWidth > de.clientWidth,
      regionVertical: region.scrollHeight > region.clientHeight,
      regionHorizontal: region.scrollWidth > region.clientWidth,
      listScrolls: list.scrollHeight > list.clientHeight,
      listHeight: list.clientHeight,
    };
  });
  expect(scrollState.docVertical, 'no document scroll at 1440x900').toBe(false);
  expect(scrollState.docHorizontal, 'no horizontal document scroll at 1440x900')
    .toBe(false);
  expect(scrollState.regionVertical, 'no content-region scroll at 1440x900')
    .toBe(false);
  expect(scrollState.regionHorizontal, 'no horizontal content-region scroll')
    .toBe(false);
  expect(scrollState.listScrolls, '#companies-list scrolls on its own').toBe(true);
  expect(scrollState.listHeight, '#companies-list is laid out').toBeGreaterThan(100);
  await manyPage.close();

  // ── AC-1: at 390x844 the website is hidden and the page does not scroll
  //    horizontally ────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate(() => {
    const website = document.querySelector(
      '#companies-list .contact-card[data-company-id="co-1"] .company-row-website');
    const de = document.documentElement;
    window.scrollTo(100, 0);
    const scrolledX = window.scrollX > 0;
    window.scrollTo(0, 0);
    return {
      websiteDisplay: website ? getComputedStyle(website).display : 'missing',
      docHorizontal: de.scrollWidth > de.clientWidth,
      scrolledX,
    };
  });
  expect(narrow.websiteDisplay, 'the website is hidden at <= 900 px').toBe('none');
  expect(narrow.docHorizontal, 'no horizontal page scroll at 390x844').toBe(false);
  expect(narrow.scrolledX, 'the page cannot be scrolled sideways at 390x844')
    .toBe(false);

  // ── Review defect: logging out hides the admin-only company
  //    actions (the rows' Edit/Delete and "Add company") without a reload,
  //    while the rows keep rendering ───────────────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click('#auth-status'); // confirm('Log out?') is auto-accepted
  await page.waitForFunction(
    () => typeof Auth !== 'undefined' && !Auth.isAuthenticated(),
    { timeout: 10000 });
  const afterLogout = await page.evaluate(() => {
    const visibleAdminOnly = Array.from(
      document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null);
    const visibleRowActions = Array.from(
      document.querySelectorAll('#companies-list .card-action-btn'))
      .filter((el) => el.offsetParent !== null);
    const name = document.querySelector(
      '#companies-list .contact-card[data-company-id="co-1"] .company-row-name');
    return {
      visibleAdminOnly: visibleAdminOnly.map((el) => el.id || el.className),
      visibleRowActions: visibleRowActions.length,
      rowsStillRender: name ? name.offsetParent !== null : false,
    };
  });
  expect(afterLogout.rowsStillRender, 'the rows still render after logout')
    .toBe(true);
  expect(afterLogout.visibleRowActions,
    "logout hides the rows' Edit/Delete actions").toBe(0);
  expect(afterLogout.visibleAdminOnly,
    'logout hides every visible admin-only control, incl. "Add company"')
    .toEqual([]);
  await expect(page.locator('#btn-add-company')).toBeHidden();

  // ── AC-1: the new styles use tokens only — no raw colour values in
  //    css/companies.css ───────────────────────────────────────────────────
  const companiesCss = fs.readFileSync(
    path.resolve(__dirname, '..', 'css', 'companies.css'), 'utf8');
  const cssCode = companiesCss.replace(/\/\*[\s\S]*?\*\//g, '');
  expect(cssCode.match(/#[0-9a-fA-F]{3,8}\b/g) || [], 'no raw hex colours')
    .toEqual([]);
  expect(cssCode.match(/\brgba?\(|\bhsla?\(/g) || [], 'no raw rgb()/hsl() colours')
    .toEqual([]);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(emptyErrors, `empty-page errors: ${emptyErrors.join(' | ')}`).toEqual([]);
  expect(errorErrors, `error-page errors: ${errorErrors.join(' | ')}`).toEqual([]);
  expect(manyErrors, `many-page errors: ${manyErrors.join(' | ')}`).toEqual([]);
  expect(wsErrors, `whitespace-page errors: ${wsErrors.join(' | ')}`).toEqual([]);
});

test('issue344 freeform (viewer)', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  // Identity: the same production boot, but NON-ADMIN (role 'user').
  const calls = await boot(page, VIEWER_TOKEN, COMPANIES);
  await page.setViewportSize({ width: 1440, height: 900 });

  const roles = await page.evaluate(() => (Auth.getCurrentUser() || {}).roles);
  expect(roles, 'the viewer pass runs as a NON-ADMIN (role "user")').toEqual(['user']);
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + VIEWER_TOKEN),
    { timeout: 10000 }).toBe(true);

  // The page still renders: the rows are there, with every value.
  await page.evaluate(() => { location.hash = '#/companies'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#companies-list .contact-card').length === 5,
    { timeout: 20000 });
  await expect(page.locator('#page-title')).toHaveText('Companies');
  await expect(page.locator('#companies-list .contact-card'))
    .toHaveCount(5);
  await expect(
    page.locator('#companies-list .contact-card[data-company-id="co-1"] .company-row-name'))
    .toHaveText('Fullfield Systems');
  await expect(
    page.locator('#companies-list .contact-card[data-company-id="co-1"] .company-row-employees'))
    .toHaveText('1,250 employees');

  // The admin-only controls are absent: no Edit/Delete on the rows and no
  // visible "Add company".
  expect(await page.locator('#companies-list .card-action-btn').count(),
    'a non-admin sees no Edit or Delete buttons').toBe(0);
  await expect(page.locator('#btn-add-company'),
    'a non-admin sees no "Add company"').toBeHidden();
  const adminOnlyVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.className));
  expect(adminOnlyVisible, 'no admin-only control may be visible to a non-admin')
    .toEqual([]);

  // A full reload keeps the viewer role, reopens the hash route, and the
  // admin-only controls stay absent while the page still renders.
  await page.reload();
  await page.waitForFunction(
    () => Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'the reload keeps the NON-ADMIN role').toEqual(['user']);
  await page.waitForFunction(
    () => document.querySelectorAll('#companies-list .contact-card').length === 5,
    { timeout: 20000 });
  await expect(page.locator('#page-companies.active')).toBeVisible();
  await expect(page.locator('#page-title')).toHaveText('Companies');
  await expect(
    page.locator('#companies-list .contact-card[data-company-id="co-1"] .company-row-name'))
    .toHaveText('Fullfield Systems');
  expect(await page.locator('#companies-list .card-action-btn').count(),
    'after reload, a non-admin still sees no Edit or Delete buttons').toBe(0);
  await expect(page.locator('#btn-add-company'),
    'after reload, a non-admin still sees no "Add company"').toBeHidden();

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
