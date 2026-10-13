// Issue #320 — each Settings page button acts exactly once per click.
//
// In-browser proof (real Chromium; the API is fully mocked with page.route —
// no backend). The page boots the production way: the token rides the URL
// hash as #access_token=..., and /api/auth/config + /api/auth/me are mocked
// for that user.
//
//   AC-1  Signed in as an admin, the Settings page handlers that
//         renderSettings() used to assign to #btn-create-backup,
//         #btn-restore-backup, #backup-file-input and #btn-clear-data are
//         gone: the bindSettings() listeners are the only ones.
//         - One click on Export Settings starts exactly one download, the
//           backup file that createBackup() writes.
//         - One click on Import Settings opens exactly one file chooser,
//           and choosing a backup file opens exactly one restore dialog.
//         - "Replace Settings" sends exactly one DELETE /api/settings
//           followed by exactly one PUT /api/settings carrying the
//           backup's settings.
//         - "Merge with Existing" sends exactly one PUT /api/settings and
//           no DELETE.
//         - Reset Settings asks for confirmation exactly once; accepting
//           sends exactly one DELETE /api/settings and no PUT, then shows
//           a success notification.
//         - A DELETE /api/settings answered with 500 shows an error
//           notification.
//
// Identity: the "(viewer)" test boots the page the production way for a
// NON-ADMIN (role 'user') and asserts the admin-only controls (the ones
// driving PUT/DELETE /api/settings) are absent while the page still
// renders, including across a full reload.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const INDEX = 'file://' + path.resolve(__dirname, '..', 'index.html');
const ADMIN_TOKEN = 'dev-secret-token:admin';
const VIEWER_TOKEN = 'dev-secret-token:user';

// The settings record the mock backend serves (the single settings row).
const BASE_SETTINGS = {
  id: 1,
  payload: { theme: 'light', language: 'en', reminder: { enabled: false } },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// The backup file the import flows choose: its data.SETTINGS is what
// "Replace" must PUT and what "Merge" must merge over the current settings.
const BACKUP_SETTINGS = { theme: 'dark', language: 'de', banner: 'issue-320-restore' };
const BACKUP = {
  metadata: {
    appName: 'AICRM',
    version: '0.2.3',
    createdAt: '2026-09-01T12:00:00Z',
    scope: 'backend-managed',
    summary: {},
  },
  data: { SETTINGS: BACKUP_SETTINGS },
};

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'aicrm-issue320-'));
const BACKUP_PATH = path.join(TMP_DIR, 'issue320-backup.json');
fs.writeFileSync(BACKUP_PATH, JSON.stringify(BACKUP, null, 2));

/**
 * Boot the page the production way: the token is in the URL hash as
 * #access_token=..., and /api/auth/config + /api/auth/me are mocked for
 * that user. Every other API call is mocked too — no backend. Google Fonts
 * is stubbed so the run never depends on the network.
 *
 * The mock honours the backend's role rules for the settings routes:
 * PUT/DELETE /api/settings are admin-only (403 for the viewer), GET needs
 * only authentication. `state.failDelete` makes DELETE answer with 500.
 *
 * Returns the recorded /api/settings requests ({ method, body }).
 */
async function boot(page, token, state) {
  const user = token === VIEWER_TOKEN
    ? { username: 'plain-user', sub: 'u1', roles: ['user'], display_name: 'Viewer One' }
    : { username: 'admin-user', sub: 'u1', roles: ['admin'], display_name: 'Admin' };
  const settingsReqs = [];
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
      let body = null;
      if (req.method() === 'PUT' && req.postData()) {
        try { body = req.postDataJSON(); } catch { body = null; }
      }
      settingsReqs.push({ method: req.method(), body });
      if (req.method() === 'DELETE') {
        // DELETE /api/settings — admin only.
        if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
        if (state.failDelete) return json({ detail: 'Internal Server Error' }, 500);
        return json({ id: 1, payload: {}, created_at: BASE_SETTINGS.created_at, updated_at: '2026-09-02T00:00:00Z' });
      }
      if (req.method() === 'PUT') {
        // PUT /api/settings — admin only; the payload is merged server-side.
        if (token === VIEWER_TOKEN) return json({ detail: 'Forbidden' }, 403);
        return json({ id: 1, payload: (body && body.payload) || {}, created_at: BASE_SETTINGS.created_at, updated_at: '2026-09-02T00:00:00Z' });
      }
      return json(BASE_SETTINGS);
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
  return settingsReqs;
}

