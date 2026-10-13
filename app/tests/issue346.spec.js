// Issue #346 — the Contacts bulk action bar's tag dropdown
// (#bulk-tag-select) is a live view of the tag list: a tag created,
// renamed or deleted through "Manage Tags" is reflected in the dropdown
// without a page reload.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  The dropdown always lists the current tags: after a tag is
//         created, renamed or deleted through "Manage Tags" the dropdown
//         lists the tags as they now are, without a page reload — a new
//         tag is offered, a renamed tag shows its new name, and a deleted
//         tag is no longer offered. Each tag appears once, after the
//         existing first option, in the order GET /api/tags returns them.
//         The chosen tag stays chosen while it still exists; a deleted
//         choice returns the dropdown to its first option and disables
//         "Add Tag" (#btn-bulk-tag). A failed tag load leaves the dropdown
//         as it was and raises no page error. "Add Tag" behaves as issue
//         #325 left it, the tags are not fetched again on every list
//         render, and every value from the API is inserted as text.
//
//   AC-2  this spec. With two tags and two contacts selected it proves,
//         against mocked API responses whose tag list the test changes:
//         the dropdown offers the two tags; a third tag created through
//         "Manage Tags" is offered (three tags, each once, no reload); a
//         tag renamed through "Manage Tags" (the name prompt answered by
//         the test) shows its new name; with a tag chosen, deleting a
//         different tag keeps the choice and keeps "Add Tag" enabled;
//         deleting the chosen tag returns the dropdown to its first
//         option and disables "Add Tag"; GET /api/tags answering 500
//         during a refresh leaves the dropdown unchanged and raises no
//         page error; a hostile tag name is shown as text with
//         window.__pwned undefined; and the number of GET /api/tags
//         requests does not grow when the list is re-rendered by a sort
//         or filter change. The confirmation and prompt dialogs are
//         answered through the page's `dialog` event.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the admin-only controls are absent
// while the page still renders, including across a full reload.

const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// The two tag definitions the mocked GET /api/tags answers with at boot.
const TAGS = [
  { id: 't1', name: 'Tag One', color: '#ef4444', created_at: '2026-01-01T00:00:00Z' },
  { id: 't2', name: 'Tag Two', color: '#22c55e', created_at: '2026-01-01T00:00:00Z' },
];

// A hostile, user-controllable tag name: unescaped, it would inject an
// <img> element whose onerror handler sets window.__pwned.
const XSS_NAME = '<img src=x onerror=window.__pwned=1>';

