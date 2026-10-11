// Proof for issue #311 — the Dashboard page (#page-dashboard) follows the
// Overview pattern of docs/design/design-system.md.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user. 50 recent activities, 50 recent contacts and 50 recent
// leads are mocked.
//
//   AC-1  At 1440x900 the seven value tiles (#stat-*) sit in one row (each
//         tile's top within 4 px of the first one's), as value tiles without
//         emoji: a label above, and a figure in IBM Plex Mono with tabular
//         numbers; the money tiles read whole dollars. The six cards form a
//         grid of three columns and two rows; each card has its title in the
//         card header and a body that scrolls on its own. "Export PDF
//         Report" sits in the page header's actions as a secondary button,
//         without emoji. With the 50-item lists the document does not scroll
//         and the content region does not scroll either — only card bodies
//         do; the #recent-contacts card body scrolls. At 900 px and below
//         the tiles wrap and the cards stack in one column, with no
//         horizontal page scroll at 390x844. Every existing id stays,
//         including the seven #stat-* figures, #recent-activities,
//         #lead-pipeline-overview and its #pipeline-* children,
//         #recommended-actions, #recent-contacts, #recent-leads,
//         #activity-trend-overview, #activity-trend-chart and
//         #btn-export-pdf, and the .recent-item rows and the classes app.js
//         renders into.
//   AC-3  The Dashboard renders as a fixed-height two-row grid (value tile
//         row plus a 3x2 card grid) using minmax(0, 1fr), so only card
//         bodies scroll and the page does not; the app.js data contracts
//         are untouched (the page renders from the standard snake_case API
//         payloads this proof mocks).
const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';

// Emoji ranges: pictographs/symbols, arrows, misc technical, VS-16.
const EMOJI_SRC = '[\\u{1F000}-\\u{1FAFF}\\u{2190}-\\u{2BFF}\\u{2300}-\\u{23FF}\\uFE0F]';
const EMOJI_RE = new RegExp(EMOJI_SRC, 'u');

const STAT_FIGURES = [
  'stat-total-contacts', 'stat-total-leads', 'stat-converted-leads',
  'stat-today-activities', 'stat-pipeline-value', 'stat-won-revenue',
  'stat-overdue-activities',
];
const REQUIRED_IDS = [
  ...STAT_FIGURES,
  'recent-activities',
  'lead-pipeline-overview',
  'pipeline-new', 'pipeline-new-value',
  'pipeline-contacted', 'pipeline-contacted-value',
  'pipeline-qualified', 'pipeline-qualified-value',
  'pipeline-proposal', 'pipeline-proposal-value',
  'pipeline-won', 'pipeline-won-value',
  'recommended-actions', 'recent-contacts', 'recent-leads',
  'activity-trend-overview', 'activity-trend-chart', 'activity-trend-legend',
  'btn-export-pdf',
];
// The #pipeline-* children named by the kept-ids clause, as children of
// #lead-pipeline-overview.
const PIPELINE_CHILDREN = [
  'pipeline-new', 'pipeline-new-value',
  'pipeline-contacted', 'pipeline-contacted-value',
  'pipeline-qualified', 'pipeline-qualified-value',
  'pipeline-proposal', 'pipeline-proposal-value',
  'pipeline-won', 'pipeline-won-value',
];
const CARD_TITLES = [
  'Recent Activities', 'Lead Pipeline', 'Recommended Actions',
  'Recent Contacts', 'Recent Leads', 'Activity Trends',
];

function makeContacts(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - (i % 30) * 86400000).toISOString();
    out.push({
      id: 'c-' + String(i + 1).padStart(3, '0'),
      name: 'Contact ' + String(i + 1).padStart(3, '0'),
      email: i % 5 === 4 ? null : 'contact' + (i + 1) + '@example.com',
      phone: null,
      company: i % 2 === 0 ? 'Acme Corp' : null,
      status: 'active',
      notes: null,
      tags: [],
      created_at: d,
      updated_at: d,
    });
  }
  return out;
}

function makeLeads(n) {
  const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - (i % 30) * 86400000).toISOString();
    out.push({
      id: 'l-' + String(i + 1).padStart(3, '0'),
      name: 'Lead ' + String(i + 1).padStart(3, '0'),
      email: 'lead' + (i + 1) + '@example.com',
      company: i % 2 === 0 ? 'Acme Corp' : null,
      stage: stages[i % 6],
      source: 'website',
      value: ((i % 10) + 1) * 25000,
      created_at: d,
      updated_at: d,
    });
  }
  return out;
}

