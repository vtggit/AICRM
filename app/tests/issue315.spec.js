// Proof for issue #315 — the Contacts detail pane (#contact-detail-pane)
// keeps "last selection wins" while detail loads are in flight, and an open
// email form (#contact-email-form) survives list re-renders.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-2  The send-gate response (GET /api/suppressions/may-send) for one
//         contact is delayed by about a second in the mocked route, and the
//         others are answered at once. Clicking the delayed contact and
//         then another contact leaves the second contact's name in the pane
//         heading and aria-current="true" on the second contact's row —
//         both before and after the delayed response arrives. With the
//         email form open and text typed into its subject and body, changing
//         #contact-sort and then #contact-filter-status re-renders the list
//         while the form stays in the pane with the typed text; Cancel then
//         shows that contact's detail. The first contact is still selected
//         when the page opens, and no page error is raised. The delay is
//         made in the mocked route, not with a fixed wait in the page.
const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';

// The contact whose send-gate verdict is delayed in the mocked route.
const DELAYED_CONTACT = 'Contact 002';
const DELAYED_EMAIL = 'contact2@example.com';
// The contact selected right after the delayed one (the "other" contact).
const OTHER_CONTACT = 'Contact 003';
// The about-a-second gate delay, produced in the mocked route below.
const GATE_DELAY_MS = 1200;
// A hostile lead stage from the mocked /leads response: interpolated
// unescaped into the recent-leads card it would terminate the badge's class
// attribute and inject an <img> element into the dashboard.
const HOSTILE_STAGE = 'proposal"><img src="x" alt="stage-injected">';

const CONTACTS = [
  {
    id: 'c-001', name: 'Contact 001', email: 'contact1@example.com',
    phone: null, company: 'Acme Corp', status: 'active', notes: null, tags: [],
    created_at: '2026-01-05T08:00:00Z', updated_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'c-002', name: 'Contact 002', email: 'contact2@example.com',
    phone: null, company: null, status: 'active', notes: null, tags: [],
    created_at: '2026-01-04T08:00:00Z', updated_at: '2026-01-04T08:00:00Z',
  },
  {
    id: 'c-003', name: 'Contact 003', email: 'contact3@example.com',
    phone: null, company: null, status: 'active', notes: null, tags: [],
    created_at: '2026-01-03T08:00:00Z', updated_at: '2026-01-03T08:00:00Z',
  },
  {
    id: 'c-004', name: 'Contact 004', email: 'contact4@example.com',
    phone: null, company: 'Globex', status: 'vip', notes: null, tags: [],
    created_at: '2026-01-02T08:00:00Z', updated_at: '2026-01-02T08:00:00Z',
  },
  {
    id: 'c-005', name: 'Contact 005', email: 'contact5@example.com',
    phone: null, company: null, status: 'inactive', notes: null, tags: [],
    created_at: '2026-01-01T08:00:00Z', updated_at: '2026-01-01T08:00:00Z',
  },
];

const ACTIVITIES = [
  {
    id: 'act-1', type: 'call', description: 'Intro call',
    contact_name: 'Contact 003', occurred_at: '2026-09-01T10:00:00Z', status: 'done',
  },
];

// One lead whose stage is hostile markup (the dashboard renders it in the
// recent-leads card, which must keep it inert).
const LEADS = [
  {
    id: 'lead-1', name: 'Initech expansion', email: null, phone: null,
    company: 'Initech', stage: HOSTILE_STAGE, value: 25000, source: 'web',
    created_at: '2026-09-05T09:00:00Z', updated_at: '2026-09-05T09:00:00Z',
  },
];