// The two mocked contacts: one without tags, one with t1.
function makeContacts() {
  return [
    {
      id: 'c-101', name: 'Contact 101', email: 'contact101@example.com',
      phone: null, company: 'Acme Corp', status: 'active', notes: null,
      tags: [],
      created_at: '2026-01-01T08:00:00Z', updated_at: '2026-01-01T08:00:00Z',
    },
    {
      id: 'c-102', name: 'Contact 102', email: 'contact102@example.com',
      phone: null, company: null, status: 'active', notes: null,
      tags: [{ ...TAGS[0] }],
      created_at: '2026-01-02T08:00:00Z', updated_at: '2026-01-02T08:00:00Z',
    },
  ];
}

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * The mock keeps an in-memory tag list (state.tags) that the test changes:
 * GET /api/tags answers from it (state.tagsGets counts its requests and
 * state.tagsFail makes it answer 500), POST /tags appends to it, PUT
 * /tags/{id} renames in it, DELETE /tags/{id} removes from it. The tag
 * endpoints are admin-only, mirroring the backend: the viewer gets 403.
 * The bulk "Add Tag" write (PUT /api/tags/contacts/{id}/tags, issue #325)
 * is recorded in state.contactTagPuts and rewrites the contact's tags.
 * The confirmation and prompt dialogs are answered through the page's
 * `dialog` event (prompts with state.nextPromptAnswer, confirms accepted).
 *
 * Returns the shared mock state.
 */
async function boot(page, token) {
  const user = token === VIEWER_TOKEN
    ? { username: 'plain-user', sub: 'u1', roles: ['user'], display_name: 'Viewer One' }
    : { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const state = {
    token,
    contacts: makeContacts(),
    tags: TAGS.map((t) => ({ ...t })),
    tagsGets: 0,
    tagsFail: false,
    nextTagId: 3,
    tagPosts: [],
    tagPuts: [],
    tagDeletes: [],
    contactTagPuts: [],
    nextPromptAnswer: null,
  };
  await page.addInitScript((cfg) => { window.AICRM_CONFIG = cfg; },
    { API_BASE_URL: 'http://localhost:9000/api' });
  await page.route('**/fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' }));
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
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
    const contactTagsMatch = url.match(/\/tags\/contacts\/([^/?#]+)\/tags/);
    if (contactTagsMatch && method === 'PUT') {
      // The bulk "Add Tag" write (issue #325), unchanged.
      const contactId = contactTagsMatch[1];
      let tagIds = [];
      try { tagIds = (req.postDataJSON() || {}).tag_ids || []; } catch { tagIds = []; }
      state.contactTagPuts.push({ contactId, tagIds, status: 204 });
      const contact = state.contacts.find((c) => c.id === contactId);
      if (contact) {
        contact.tags = tagIds
          .map((id) => state.tags.find((t) => t.id === id))
          .filter((t) => t)
          .map((t) => ({ ...t }));
      }
      return route.fulfill({ status: 204, contentType: 'application/json' });
    }
    const tagIdMatch = url.match(/\/tags\/([^/?#]+)(\?|$)/);
    if (tagIdMatch) {
      // The tag endpoints are admin-only on the backend.
      if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
      const tagId = tagIdMatch[1];
      if (method === 'PUT') {
        let name = null;
        try { name = (req.postDataJSON() || {}).name; } catch { name = null; }
        const tag = state.tags.find((t) => t.id === tagId);
        if (!tag) return json({ detail: 'Not found' }, 404);
        if (typeof name === 'string') tag.name = name;
        state.tagPuts.push({ tagId, name, status: 200 });
        return json({ ...tag });
      }
      if (method === 'DELETE') {
        const index = state.tags.findIndex((t) => t.id === tagId);
        if (index === -1) {
          state.tagDeletes.push({ tagId, status: 404 });
          return json({ detail: 'Not found' }, 404);
        }
        state.tags.splice(index, 1);
        state.tagDeletes.push({ tagId, status: 204 });
        return route.fulfill({ status: 204, contentType: 'application/json' });
      }
      return json({ detail: 'Method not allowed' }, 405);
    }
    if (/\/tags(\?|$)/.test(url)) {
      if (method === 'GET') {
        state.tagsGets += 1;
        // The tag endpoints are admin-only on the backend.
        if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
        if (state.tagsFail) return json({ detail: 'Internal Server Error' }, 500);
        return json(state.tags);
      }
      if (method === 'POST') {
        if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
        let name = '';
        let color = '#3b82f6';
        try {
          const body = req.postDataJSON() || {};
          name = String(body.name || '');
          color = body.color || '#3b82f6';
        } catch { name = ''; }
        const tag = { id: 't' + state.nextTagId, name, color, created_at: '2026-01-03T00:00:00Z' };
        state.nextTagId += 1;
        state.tags.push({ ...tag });
        state.tagPosts.push({ name, status: 201 });
        return json(tag, 201);
      }
      return json({ detail: 'Method not allowed' }, 405);
    }
    return json([]);
  });
  // The confirmation and prompt dialogs are answered through the page's
  // `dialog` event: prompts get the test's next answer, confirms are
  // accepted (the deletion proceeds).
  page.on('dialog', (dialog) => {
    if (dialog.type() === 'prompt') {
      dialog.accept(state.nextPromptAnswer === null ? '' : state.nextPromptAnswer);
    } else {
      dialog.accept();
    }
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

// Open the Contacts route and wait for the two mocked contact rows.
async function openContacts(page) {
  await page.evaluate(() => { location.hash = '#/contacts'; });
  await page.waitForFunction(
    () => document.getElementById('page-contacts').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Contacts');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 2,
    { timeout: 20000 });
}

// The dropdown options as [value, text] pairs, first option included.
async function dropdownOptions(page) {
  return page.evaluate(() =>
    Array.from(document.getElementById('bulk-tag-select').options)
      .map((o) => [o.value, o.textContent]));
}

// Click "+ New Tag" in the open Manage Tags modal, type the name into the
// create form and submit it.
async function createTagInModal(page, name) {
  await page.click('#modal-body .tags-manager-header button');
  await page.fill('#tag-create-name', name);
  await page.click('#tag-create-form button[type="submit"]');
}

test('issue346 freeform', async ({ page }) => {
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

  // With two contacts selected, the dropdown offers the two tags — each
  // once, after the existing first option, in the order GET /api/tags
  // returns them.
  const boxes = page.locator('#contacts-list .contact-checkbox');
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await expect(page.locator('#bulk-action-bar')).toBeVisible();
  await expect(page.locator('#bulk-selection-count')).toHaveText('2');
  await expect.poll(async () => (await dropdownOptions(page)).length,
    { timeout: 10000 }).toBe(3);
  expect(await dropdownOptions(page),
    'the dropdown offers the two tags, each once, in API order').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One'], ['t2', 'Tag Two'],
  ]);

  // ── AC-1: a third tag created through "Manage Tags" is offered ───────
  await page.click('#btn-manage-tags');
  await page.waitForFunction(
    () => document.querySelectorAll('#tags-list-container .tag-list-item').length === 2,
    { timeout: 10000 });
  await createTagInModal(page, 'Tag Three');
  await page.waitForFunction(
    () => document.querySelectorAll('#tags-list-container .tag-list-item').length === 3,
    { timeout: 15000 });
  expect(await dropdownOptions(page),
    'the new tag is offered, each tag once, in API order').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One'], ['t2', 'Tag Two'], ['t3', 'Tag Three'],
  ]);
  // Without a page reload: still on Contacts, both contacts still selected.
  await expect(page.locator('#page-contacts')).toHaveClass(/active/);
  await expect(page.locator('#bulk-selection-count')).toHaveText('2');
  expect(await page.evaluate(() => location.hash), 'no page reload').toBe('#/contacts');

  // ── AC-1: a rename through "Manage Tags" shows the new name ──────────
  // The modal is open showing the three tags. Rename t1; the test answers
  // the name prompt through the page's dialog event.
  state.nextPromptAnswer = 'Tag One Renamed';
  await page.click('.tag-list-item[data-tag-id="t1"] [data-action="edit-tag"]');
  await page.waitForFunction(
    () => (document.querySelector('.tag-list-item[data-tag-id="t1"] .tag-list-name') || {}).textContent === 'Tag One Renamed',
    { timeout: 15000 });
  expect(await dropdownOptions(page),
    'the renamed tag shows its new name').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One Renamed'], ['t2', 'Tag Two'], ['t3', 'Tag Three'],
  ]);

  // ── AC-1: the choice is kept when a different tag is deleted ─────────
  // Close the modal, choose t2 in the dropdown, then delete a different
  // tag (t3) through "Manage Tags".
  await page.click('#modal-close');
  await page.selectOption('#bulk-tag-select', 't2');
  await expect(page.locator('#btn-bulk-tag')).toBeEnabled();
  await page.click('#btn-manage-tags');
  await page.waitForFunction(
    () => document.querySelectorAll('#tags-list-container .tag-list-item').length === 3,
    { timeout: 10000 });
  await page.click('.tag-list-item[data-tag-id="t3"] [data-action="delete-tag"]');
  await page.waitForFunction(
    () => document.querySelectorAll('#tags-list-container .tag-list-item').length === 2,
    { timeout: 15000 });
  expect(await dropdownOptions(page),
    'the deleted tag is no longer offered').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One Renamed'], ['t2', 'Tag Two'],
  ]);
  await expect(page.locator('#bulk-tag-select'),
    'the chosen tag is still chosen').toHaveValue('t2');
  await expect(page.locator('#btn-bulk-tag'),
    '"Add Tag" is still enabled').toBeEnabled();

  // ── AC-1: the chosen tag deleted → first option + disabled button ────
  // The modal is open (re-rendered, two items). Delete the chosen tag t2.
  await page.click('.tag-list-item[data-tag-id="t2"] [data-action="delete-tag"]');
  await page.waitForFunction(
    () => document.querySelectorAll('#tags-list-container .tag-list-item').length === 1,
    { timeout: 15000 });
  expect(await dropdownOptions(page),
    'the deleted tag is no longer offered').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One Renamed'],
  ]);
  await expect(page.locator('#bulk-tag-select'),
    'the dropdown is back on its first option').toHaveValue('');
  await expect(page.locator('#btn-bulk-tag'),
    '"Add Tag" is disabled').toBeDisabled();

  // ── AC-1: a failed tag load leaves the dropdown as it was ────────────
  // Refresh the tag list through the still-open modal: the POST for a new
  // tag succeeds, the follow-up GET /api/tags answers 500.
  state.tagsFail = true;
  await createTagInModal(page, 'Tag Temp');
  await page.waitForFunction(
    () => /No tags created yet/.test(document.getElementById('tags-list-container').textContent),
    { timeout: 15000 });
  expect(await dropdownOptions(page),
    'a failed tag load leaves the dropdown as it was').toEqual([
    ['', 'Add Tag...'], ['t1', 'Tag One Renamed'],
  ]);
  await expect(page.locator('#bulk-tag-select')).toHaveValue('');
  state.tagsFail = false;

  // ── AC-1: a hostile tag name is inserted as text ─────────────────────
  // The modal is open on its failed-load fallback. Create the hostile tag;
  // the next refresh (GET ok) syncs the dropdown.
  await createTagInModal(page, XSS_NAME);
  await page.waitForFunction(
    (name) => Array.from(document.getElementById('bulk-tag-select').options)
      .some((o) => o.textContent === name),
    XSS_NAME, { timeout: 15000 });
  const hostile = await page.evaluate((name) => {
    const select = document.getElementById('bulk-tag-select');
    const option = Array.from(select.options).find((o) => o.textContent === name);
    return {
      text: option ? option.textContent : null,
      html: select.innerHTML,
      pwned: typeof window.__pwned,
      injectedImgs: select.querySelectorAll('img').length,
    };
  }, XSS_NAME);
  expect(hostile.text, 'the hostile name is shown as text').toBe(XSS_NAME);
  expect(hostile.html, 'the hostile name is escaped in the DOM').not.toContain('<img');
  expect(hostile.injectedImgs, 'no <img> is injected into the dropdown').toBe(0);
  expect(hostile.pwned, 'window.__pwned stays undefined').toBe('undefined');

  // Close the modal before the list-level checks.
  await page.click('#modal-close');

  // ── AC-1: no extra GET /api/tags when the list re-renders ─────────────
  const tagsGetsBefore = state.tagsGets;
  // A sort change re-renders the list (the card order flips).
  await page.selectOption('#contact-sort', 'name-desc');
  await page.waitForFunction(
    () => {
      const cards = document.querySelectorAll('#contacts-list .contact-card');
      return cards.length === 2 && cards[0].dataset.contactId === 'c-102';
    },
    { timeout: 15000 });
  expect(state.tagsGets,
    'a sort re-render does not re-fetch the tags').toBe(tagsGetsBefore);
  // ... and so does a filter change (rows out, rows back in).
  await page.selectOption('#contact-filter-status', 'inactive');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 0,
    { timeout: 15000 });
  await page.selectOption('#contact-filter-status', 'active');
  await page.waitForFunction(
    () => document.querySelectorAll('#contacts-list .contact-card').length === 2,
    { timeout: 15000 });
  expect(state.tagsGets,
    'a filter re-render does not re-fetch the tags').toBe(tagsGetsBefore);

  // ── AC-1: "Add Tag" behaves as issue #325 left it ────────────────────
  // Both contacts are selected and t1 is chosen. c-102 already has t1, so
  // exactly one PUT goes out — for c-101, with its current tag ids plus t1.
  await expect(page.locator('#bulk-action-bar')).toBeVisible();
  await expect(page.locator('#bulk-selection-count')).toHaveText('2');
  await page.selectOption('#bulk-tag-select', 't1');
  await expect(page.locator('#btn-bulk-tag')).toBeEnabled();
  await page.click('#btn-bulk-tag');
  await expect(page.locator('.notification-success',
    { hasText: 'Tag assigned to 2 contact(s)' }))
    .toBeVisible({ timeout: 15000 });
  expect(state.contactTagPuts,
    'exactly one PUT /api/tags/contacts/{id}/tags goes out')
    .toEqual([{ contactId: 'c-101', tagIds: ['t1'], status: 204 }]);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('issue346 freeform (viewer)', async ({ page }) => {
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

  // The admin-only controls are absent for the non-admin — in particular
  // "Manage Tags", the page's only entry point to the tag list.
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
  await expect(page.locator('#btn-manage-tags'),
    'the Manage Tags control is admin-only').toBeHidden();

  // The dropdown has no tags to offer (GET /api/tags is admin-only and
  // answers 403) — the placeholder only — and nothing breaks.
  await expect.poll(
    () => page.evaluate(() => document.getElementById('bulk-tag-select').options.length),
    { timeout: 10000 }).toBe(1);

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
    () => document.querySelectorAll('#contacts-list .contact-card').length === 2,
    { timeout: 20000 });
  const adminOnlyVisibleAfterReload = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-admin-only="true"]'))
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.tagName));
  expect(adminOnlyVisibleAfterReload,
    'after reload, no admin-only control may be visible to a non-admin').toEqual([]);

  // The viewer issues no tag writes.
  expect(state.contactTagPuts, 'the viewer issues no tag write').toHaveLength(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
