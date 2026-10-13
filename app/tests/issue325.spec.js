// Issue #325 — the Contacts bulk action bar's "Add Tag" (#btn-bulk-tag)
// assigns the tag chosen in #bulk-tag-select to every selected contact.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  "Add Tag" takes each selected contact's current tags from the
//         contact records the page already loaded (the tags list on each
//         contact from GET /api/contacts) and, for a contact that does not
//         have the chosen tag, calls ContactsDataSource.setContactTags
//         with the contact's current tag ids and the chosen one —
//         PUT /api/tags/contacts/{contact_id}/tags. A contact that already
//         has the tag gets no request. When every request succeeds the
//         page shows a success notification; when any request fails it
//         shows an error notification and does not count that contact as
//         tagged. applyBulkTags() no longer calls getContactTags.
//
//   AC-2  Signed in as an admin, with three mocked contacts — one with no
//         tags, one with tag t1 and one with tag t2 — all three are
//         selected, t2 is chosen in #bulk-tag-select and "Add Tag" is
//         pressed. Exactly two PUT /api/tags/contacts/{contact_id}/tags
//         requests are sent: tag_ids ["t2"] for the first contact and
//         ["t1", "t2"] for the second, and none for the third. A success
//         notification is shown. With the PUT for one contact answered
//         with 500, an error notification is shown. No page error is
//         raised in either case.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the admin-only controls are absent
// while the page still renders, including across a full reload.

const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// The tag definitions served by GET /api/tags and used as the tags list on
// the mocked contacts (GET /api/contacts).
const TAGS = [
  { id: 't1', name: 'Tag One', color: '#ef4444', created_at: '2026-01-01T00:00:00Z' },
  { id: 't2', name: 'Tag Two', color: '#22c55e', created_at: '2026-01-01T00:00:00Z' },
];