function makeActivities(n) {
  const types = ['call', 'email', 'meeting', 'note', 'task'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - (i % 30) * 86400000).toISOString();
    out.push({
      id: 'act-' + String(i + 1).padStart(3, '0'),
      type: types[i % 5],
      description: 'Activity ' + String(i + 1).padStart(3, '0'),
      contact_name: 'Contact ' + String((i % 50) + 1).padStart(3, '0'),
      lead_id: i % 3 === 0 ? 'l-' + String((i % 50) + 1).padStart(3, '0') : null,
      occurred_at: d,
      due_date: null,
      status: i % 4 === 0 ? 'done' : 'pending',
    });
  }
  return out;
}

// The /analytics/activity-trends payload the backend would return for the
// mocked activities (range=30d, group=day).
function trendPayload(activities) {
  const types = ['call', 'email', 'meeting', 'note', 'task'];
  const buckets = [];
  let peakBucket = '';
  let peakTotal = -1;
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const dayActs = activities.filter((a) => a.occurred_at.slice(0, 10) === key);
    const bucket = { bucket_date: key, total: dayActs.length };
    for (const t of types) bucket[t] = dayActs.filter((a) => a.type === t).length;
    if (bucket.total > peakTotal) {
      peakTotal = bucket.total;
      peakBucket = key;
    }
    buckets.push(bucket);
  }
  return {
    total_activities: buckets.reduce((s, b) => s + b.total, 0),
    peak_count: Math.max(0, peakTotal),
    peak_bucket: peakBucket,
    group: 'day',
    buckets,
  };
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
  const user = { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
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
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    calls.push({ method: req.method(), url, auth: req.headers()['authorization'] || '' });
    const json = (o) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/auth\/me/.test(url)) {
      // A foreign token does not authenticate.
      const auth = req.headers()['authorization'] || '';
      if (auth && !auth.includes(token)) return json({ authenticated: false, user: null });
      return json({ authenticated: true, user });
    }
    if (/\/auth\/config/.test(url)) return json({ auth_enabled: true });
    if (/\/health/.test(url)) return json({ status: 'ok', app_version: '0.2.3' });
    if (/\/contacts(\b|\?|$)/.test(url)) return json(pageSlice(data.contacts, url));
    if (/\/leads(\b|\?|$)/.test(url)) return json(pageSlice(data.leads, url));
    if (/\/activities(\b|\?|$)/.test(url)) return json(pageSlice(data.activities, url));
    if (/\/analytics\/activity-trends/.test(url)) return json(trendPayload(data.activities));
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

