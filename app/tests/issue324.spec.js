// Issue #324 — lead CSV import accepts the stored source values and the
// labels the lead form shows.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  importLeadsCSV accepts the source values the application stores
//         and Export CSV writes (website, referral, social, cold-call,
//         event) and the labels the lead form shows, in any letter case
//         with surrounding spaces ignored ('Social Media' -> social,
//         'Cold Call' -> cold-call). Any other source is imported with no
//         source, as before. The source sent to POST /api/leads is always
//         a stored value or null — never a label.
//
//   AC-2  Signed in as an admin, a CSV file with the header row and column
//         order Export CSV writes (Name,Company,Email,Phone,Value,Stage,
//         Source,Notes) and six leads whose sources are social, cold-call,
//         Social Media, cold call, website and billboard is set on
//         #leads-csv-file-input. The bodies of the POST /api/leads
//         requests, matched by lead name, carry source social, cold-call,
//         social, cold-call, website and null.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the admin-only controls are absent
// while the page still renders, including across a full reload.

const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// The stored lead sources — what the app saves and Export CSV writes.
const STORED_SOURCES = ['website', 'referral', 'social', 'cold-call', 'event'];

// Header row + column order exactly as exportLeadsCSV() writes them.
const CSV_HEADER = 'Name,Company,Email,Phone,Value,Stage,Source,Notes';

// Six leads whose Source column covers every stored value, both form
// labels (one in Title Case, one lowercase with the label's inner space),
// and an unknown source that must import with no source.
const CSV_LEADS = [
  ['Alice Social', 'social'],
  ['Bob Call', 'cold-call'],
  ['Cara Label', 'Social Media'],
  ['Dan Space', 'cold call'],
  ['Eve Web', 'website'],
  ['Fred Billboard', 'billboard'],
];

const CSV_TEXT = [
  CSV_HEADER,
  ...CSV_LEADS.map(([name, source], i) =>
    '"' + name + '","Acme ' + (i + 1) + '",' +
    '"' + name.split(' ')[0].toLowerCase() + '@example.com","555-010' + i + '",' +
    '"' + (1000 * (i + 1)) + '","new","' + source + '",""'
  ),
].join('\n');

// The source each POST /api/leads body must carry, keyed by lead name.
const EXPECTED_SOURCE = {
  'Alice Social': 'social',
  'Bob Call': 'cold-call',
  'Cara Label': 'social',
  'Dan Space': 'cold-call',
  'Eve Web': 'website',
  'Fred Billboard': null,
};

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * The mock keeps an in-memory lead store: GET /leads returns it and
 * POST /leads appends (recording the request body in state.leadPosts).
 * POST /leads honours the backend's admin-only rule (403 for the viewer).
 *
 * Returns the shared mock state.
 */
