// Proof for issue #281: no rendered markup in app/js/app.js interpolates a
// record id (or any other data value) into an inline event-handler attribute.
//
// The contact card, dashboard recent items, and every other action button are
// now rendered with data-* attributes (through escapeAttr) and a delegated
// click listener. This spec renders a contact whose id contains both ' and "
// (route-mocked) and proves:
//   1. clicking view/edit/delete calls the matching App method with the EXACT
//      id (round-tripped through the data attribute),
//   2. no extra attribute (e.g. a forged "pwn") was created on the elements,
//   3. no inline event-handler attribute remains on the rendered card,
//   4. user-controllable values (contact names) also round-trip exactly via
//      the quick-activity buttons.
//   5. review defect: company ids round-trip the data attribute back to the
//      backend's numeric type (edit/delete receive a real number),
//   6. review defect: a hostile, user-controllable tag color cannot forge
//      attributes inside the style="..." attribute (legit colors are kept),
//   7. review defect: a prototype-key lead id ("constructor") cannot poison
//      the recommendation scoring with inherited properties (NaN).
const { test, expect } = require('@playwright/test');
const path = require('path');

test('issue281 freeform', async ({ page }) => {
  const apiCalls = [];
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { window.AICRM_CONFIG = { API_BASE_URL: 'http://localhost:9000/api' }; });

  // Hostile record id: contains a double quote (terminates a double-quoted
  // attribute and forges a "pwn" attribute) and a single quote (breaks a
  // single-quoted JS string).
  const hostileId = "c-\"'pwn=1";
  // Hostile, user-controllable name with both quote types as well.
  const hostileName = "O'Brien \"Best\" Co";
  const contacts = [
    {
      id: hostileId,
      name: 'Quote Ida',
      email: 'ida@example.com',
      phone: null,
      company: null,
      status: 'active',
      notes: null,
      tags: [
        { id: 'tag-evil', name: 'Vip', color: '#f00" data-pwn="1' },
        { id: 'tag-blue', name: 'Blue', color: '#0ea5e9' },
      ],
      created_at: '2026-01-09T10:00:00Z',
      updated_at: '2026-01-09T10:00:00Z',
    },
    {
      id: 'c-two',
      name: hostileName,
      email: 'obrien@example.com',
      phone: null,
      company: null,
      status: 'active',
      notes: null,
      tags: [],
      created_at: '2026-01-08T10:00:00Z',
      updated_at: '2026-01-08T10:00:00Z',
    },
  ];

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    apiCalls.push({ method: req.method(), url, body: req.postData() });
    const json = (o, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/auth\/me/.test(url)) return json({ authenticated: true, user: { username: 't', sub: 't', roles: ['admin'], display_name: 'T' } });
    if (/\/auth\/config/.test(url)) return json({ auth_enabled: true });
    if (/\/health/.test(url)) return json({ status: 'ok' });
    if (/\/contacts(\b|\/|\?|$)/.test(url)) return json(contacts);
    if (/\/companies(\b|\/|\?|$)/.test(url)) return json([{ id: 42, name: 'Acme Corp', website: null, industry: null, employee_count: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]);
    if (/\/activities(\b|\/|\?|$)/.test(url)) return json([]);
    if (/\/leads(\b|\/|\?|$)/.test(url)) return json([]);
    if (/\/settings/.test(url)) return json({ payload: {} });
    return json([]);
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => typeof App !== 'undefined'
    && document.getElementById('recent-contacts')
    && document.querySelector('.nav-item[data-page="contacts"]'), { timeout: 20000 });

  // Record calls instead of executing: a click must reach the matching App
  // method with the exact (decoded) value.
  await page.evaluate(() => {
    window.__issue281Calls = [];
    for (const method of ['viewContact', 'editContact', 'deleteContact', 'quickLogActivity', 'editCompany', 'deleteCompany']) {
      App[method] = async (...args) => { window.__issue281Calls.push({ method, args }); };
    }
  });
  const recordedCalls = () => page.evaluate(() => window.__issue281Calls);
  const attrNames = (locator) => locator.evaluate((el) => Array.from(el.attributes).map((a) => a.name).sort());

  // ── Dashboard recent item: hostile id round-trips, no forged attributes ──
  const recentItem = page.locator('#recent-contacts .recent-item').first();
  await expect(recentItem, 'recent item renders with the exact hostile id').toHaveAttribute('data-contact-id', hostileId);
  expect(await attrNames(recentItem)).toEqual(['class', 'data-action', 'data-contact-id', 'title']);
  await recentItem.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(1);
  expect(await recordedCalls()).toEqual([{ method: 'viewContact', args: [hostileId] }]);

  // ── Contact page: view / edit / delete with the exact id ──
  await page.evaluate(() => { App.navigate('contacts'); });
  const hostileCard = page.locator('.contact-card', { hasText: 'Quote Ida' });
  await expect(hostileCard, 'contact card renders with the exact hostile id').toHaveAttribute('data-contact-id', hostileId);
  expect(await attrNames(hostileCard)).toEqual(['class', 'data-contact-id']);

  const viewBtn = hostileCard.locator('button[title="View Details"]');
  const editBtn = hostileCard.locator('button[title="Edit"]');
  const deleteBtn = hostileCard.locator('button[title="Delete"]');
  await expect(viewBtn).toHaveAttribute('data-contact-id', hostileId);
  await expect(editBtn).toHaveAttribute('data-contact-id', hostileId);
  await expect(deleteBtn).toHaveAttribute('data-contact-id', hostileId);

  // The exact attribute set on each button: nothing was forged by the
  // embedded quotes (a "pwn" attribute would appear as an extra entry).
  for (const btn of [viewBtn, editBtn, deleteBtn]) {
    expect(await attrNames(btn)).toEqual(['class', 'data-action', 'data-contact-id', 'title']);
  }

  // No inline event-handler attribute anywhere in the rendered card subtree.
  expect(await hostileCard.evaluate((el) => el.outerHTML)).not.toMatch(
    /\s(onclick|ondblclick|onchange|oninput|onsubmit|onkeydown|onkeyup|onblur|onfocus|onload|onerror|onmouseover|onmouseout|ondragstart|ondragend|ondrop)="[^"]*"\s/i
  );

  await viewBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(2);
  expect((await recordedCalls())[1]).toEqual({ method: 'viewContact', args: [hostileId] });

  await editBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(3);
  expect((await recordedCalls())[2]).toEqual({ method: 'editContact', args: [hostileId] });

  await deleteBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(4);
  expect((await recordedCalls())[3]).toEqual({ method: 'deleteContact', args: [hostileId] });

  // ── Hostile contact name round-trips through the quick-activity buttons ──
  const nameCard = page.locator('.contact-card', { hasText: hostileName });
  await expect(nameCard).toHaveCount(1);
  const callBtn = nameCard.locator('button[title="Quick log a call"]');
  expect(await attrNames(callBtn)).toEqual(['class', 'data-action', 'data-activity-type', 'data-contact-name', 'title']);
  await expect(callBtn).toHaveAttribute('data-contact-name', hostileName);
  await expect(callBtn).toHaveAttribute('data-activity-type', 'call');
  await callBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(5);
  expect((await recordedCalls())[4]).toEqual({ method: 'quickLogActivity', args: [hostileName, 'call'] });

  // ── Review defect 1: hostile tag color must not forge attributes ──
  // The "Vip" tag color contains a double quote that, unescaped, would
  // terminate the style="..." attribute and inject a data-pwn attribute.
  const vipBadge = hostileCard.locator('.contact-tag-badge', { hasText: 'Vip' });
  await expect(vipBadge).toHaveCount(1);
  expect(await attrNames(vipBadge)).toEqual(['class', 'style', 'title']);
  expect(await vipBadge.getAttribute('style')).toBe('background-color:#3b82f6');
  expect(await vipBadge.getAttribute('title')).toBe('Vip');
  expect(await vipBadge.evaluate((el) => el.outerHTML)).not.toMatch(/data-pwn/i);
  // A legitimate hex color must pass through unchanged (no over-sanitizing).
  const blueBadge = hostileCard.locator('.contact-tag-badge', { hasText: 'Blue' });
  await expect(blueBadge).toHaveCount(1);
  expect(await blueBadge.getAttribute('style')).toBe('background-color:#0ea5e9');

  // ── Review defect 2: company id round-trips as the backend's number ──
  await page.evaluate(() => { App.navigate('companies'); });
  const companyCard = page.locator('#companies-list .contact-card').first();
  await expect(companyCard, 'company card renders').toHaveAttribute('data-company-id', '42');
  const companyEditBtn = companyCard.locator('button[title="Edit"]');
  const companyDeleteBtn = companyCard.locator('button[title="Delete"]');

  await companyEditBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(6);
  const companyEditCall = (await recordedCalls())[5];
  expect(companyEditCall).toEqual({ method: 'editCompany', args: [42] });
  expect(typeof companyEditCall.args[0], 'company id is a number').toBe('number');

  await companyDeleteBtn.click();
  await expect.poll(() => recordedCalls().then((c) => c.length), { timeout: 5000 }).toBe(7);
  const companyDeleteCall = (await recordedCalls())[6];
  expect(companyDeleteCall).toEqual({ method: 'deleteCompany', args: [42] });
  expect(typeof companyDeleteCall.args[0], 'company id is a number').toBe('number');

  // ── Review defect 3: prototype-key lead id must not break scoring ──
  // A lead whose id is "constructor" used to resolve to
  // Object.prototype.constructor in the plain-object activity map, turning
  // its recency math (and priority) into NaN.
  const recs = await page.evaluate(async () => {
    const leads = [
      { id: 'constructor', name: 'Proto Lead', stage: 'new', source: 'website', value: 100000, email: 'p@example.com', createdAt: '2026-09-20T00:00:00Z' },
      { id: 'lead-2', name: 'Normal Lead', stage: 'new', source: 'website', value: 100000, email: 'n@example.com', createdAt: '2026-09-20T00:00:00Z' },
    ];
    const real = ActivitiesDataSource.getActivities.bind(ActivitiesDataSource);
    ActivitiesDataSource.getActivities = async () => [
      { id: 'act-1', leadId: 'constructor', date: '2026-09-29T12:00:00Z', type: 'call', description: 'd', contactName: null },
      { id: 'act-2', leadId: 'lead-2', date: '2026-09-29T12:00:00Z', type: 'call', description: 'd', contactName: null },
    ];
    try {
      return (await App.getLeadRecommendations(leads)).map((r) => ({
        id: r.lead.id,
        priority: r.priority,
        daysSinceContact: r.daysSinceContact,
      }));
    } finally {
      ActivitiesDataSource.getActivities = real;
    }
  });
  expect(recs).toHaveLength(2);
  const protoRec = recs.find((r) => r.id === 'constructor');
  const normalRec = recs.find((r) => r.id === 'lead-2');
  expect(protoRec, 'prototype-key lead is scored').toBeTruthy();
  for (const r of recs) {
    expect(Number.isFinite(r.priority), `finite priority for ${r.id}`).toBe(true);
    expect(Number.isInteger(r.daysSinceContact), `integer days for ${r.id}`).toBe(true);
    expect(r.daysSinceContact).toBeGreaterThanOrEqual(0);
  }
  // Both leads share the same last-activity date, so the prototype-key lead
  // must be scored off its real activity, not an inherited property.
  expect(protoRec.daysSinceContact).toBe(normalRec.daysSinceContact);
  expect(protoRec.priority).toBe(normalRec.priority);

  expect(errors).toEqual([]);
});