/**
 * Boot the app the production way (file:// index, hash token) with every
 * API call mocked. The send-gate route delays the verdict for DELAYED_EMAIL
 * by about a second — the delay lives in the mocked route, never in the
 * page. Returns the recorded API calls (method, url, authorization header).
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
  await page.route('**/api/**', async (route) => {
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
    if (/\/contacts(\b|\?|$)/.test(url)) return json(pageSlice(data.contacts, url));
    if (/\/suppressions\/may-send/.test(url)) {
      const email = new URL(url).searchParams.get('email') || '';
      // About a second of latency for the delayed contact's verdict; the
      // other addresses are answered at once.
      if (email === DELAYED_EMAIL) {
        await new Promise((resolve) => setTimeout(resolve, GATE_DELAY_MS));
      }
      return json({ may_send: true, reasons: [] });
    }
    if (/\/activities(\b|\?|$)/.test(url)) return json(pageSlice(data.activities, url));
    if (/\/leads(\b|\?|$)/.test(url)) return json(pageSlice(data.leads, url));
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

const row = (page, name) =>
  page.locator('#contacts-list .contact-card:has(h4:text-is("' + name + '"))');

test('issue315 freeform', async ({ page }) => {
  test.setTimeout(180000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  const calls = await boot(page, ADMIN_TOKEN, { contacts: CONTACTS, activities: ACTIVITIES, leads: LEADS });
  await page.setViewportSize({ width: 1440, height: 900 });

  // The production boot sent the hash token as a Bearer header.
  await expect.poll(
    () => calls.some((c) => /\/auth\/me/.test(c.url) && c.auth === 'Bearer ' + ADMIN_TOKEN),
    { timeout: 10000 }).toBe(true);

  // ── Dashboard (open on boot): a hostile lead stage stays inert ─────────
  // The recent-leads card renders the mocked lead whose stage would forge
  // markup (close the class attribute, inject an <img>) if interpolated
  // unescaped: it must appear only as text inside the badge.
  await page.waitForFunction(
    () => !!document.querySelector('#recent-leads .recent-item'),
    { timeout: 30000 });
  const stageCard = await page.evaluate(() => {
    const meta = document.querySelector('#recent-leads .recent-item-meta');
    const badge = meta ? meta.querySelector('span.badge') : null;
    return {
      rendered: !!(meta && badge),
      injectedElements: meta
        ? meta.querySelectorAll('img,script,button,input,link,style').length
        : -1,
      badgeText: badge ? badge.textContent : null,
    };
  });
  expect(stageCard.rendered, 'the recent-leads card rendered the hostile-stage lead')
    .toBe(true);
  expect(stageCard.injectedElements,
    'the hostile stage must not inject elements into the recent-leads card')
    .toBe(0);
  expect(stageCard.badgeText, 'the hostile stage renders as inert badge text')
    .toBe(HOSTILE_STAGE);

  // ── Open the Contacts page; the first contact is selected ──────────────
  await page.evaluate(() => { location.hash = '#/contacts'; });
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 5,
    { timeout: 30000 });
  await page.waitForFunction(
    () => !!document.querySelector('#contact-detail-pane .contact-detail-view'),
    { timeout: 30000 });

  await expect(row(page, 'Contact 001')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#contacts-list .contact-card[aria-current="true"]'))
    .toHaveCount(1);
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText('Contact 001');

  // ── Click the delayed contact, then the other contact ──────────────────
  // The send-gate for Contact 002's address is delayed by about a second in
  // the mocked route; the other verdicts answer at once.
  const delayedGate = page.waitForResponse(
    (r) => /\/suppressions\/may-send/.test(r.url())
      && r.url().includes('email=' + encodeURIComponent(DELAYED_EMAIL)),
    { timeout: 15000 });
  await row(page, DELAYED_CONTACT).locator('h4').click();
  await row(page, OTHER_CONTACT).locator('h4').click();

  // Before the delayed response arrives: the pane heading names the second
  // contact, and aria-current="true" sits on the second contact's row — the
  // earlier (still loading) detail must not have written the pane.
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'),
    'heading before the delayed gate resolves')
    .toHaveText(OTHER_CONTACT, { timeout: 1000 });
  await expect(row(page, OTHER_CONTACT),
    'aria-current on the second row before the delayed gate resolves')
    .toHaveAttribute('aria-current', 'true', { timeout: 1000 });
  await expect(page.locator('#contacts-list .contact-card[aria-current="true"]'),
    'exactly one current row before the delayed gate resolves')
    .toHaveCount(1);

  // Let the delayed response arrive (its latency is the mocked route's),
  // then give the page a moment to process it.
  await delayedGate;
  await page.waitForTimeout(200);

  // After the delayed response arrives: the pane still shows the second
  // contact — the earlier load wrote nothing when it finished.
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'),
    'heading after the delayed gate resolves')
    .toHaveText(OTHER_CONTACT);
  await expect(row(page, OTHER_CONTACT),
    'aria-current on the second row after the delayed gate resolves')
    .toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#contacts-list .contact-card[aria-current="true"]'),
    'exactly one current row after the delayed gate resolves')
    .toHaveCount(1);
  // The pane heading and the aria-current row always name the same contact.
  const heading = (await page.locator('#contact-detail-pane .contact-detail-view h3')
    .textContent()).trim();
  const currentRow = (await page.locator(
    '#contacts-list .contact-card[aria-current="true"] h4').textContent()).trim();
  expect(heading, 'pane heading and aria-current row name the same contact')
    .toBe(currentRow);

  // ── Open the email form and type into it ───────────────────────────────
  await page.locator('#contact-detail-pane #contact-email-btn').click();
  await expect(page.locator('#contact-detail-pane #contact-email-form'))
    .toBeVisible();
  const subjectText = 'Sync on the Q4 rollout';
  const bodyText = 'Hi — following up on yesterday\'s call. Can we sync on the Q4 rollout?';
  await page.locator('#contact-email-subject').fill(subjectText);
  await page.locator('#contact-email-body').fill(bodyText);

  // Mark the currently rendered rows so a list re-render is observable:
  // after a re-render the rows are fresh nodes without the mark.
  await page.evaluate(() => {
    document.querySelectorAll('#contacts-list .contact-card')
      .forEach((el) => { el.dataset.r315mark = '1'; });
  });

  // Changing #contact-sort re-renders the list while the form stays in the
  // pane, with the text typed into its fields unchanged.
  await page.locator('#contact-sort').selectOption('name-desc');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card[data-r315mark="1"]').length === 0,
    { timeout: 10000 });
  await expect(page.locator('#contact-detail-pane #contact-email-form'),
    'the form stays in the pane after the sort re-render')
    .toBeVisible();
  expect(await page.locator('#contact-email-subject').inputValue(),
    'the typed subject is unchanged after the sort re-render').toBe(subjectText);
  expect(await page.locator('#contact-email-body').inputValue(),
    'the typed body is unchanged after the sort re-render').toBe(bodyText);
  await expect(row(page, OTHER_CONTACT),
    'the form owner keeps the selected row after the sort re-render')
    .toHaveAttribute('aria-current', 'true');

  // Changing #contact-filter-status re-renders the list again while the
  // form stays in the pane, with the typed text unchanged.
  await page.locator('#contact-filter-status').selectOption('active');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 3
      && document.querySelectorAll('#contacts-list .contact-card[data-r315mark="1"]').length === 0,
    { timeout: 10000 });
  await expect(page.locator('#contact-detail-pane #contact-email-form'),
    'the form stays in the pane after the filter re-render')
    .toBeVisible();
  expect(await page.locator('#contact-email-subject').inputValue(),
    'the typed subject is unchanged after the filter re-render').toBe(subjectText);
  expect(await page.locator('#contact-email-body').inputValue(),
    'the typed body is unchanged after the filter re-render').toBe(bodyText);
  await expect(row(page, OTHER_CONTACT),
    'the form owner keeps the selected row after the filter re-render')
    .toHaveAttribute('aria-current', 'true');

  // Cancel returns the pane to that contact's detail.
  await page.locator('#contact-email-cancel').click();
  await expect(page.locator('#contact-email-form'), 'the form is gone after Cancel')
    .toHaveCount(0);
  await expect(page.locator('#contact-detail-pane .contact-detail-view'),
    'the pane shows the contact detail after Cancel')
    .toBeVisible();
  await expect(page.locator('#contact-detail-pane .contact-detail-view h3'))
    .toHaveText(OTHER_CONTACT);

  // No page error was raised along the way.
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