async function boot(page, token) {
  const user = token === VIEWER_TOKEN
    ? { username: 'plain-user', sub: 'u1', roles: ['user'], display_name: 'Viewer One' }
    : { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const state = { leads: [], nextId: 1, leadPosts: [] };
  await page.addInitScript((cfg) => { window.AICRM_CONFIG = cfg; },
    { API_BASE_URL: 'http://localhost:9000/api' });
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    const json = (o, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/auth\/me/.test(url)) {
      // Mocked for THIS user. The production boot sends the hash token as a
      // Bearer header; after the hash is cleaned, reloads may arrive without
      // one and still resolve to the same user. A foreign token does not.
      const auth = req.headers()['authorization'] || '';
      if (auth && !auth.includes(token)) return json({ authenticated: false, user: null });
      return json({ authenticated: true, user });
    }
    if (/\/auth\/config/.test(url)) return json({ auth_enabled: true });
    if (/\/health/.test(url)) return json({ status: 'ok', app_version: '0.2.3' });
    if (/\/settings(\?|$)/.test(url)) {
      return json({ id: 1, payload: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
    }
    if (/\/leads(\?|$)/.test(url)) {
      if (req.method() === 'POST') {
        // POST /api/leads is admin-only on the backend.
        if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
        let body = null;
        try { body = req.postDataJSON(); } catch { body = null; }
        if (!body || !body.name) return json({ detail: 'name is required' }, 422);
        state.leadPosts.push(body);
        const lead = {
          id: 'lead-' + state.nextId++,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
          ...body,
        };
        state.leads.push(lead);
        return json(lead, 201);
      }
      return json(state.leads);
    }
    return json([]);
  });
  await page.goto(INDEX + '#access_token=' + encodeURIComponent(token));
  await page.waitForFunction(
    () => typeof App !== 'undefined' && !!document.getElementById('page-title'),
    { timeout: 20000 });
  await page.waitForFunction(
    () => typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  return state;
}

test('issue324 freeform', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // AC-2: the pass runs signed in as an admin.
  const state = await boot(page, ADMIN_TOKEN);
  await page.setViewportSize({ width: 1440, height: 900 });

  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'signed in as an admin').toEqual(['admin']);
  await expect(page.locator('#sidebar .sidebar-footer #auth-status .auth-username'))
    .toHaveText('Admin');

  await page.evaluate(() => { location.hash = '#/leads'; });
  await page.waitForFunction(
    () => document.getElementById('page-leads').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Leads');
  await expect(page.locator('#btn-import-leads-csv')).toBeVisible();

  // AC-2: set the CSV file on #leads-csv-file-input. Its header row and
  // column order are exactly what Export CSV writes; the six leads' Source
  // column is social, cold-call, Social Media, cold call, website,
  // billboard. The input's change handler runs the import.
  await page.setInputFiles('#leads-csv-file-input', {
    name: 'leads.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV_TEXT, 'utf8'),
  });

  // The import finishes with the success notification, after every row has
  // been POSTed and both views re-rendered.
  await expect(page.locator('.notification-success', { hasText: 'Imported 6 leads' }))
    .toBeVisible({ timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelectorAll('#leads-list .lead-card').length === 6,
    { timeout: 15000 });

  // AC-2: one POST /api/leads per row, all six lead names present.
  expect(state.leadPosts, 'the import sends one POST /api/leads per row')
    .toHaveLength(6);
  const postedNames = state.leadPosts.map((b) => b.name).sort();
  expect(postedNames, 'every imported lead was POSTed once, matched by name')
    .toEqual(Object.keys(EXPECTED_SOURCE).sort());

  // AC-2 + AC-1: the source per lead, matched by lead name, is the stored
  // value — social, cold-call, social, cold-call, website — and null for
  // the unknown source.
  const sourcesByName = {};
  for (const body of state.leadPosts) sourcesByName[body.name] = body.source;
  for (const [name, expected] of Object.entries(EXPECTED_SOURCE)) {
    expect(sourcesByName[name],
      'POST /api/leads for ' + name + ' carries the stored source (or null)')
      .toEqual(expected);
  }

  // AC-1: the source sent to POST /api/leads is always a stored value or
  // null — never a form label like 'social media' or 'cold call'.
  expect(state.leadPosts.every((b) => b.source === null || STORED_SOURCES.includes(b.source)),
    'no POST /api/leads body carries a label instead of a stored value')
    .toBe(true);
  expect(state.leadPosts.map((b) => b.source).filter((s) => s !== null).sort(),
    'the five known sources arrive as stored values, labels mapped')
    .toEqual(['cold-call', 'cold-call', 'social', 'social', 'website']);

  // The re-rendered list shows the six imported leads.
  const listNames = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#leads-list .lead-card .lead-row-name'))
      .map((el) => el.textContent));
  expect(listNames.sort(), 'the leads list re-renders with the six imported leads')
    .toEqual(Object.keys(EXPECTED_SOURCE).sort());

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('issue324 freeform (viewer)', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // Identity: the same production boot, but NON-ADMIN (role 'user').
  const state = await boot(page, VIEWER_TOKEN);
  await page.setViewportSize({ width: 1440, height: 900 });

  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'the viewer pass runs as a NON-ADMIN (role "user")').toEqual(['user']);
  await expect(page.locator('#sidebar .sidebar-footer #auth-status .auth-username'))
    .toHaveText('Viewer One');

  // The page still renders: the Leads page opens and lists the leads from
  // the (authentication-only) GET /api/leads.
  await page.evaluate(() => { location.hash = '#/leads'; });
  await page.waitForFunction(
    () => document.getElementById('page-leads').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Leads');
  await expect(page.locator('#leads-list')).toBeVisible();

  // The admin-only controls are absent for the non-admin.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .every((el) => el.offsetParent === null),
    { timeout: 10000 });
  const adminOnlyVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.tagName));
  expect(adminOnlyVisible, 'no admin-only control may be visible to a non-admin')
    .toEqual([]);
  for (const id of ['btn-add-contact', 'btn-import-csv', 'btn-add-template', 'btn-add-company']) {
    await expect(page.locator('#' + id), id + ' is admin-only').toBeHidden();
  }

  // A full reload keeps the viewer role: the page still renders and the
  // admin-only controls stay absent.
  await page.reload();
  await page.waitForFunction(
    () => Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles)).toEqual(['user']);
  await page.waitForFunction(
    () => document.getElementById('page-leads').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Leads');
  const adminOnlyVisibleAfterReload = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.tagName));
  expect(adminOnlyVisibleAfterReload,
    'after reload, no admin-only control may be visible to a non-admin').toEqual([]);

  expect(state.leadPosts, 'the viewer issues no POST /api/leads').toHaveLength(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