test('issue320 freeform', async ({ page }) => {
  test.setTimeout(120000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const state = { failDelete: false };
  const settingsReqs = await boot(page, ADMIN_TOKEN, state);
  await page.setViewportSize({ width: 1440, height: 900 });

  // The pass runs signed in as an admin.
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'signed in as an admin').toEqual(['admin']);

  // Counters: downloads, file choosers, native confirm dialogs.
  const downloads = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));
  const choosers = [];
  page.on('filechooser', (fc) => choosers.push(fc));
  const confirmations = [];
  page.on('dialog', (d) => { confirmations.push(d.type()); d.accept(); });

  // Count restore-dialog openings (the single #modal-overlay is reused, so
  // DOM state alone cannot distinguish "opened twice" from "opened once").
  await page.evaluate(() => {
    window.__restoreDialogs = 0;
    const original = App._showRestoreDialog;
    App._showRestoreDialog = function (backup) {
      window.__restoreDialogs += 1;
      return original.call(this, backup);
    };
  });

  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForFunction(
    () => document.getElementById('page-settings').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Settings');
  // An admin sees every Settings control.
  await expect(page.locator('#btn-create-backup')).toBeVisible();
  await expect(page.locator('#btn-restore-backup')).toBeVisible();
  await expect(page.locator('#btn-clear-data')).toBeVisible();

  // ── AC-1: one click on Export Settings starts exactly one download ──
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('#btn-create-backup'),
  ]);
  await expect(page.locator('.notification-success', { hasText: 'Backup created from backend settings.' }))
    .toBeVisible({ timeout: 10000 });
  expect(downloads, 'one click on Export Settings starts exactly one download')
    .toHaveLength(1);
  expect(download.suggestedFilename(), 'the download is the backup file createBackup() writes')
    .toMatch(/^aicrm_backup_\d{4}-\d{2}-\d{2}\.json$/);
  const exportPath = path.join(TMP_DIR, download.suggestedFilename());
  await download.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  expect(exported.metadata.appName).toBe('AICRM');
  expect(exported.data.SETTINGS, 'the backup file holds the backend settings payload')
    .toEqual(BASE_SETTINGS.payload);

  // ── AC-1: one click on Import Settings opens exactly one file chooser ──
  const firstChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });
  await page.click('#btn-restore-backup');
  const firstChooser = await firstChooserPromise;
  expect(choosers, 'one click on Import Settings opens exactly one file chooser')
    .toHaveLength(1);

  // ── AC-1: choosing a backup file opens exactly one restore dialog ──
  await firstChooser.setFiles(BACKUP_PATH);
  await expect(page.locator('#modal-overlay.active')).toBeVisible();
  await expect(page.locator('#btn-restore-replace')).toBeVisible();
  await expect(page.locator('#btn-restore-merge')).toBeVisible();
  expect(await page.evaluate(() => window.__restoreDialogs),
    'choosing a backup file opens exactly one restore dialog').toBe(1);

  // ── AC-1: "Replace Settings" — one DELETE then exactly one PUT ──
  const beforeReplace = settingsReqs.length;
  await page.click('#btn-restore-replace');
  await expect(page.locator('.notification-success', { hasText: 'Replaced settings on the backend.' }))
    .toBeVisible({ timeout: 10000 });
  const replaceReqs = settingsReqs.slice(beforeReplace);
  expect(replaceReqs.filter((r) => r.method === 'DELETE'),
    'Replace Settings sends exactly one DELETE /api/settings').toHaveLength(1);
  expect(replaceReqs.filter((r) => r.method === 'PUT'),
    'Replace Settings sends exactly one PUT /api/settings').toHaveLength(1);
  const replaceDel = replaceReqs.findIndex((r) => r.method === 'DELETE');
  const replacePut = replaceReqs.findIndex((r) => r.method === 'PUT');
  expect(replaceDel, 'the DELETE /api/settings precedes the PUT').toBeLessThan(replacePut);
  expect(replaceReqs[replacePut].body.payload, 'the PUT carries the backup settings')
    .toEqual(BACKUP_SETTINGS);
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: "Merge with Existing" — one PUT, no DELETE ──
  const secondChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });
  await page.click('#btn-restore-backup');
  const secondChooser = await secondChooserPromise;
  expect(choosers, 'each Import Settings click opens exactly one file chooser')
    .toHaveLength(2);
  await secondChooser.setFiles(BACKUP_PATH);
  await expect(page.locator('#btn-restore-merge')).toBeVisible();
  expect(await page.evaluate(() => window.__restoreDialogs),
    'the second chosen file opens exactly one more restore dialog').toBe(2);

  const beforeMerge = settingsReqs.length;
  await page.click('#btn-restore-merge');
  await expect(page.locator('.notification-success', { hasText: 'Merged settings on the backend.' }))
    .toBeVisible({ timeout: 10000 });
  const mergeReqs = settingsReqs.slice(beforeMerge);
  const mergePut = mergeReqs.find((r) => r.method === 'PUT');
  expect(mergeReqs.filter((r) => r.method === 'PUT'),
    'Merge with Existing sends exactly one PUT /api/settings').toHaveLength(1);
  expect(mergeReqs.filter((r) => r.method === 'DELETE'),
    'Merge with Existing sends no DELETE /api/settings').toHaveLength(0);
  expect(mergePut.body.payload, 'the merge is the backup over the current settings')
    .toEqual({ ...BASE_SETTINGS.payload, ...BACKUP_SETTINGS });
  await expect(page.locator('#modal-overlay')).toBeHidden();

  // ── AC-1: Reset Settings — one confirmation, one DELETE, no PUT,
  //    success notification ──
  const confirmsBeforeReset = confirmations.length;
  const beforeReset = settingsReqs.length;
  await page.click('#btn-clear-data');
  await expect(page.locator('.notification-success', { hasText: 'Settings reset to defaults on the backend.' }))
    .toBeVisible({ timeout: 10000 });
  expect(confirmations.slice(confirmsBeforeReset),
    'Reset Settings asks for confirmation exactly once').toEqual(['confirm']);
  const resetReqs = settingsReqs.slice(beforeReset);
  expect(resetReqs.filter((r) => r.method === 'DELETE'),
    'accepting the reset sends exactly one DELETE /api/settings').toHaveLength(1);
  expect(resetReqs.filter((r) => r.method === 'PUT'),
    'accepting the reset sends no PUT /api/settings').toHaveLength(0);

  // ── AC-1: a failed request (DELETE answered 500) shows an error ──
  state.failDelete = true;
  const confirmsBeforeError = confirmations.length;
  const beforeError = settingsReqs.length;
  await page.click('#btn-clear-data');
  await expect(page.locator('.notification-error', { hasText: 'Failed to reset settings' }))
    .toBeVisible({ timeout: 10000 });
  expect(confirmations.slice(confirmsBeforeError),
    'the failed reset also asked for confirmation exactly once').toEqual(['confirm']);
  const errorReqs = settingsReqs.slice(beforeError);
  expect(errorReqs.filter((r) => r.method === 'DELETE')).toHaveLength(1);
  expect(errorReqs.filter((r) => r.method === 'PUT')).toHaveLength(0);

  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