// The three mocked contacts: one with no tags, one with t1, one with t2.
function makeContacts() {
  return [
    {
      id: 'c-001', name: 'Contact 001', email: 'contact001@example.com',
      phone: null, company: 'Acme Corp', status: 'active', notes: null,
      tags: [],
      created_at: '2026-01-01T08:00:00Z', updated_at: '2026-01-01T08:00:00Z',
    },
    {
      id: 'c-002', name: 'Contact 002', email: 'contact002@example.com',
      phone: null, company: null, status: 'active', notes: null,
      tags: [{ ...TAGS[0] }],
      created_at: '2026-01-02T08:00:00Z', updated_at: '2026-01-02T08:00:00Z',
    },
    {
      id: 'c-003', name: 'Contact 003', email: 'contact003@example.com',
      phone: null, company: null, status: 'active', notes: null,
      tags: [{ ...TAGS[1] }],
      created_at: '2026-01-03T08:00:00Z', updated_at: '2026-01-03T08:00:00Z',
    },
  ];
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * The mock keeps an in-memory contact store: GET /api/contacts returns it
 * and PUT /api/tags/contacts/{id}/tags records the request body in
 * state.tagPuts (honouring state.failPutFor, which answers that contact's
 * PUT with 500) and rewrites the contact's tags on success. The tag
 * endpoints are admin-only, mirroring the backend: the viewer gets 403.
 *
 * Returns the shared mock state.
 */
async function boot(page, token) {
  const user = token === VIEWER_TOKEN
    ? { username: 'plain-user', sub: 'u1', roles: ['user'], display_name: 'Viewer One' }
    : { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const state = { contacts: makeContacts(), tagPuts: [], failPutFor: null };
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
    if (/\/contacts(\?|$)/.test(url)) {
      return json(state.contacts);
    }
    if (/\/tags(\?|$)/.test(url)) {
      // The tag endpoints are admin-only on the backend.
      if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
      if (req.method() === 'PUT') {
        const m = url.match(/\/tags\/contacts\/([^/?]+)\/tags/);
        const contactId = m ? m[1] : null;
        let tagIds = [];
        try { tagIds = (req.postDataJSON() || {}).tag_ids || []; } catch { tagIds = []; }
        state.tagPuts.push({ contactId, tagIds, status: 0 });
        const rec = state.tagPuts[state.tagPuts.length - 1];
        if (contactId === state.failPutFor) {
          rec.status = 500;
          return json({ detail: 'Internal Server Error' }, 500);
        }
        const contact = state.contacts.find((c) => c.id === contactId);
        if (contact) {
          contact.tags = tagIds
            .map((id) => TAGS.find((t) => t.id === id))
            .filter((t) => t)
            .map((t) => ({ ...t }));
        }
        rec.status = 204;
        return route.fulfill({ status: 204, contentType: 'application/json' });
      }
      return json(TAGS);
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

// Open the Contacts route and wait for the three mocked contact rows.
async function openContacts(page) {
  await page.evaluate(() => { location.hash = '#/contacts'; });
  await page.waitForFunction(
    () => document.getElementById('page-contacts').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Contacts');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 3,
    { timeout: 20000 });
}

// Select all three rows (the bulk bar only appears once a row is checked,
// so the row checkboxes themselves are checked), choose the given tag in
// #bulk-tag-select and press "Add Tag".
async function selectAllAndChooseTag(page, tagId) {
  const boxes = page.locator('#contacts-list .contact-checkbox');
  for (let i = 0; i < 3; i++) {
    await boxes.nth(i).check();
  }
  await expect(page.locator('#bulk-action-bar')).toBeVisible();
  await expect(page.locator('#bulk-selection-count')).toHaveText('3');
  await page.waitForFunction((ids) => {
    const sel = document.getElementById('bulk-tag-select');
    return ids.every((id) =>
      Array.from(sel.options).some((o) => o.value === id));
  }, ['t1', 't2']);
  await page.selectOption('#bulk-tag-select', tagId);
  await expect(page.locator('#btn-bulk-tag')).toBeEnabled();
  await page.click('#btn-bulk-tag');
}

test('issue325 freeform', async ({ page }) => {
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

  await openContacts(page);

  // AC-2: select all three contacts, choose t2, press "Add Tag".
  await selectAllAndChooseTag(page, 't2');

  // AC-1: every request succeeded — the success notification is shown.
  await expect(page.locator('.notification-success',
    { hasText: 'Tag assigned to 3 contact(s)' }))
    .toBeVisible({ timeout: 15000 });

  // AC-2: exactly two PUT /api/tags/contacts/{contact_id}/tags requests —
  // tag_ids ["t2"] for the contact with no tags, ["t1", "t2"] for the one
  // with t1, and none for the one that already has t2.
  expect(state.tagPuts, 'exactly two tag PUTs are sent').toHaveLength(2);
  const putsByContact = {};
  for (const rec of state.tagPuts) putsByContact[rec.contactId] = rec.tagIds;
  expect(putsByContact['c-001'], 'the contact with no tags gets tag_ids ["t2"]')
    .toEqual(['t2']);
  expect(putsByContact['c-002'], 'the contact with t1 gets tag_ids ["t1", "t2"]')
    .toEqual(['t1', 't2']);
  expect(putsByContact['c-003'],
    'the contact that already has t2 gets no request').toBeUndefined();
  expect(state.tagPuts.every((rec) => rec.status === 204),
    'both tag PUTs succeed').toBe(true);

  // The re-rendered list reflects the assigned tag.
  // Wait for the post-action re-render so the assertion reads the fresh row.
  await page.waitForFunction(() => {
    const badges = document.querySelectorAll(
      '#contacts-list .contact-card[data-contact-id="c-001"] .contact-tag-badge');
    return badges.length === 1 && badges[0].textContent === 'Tag Two';
  }, { timeout: 15000 });
  const firstCardTags = await page.evaluate(() =>
    Array.from(document.querySelectorAll(
      '#contacts-list .contact-card[data-contact-id="c-001"] .contact-tag-badge'))
      .map((el) => el.textContent));
  expect(firstCardTags, 'the first contact now shows the assigned tag badge')
    .toEqual(['Tag Two']);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);

  // AC-1 failure path: the same action with the PUT for one contact
  // answered with 500 shows an error notification and does not count that
  // contact as tagged.
  state.contacts = makeContacts();
  state.tagPuts = [];
  state.failPutFor = 'c-001';
  await page.reload();
  await page.waitForFunction(
    () => typeof Auth !== 'undefined' && Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  await openContacts(page);
  await page.waitForFunction(
    () => !document.querySelector('.notification'),
    { timeout: 10000 });
  await selectAllAndChooseTag(page, 't2');

  await expect(page.locator('.notification-error',
    { hasText: 'Failed to assign tag to 1 of 3 contact(s)' }))
    .toBeVisible({ timeout: 15000 });

  // The failed PUT was attempted (and answered 500) without counting the
  // contact as tagged; the other eligible contact still got its PUT; the
  // already-tagged contact got none.
  expect(state.tagPuts, 'both tag PUTs are attempted again').toHaveLength(2);
  const failed = state.tagPuts.find((rec) => rec.contactId === 'c-001');
  expect(failed, 'the 500 PUT is the one for the first contact').toBeDefined();
  expect(failed.tagIds, 'the 500 PUT carries ["t2"]').toEqual(['t2']);
  expect(failed.status).toBe(500);
  const ok = state.tagPuts.find((rec) => rec.contactId === 'c-002');
  expect(ok.tagIds, 'the second contact still gets tag_ids ["t1", "t2"]')
    .toEqual(['t1', 't2']);
  expect(ok.status).toBe(204);
  expect(state.tagPuts.some((rec) => rec.contactId === 'c-003'),
    'the already-tagged contact gets no request').toBe(false);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('issue325 freeform (viewer)', async ({ page }) => {
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

  // The page still renders: the Contacts page opens and lists the contacts
  // from GET /api/contacts.
  await openContacts(page);

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
  for (const id of ['btn-add-contact', 'btn-manage-tags', 'btn-import-csv', 'btn-import-vcard']) {
    await expect(page.locator('#' + id), id + ' is admin-only').toBeHidden();
  }

  // A full reload keeps the viewer role: the page still renders and the
  // admin-only controls stay absent.
  await page.reload();
  await page.waitForFunction(
    () => Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'the reload keeps the NON-ADMIN role').toEqual(['user']);
  await page.waitForFunction(
    () => document.getElementById('page-contacts').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Contacts');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 3,
    { timeout: 20000 });
  const adminOnlyVisibleAfterReload = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.tagName));
  expect(adminOnlyVisibleAfterReload,
    'after reload, no admin-only control may be visible to a non-admin').toEqual([]);

  // The viewer issues no tag PUTs.
  expect(state.tagPuts, 'the viewer issues no tag PUT').toHaveLength(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
