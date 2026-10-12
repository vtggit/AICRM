// Proof for issue #313 — the Contacts page (#page-contacts) is a split pane.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  The list pane (left, #contacts-list) holds one compact row per
//         contact — each row keeps the class contact-card and its
//         data-contact-id and shows the name, company, status and the tag
//         badges — and scrolls on its own. The selected row is tinted and
//         carries aria-current="true". The detail pane (right,
//         --detail-width) is #contact-detail-pane and shows the selected
//         contact's detail — the content "view contact" shows in the modal
//         today — without opening the modal. The first contact is selected
//         when the page opens; clicking a row selects it. "Email" shows the
//         existing email form (#contact-email-form, with every existing
//         #contact-email-* element) inside the detail pane, not in the
//         modal; Cancel returns the pane to the detail. With no contacts
//         the pane shows a centred empty state. One toolbar bar above the
//         panes holds the existing controls with their ids and their
//         data-admin-only gating, and their labels have no emoji. The bulk
//         action bar (#bulk-action-bar and its controls) shows above the
//         list while rows are selected. The add/edit contact, manage tags,
//         find duplicates and imports modals are kept. At 1440x900 with 200
//         mocked contacts neither the document nor the content region
//         scrolls — only the list pane (and, when needed, the detail pane)
//         does. At 900 px and below the panes stack, with no horizontal
//         page scroll at 390x844. Every existing element id on the page
//         stays, and API values still pass through the escaping helpers
//         (a hostile contact name renders as text in the row and the
//         detail, without executing). Colours, radii and spacing of the new
//         styles come from css/tokens.css — no raw colour values in
//         css/contacts.css.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the admin-only controls are absent
// while the page still renders.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// Emoji ranges: pictographs/symbols, arrows, misc technical, VS-16.
const EMOJI_SRC = '[\\u{1F000}-\\u{1FAFF}\\u{2190}-\\u{2BFF}\\u{2300}-\\u{23FF}\\uFE0F]';
const EMOJI_RE = new RegExp(EMOJI_SRC, 'u');

// Hostile, user-controllable contact name: unescaped, it would inject an
// <img> element whose onerror handler sets window.__pwned.
const HOSTILE_NAME = '<img src=x onerror=window.__pwned=1>';

// Every element id the Contacts page must keep (issue #313 "kept" clause).
const KEPT_IDS = [
  'page-contacts',
  'btn-add-contact', 'btn-manage-tags', 'btn-export-csv',
  'btn-import-csv', 'btn-import-vcard', 'btn-find-duplicates',
  'contact-filter-status', 'contact-sort',
  'csv-file-input', 'vcard-file-input',
  'contacts-list', 'contact-detail-pane',
  'bulk-action-bar', 'bulk-selection-count',
  'btn-select-all', 'btn-select-none',
  'bulk-status-change', 'btn-bulk-status',
  'bulk-tag-select', 'btn-bulk-tag', 'btn-bulk-delete',
];
const ADMIN_ONLY_IDS = ['btn-add-contact', 'btn-manage-tags', 'btn-import-csv', 'btn-import-vcard'];
const TOOLBAR_BUTTON_IDS = ['btn-add-contact', 'btn-manage-tags', 'btn-export-csv',
  'btn-import-csv', 'btn-import-vcard', 'btn-find-duplicates'];

function makeContacts(n, opts = {}) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const day = (i % 9) + 1;
    out.push({
      id: i === 1 && opts.xss ? 'c-xss' : 'c-' + String(i).padStart(3, '0'),
      name: i === 1 && opts.xss ? HOSTILE_NAME : 'Contact ' + String(i).padStart(3, '0'),
      email: 'contact' + i + '@example.com',
      phone: i % 3 === 0 ? '+1 555 01' + String(i).padStart(2, '0') : null,
      company: i % 2 === 0 ? 'Acme Corp' : null,
      status: i % 7 === 0 ? 'vip' : 'active',
      notes: null,
      tags: i % 10 === 0 ? [{ id: 'tag-vip', name: 'Vip', color: '#3b82f6' }] : [],
      created_at: '2026-01-0' + day + 'T08:00:00Z',
      updated_at: '2026-01-0' + day + 'T08:00:00Z',
    });
  }
  return out;
}

