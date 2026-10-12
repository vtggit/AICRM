// Issue #317 — the Leads page (#page-leads) fits the window in both views.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  One toolbar bar above the view holds the existing controls with
//         their ids; the labels and the score filter's option labels carry
//         no emoji. The view button reads "Board" in the list view and
//         "List" in the board view, and the K shortcut switches views. The
//         stage and score filters apply to both views.
//   AC-2  At 1440x900 with 300 mocked leads, in the board view neither the
//         document nor the content region scrolls, the board fills the area
//         under the toolbar, a busy stage's card region scrolls while its
//         header stays in view, each stage header shows its count and value,
//         and an empty stage shows "No leads". In the list view neither the
//         document nor the content region scrolls, #leads-list scrolls on its
//         own, every row is at least 52 px tall and carries the word-labelled
//         Edit/Delete buttons with their data-action and data-lead-id.
//   AC-3  Moving a card to another stage by calling the page's own drop
//         handling with a synthetic drag-and-drop event sequence (no
//         pixel-dragging) sends the stage update for the right lead and the
//         card appears in the new stage.
//   AC-4  With no leads the list shows a centred empty state. A lead named
//         <img src=x onerror=window.__pwned=1> renders as text in a list row
//         and in a board card, and a hostile stage renders as inert badge
//         text — window.__pwned stays undefined. At 390x844 neither view
//         scrolls the page sideways; the board scrolls sideways inside its
//         own region.

const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';

// Hostile values from the mocked /leads response. Interpolated unescaped,
// the name would inject an <img> whose onerror fires; the stage would
// terminate the badge's class attribute and inject the same.
const HOSTILE_NAME = '<img src=x onerror=window.__pwned=1>';
const HOSTILE_STAGE = 'x"><img src=x onerror=window.__pwned=2>';
const HOSTILE_NAME_ID = 'lead-299';
const MOVE_FROM_STAGE = 'new';
const MOVE_TO_STAGE = 'contacted';
const MOVED_LEAD_ID = 'lead-001';

// Emoji ranges: pictographs/symbols, arrows, misc technical, VS-16.
const EMOJI_SRC = '[\\u{1F000}-\\u{1FAFF}\\u{2190}-\\u{2BFF}\\u{2300}-\\u{23FF}\\uFE0F]';
const EMOJI_RE = new RegExp(EMOJI_SRC, 'u');

const SOURCES = ['website', 'referral', 'social', 'cold-call', 'event'];
// [stage, count, first index]: 300 leads total, "lost" stays empty.
const STAGE_PLAN = [
  ['new', 80, 1],
  ['contacted', 80, 81],
  ['qualified', 80, 161],
  ['proposal', 40, 241],
  ['won', 18, 281],
];

function makeLeads() {
  const out = [];
  for (const [stage, count, first] of STAGE_PLAN) {
    for (let i = first; i < first + count; i++) {
      out.push({
        id: 'lead-' + String(i).padStart(3, '0'),
        name: 'Lead ' + String(i).padStart(3, '0'),
        email: i % 4 === 0 ? null : 'lead' + i + '@example.com',
        phone: null,
        company: i % 3 === 0 ? 'Acme ' + (i % 5 + 1) : null,
        value: 5000 + ((i * 1234) % 95) * 1000,
        stage,
        source: SOURCES[i % 5],
        notes: null,
        created_at: '2026-09-0' + ((i % 9) + 1) + 'T08:00:00Z',
        updated_at: '2026-09-0' + ((i % 9) + 1) + 'T08:00:00Z',
      });
    }
  }
  // lead-299: hostile NAME, real stage (appears in both views).
  out.push({
    id: HOSTILE_NAME_ID,
    name: HOSTILE_NAME,
    email: null,
    phone: null,
    company: null,
    value: 90000,
    stage: 'new',
    source: 'website',
    notes: null,
    created_at: '2026-09-05T09:00:00Z',
    updated_at: '2026-09-05T09:00:00Z',
  });
  // lead-300: hostile STAGE (matches no column; the badge must keep it inert).
  out.push({
    id: 'lead-300',
    name: 'Lead 300',
    email: null,
    phone: null,
    company: null,
    value: 12000,
    stage: HOSTILE_STAGE,
    source: 'referral',
    notes: null,
    created_at: '2026-09-06T09:00:00Z',
    updated_at: '2026-09-06T09:00:00Z',
  });
  return out;
}