test('issue320 freeform (viewer)', async ({ page }) => {
  test.setTimeout(60000);
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.type()); d.dismiss(); });

  // Identity: the same production boot, but NON-ADMIN (role 'user').
  const settingsReqs = await boot(page, VIEWER_TOKEN, { failDelete: false });
  await page.setViewportSize({ width: 1440, height: 900 });

  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles),
    'the viewer pass runs as a NON-ADMIN (role "user")').toEqual(['user']);
  // The production boot sent the hash token as a Bearer header.
  await expect(page.locator('#sidebar .sidebar-footer #auth-status .auth-username'))
    .toHaveText('Viewer One');

  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForFunction(
    () => document.getElementById('page-settings').classList.contains('active'),
    { timeout: 10000 });

  // The page still renders: title, the settings cards, and the
  // authenticated-only Export control (GET /api/settings is not admin-only).
  await expect(page.locator('#page-settings.active')).toBeVisible();
  await expect(page.locator('#page-title')).toHaveText('Settings');
  await expect(page.locator('.settings-card').first()).toBeVisible();
  await expect(page.locator('#btn-create-backup'),
    'Export Settings (GET /api/settings) stays visible to the viewer').toBeVisible();

  // The admin-only controls — the ones driving PUT/DELETE /api/settings —
  // are absent for the non-admin.
  await expect(page.locator('#btn-restore-backup')).toBeHidden();
  await expect(page.locator('#btn-clear-data')).toBeHidden();
  const adminOnlyVisible = await page.evaluate(() =>
    ['btn-restore-backup', 'btn-clear-data'].filter((id) => {
      const el = document.getElementById(id);
      return el && el.offsetParent !== null;
    }));
  expect(adminOnlyVisible, 'no admin-only settings control may be visible to a non-admin')
    .toEqual([]);
  expect(settingsReqs.filter((r) => r.method === 'PUT' || r.method === 'DELETE'),
    'booting and rendering the Settings page issues no PUT/DELETE /api/settings')
    .toHaveLength(0);

  // A full reload keeps the viewer role: the page still renders, the
  // admin-only controls stay absent, and no dialog ever appears.
  await page.reload();
  await page.waitForFunction(
    () => Auth.isAuthenticated && Auth.isAuthenticated(),
    { timeout: 20000 });
  expect(await page.evaluate(() => (Auth.getCurrentUser() || {}).roles)).toEqual(['user']);
  await page.waitForFunction(
    () => document.getElementById('page-settings').classList.contains('active'),
    { timeout: 10000 });
  await expect(page.locator('#page-title')).toHaveText('Settings');
  await expect(page.locator('#btn-create-backup')).toBeVisible();
  await expect(page.locator('#btn-restore-backup')).toBeHidden();
  await expect(page.locator('#btn-clear-data')).toBeHidden();

  expect(dialogs, 'no confirmation dialog appears for the viewer').toEqual([]);
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});