function makeActivities(contacts) {
  // A couple of activities for the second contact, so the detail pane's
  // timeline has content.
  return [
    { id: 'act-1', type: 'call', description: 'Intro call', contact_name: 'Contact 002', occurred_at: '2026-09-01T10:00:00Z', status: 'done' },
    { id: 'act-2', type: 'email', description: 'Follow-up email', contact_name: 'Contact 002', occurred_at: '2026-09-02T11:00:00Z', status: 'done' },
  ];
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * Returns the recorded API calls (method, url, authorization header).
 */
async function boot(page, token, data) {
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
  const pageSlice = (list, url) => {
    const u = new URL(url);
    const limit = Math.max(1, parseInt(u.searchParams.get('limit') || String(list.length), 10) || list.length);
    const offset = Math.max(0, parseInt(u.searchParams.get('offset') || '0', 10) || 0);
    return list.slice(offset, offset + limit);
  };
  const dupContacts = data.contacts.slice(0, 2).map((c) => ({
    name: c.name, email: c.email, phone: c.phone, company: c.company,
    created_at: c.created_at,
  }));
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
    // Sub-routes before the generic /contacts match.
    if (/\/contacts\/duplicates/.test(url)) return json({
      totalGroups: 1,
      totalDuplicates: dupContacts.length,
      groups: [{ groupId: 1, matchType: 'email', contacts: dupContacts }],
    });
    if (/\/contacts\/[^/]+\/send-email$/.test(url)) return json({ status: 'accepted' }, 202);
    if (/\/contacts(\b|\?|$)/.test(url)) return json(pageSlice(data.contacts, url));
    if (/\/suppressions\/may-send/.test(url)) return json({ may_send: true, reasons: [] });
    if (/\/activities(\b|\?|$)/.test(url)) return json(pageSlice(data.activities, url));
    if (/\/leads(\b|\?|$)/.test(url)) return json([]);
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

test('issue313 freeform', async ({ page }) => {
  test.setTimeout(180000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  // 200 mocked contacts, one of them named <img src=x onerror=...>.
  const contacts = makeContacts(200, { xss: true });
  const calls = await boot(page, ADMIN_TOKEN, { contacts, activities: makeActivities(contacts) });
  await page.setViewportSize({ width: 1440, height: 900 });

  // The production boot sent the hash token as a Bearer header.
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + ADMIN_TOKEN),
    { timeout: 10000 }).toBe(true);

  // ── AC-1: open the Contacts page; the first contact is selected ────────
  await page.evaluate(() => { location.hash = '#/contacts'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 200,
    { timeout: 30000 });
  await page.waitForFunction(
    () => !!document.querySelector('#contact-detail-pane .contact-detail-view'),
    { timeout: 30000 });

  // The rows keep their class and data-contact-id.
  const firstRow = page.locator('#contacts-list .contact-card').first();
  await expect(firstRow).toHaveAttribute('data-contact-id');
  const firstRowId = await firstRow.getAttribute('data-contact-id');
  expect(firstRowId, 'the first row keeps its data-contact-id').toBeTruthy();
  expect(firstRowId, 'the row id round-trips a real contact id')
    .toMatch(/^c-(xss|\d{3})$/);

  // Exactly one selected row, and it is the first one; it is tinted and
  // carries aria-current="true".
  await expect(firstRow).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#contacts-list .contact-card[aria-current="true"]'))
    .toHaveCount(1);
  const tints = await page.evaluate(() => {
    const rows = document.querySelectorAll('#contacts-list .contact-card');
    const cs = (el) => getComputedStyle(el);
    return {
      selectedBg: cs(rows[0]).backgroundColor,
      selectedShadow: cs(rows[0]).boxShadow,
      otherBg: rows[1] ? cs(rows[1]).backgroundColor : '',
    };
  });
  expect(tints.selectedBg, 'the selected row is tinted (not the plain surface)')
    .not.toBe('rgb(255, 255, 255)');
  expect(tints.selectedShadow, 'the selected row carries the accent bar')
    .toContain('inset');
  expect(tints.otherBg, 'unselected rows keep the plain surface').toBe('rgb(255, 255, 255)');

  // The detail pane shows the selected contact's detail — the content
  // "view contact" shows in the modal — without opening the modal.
  const firstName = (await firstRow.locator('h4').textContent()).trim();
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText(firstName);
  await expect(page.locator('#contact-detail-pane .contact-detail-view .badge')).toBeVisible();
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: the rows show the name, company, status and the tag badges ──
  const row10 = page.locator('#contacts-list .contact-card:has(h4:text-is("Contact 010"))');
  await expect(row10, 'the "Contact 010" row renders').toHaveCount(1);
  await expect(row10.locator('h4')).toHaveText('Contact 010');
  await expect(row10.locator('.card-body p', { hasText: 'Acme Corp' })).toBeVisible();
  await expect(row10.locator('.badge', { hasText: /^active$/ })).toBeVisible();
  await expect(row10.locator('.contact-tag-badge', { hasText: 'Vip' })).toBeVisible();

  // ── AC-1: one toolbar bar above the panes; existing controls, ids and
  //    data-admin-only gating kept; labels without emoji ──────────────────
  const toolbar = await page.evaluate(() => {
    const bar = document.querySelector('#page-contacts .page-actions');
    return {
      buttons: Array.from(bar.querySelectorAll('button')).map((b) => ({
        id: b.id,
        label: b.textContent.trim(),
        adminOnly: b.getAttribute('data-admin-only'),
      })),
      selects: Array.from(bar.querySelectorAll('select')).map((s) => s.id),
      barTop: bar.getBoundingClientRect().top,
      splitTop: document.getElementById('contacts-split').getBoundingClientRect().top,
    };
  });
  expect(toolbar.buttons.map((b) => b.id).sort(), 'the toolbar keeps its buttons')
    .toEqual([...TOOLBAR_BUTTON_IDS].sort());
  expect(toolbar.selects.sort(), 'the toolbar keeps its selects')
    .toEqual(['contact-filter-status', 'contact-sort']);
  for (const b of toolbar.buttons) {
    expect(EMOJI_RE.test(b.label), `no emoji in the toolbar label "${b.label}"`).toBe(false);
  }
  for (const id of ADMIN_ONLY_IDS) {
    expect(toolbar.buttons.find((b) => b.id === id).adminOnly,
      `#${id} keeps its data-admin-only gating`).toBe('true');
  }
  for (const id of ['btn-export-csv', 'btn-find-duplicates']) {
    expect(toolbar.buttons.find((b) => b.id === id).adminOnly,
      `#${id} is not admin-only`).toBe(null);
  }
  expect(toolbar.barTop < toolbar.splitTop, 'the toolbar bar sits above the panes').toBe(true);

  // ── AC-1: clicking another row selects it and switches the detail ──────
  const secondRow = page.locator('#contacts-list .contact-card').nth(1);
  const secondName = (await secondRow.locator('h4').textContent()).trim();
  await secondRow.locator('h4').click();
  await expect(secondRow).toHaveAttribute('aria-current', 'true');
  await expect(firstRow).not.toHaveAttribute('aria-current');
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText(secondName);
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: "Email" shows the existing email form inside the detail pane,
  //    not in the modal; Cancel returns the pane to the detail ────────────
  await page.locator('#contact-detail-pane #contact-email-btn').click();
  await expect(page.locator('#contact-detail-pane #contact-email-form'))
    .toBeVisible();
  for (const id of ['contact-email-recipient', 'contact-email-subject', 'contact-email-body',
                    'contact-email-cancel', 'contact-email-send']) {
    await expect(page.locator('#' + id), `#${id} is present in the pane`).toBeVisible();
  }
  const recipient = await page.locator('#contact-email-recipient').inputValue();
  expect(recipient, 'the recipient value passes through the escaping helpers')
    .toMatch(/@example\.com$/);
  await expect(page.locator('#modal-overlay'), 'the email form does not open the modal')
    .toBeHidden();
  await page.locator('#contact-email-cancel').click();
  await expect(page.locator('#contact-detail-pane .contact-detail-view'))
    .toBeVisible();
  await expect(page.locator('#contact-email-form')).toHaveCount(0);
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText(secondName);

  // ── AC-1: the kept modals (add, manage tags, find duplicates) ──────────
  await page.locator('#btn-add-contact').click();
  await expect(page.locator('#modal-overlay')).toBeVisible();
  await expect(page.locator('#modal-overlay #contact-form')).toBeVisible();
  await expect(page.locator('#modal-title')).toHaveText('Add Contact');
  await page.evaluate(() => App.closeModal());
  await expect(page.locator('#modal-overlay')).toBeHidden();

  await page.locator('#btn-manage-tags').click();
  await expect(page.locator('#modal-overlay')).toBeVisible();
  await expect(page.locator('#modal-overlay .tags-manager')).toBeVisible();
  await page.evaluate(() => App.closeModal());
  await expect(page.locator('#modal-overlay')).toBeHidden();

  await page.locator('#btn-find-duplicates').click();
  await expect(page.locator('#modal-overlay')).toBeVisible();
  await expect(page.locator('#modal-overlay .duplicate-group')).toHaveCount(1);
  await page.evaluate(() => App.closeModal());
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: the bulk action bar shows above the list while rows are
  //    selected, and hides again ───────────────────────────────────────────
  await expect(page.locator('#bulk-action-bar')).toBeHidden();
  await firstRow.locator('.contact-checkbox').check();
  await expect(page.locator('#bulk-action-bar')).toBeVisible();
  const bulkPos = await page.evaluate(() => {
    const bar = document.getElementById('bulk-action-bar').getBoundingClientRect();
    const list = document.getElementById('contacts-list').getBoundingClientRect();
    return { barBottom: bar.bottom, listTop: list.top };
  });
  expect(bulkPos.barBottom <= bulkPos.listTop + 1,
    'the bulk action bar shows above the list').toBe(true);
  await expect(page.locator('#bulk-selection-count')).toHaveText('1');
  for (const id of ['bulk-selection-count', 'btn-select-all', 'btn-select-none',
                    'bulk-status-change', 'btn-bulk-status', 'bulk-tag-select',
                    'btn-bulk-tag', 'btn-bulk-delete']) {
    await expect(page.locator('#' + id), `the bulk bar keeps #${id}`).toBeVisible();
  }
  const bulkLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#bulk-action-bar button'))
      .map((b) => b.textContent.trim()));
  for (const label of bulkLabels) {
    expect(EMOJI_RE.test(label), `no emoji in the bulk bar label "${label}"`).toBe(false);
  }
  await firstRow.locator('.contact-checkbox').uncheck();
  await expect(page.locator('#bulk-action-bar')).toBeHidden();

  // ── AC-1: a hostile contact name renders as text in the row and the
  //    detail, without executing ───────────────────────────────────────────
  const hostileRow = page.locator('#contacts-list .contact-card:has(h4:text-is("' + HOSTILE_NAME + '"))');
  await expect(hostileRow, 'the hostile row renders as a row').toHaveCount(1);
  expect(await hostileRow.locator('h4').textContent()).toBe(HOSTILE_NAME);
  expect(await hostileRow.locator('img').count(), 'no <img> element in the hostile row').toBe(0);
  await hostileRow.locator('h4').click();
  await expect(hostileRow).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText(HOSTILE_NAME);
  expect(await page.locator('#contact-detail-pane img').count(),
    'no <img> element in the detail pane').toBe(0);
  const pwned = await page.evaluate(() =>
    (window.__pwned === undefined ? 'undefined' : String(window.__pwned)));
  expect(pwned, 'the hostile name never executes').toBe('undefined');

  // ── AC-1: every existing element id on the page stays ──────────────────
  for (const id of KEPT_IDS) {
    await expect(page.locator('#' + id), `#${id} is kept`).toHaveCount(1);
  }

  // ── AC-1: the new styles use tokens only — no raw colour values in
  //    css/contacts.css ───────────────────────────────────────────────────
  const contactsCss = fs.readFileSync(
    path.resolve(__dirname, '..', 'css', 'contacts.css'), 'utf8');
  const cssCode = contactsCss.replace(/\/\*[\s\S]*?\*\//g, '');
  expect(cssCode.match(/#[0-9a-fA-F]{3,8}\b/g) || [], 'no raw hex colours')
    .toEqual([]);
  expect(cssCode.match(/\brgba?\(|\bhsla?\(/g) || [], 'no raw rgb()/hsl() colours')
    .toEqual([]);

  // ── AC-1: at 1440x900 with 200 contacts, neither the document nor the
  //    content region scrolls; only the list pane does ────────────────────
  const scrollState = await page.evaluate(() => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const list = document.getElementById('contacts-list');
    return {
      docVertical: de.scrollHeight > de.clientHeight,
      docHorizontal: de.scrollWidth > de.clientWidth,
      regionVertical: region.scrollHeight > region.clientHeight,
      regionHorizontal: region.scrollWidth > region.clientWidth,
      listScrolls: list.scrollHeight > list.clientHeight,
      listHeight: list.clientHeight,
      paneWidth: document.getElementById('contact-detail-pane').getBoundingClientRect().width,
    };
  });
  expect(scrollState.docVertical, 'no document scroll at 1440x900').toBe(false);
  expect(scrollState.docHorizontal, 'no horizontal document scroll at 1440x900')
    .toBe(false);
  expect(scrollState.regionVertical, 'no content-region scroll at 1440x900')
    .toBe(false);
  expect(scrollState.regionHorizontal, 'no horizontal content-region scroll')
    .toBe(false);
  expect(scrollState.listScrolls, 'the list pane scrolls on its own').toBe(true);
  expect(scrollState.listHeight, 'the list pane is laid out').toBeGreaterThan(100);
  expect(scrollState.paneWidth, 'the detail pane is --detail-width (440 px)')
    .toBeCloseTo(440, 0);

  // ── AC-1: at 390x844 the panes stack and the page does not scroll
  //    horizontally ───────────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const stacked = await page.evaluate(() => {
    const list = document.getElementById('contacts-list').getBoundingClientRect();
    const pane = document.getElementById('contact-detail-pane').getBoundingClientRect();
    const de = document.documentElement;
    window.scrollTo(100, 0);
    const scrolledX = window.scrollX > 0;
    window.scrollTo(0, 0);
    return {
      paneBelowList: pane.top >= list.bottom - 1,
      docHorizontal: de.scrollWidth > de.clientWidth,
      scrolledX,
    };
  });
  expect(stacked.paneBelowList, 'at <= 900 px the panes stack').toBe(true);
  expect(stacked.docHorizontal, 'no horizontal page scroll at 390x844').toBe(false);
  expect(stacked.scrolledX, 'the page cannot be scrolled sideways at 390x844')
    .toBe(false);

  // ── AC-1: with no contacts the pane shows a centred empty state ────────
  const emptyPage = await page.context().newPage();
  const emptyErrors = [];
  emptyPage.on('pageerror', (e) => emptyErrors.push(String(e)));
  await boot(emptyPage, ADMIN_TOKEN, { contacts: [], activities: [] });
  await emptyPage.setViewportSize({ width: 1440, height: 900 });
  await emptyPage.evaluate(() => { location.hash = '#/contacts'; });
  await emptyPage.waitForFunction(() => {
    const list = document.getElementById('contacts-list');
    return list && list.textContent.includes('No contacts found.');
  }, { timeout: 30000 });
  await emptyPage.waitForFunction(
    () => {
      const el = document.querySelector('#contact-detail-pane .contact-pane-empty');
      return el && el.querySelector('h3');
    }, { timeout: 10000 });
  expect(await emptyPage.locator('#contacts-list .contact-card').count(),
    'no rows with no contacts').toBe(0);
  await expect(emptyPage.locator('#contact-detail-pane .contact-pane-empty h3'))
    .toHaveText('No contact selected');
  const centered = await emptyPage.evaluate(() => {
    const pane = document.getElementById('contact-detail-pane');
    const el = pane.querySelector('.contact-pane-empty');
    const pr = pane.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
      paneHeight: pr.height,
      elHeight: er.height,
      deltaX: (er.left + er.right) / 2 - (pr.left + pr.right) / 2,
      deltaY: (er.top + er.bottom) / 2 - (pr.top + pr.bottom) / 2,
    };
  });
  expect(centered.paneHeight, 'the detail pane is laid out').toBeGreaterThan(200);
  expect(Math.abs(centered.deltaX), 'the empty state is centred horizontally')
    .toBeLessThanOrEqual(2);
  expect(Math.abs(centered.deltaY), 'the empty state is centred vertically')
    .toBeLessThanOrEqual(2);
  await emptyPage.close();

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(emptyErrors, `empty-page errors: ${emptyErrors.join(' | ')}`).toEqual([]);
});

test('issue313 freeform (viewer)', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  // Identity: the same production boot, but NON-ADMIN (role 'user').
  const contacts = makeContacts(3);
  const calls = await boot(page, VIEWER_TOKEN, { contacts, activities: [] });
  await page.setViewportSize({ width: 1440, height: 900 });

  const roles = await page.evaluate(() => (Auth.getCurrentUser() || {}).roles);
  expect(roles, 'the viewer pass runs as a NON-ADMIN (role "user")').toEqual(['user']);
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + VIEWER_TOKEN),
    { timeout: 10000 }).toBe(true);

  // The page still renders: the contacts page opens with the first contact
  // selected and its detail in the detail pane.
  await page.evaluate(() => { location.hash = '#/contacts'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 3,
    { timeout: 20000 });
  await page.waitForFunction(
    () => !!document.querySelector('#contact-detail-pane .contact-detail-view'),
    { timeout: 20000 });
  await expect(page.locator('#page-title')).toHaveText('Contacts');
  await expect(page.locator('#contacts-list .contact-card').first())
    .toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3')).toBeVisible();

  // The admin-only controls are absent while the rest of the toolbar stays.
  for (const id of ADMIN_ONLY_IDS) {
    await expect(page.locator('#' + id), `#${id} is hidden for a non-admin`).toBeHidden();
  }
  const adminOnlyVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.className));
  expect(adminOnlyVisible, 'no admin-only control may be visible to a non-admin')
    .toEqual([]);
  await expect(page.locator('#btn-export-csv')).toBeVisible();
  await expect(page.locator('#btn-find-duplicates')).toBeVisible();
  await expect(page.locator('#contact-filter-status')).toBeVisible();
  await expect(page.locator('#contact-sort')).toBeVisible();

  // A full reload keeps the viewer role, reopens the hash route, and the
  // admin-only controls stay absent while the page still renders.
  await page.reload();
  await page.waitForFunction(
    () => Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'the reload keeps the NON-ADMIN role')
    .toEqual(['user']);
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 3,
    { timeout: 20000 });
  await page.waitForFunction(
    () => !!document.querySelector('#contact-detail-pane .contact-detail-view'),
    { timeout: 20000 });
  await expect(page.locator('#page-contacts.active')).toBeVisible();
  await expect(page.locator('#page-title')).toHaveText('Contacts');
  await expect(page.locator('#contacts-list .contact-card').first())
    .toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#btn-add-contact')).toBeHidden();
  await expect(page.locator('#btn-manage-tags')).toBeHidden();
  await expect(page.locator('#btn-import-csv')).toBeHidden();
  await expect(page.locator('#btn-import-vcard')).toBeHidden();

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