function stageStats(leads, stage) {
  const stageLeads = leads.filter((l) => l.stage === stage);
  return {
    count: stageLeads.length,
    total: stageLeads.reduce((sum, l) => sum + l.value, 0),
  };
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network. The mocked /leads
 * store is mutable: the test empties it (and refills it) by reassigning
 * state.leads, and the stage PATCH mutates it like the real backend would.
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
    if (req.method() === 'PATCH' && /^\/api\/leads\/[^/]+\/stage$/.test(u.pathname)) {
      // Kanban drag-and-drop stage update: mutate the store, return the
      // entity. The pathname is /api/leads/<id>/stage, so the id is the
      // fourth segment (index 3), not the third.
      const id = u.pathname.split('/')[3];
      const payload = JSON.parse(req.postData() || '{}');
      const lead = state.leads.find((l) => l.id === id);
      if (!lead) return json({ detail: 'Lead not found.' }, 404);
      lead.stage = payload.stage;
      return json(lead);
    }
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

test('issue317 freeform', async ({ page }) => {
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

  // ── AC-1: one toolbar bar above the view, existing ids, no emoji ──────
  const toolbar = await page.evaluate(() => {
    const pageEl = document.getElementById('page-leads');
    const bar = pageEl.querySelector(':scope > .page-actions');
    const ids = ['btn-add-lead', 'btn-toggle-kanban', 'btn-export-leads-csv',
                 'btn-import-leads-csv', 'lead-filter-stage', 'lead-filter-score', 'lead-sort'];
    return {
      barCount: pageEl.querySelectorAll(':scope > .page-actions').length,
      barIsFirstChild: bar === pageEl.firstElementChild,
      missing: ids.filter((id) => !document.getElementById(id)),
      buttonTexts: bar ? Array.from(bar.querySelectorAll('button')).map((b) => b.textContent.trim()) : [],
      optionTexts: ['lead-filter-stage', 'lead-filter-score', 'lead-sort']
        .flatMap((id) => Array.from(document.getElementById(id).querySelectorAll('option'))
          .map((o) => o.textContent.trim())),
      toggleLabel: (document.getElementById('btn-toggle-kanban') || {}).textContent || '',
    };
  });
  expect(toolbar.barCount, 'exactly one toolbar bar above the view').toBe(1);
  expect(toolbar.barIsFirstChild, 'the bar sits above the view').toBe(true);
  expect(toolbar.missing, 'the toolbar keeps every existing control id').toEqual([]);
  expect(toolbar.buttonTexts.length, 'toolbar holds its buttons').toBe(4);
  for (const text of [...toolbar.buttonTexts, ...toolbar.optionTexts]) {
    expect(EMOJI_RE.test(text), `no emoji in toolbar label "${text}"`).toBe(false);
  }
  expect(toolbar.toggleLabel, 'the view button reads "Board" in the list view').toBe('Board');

  // ── AC-2: list view at 1440x900 with 300 leads — only #leads-list
  //    scrolls; rows are >= 52 px with word-labelled edit/delete buttons ──
  const listView = await page.evaluate(({ hostileName, hostileStage, firstRowId }) => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const list = document.getElementById('leads-list');
    const rows = Array.from(list.querySelectorAll('.lead-card'));
    const heights = rows.map((r) => r.getBoundingClientRect().height);
    // The default sort is newest-first, so pick the row by its id rather
    // than by DOM position: it is also the card the drag-and-drop moves.
    const first = rows.find((r) => r.dataset.leadId === firstRowId) || null;
    const editBtn = first ? first.querySelector('button[data-action="edit-lead"]') : null;
    const delBtn = first ? first.querySelector('button[data-action="delete-lead"]') : null;
    const hostileRow = rows.find((r) => {
      const name = r.querySelector('.lead-row-name');
      return name && name.textContent === hostileName;
    });
    const badgeRow = rows.find((r) => Array.from(r.querySelectorAll('.badge'))
      .some((b) => b.textContent === hostileStage));
    const btnTexts = Array.from(list.querySelectorAll('.card-action-btn'))
      .map((b) => b.textContent.trim());
    return {
      docScrolls: de.scrollHeight > de.clientHeight,
      regionScrolls: region.scrollHeight > region.clientHeight,
      listScrolls: list.scrollHeight > list.clientHeight,
      rowCount: rows.length,
      minRowHeight: heights.length ? Math.min(...heights) : -1,
      edit: editBtn ? { leadId: editBtn.dataset.leadId, text: editBtn.textContent.trim() } : null,
      del: delBtn ? { leadId: delBtn.dataset.leadId, text: delBtn.textContent.trim() } : null,
      editCount: list.querySelectorAll('button[data-action="edit-lead"]').length,
      deleteCount: list.querySelectorAll('button[data-action="delete-lead"]').length,
      btnWords: new Set(btnTexts).size === 2
        && btnTexts.filter((t) => t === 'Edit').length === rows.length
        && btnTexts.filter((t) => t === 'Delete').length === rows.length,
      hostileRow: hostileRow ? {
        nameText: hostileRow.querySelector('.lead-row-name').textContent,
        injected: hostileRow.querySelectorAll('img, script, link, style').length,
      } : null,
      badgeRow: badgeRow ? {
        badgeText: badgeRow.querySelector('.badge').textContent,
        injected: badgeRow.querySelectorAll('img, script, link, style').length,
      } : null,
      pwned: typeof window.__pwned,
    };
  }, { hostileName: HOSTILE_NAME, hostileStage: HOSTILE_STAGE, firstRowId: MOVED_LEAD_ID });
  expect(listView.docScrolls, 'no document scroll at 1440x900 (list view, 300 leads)').toBe(false);
  expect(listView.regionScrolls, 'no content-region scroll (list view, 300 leads)').toBe(false);
  expect(listView.listScrolls, '#leads-list scrolls on its own').toBe(true);
  expect(listView.rowCount, 'one row per lead').toBe(300);
  expect(listView.minRowHeight, 'every row is at least 52 px tall').toBeGreaterThanOrEqual(52);
  expect(listView.edit, 'the first row keeps its edit button wiring')
    .toEqual({ leadId: 'lead-001', text: 'Edit' });
  expect(listView.del, 'the first row keeps its delete button wiring')
    .toEqual({ leadId: 'lead-001', text: 'Delete' });
  expect(listView.editCount).toBe(300);
  expect(listView.deleteCount).toBe(300);
  expect(listView.btnWords, 'every row button reads "Edit"/"Delete", not emoji').toBe(true);

  // ── AC-4: hostile API values render as inert text ─────────────────────
  expect(listView.hostileRow, 'the hostile-name lead rendered a list row').toBeTruthy();
  expect(listView.hostileRow.nameText, 'the hostile name renders as text').toBe(HOSTILE_NAME);
  expect(listView.hostileRow.injected, 'the hostile name injects no elements').toBe(0);
  expect(listView.badgeRow, 'the hostile-stage lead rendered a list row').toBeTruthy();
  expect(listView.badgeRow.badgeText, 'the hostile stage renders as inert badge text')
    .toBe(HOSTILE_STAGE);
  expect(listView.badgeRow.injected, 'the hostile stage injects no elements').toBe(0);
  expect(listView.pwned, 'window.__pwned stays undefined (list view)').toBe('undefined');

  // ── Proof (mock): the GET branch matches the /api-prefixed pathname ──
  // The page's requests carry the /api prefix, so the branch that serves
  // the rows must be the /api-prefixed one — and it served every lead.
  const leadsGets = calls.filter((c) => c.method === 'GET'
    && new URL(c.url).pathname === '/api/leads');
  expect(leadsGets.length, 'the page fetched leads from the /api-prefixed path')
    .toBeGreaterThan(0);
  expect(listView.rowCount, 'the mock served every lead (the branch is not dead)')
    .toBe(state.leads.length);

  // ── AC-1: the score filter still applies to the list view ─────────────
  await page.selectOption('#lead-filter-score', 'critical');
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#leads-list .lead-card');
    return rows.length > 0 && rows.length < 300;
  }, { timeout: 15000 });
  const scoreFiltered = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#leads-list .lead-card'));
    return {
      count: rows.length,
      allCritical: rows.length > 0 && rows.every((r) => {
        const badge = r.querySelector('.score-badge');
        return badge && badge.classList.contains('score-critical');
      }),
    };
  });
  expect(scoreFiltered.count, 'the score filter narrowed the list').toBeGreaterThan(0);
  expect(scoreFiltered.count).toBeLessThan(300);
  expect(scoreFiltered.allCritical, 'only Critical-score rows remain').toBe(true);
  await page.selectOption('#lead-filter-score', '');
  await blurActive(page);
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 15000 });

  // ── AC-1: the K shortcut switches to the board view ───────────────────
  await page.keyboard.press('k');
  await expect(page.locator('#kanban-board')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelectorAll('#kanban-board .kanban-card').length === 299,
    { timeout: 30000 });
  await expect(page.locator('#btn-toggle-kanban'),
    'the view button reads "List" in the board view').toHaveText('List');

  // ── AC-2: board view at 1440x900 — only the columns' card regions
  //    scroll; headers stay in view; counts and values per stage ─────────
  const boardView = await page.evaluate(({ hostileName, fromStage, movedId, hostileId }) => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const board = document.getElementById('kanban-board');
    const br = board.getBoundingClientRect();
    const rr = region.getBoundingClientRect();
    const fromCol = document.querySelector('.kanban-column[data-stage="' + fromStage + '"]');
    const fromCards = document.querySelector('.kanban-cards[data-stage="' + fromStage + '"]');
    const header = fromCol.querySelector('.kanban-header');
    const hr = header.getBoundingClientRect();
    const moved = fromCards.querySelector('.kanban-card[data-lead-id="' + movedId + '"]');
    const hostileCard = document.querySelector('.kanban-card[data-lead-id="' + hostileId + '"]');
    return {
      docScrolls: de.scrollHeight > de.clientHeight,
      regionScrolls: region.scrollHeight > region.clientHeight,
      cols: Array.from(document.querySelectorAll('#kanban-board .kanban-column')).map((c) => ({
        stage: c.dataset.stage,
        count: c.querySelector('.kanban-count').textContent,
        value: c.querySelector('.kanban-value').textContent,
        cards: c.querySelectorAll('.kanban-card').length,
        note: c.querySelector('.kanban-empty-note')
          ? c.querySelector('.kanban-empty-note').textContent.trim() : null,
      })),
      fromCardsScroll: fromCards.scrollHeight > fromCards.clientHeight,
      headerTop: hr.top,
      headerBottom: hr.bottom,
      viewport: window.innerHeight,
      boardBottomGapToRegion: br.bottom + 28 - rr.bottom,
      card: moved ? {
        draggable: moved.getAttribute('draggable'),
        leadId: moved.dataset.leadId,
        leadStage: moved.dataset.leadStage,
        hasClass: moved.classList.contains('kanban-card'),
      } : null,
      hostileCard: hostileCard ? {
        nameText: hostileCard.querySelector('.kanban-card-name').textContent,
        injected: hostileCard.querySelectorAll('img, script, link, style').length,
      } : null,
      pwned: typeof window.__pwned,
    };
  }, {
    hostileName: HOSTILE_NAME,
    fromStage: MOVE_FROM_STAGE,
    movedId: MOVED_LEAD_ID,
    hostileId: HOSTILE_NAME_ID,
  });
  expect(boardView.docScrolls, 'no document scroll at 1440x900 (board view, 300 leads)').toBe(false);
  expect(boardView.regionScrolls, 'no content-region scroll (board view, 300 leads)').toBe(false);
  expect(boardView.fromCardsScroll, "the busy stage's card region scrolls inside its column")
    .toBe(true);
  expect(boardView.headerTop, 'the stage header stays in view (top)').toBeGreaterThanOrEqual(0);
  expect(boardView.headerBottom, 'the stage header stays in view (bottom)')
    .toBeLessThanOrEqual(boardView.viewport);
  expect(Math.abs(boardView.boardBottomGapToRegion),
    'the board fills the area under the toolbar (flush with the content region)')
    .toBeLessThanOrEqual(2);
  expect(boardView.card, 'the card keeps its class and drag wiring').toEqual({
    draggable: 'true',
    leadId: MOVED_LEAD_ID,
    leadStage: MOVE_FROM_STAGE,
    hasClass: true,
  });

  // Per-stage header: count and value from the mocked data.
  const expectedStats = {};
  for (const [stage] of STAGE_PLAN) expectedStats[stage] = stageStats(state.leads, stage);
  expectedStats['lost'] = { count: 0, total: 0 };
  for (const col of boardView.cols) {
    const stats = expectedStats[col.stage];
    expect(Number(col.count), `count in the ${col.stage} header`).toBe(stats.count);
    const shown = Number(col.value.replace(/[^0-9]/g, ''));
    expect(shown, `value in the ${col.stage} header`).toBe(stats.total);
    expect(col.cards, `cards in the ${col.stage} column`).toBe(stats.count);
  }
  const lostCol = boardView.cols.find((c) => c.stage === 'lost');
  expect(lostCol.note, 'the empty stage shows muted "No leads"').toBe('No leads');

  // The hostile name renders as text in the board card too.
  expect(boardView.hostileCard, 'the hostile-name lead rendered a board card').toBeTruthy();
  expect(boardView.hostileCard.nameText, 'the hostile name renders as card text')
    .toBe(HOSTILE_NAME);
  expect(boardView.hostileCard.injected, 'the hostile name injects no elements').toBe(0);
  expect(boardView.pwned, 'window.__pwned stays undefined (board view)').toBe('undefined');

  // ── AC-3: synthetic drag-and-drop through the page's own handlers ─────
  // dragstart on the card, dragover + drop on the target column's card
  // region — the page's bound handlers do the rest (API call, re-render).
  await page.evaluate(({ leadId, toStage }) => {
    const card = document.querySelector('.kanban-card[data-lead-id="' + leadId + '"]');
    const zone = document.querySelector('.kanban-cards[data-stage="' + toStage + '"]');
    const dataTransfer = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart',
      { dataTransfer, bubbles: true, cancelable: true }));
    zone.dispatchEvent(new DragEvent('dragover',
      { dataTransfer, bubbles: true, cancelable: true }));
    zone.dispatchEvent(new DragEvent('drop',
      { dataTransfer, bubbles: true, cancelable: true }));
  }, { leadId: MOVED_LEAD_ID, toStage: MOVE_TO_STAGE });
  await page.waitForFunction(({ leadId, toStage }) =>
    !!document.querySelector(
      '.kanban-cards[data-stage="' + toStage + '"] .kanban-card[data-lead-id="' + leadId + '"]'),
    { leadId: MOVED_LEAD_ID, toStage: MOVE_TO_STAGE }, { timeout: 20000 });

  const patchCall = calls.find((c) => c.method === 'PATCH'
    && c.url.endsWith('/api/leads/' + MOVED_LEAD_ID + '/stage'));
  expect(patchCall, 'the drop sent a stage update for the right lead').toBeTruthy();
  expect(JSON.parse(patchCall.body), 'the stage update carries the new stage')
    .toEqual({ stage: MOVE_TO_STAGE });
  // Proof (mock): the /api-prefixed PATCH branch answered (not the
  // dead-branch fallback) and the id parsed from the fourth segment
  // mutated the store for the right lead.
  expect(patchCall.status, 'the mock answered the stage PATCH with 200')
    .toBe(200);
  expect(state.leads.find((l) => l.id === MOVED_LEAD_ID).stage,
    'the stage PATCH mutated the store for the right lead')
    .toBe(MOVE_TO_STAGE);
  const movedStats = await page.evaluate(({ leadId, fromStage, toStage }) => {
    const col = (stage) => document.querySelector('.kanban-column[data-stage="' + stage + '"]');
    const card = col(toStage).querySelector('.kanban-card[data-lead-id="' + leadId + '"]');
    return {
      fromCount: col(fromStage).querySelector('.kanban-count').textContent,
      toCount: col(toStage).querySelector('.kanban-count').textContent,
      cardStage: card ? card.dataset.leadStage : null,
    };
  }, { leadId: MOVED_LEAD_ID, fromStage: MOVE_FROM_STAGE, toStage: MOVE_TO_STAGE });
  const moved = state.leads.find((l) => l.id === MOVED_LEAD_ID);
  expect(moved.stage, 'the card now sits in the new stage').toBe(MOVE_TO_STAGE);
  expect(movedStats.cardStage).toBe(MOVE_TO_STAGE);
  expect(movedStats.fromCount, 'the source column count followed the move')
    .toBe(String(stageStats(state.leads, MOVE_FROM_STAGE).count));
  expect(movedStats.toCount, 'the target column count followed the move')
    .toBe(String(stageStats(state.leads, MOVE_TO_STAGE).count));

  // ── AC-1: the stage filter still applies to the board view ────────────
  await page.selectOption('#lead-filter-stage', 'qualified');
  await blurActive(page);
  await page.waitForFunction(() => {
    const qualified = document.querySelectorAll(
      '.kanban-column[data-stage="qualified"] .kanban-card');
    const others = document.querySelectorAll(
      '.kanban-column:not([data-stage="qualified"]) .kanban-card');
    return qualified.length === 80 && others.length === 0;
  }, { timeout: 15000 });
  const filteredNotes = await page.evaluate(() =>
    Array.from(document.querySelectorAll(
      '.kanban-column:not([data-stage="qualified"]) .kanban-empty-note'))
      .map((n) => n.textContent.trim()));
  expect(filteredNotes, 'the filtered-out columns show "No leads"')
    .toEqual(['No leads', 'No leads', 'No leads', 'No leads', 'No leads']);
  await page.selectOption('#lead-filter-stage', '');
  await blurActive(page);
  await page.waitForFunction(({ fromStage, expected }) =>
    document.querySelectorAll(
      '.kanban-column[data-stage="' + fromStage + '"] .kanban-card').length === expected,
    { fromStage: MOVE_FROM_STAGE, expected: stageStats(state.leads, MOVE_FROM_STAGE).count },
    { timeout: 15000 });

  // ── AC-1: K switches back to the list view ────────────────────────────
  await page.keyboard.press('k');
  await expect(page.locator('#leads-list')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 30000 });
  await expect(page.locator('#btn-toggle-kanban'),
    'the view button reads "Board" again in the list view').toHaveText('Board');

  // ── AC-4: with no leads the list shows a centred empty state ──────────
  state.leads = [];
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForFunction(
    () => document.getElementById('page-dashboard').classList.contains('active'),
    { timeout: 10000 });
  await page.evaluate(() => { location.hash = '#/leads'; });
  await page.waitForFunction(() =>
    document.querySelectorAll('#leads-list .lead-card').length === 0
      && !!document.querySelector('#leads-list .empty-state-card'),
    { timeout: 15000 });
  const emptyState = await page.evaluate(() => {
    const list = document.getElementById('leads-list');
    const card = list.querySelector('.empty-state-card');
    const lr = list.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return {
      text: card.textContent.trim(),
      dx: Math.abs((cr.left + cr.right) / 2 - (lr.left + lr.right) / 2),
      dy: Math.abs((cr.top + cr.bottom) / 2 - (lr.top + lr.bottom) / 2),
    };
  });
  expect(emptyState.text, 'the empty state has content').not.toBe('');
  expect(emptyState.dx, 'the empty state is centred horizontally').toBeLessThan(4);
  expect(emptyState.dy, 'the empty state is centred vertically').toBeLessThan(4);

  // The empty board shows "No leads" in every stage column.
  await page.keyboard.press('k');
  await expect(page.locator('#kanban-board')).toBeVisible();
  await page.waitForFunction(
    () => document.querySelectorAll('#kanban-board .kanban-empty-note').length === 6,
    { timeout: 15000 });
  const boardEmpty = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#kanban-board .kanban-empty-note'))
      .map((n) => n.textContent.trim()));
  expect(boardEmpty, 'every empty stage column shows "No leads"').toEqual(
    ['No leads', 'No leads', 'No leads', 'No leads', 'No leads', 'No leads']);
  await page.keyboard.press('k');
  await expect(page.locator('#leads-list')).toBeVisible();

  // ── AC-4: 390x844 — no horizontal page scroll in either view; the
  //    board scrolls sideways inside its own region ──────────────────────
  state.leads = makeLeads();
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForFunction(
    () => document.getElementById('page-dashboard').classList.contains('active'),
    { timeout: 10000 });
  await page.evaluate(() => { location.hash = '#/leads'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 30000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 300,
    { timeout: 10000 });
  const listNarrow = await page.evaluate(() => {
    window.scrollTo(500, 0);
    const canScrollX = window.scrollX > 0;
    window.scrollTo(0, 0);
    return { canScrollX };
  });
  expect(listNarrow.canScrollX, 'no horizontal page scroll at 390x844 (list view)').toBe(false);

  await page.keyboard.press('k');
  await expect(page.locator('#kanban-board')).toBeVisible();
  await page.waitForFunction(() => {
    const board = document.getElementById('kanban-board');
    return board.scrollWidth > board.clientWidth;
  }, { timeout: 15000 });
  const boardNarrow = await page.evaluate(() => {
    const board = document.getElementById('kanban-board');
    window.scrollTo(500, 0);
    const canScrollX = window.scrollX > 0;
    window.scrollTo(0, 0);
    return { canScrollX, boardScrollsX: board.scrollWidth > board.clientWidth };
  });
  expect(boardNarrow.canScrollX, 'no horizontal page scroll at 390x844 (board view)').toBe(false);
  expect(boardNarrow.boardScrollsX, 'the board scrolls sideways inside its own region')
    .toBe(true);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
