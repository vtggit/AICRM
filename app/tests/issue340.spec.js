// Issue #340 — the Leads list rows show the email and the created date.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  Each list row (.lead-card) shows, left to right: name, company,
//         the muted email (.lead-row-email), value, stage badge, score
//         badge, the muted created date (.lead-row-created) in the page's
//         formatDate form (e.g. "Oct 12, 2026"), then the word-labelled
//         Edit and Delete buttons. A lead with no email has no
//         .lead-row-email; a lead with no created date has no
//         .lead-row-created; the list shows no "Invalid Date" or
//         "undefined" text. A 120-character email at 1440x900 stays one
//         line, is cut with an ellipsis (its box narrower than its text,
//         never wrapped), and the row keeps its >= 52 px height with the
//         Edit and Delete buttons inside the row's right edge. At
//         1440x900 with 300 leads neither the document nor the content
//         region scrolls — only #leads-list does — and every row keeps
//         its class, data-lead-id, badges and button wiring. At 390x844
//         (<= 900 px) the email is hidden, the created date stays, and
//         there is no horizontal page scroll.
//   AC-2  A lead whose email is <img src=x onerror=window.__pwned=1>
//         renders the email as inert text and window.__pwned stays
//         undefined. The board view is unchanged: its cards still carry
//         kanban-card, data-lead-id and data-lead-stage.

const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';

// Hostile and boundary values from the mocked /leads response. The hostile
// email would inject an <img> whose onerror fires if interpolated unescaped.
const HOSTILE_EMAIL = '<img src=x onerror=window.__pwned=1>';
// Exactly 120 characters (asserted below).
const LONG_EMAIL = 'x'.repeat(120 - '@example.com'.length) + '@example.com';

// Far enough in the past that the page's formatDate helper returns the
// absolute form ("Sep 20, 2026"), not a relative one ("2d ago").
const CREATED_FULL = '2026-09-20T09:00:00Z';
const CREATED_PLAIN = '2026-09-21T09:00:00Z';

const FULL_ID = 'lead-901';       // name + company + email + value + created
const NO_EMAIL_ID = 'lead-902';   // no email, has created
const NO_DATE_ID = 'lead-903';    // has email, no created
const LONG_ID = 'lead-904';       // 120-character email
const HOSTILE_ID = 'lead-905';    // hostile email
const BARE_ID = 'lead-906';       // no email and no created
const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