test('issue311 freeform', async ({ page }) => {
  test.setTimeout(180000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  // 50 recent activities, 50 recent contacts and 50 recent leads — mocked.
  const data = {
    contacts: makeContacts(50),
    leads: makeLeads(50),
    activities: makeActivities(50),
  };
  const calls = await boot(page, ADMIN_TOKEN, data);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The production boot sent the hash token as a Bearer header.
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + ADMIN_TOKEN),
    { timeout: 10000 }).toBe(true);

  // The dashboard reaches its terminal state on the 50-item lists.
  await page.waitForFunction(() => {
    const stats = document.getElementById('stat-total-contacts');
    const recent = document.getElementById('recent-contacts');
    return stats && stats.textContent === '50'
      && recent.querySelectorAll('.recent-item').length === 5
      && document.querySelectorAll('#recommended-actions .recommendation-item').length === 3
      && document.querySelectorAll('#activity-trend-chart .trend-bar-group').length === 30;
  }, { timeout: 30000 });

  // ── AC-1: the seven value tiles sit in one row at 1440x900 ──────────────
  const tiles = await page.evaluate(() => Array.from(
    document.querySelectorAll('#page-dashboard .stats-grid .stat-card')).map((el) => {
      const r = el.getBoundingClientRect();
      const label = el.querySelector('.stat-label');
      const figure = el.querySelector('h3');
      const lr = label ? label.getBoundingClientRect() : null;
      const fr = figure ? figure.getBoundingClientRect() : null;
      const fcs = figure ? getComputedStyle(figure) : null;
      return {
        id: figure ? figure.id : '',
        top: r.top,
        left: r.left,
        bottom: r.bottom,
        width: r.width,
        label: label ? label.textContent.trim() : '',
        labelTop: lr ? lr.top : null,
        figureTop: fr ? fr.top : null,
        figureText: figure ? figure.textContent.trim() : '',
        fontFamily: fcs ? fcs.fontFamily : '',
        fontVariantNumeric: fcs ? fcs.fontVariantNumeric : '',
      };
    }));
  expect(tiles.map((t) => t.id), 'the seven #stat-* figures, in order').toEqual(STAT_FIGURES);
  const firstTop = tiles[0].top;
  for (const t of tiles) {
    expect(Math.abs(t.top - firstTop), `tile ${t.id} top within 4 px of the first one's`)
      .toBeLessThanOrEqual(4);
    expect(Math.abs(t.bottom - tiles[0].bottom), `tile ${t.id} in the same row`)
      .toBeLessThanOrEqual(4);
    expect(t.width, `tile ${t.id} has width`).toBeGreaterThan(0);
    expect(t.label, `tile ${t.id} has a label`).not.toBe('');
    expect(EMOJI_RE.test(t.label), `no emoji in the tile label "${t.label}"`).toBe(false);
    expect(t.labelTop < t.figureTop, `tile ${t.id}: the label sits above the figure`).toBe(true);
    expect(t.fontFamily.toLowerCase(), `tile ${t.id} figure in IBM Plex Mono`)
      .toContain('ibm plex mono');
    expect(t.fontVariantNumeric, `tile ${t.id} figure uses tabular numbers`).toBe('tabular-nums');
  }
  expect(new Set(tiles.map((t) => Math.round(t.left))).size, 'one row: seven distinct lefts')
    .toBe(7);
  const figures = Object.fromEntries(tiles.map((t) => [t.id, t.figureText]));
  expect(figures['stat-total-contacts'], 'total contacts figure').toBe('50');
  expect(figures['stat-total-leads'], 'total leads figure').toBe('50');
  // The money tiles read whole dollars.
  expect(figures['stat-pipeline-value'], 'pipeline value in whole dollars')
    .toMatch(/^\$[\d,]+$/);
  expect(figures['stat-won-revenue'], 'won revenue in whole dollars')
    .toMatch(/^\$[\d,]+$/);
  expect(figures['stat-pipeline-value']).not.toBe('$0');
  expect(figures['stat-won-revenue']).not.toBe('$0');

  // ── AC-1: six cards in three columns and two rows, title in the header ──
  const cards = await page.evaluate(() => Array.from(
    document.querySelectorAll('#page-dashboard .dashboard-card')).map((el) => {
      const r = el.getBoundingClientRect();
      const header = el.querySelector('.dashboard-card-header, .dashboard-card-header-row');
      const titleEl = header ? header.querySelector('h3') : null;
      const body = el.querySelector('.dashboard-card-body');
      return {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        hasHeader: !!header,
        title: titleEl ? titleEl.textContent.trim() : '',
        bodyVisible: body ? body.clientWidth > 0 && body.clientHeight > 0 : false,
        bodyScrolls: body ? body.scrollHeight > body.clientHeight : false,
      };
    }));
  expect(cards, 'the six cards').toHaveLength(6);
  expect(new Set(cards.map((c) => Math.round(c.left))).size, 'the cards form three columns')
    .toBe(3);
  expect(new Set(cards.map((c) => Math.round(c.top))).size, 'the cards form two rows')
    .toBe(2);
  expect(cards.map((c) => c.title).sort(), 'the card titles')
    .toEqual([...CARD_TITLES].sort());
  for (const c of cards) {
    expect(c.hasHeader, `card "${c.title}" has a card header`).toBe(true);
    expect(EMOJI_RE.test(c.title), `no emoji in the card title "${c.title}"`).toBe(false);
    expect(c.width > 0 && c.height > 0, `card "${c.title}" is laid out`).toBe(true);
    expect(c.bodyVisible, `card "${c.title}" body is laid out`).toBe(true);
  }
  // The #recent-contacts card body scrolls on its own.
  const contactsCard = cards.find((c) => c.title === 'Recent Contacts');
  expect(contactsCard, 'the Recent Contacts card is one of the six cards').toBeTruthy();
  expect(contactsCard.bodyScrolls, 'the #recent-contacts card body scrolls on its own')
    .toBe(true);

  // ── AC-1: "Export PDF Report" in the page header's actions ──────────────
  const exportBtn = await page.evaluate(() => {
    const btn = document.getElementById('btn-export-pdf');
    const header = document.querySelector('.top-header');
    return {
      tag: btn ? btn.tagName : '',
      inHeader: header && btn ? header.contains(btn) : false,
      visible: btn ? btn.offsetParent !== null : false,
      classes: btn ? btn.className : '',
      text: btn ? btn.textContent.trim() : '',
    };
  });
  expect(exportBtn.tag, 'the export control is a real button').toBe('BUTTON');
  expect(exportBtn.inHeader, '"Export PDF Report" is in the page header').toBe(true);
  expect(exportBtn.visible, 'the export button is visible on the Dashboard').toBe(true);
  expect(exportBtn.classes, 'the export button is secondary').toContain('btn-secondary');
  expect(exportBtn.text, 'the export button label').toBe('Export PDF Report');
  expect(EMOJI_RE.test(exportBtn.text), 'no emoji in the export button').toBe(false);

  // ── AC-1: every existing id stays ───────────────────────────────────────
  const missingIds = await page.evaluate((ids) =>
    ids.filter((id) => !document.getElementById(id)), REQUIRED_IDS);
  expect(missingIds, `missing ids: ${missingIds.join(', ')}`).toEqual([]);

  // The .recent-item rows and the classes app.js renders into are intact.
  const rendered = await page.evaluate(() => ({
    recentItems: document.querySelectorAll('#page-dashboard .recent-item').length,
    recentContactItems: document.querySelectorAll('#recent-contacts .recent-item').length,
    recentLeadItems: document.querySelectorAll('#recent-leads .recent-item').length,
    activityItems: document.querySelectorAll('#recent-activities .activity-item').length,
    recommendationItems: document.querySelectorAll('#recommended-actions .recommendation-item').length,
    pipelineStages: document.querySelectorAll('#lead-pipeline-overview .pipeline-stage').length,
    trendBars: document.querySelectorAll('#activity-trend-chart .trend-bar-group').length,
    trendStats: document.querySelectorAll('#activity-trend-overview .trend-stat').length,
  }));
  expect(rendered.recentContactItems, '#recent-contacts renders .recent-item rows').toBe(5);
  expect(rendered.recentLeadItems, '#recent-leads renders .recent-item rows').toBe(5);
  expect(rendered.recentItems, 'the dashboard renders .recent-item rows').toBe(10);
  expect(rendered.activityItems, '#recent-activities renders .activity-item rows').toBe(5);
  expect(rendered.recommendationItems, '#recommended-actions renders .recommendation-item rows').toBe(3);
  expect(rendered.pipelineStages, '#lead-pipeline-overview renders the five #pipeline-* stages')
    .toBe(5);
  expect(rendered.trendBars, '#activity-trend-chart renders the 30 daily buckets').toBe(30);
  expect(rendered.trendStats, '#activity-trend-overview renders the summary stats').toBe(3);

  // The kept-ids parent-child clause: every #pipeline-* child sits inside
  // #lead-pipeline-overview, and #lead-pipeline-overview sits inside the
  // Lead Pipeline card.
  const pipelineParentChild = await page.evaluate((children) => {
    const parent = document.getElementById('lead-pipeline-overview');
    if (!parent) return { parent: false, outside: children, inCard: false, cardTitle: '' };
    const outside = children.filter((id) => {
      const el = document.getElementById(id);
      return !el || !parent.contains(el);
    });
    const card = parent.closest('#page-dashboard .dashboard-card');
    const title = card ? card.querySelector('.dashboard-card-header h3') : null;
    return {
      parent: true,
      outside,
      inCard: !!card,
      cardTitle: title ? title.textContent.trim() : '',
    };
  }, PIPELINE_CHILDREN);
  expect(pipelineParentChild.parent, '#lead-pipeline-overview is present').toBe(true);
  expect(pipelineParentChild.outside,
    `#pipeline-* children outside #lead-pipeline-overview: ${pipelineParentChild.outside.join(', ')}`)
    .toEqual([]);
  expect(pipelineParentChild.inCard, '#lead-pipeline-overview sits in the Lead Pipeline card')
    .toBe(true);
  expect(pipelineParentChild.cardTitle, 'the parent card is the Lead Pipeline card')
    .toBe('Lead Pipeline');

  // ── AC-1: with the 50-item lists, neither the document nor the content
  //    region scrolls; only card bodies do ─────────────────────────────────
  const scrollState = await page.evaluate(() => {
    const de = document.documentElement;
    const region = document.getElementById('page-container');
    const body = document.querySelector(
      '#page-dashboard .dashboard-card:has(#recent-contacts) .dashboard-card-body');
    return {
      docVertical: de.scrollHeight > de.clientHeight,
      docHorizontal: de.scrollWidth > de.clientWidth,
      regionVertical: region.scrollHeight > region.clientHeight,
      regionHorizontal: region.scrollWidth > region.clientWidth,
      bodyFound: !!body,
      bodyScrolls: body ? body.scrollHeight > body.clientHeight : false,
    };
  });
  expect(scrollState.docVertical, 'no document scroll at 1440x900').toBe(false);
  expect(scrollState.docHorizontal, 'no horizontal document scroll at 1440x900').toBe(false);
  expect(scrollState.regionVertical, 'no content-region scroll at 1440x900').toBe(false);
  expect(scrollState.regionHorizontal, 'no horizontal content-region scroll').toBe(false);
  expect(scrollState.bodyFound, 'found the #recent-contacts card body').toBe(true);
  expect(scrollState.bodyScrolls, 'the #recent-contacts card body scrolls').toBe(true);

  // ── AC-3: fixed-height two-row grid (tile row + minmax(0,1fr) card grid) ─
  // The computed style resolves every track to its used px, so the
  // minmax(0,1fr) behaviour is proven by what the layout does: exactly two
  // tracks, the card row filling precisely the space the tile row leaves in
  // the fixed-height grid (and the 50-item lists above already proved the
  // row shrinks below its content — the minmax(0, ...) part — or the page
  // would scroll).
  const grid = await page.evaluate(() => {
    const dash = document.getElementById('page-dashboard');
    const cs = getComputedStyle(dash);
    const region = document.getElementById('page-container');
    const rcs = getComputedStyle(region);
    const dashRect = dash.getBoundingClientRect();
    const cardGrid = dash.querySelector('.dashboard-grid');
    return {
      display: cs.display,
      rows: cs.gridTemplateRows,
      dashHeight: dashRect.height,
      dashContentBottom: dashRect.bottom
        - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth),
      cardGridBottom: cardGrid.getBoundingClientRect().bottom,
      regionContent: region.clientHeight
        - parseFloat(rcs.paddingTop) - parseFloat(rcs.paddingBottom),
    };
  });
  expect(grid.display, 'the Dashboard is a grid').toBe('grid');
  expect(grid.rows, 'two rows: the tile row plus the minmax(0,1fr) card row')
    .toMatch(/^\d+(\.\d+)?px\s+\d+(\.\d+)?px$/);
  expect(Math.abs(grid.cardGridBottom - grid.dashContentBottom),
    'the card row is 1fr: it fills the space the tile row leaves')
    .toBeLessThanOrEqual(1);
  expect(Math.abs(grid.dashHeight - grid.regionContent),
    'fixed height: the Dashboard fills the content region')
    .toBeLessThanOrEqual(1);

  // Terminal state: no loading placeholder left behind.
  const stuck = await page.evaluate(() => Array.from(document.querySelectorAll('#page-dashboard *'))
    .filter((el) => el.children.length === 0)
    .map((el) => (el.textContent || '').trim())
    .filter((t) => t === 'Loading\u2026' || t === 'Loading...'
      || t.startsWith('Loading data')));
  expect(stuck, 'no loading placeholder remains').toEqual([]);

  // ── AC-1: at 390x844 the tiles wrap, the cards stack in one column, and
  //    there is no horizontal page scroll ──────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const narrow = await page.evaluate(() => {
    const de = document.documentElement;
    const tileTops = Array.from(
      document.querySelectorAll('#page-dashboard .stats-grid .stat-card'))
      .map((el) => Math.round(el.getBoundingClientRect().top));
    const cardLefts = Array.from(
      document.querySelectorAll('#page-dashboard .dashboard-card'))
      .map((el) => Math.round(el.getBoundingClientRect().left));
    window.scrollTo(100, 0);
    const scrolledX = window.scrollX > 0;
    window.scrollTo(0, 0);
    return {
      tileRows: new Set(tileTops).size,
      cardColumns: new Set(cardLefts).size,
      docHorizontal: de.scrollWidth > de.clientWidth,
      scrolledX,
    };
  });
  expect(narrow.tileRows, 'the tiles wrap at <= 900 px').toBeGreaterThan(1);
  expect(narrow.cardColumns, 'the cards stack in one column at <= 900 px').toBe(1);
  expect(narrow.docHorizontal, 'no horizontal page scroll at 390x844').toBe(false);
  expect(narrow.scrolledX, 'the page cannot be scrolled sideways at 390x844').toBe(false);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