function makeLeads() {
  const out = [];
  for (let i = 1; i <= 294; i++) {
    out.push({
      id: 'lead-' + String(i).padStart(3, '0'),
      name: 'Lead ' + String(i).padStart(3, '0'),
      email: i % 4 === 0 ? null : 'lead' + i + '@example.com',
      phone: null,
      company: i % 3 === 0 ? 'Acme ' + (i % 5 + 1) : null,
      value: 5000 + ((i * 1234) % 95) * 1000,
      stage: STAGES[i % 6],
      source: 'website',
      notes: null,
      created_at: '2026-09-0' + ((i % 9) + 1) + 'T08:00:00Z',
      updated_at: '2026-09-0' + ((i % 9) + 1) + 'T08:00:00Z',
    });
  }
  out.push({
    id: FULL_ID,
    name: 'Full Lead',
    email: 'full.lead@example.com',
    phone: null,
    company: 'Acme Corp',
    value: 12345,
    stage: 'new',
    source: 'referral',
    notes: null,
    created_at: CREATED_FULL,
    updated_at: CREATED_FULL,
  });
  out.push({
    id: NO_EMAIL_ID,
    name: 'No Email',
    email: null,
    phone: null,
    company: 'Beta LLC',
    value: 5000,
    stage: 'contacted',
    source: 'social',
    notes: null,
    created_at: CREATED_PLAIN,
    updated_at: CREATED_PLAIN,
  });
  out.push({
    id: NO_DATE_ID,
    name: 'No Date',
    email: 'nodate@example.com',
    phone: null,
    company: null,
    value: 8000,
    stage: 'qualified',
    source: 'event',
    notes: null,
    created_at: null,
    updated_at: null,
  });
  out.push({
    id: LONG_ID,
    name: 'Long Mail',
    email: LONG_EMAIL,
    phone: null,
    company: 'Gamma GmbH',
    value: 30000,
    stage: 'proposal',
    source: 'cold-call',
    notes: null,
    created_at: CREATED_FULL,
    updated_at: CREATED_FULL,
  });
  out.push({
    id: HOSTILE_ID,
    name: 'Hostile Mail',
    email: HOSTILE_EMAIL,
    phone: null,
    company: null,
    value: 1500,
    stage: 'won',
    source: 'website',
    notes: null,
    created_at: CREATED_FULL,
    updated_at: CREATED_FULL,
  });
  out.push({
    id: BARE_ID,
    name: 'Bare Lead',
    email: null,
    phone: null,
    company: null,
    value: 0,
    stage: 'lost',
    source: 'referral',
    notes: null,
    created_at: null,
    updated_at: null,
  });
  return out;
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network. The mocked /leads
 * store serves the rows with the limit/offset paging the app uses.
 *
 * Returns the recorded API calls (method, url, authorization, body).
 */
async function boot(page, token, state) {
  const user = { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const calls = [];
  await page.addInitScript((cfg) => { window.AICRM_CONFIG = cfg; },
    { API_BASE_URL: 'http://localhost:9000/api' });
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    const u = new URL(url);
    calls.push({
      method: req.method(),
      url,
      auth: req.headers()['authorization'] || '',
      body: req.postData() || null,
      status: 0,
    });
    const json = (o, status = 200) => {
      calls[calls.length - 1].status = status;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    };
    if (/\/auth\/me/.test(u.pathname)) {
      // Mocked for THIS user; a foreign token does not authenticate.
      const auth = req.headers()['authorization'] || '';
      if (auth && !auth.includes(token)) return json({ authenticated: false, user: null });
      return json({ authenticated: true, user });
    }
    if (/\/auth\/config/.test(u.pathname)) return json({ auth_enabled: true });
    if (/\/health/.test(u.pathname)) return json({ status: 'ok', app_version: '0.2.3' });
    if (/^\/api\/leads$/.test(u.pathname)) {
      // Honour the limit/offset paging used by ApiClient.getAllPages.
      const limit = Math.max(1, parseInt(u.searchParams.get('limit') || '100', 10) || 100);
      const offset = Math.max(0, parseInt(u.searchParams.get('offset') || '0', 10) || 0);
      return json(state.leads.slice(offset, offset + limit));
    }
    if (/\/contacts/.test(u.pathname)) return json([]);
    if (/\/activities/.test(u.pathname)) return json([]);
    if (/\/settings/.test(u.pathname)) return json({ payload: {} });
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

/** Blur any focused control so the K shortcut (ignores inputs) can fire. */
async function blurActive(page) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
}

test('issue340 freeform', async ({ page }) => {
  test.setTimeout(180000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  const state = { leads: makeLeads() };
  const calls = await boot(page, ADMIN_TOKEN, state);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The production boot sent the hash token as a Bearer header.
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + ADMIN_TOKEN),
    { timeout: 10000 }).toBe(true);

  // Open the Leads page (list view by default).
  await page.evaluate(() => { location.hash = '#/leads'; });
  await page.waitForFunction(
    () => document.getElementById('page-leads').classList.contains('active')
      && document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 30000 });

  // ── AC-1: the full row — the eight parts in order, the created date in
  //    the formatDate form, muted email and date, existing wiring intact ──
  const fullRow = await page.evaluate(({ fullId, createdFull }) => {
    const row = document.querySelector('#leads-list .lead-card[data-lead-id="' + fullId + '"]');
    if (!row) return { found: false };
    const pick = (sel) => row.querySelector(sel);
    const parts = [
      pick('.lead-row-name'), pick('.lead-row-company'), pick('.lead-row-email'),
      pick('.lead-row-value'), pick('.badge'), pick('.score-badge'),
      pick('.lead-row-created'),
      pick('button[data-action="edit-lead"]'), pick('button[data-action="delete-lead"]'),
    ];
    const rects = parts.map((el) => el.getBoundingClientRect());
    const inOrder = rects.slice(0, -1).every((r, i) => r.left < rects[i + 1].left);
    const muted = getComputedStyle(pick('.lead-row-company')).color;
    const emailEl = pick('.lead-row-email');
    const createdEl = pick('.lead-row-created');
    const scoreEl = pick('.score-badge');
    const editBtn = pick('button[data-action="edit-lead"]');
    const delBtn = pick('button[data-action="delete-lead"]');
    return {
      found: true,
      rowClass: row.classList.contains('lead-card'),
      rowLeadId: row.getAttribute('data-lead-id'),
      name: pick('.lead-row-name').textContent,
      company: pick('.lead-row-company').textContent,
      email: emailEl ? emailEl.textContent : null,
      value: pick('.lead-row-value').textContent,
      stage: pick('.badge').textContent,
      scoreText: scoreEl ? scoreEl.textContent : null,
      scoreTitle: scoreEl ? scoreEl.getAttribute('title') : null,
      created: createdEl ? createdEl.textContent : null,
      expectedCreated: App.formatDate(createdFull),
      emailMuted: emailEl ? getComputedStyle(emailEl).color === muted : null,
      createdMuted: createdEl ? getComputedStyle(createdEl).color === muted : null,
      inOrder,
      allPartsPresent: parts.every(Boolean),
      edit: editBtn ? {
        action: editBtn.getAttribute('data-action'),
        leadId: editBtn.getAttribute('data-lead-id'),
        text: editBtn.textContent.trim(),
      } : null,
      del: delBtn ? {
        action: delBtn.getAttribute('data-action'),
        leadId: delBtn.getAttribute('data-lead-id'),
        text: delBtn.textContent.trim(),
      } : null,
      height: row.getBoundingClientRect().height,
    };
  }, { fullId: FULL_ID, createdFull: CREATED_FULL });
  expect(fullRow.found, 'the full lead rendered a list row').toBe(true);
  expect(fullRow.rowClass, 'the row keeps the lead-card class').toBe(true);
  expect(fullRow.rowLeadId, 'the row keeps its data-lead-id').toBe(FULL_ID);
  expect(fullRow.name, 'the name is shown').toBe('Full Lead');
  expect(fullRow.company, 'the company is shown').toBe('Acme Corp');
  expect(fullRow.email, 'the email is shown after the company').toBe('full.lead@example.com');
  expect(fullRow.value, 'the value is shown').toBe('$12,345');
  expect(fullRow.stage, 'the stage badge is intact').toBe('new');
  expect(fullRow.scoreText, 'the score badge is intact')
    .toMatch(/^\d+ (Cold|Warm|Hot|Critical)$/);
  expect(fullRow.scoreTitle, 'the score badge keeps its title').toMatch(/^Score: \d+\/100$/);
  expect(fullRow.created, 'the created date is shown before the buttons').toBeTruthy();
  expect(fullRow.created, 'the created date is in the formatDate form')
    .toBe(fullRow.expectedCreated);
  expect(fullRow.expectedCreated, 'the formatDate form is an absolute date such as "Oct 12, 2026"')
    .toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}$/);
  expect(fullRow.emailMuted, 'the email is muted text').toBe(true);
  expect(fullRow.createdMuted, 'the created date is muted text').toBe(true);
  expect(fullRow.allPartsPresent, 'the row carries all eight parts').toBe(true);
  expect(fullRow.inOrder, 'the parts sit left to right: name, company, email, value, stage, score, created, buttons')
    .toBe(true);
  expect(fullRow.edit, 'the Edit button keeps its wiring')
    .toEqual({ action: 'edit-lead', leadId: FULL_ID, text: 'Edit' });
  expect(fullRow.del, 'the Delete button keeps its wiring')
    .toEqual({ action: 'delete-lead', leadId: FULL_ID, text: 'Delete' });
  expect(fullRow.height, 'the row is at least 52 px tall').toBeGreaterThanOrEqual(52);

  // ── AC-2: no email / no created date / bare lead — the elements are
  //    absent, not empty ─────────────────────────────────────────────────
  const absent = await page.evaluate(({ noEmailId, noDateId, bareId }) => {
    const probe = (id) => {
      const row = document.querySelector('#leads-list .lead-card[data-lead-id="' + id + '"]');
      if (!row) return null;
      const emailEl = row.querySelector('.lead-row-email');
      const createdEl = row.querySelector('.lead-row-created');
      return {
        email: emailEl ? emailEl.textContent : null,
        emailPresent: !!emailEl,
        created: createdEl ? createdEl.textContent : null,
        createdPresent: !!createdEl,
      };
    };
    return { noEmail: probe(noEmailId), noDate: probe(noDateId), bare: probe(bareId) };
  }, { noEmailId: NO_EMAIL_ID, noDateId: NO_DATE_ID, bareId: BARE_ID });
  expect(absent.noEmail, 'the no-email lead rendered a row').toBeTruthy();
  expect(absent.noEmail.emailPresent, 'a lead with no email has no .lead-row-email').toBe(false);
  expect(absent.noEmail.created, 'that lead still shows its created date').toBeTruthy();
  expect(absent.noDate, 'the no-date lead rendered a row').toBeTruthy();
  expect(absent.noDate.createdPresent, 'a lead with no created date has no .lead-row-created')
    .toBe(false);
  expect(absent.noDate.email, 'that lead still shows its email').toBe('nodate@example.com');
  expect(absent.bare, 'the bare lead rendered a row').toBeTruthy();
  expect(absent.bare.emailPresent, 'the bare lead has no .lead-row-email').toBe(false);
  expect(absent.bare.createdPresent, 'the bare lead has no .lead-row-created').toBe(false);

  // ── AC-2: hostile email renders as inert text; no "Invalid Date" or
  //    "undefined" anywhere in the list ──────────────────────────────────
  const hostile = await page.evaluate(({ hostileId }) => {
    const list = document.getElementById('leads-list');
    const row = document.querySelector('#leads-list .lead-card[data-lead-id="' + hostileId + '"]');
    const emailEl = row ? row.querySelector('.lead-row-email') : null;
    return {
      found: !!row,
      emailText: emailEl ? emailEl.textContent : null,
      injected: row ? row.querySelectorAll('img, script, link, style').length : -1,
      listText: list.textContent,
      pwned: typeof window.__pwned,
    };
  }, { hostileId: HOSTILE_ID });
  expect(hostile.found, 'the hostile-email lead rendered a row').toBe(true);
  expect(hostile.emailText, 'the hostile email renders as text').toBe(HOSTILE_EMAIL);
  expect(hostile.injected, 'the hostile email injects no elements').toBe(0);
  expect(hostile.pwned, 'window.__pwned stays undefined').toBe('undefined');
  expect(hostile.listText.includes('Invalid Date'), 'no "Invalid Date" text anywhere in the list')
    .toBe(false);
  expect(hostile.listText.includes('undefined'), 'no "undefined" text anywhere in the list')
    .toBe(false);

  // ── AC-1: the 120-character email at 1440x900 — one line, cut not
  //    wrapped, buttons inside the row, >= 52 px tall ────────────────────
  const longRow = await page.evaluate((longId) => {
    const row = document.querySelector('#leads-list .lead-card[data-lead-id="' + longId + '"]');
    if (!row) return { found: false };
    const emailEl = row.querySelector('.lead-row-email');
    const style = getComputedStyle(emailEl);
    const rowRect = row.getBoundingClientRect();
    const centerY = rowRect.top + rowRect.height / 2;
    const parts = [
      row.querySelector('.lead-row-name'), row.querySelector('.lead-row-company'), emailEl,
      row.querySelector('.lead-row-value'), row.querySelector('.badge'),
      row.querySelector('.score-badge'), row.querySelector('.lead-row-created'),
      row.querySelector('button[data-action="edit-lead"]'),
      row.querySelector('button[data-action="delete-lead"]'),
    ];
    const oneLine = parts.every((el) => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.top + r.height / 2 - centerY) <= 1;
    });
    const editRect = row.querySelector('button[data-action="edit-lead"]').getBoundingClientRect();
    const delRect = row.querySelector('button[data-action="delete-lead"]').getBoundingClientRect();
    return {
      found: true,
      emailText: emailEl.textContent,
      emailBox: emailEl.getBoundingClientRect().width,
      emailScroll: emailEl.scrollWidth,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
      oneLine,
      height: rowRect.height,
      editInside: editRect.right <= rowRect.right + 0.5,
      delInside: delRect.right <= rowRect.right + 0.5,
    };
  }, LONG_ID);
  expect(longRow.found, 'the 120-character-email lead rendered a row').toBe(true);
  expect(LONG_EMAIL.length, 'the long-email fixture is 120 characters').toBe(120);
  expect(longRow.emailText, 'the full 120-character email is the row email').toBe(LONG_EMAIL);
  expect(longRow.emailScroll > longRow.emailBox,
    'the email box is narrower than its text (it is cut, not wrapped)').toBe(true);
  expect(longRow.textOverflow, 'the email is cut with an ellipsis').toBe('ellipsis');
  expect(longRow.whiteSpace, 'the email never wraps').toBe('nowrap');
  expect(longRow.oneLine, 'the row is still one line with a 120-character email').toBe(true);
  expect(longRow.height, 'the row is still at least 52 px tall').toBeGreaterThanOrEqual(52);
  expect(longRow.editInside, 'the Edit button is inside the row').toBe(true);
  expect(longRow.delInside, 'the Delete button is inside the row').toBe(true);

  // ── AC-1: 300 leads at 1440x900 — only #leads-list scrolls ────────────
  const listState = await page.evaluate(() => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const list = document.getElementById('leads-list');
    const rows = Array.from(list.querySelectorAll('.lead-card'));
    const heights = rows.map((r) => r.getBoundingClientRect().height);
    return {
      docScrolls: de.scrollHeight > de.clientHeight,
      regionScrolls: region.scrollHeight > region.clientHeight,
      listScrolls: list.scrollHeight > list.clientHeight,
      rowCount: rows.length,
      minRowHeight: heights.length ? Math.min(...heights) : -1,
      allRowsIntact: rows.every((r) => r.classList.contains('lead-card') && r.dataset.leadId
        && r.querySelector('.lead-row-name') && r.querySelector('.badge')
        && r.querySelector('.score-badge')
        && r.querySelector('button[data-action="edit-lead"][data-lead-id]')
        && r.querySelector('button[data-action="delete-lead"][data-lead-id]')),
      editCount: list.querySelectorAll('button[data-action="edit-lead"]').length,
      deleteCount: list.querySelectorAll('button[data-action="delete-lead"]').length,
    };
  });
  expect(listState.rowCount, 'one row per lead').toBe(300);
  expect(listState.docScrolls, 'no document scroll at 1440x900 with 300 leads').toBe(false);
  expect(listState.regionScrolls, 'no content-region scroll at 1440x900 with 300 leads').toBe(false);
  expect(listState.listScrolls, 'only #leads-list scrolls').toBe(true);
  expect(listState.minRowHeight, 'every row is at least 52 px tall').toBeGreaterThanOrEqual(52);
  expect(listState.allRowsIntact, 'every row keeps its class, id, badges and button wiring')
    .toBe(true);
  expect(listState.editCount, 'every row keeps its Edit button').toBe(300);
  expect(listState.deleteCount, 'every row keeps its Delete button').toBe(300);

  // ── AC-1: 390x844 (<= 900 px) — the email is hidden, the created date
  //    stays, and nothing scrolls the page sideways ──────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 10000 });
  const narrow = await page.evaluate(({ fullId, longId }) => {
    const de = document.documentElement;
    const row = document.querySelector('#leads-list .lead-card[data-lead-id="' + fullId + '"]');
    const emailEl = row.querySelector('.lead-row-email');
    const createdEl = row.querySelector('.lead-row-created');
    const longRow = document.querySelector('#leads-list .lead-card[data-lead-id="' + longId + '"]');
    const longEmail = longRow ? longRow.querySelector('.lead-row-email') : null;
    window.scrollTo(500, 0);
    const scrolledX = window.scrollX;
    window.scrollTo(0, 0);
    return {
      emailDisplay: getComputedStyle(emailEl).display,
      longEmailDisplay: longEmail ? getComputedStyle(longEmail).display : null,
      createdDisplay: createdEl ? getComputedStyle(createdEl).display : null,
      createdHeight: createdEl ? createdEl.getBoundingClientRect().height : -1,
      docWidth: de.clientWidth,
      docScrollWidth: de.scrollWidth,
      scrolledX,
    };
  }, { fullId: FULL_ID, longId: LONG_ID });
  expect(narrow.emailDisplay, 'the email is hidden at 390x844 (<= 900 px)').toBe('none');
  expect(narrow.longEmailDisplay, 'the long email is hidden too').toBe('none');
  expect(narrow.createdDisplay, 'the created date stays').not.toBe('none');
  expect(narrow.createdHeight, 'the created date is rendered').toBeGreaterThan(0);
  expect(narrow.docScrollWidth, 'no horizontal page scroll at 390x844 (width)')
    .toBeLessThanOrEqual(narrow.docWidth);
  expect(narrow.scrolledX, 'no horizontal page scroll at 390x844 (probe)').toBe(0);

  // ── AC-2: the board view's cards are unchanged ────────────────────────
  await page.setViewportSize({ width: 1440, height: 900 });
  await blurActive(page);
  await page.keyboard.press('k');
  await expect(page.locator('#kanban-board')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelectorAll('#kanban-board .kanban-card').length === 300,
    { timeout: 30000 });
  const boardCard = await page.evaluate((fullId) => {
    const card = document.querySelector('#kanban-board .kanban-card[data-lead-id="' + fullId + '"]');
    return card ? {
      hasClass: card.classList.contains('kanban-card'),
      leadId: card.getAttribute('data-lead-id'),
      leadStage: card.getAttribute('data-lead-stage'),
    } : null;
  }, FULL_ID);
  expect(boardCard, 'the board still renders a card for the lead').toBeTruthy();
  expect(boardCard.hasClass, 'the card still has the kanban-card class').toBe(true);
  expect(boardCard.leadId, 'the card still has its data-lead-id').toBe(FULL_ID);
  expect(boardCard.leadStage, 'the card still has its data-lead-stage').toBe('new');

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
