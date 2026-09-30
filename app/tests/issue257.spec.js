const { test, expect } = require('@playwright/test');
const path = require('path');

test('issue257 freeform', async ({ page }) => {
  const calls = [];
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { window.AICRM_CONFIG = { API_BASE_URL: 'http://localhost:9000/api' }; });

  const contacts = [
    { id: 'c-alice', name: 'Alice Sender', email: 'alice@example.com', phone: null, company: 'Acme Corp', status: 'active', notes: null, tags: [], created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
    { id: 'c-nomail', name: 'NoMail Bob', email: null, phone: null, company: null, status: 'active', notes: null, tags: [], created_at: '2026-01-06T10:00:00Z', updated_at: '2026-01-06T10:00:00Z' },
    { id: 'c-carol', name: 'Carol Suppressed', email: 'carol@example.com', phone: null, company: null, status: 'active', notes: null, tags: [], created_at: '2026-01-07T10:00:00Z', updated_at: '2026-01-07T10:00:00Z' },
    // Review-defect fixture: the id contains a double quote. Unescaped, it would
    // terminate the onclick attribute and forge a "pwn" attribute on the button.
    { id: 'c-"pwn="1', name: 'Quote Ida', email: 'ida@example.com', phone: null, company: null, status: 'active', notes: null, tags: [], created_at: '2026-01-08T10:00:00Z', updated_at: '2026-01-08T10:00:00Z' },
    // Review-defect fixture: the name is an Object.prototype key. A plain {}
    // count map would inherit the constructor function and never show a badge.
    { id: 'c-constructor', name: 'constructor', email: null, phone: null, company: null, status: 'active', notes: null, tags: [], created_at: '2026-01-09T10:00:00Z', updated_at: '2026-01-09T10:00:00Z' },
  ];
  const activities = [
    { id: 'act-1', type: 'call', description: 'Intro call', contact_name: 'constructor', occurred_at: '2026-09-01T10:00:00Z', status: 'done' },
    { id: 'act-2', type: 'email', description: 'Follow-up email', contact_name: 'constructor', occurred_at: '2026-09-02T11:00:00Z', status: 'done' },
  ];
  const maySendVerdicts = {
    'alice@example.com': { may_send: true, reasons: [] },
    'carol@example.com': { may_send: false, reasons: ['address is suppressed', 'consent is not opted_in'] },
    'ida@example.com': { may_send: true, reasons: [] },
  };
  let sendEmailResponse = { status: 202, body: { status: 'accepted' } };
  // Review-defect fixture: hostile display name; unescaped, it would inject an
  // onmouseover handler into the auth status indicator span.
  const hostileDisplayName = 'T" onmouseover="pwn';

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const url = req.url();
    calls.push({ method: req.method(), url, body: req.postData() });
    const json = (o, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (/\/auth\/me/.test(url)) return json({ authenticated: true, user: { username: 't', sub: 't', roles: ['admin'], display_name: hostileDisplayName } });
    if (/\/auth\/config/.test(url)) return json({ auth_enabled: true });
    if (/\/health/.test(url)) return json({ status: 'ok' });
    if (/\/suppressions\/may-send/.test(url)) {
      const email = new URL(url).searchParams.get('email') || '';
      const verdict = maySendVerdicts[email] || { may_send: false, reasons: ['unknown address'] };
      return json({ email, may_send: verdict.may_send, reasons: verdict.reasons });
    }
    if (/\/contacts\/[^/]+\/send-email$/.test(url)) {
      return json(sendEmailResponse.body, sendEmailResponse.status);
    }
    if (/\/contacts(\b|\/|\?|$)/.test(url)) return json(contacts);
    if (/\/activities(\b|\/|\?|$)/.test(url)) return json(activities);
    if (/\/settings/.test(url)) return json({ payload: {} });
    return json([]);
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => typeof App !== 'undefined'
    && document.getElementById('page-contacts')
    && document.querySelector('.nav-item[data-page="contacts"]'), { timeout: 20000 });

  // ── Review defect: auth display name escaped in the status indicator ──
  const authSpan = page.locator('#auth-status .auth-username');
  await authSpan.waitFor({ timeout: 10000 });
  await expect(authSpan).toHaveText(hostileDisplayName);
  // No forged onmouseover attribute; the raw hostile value survives as text
  // and as the (decoded) title attribute value only.
  expect(await authSpan.evaluate((el) => Array.from(el.attributes).map((a) => a.name)))
    .not.toContain('onmouseover');
  await expect(authSpan).toHaveAttribute('title', hostileDisplayName);

  await page.evaluate(() => { App.navigate('contacts'); });
  await page.waitForFunction(() => {
    const el = document.getElementById('contacts-list');
    return el && el.textContent.includes('Alice Sender');
  }, { timeout: 20000 });

  // ── Review defect: activity counts survive a prototype-key contact name ──
  const constructorCard = page.locator('.contact-card', { hasText: 'constructor' });
  await expect(constructorCard.locator('.activity-count-badge')).toHaveText('📋 2');

  const emailButton = page.locator('#contact-email-btn');
  const gateReason = page.locator('#contact-email-gate-reason');
  const statusMessage = page.locator('#contact-email-status-message');
  const tryAgain = () => page.locator('#contact-email-status button', { hasText: 'Try Again' }).click();
  const backToContact = () => page.locator('#contact-email-status button', { hasText: 'Back to Contact' }).click();
  const openEmailForm = async () => {
    await emailButton.waitFor({ timeout: 10000 });
    await expect(emailButton).toBeEnabled();
    await emailButton.click();
  };
  const submitEmail = async (subject, body) => {
    await page.waitForSelector('#contact-email-form', { timeout: 10000 });
    await page.fill('#contact-email-subject', subject);
    await page.fill('#contact-email-body', body);
    await page.click('#contact-email-send');
    await page.waitForSelector('#contact-email-status-message', { timeout: 10000 });
  };

  // ── Disabled state: contact has no email address ──
  await page.evaluate(() => App.viewContact('c-nomail'));
  await emailButton.waitFor({ timeout: 10000 });
  await expect(emailButton).toBeDisabled();
  await expect(gateReason).toContainText('No email address');
  await expect.poll(() => calls.some((c) => c.method === 'GET' && /\/suppressions\/may-send/.test(c.url)), { timeout: 10000 }).toBe(false);
  await page.evaluate(() => { App.closeModal(); });
  await expect(emailButton).toHaveCount(0);

  // ── Disabled state: send-gate reports may_send: false ──
  await page.evaluate(() => App.viewContact('c-carol'));
  await emailButton.waitFor({ timeout: 10000 });
  await expect(emailButton).toBeDisabled();
  await expect(gateReason).toContainText('Sending not allowed');
  await expect(gateReason).toContainText('address is suppressed');
  await expect.poll(() => calls.some((c) => c.method === 'GET'
    && /\/suppressions\/may-send/.test(c.url)
    && c.url.includes('email=carol%40example.com')), { timeout: 10000 }).toBe(true);
  await page.evaluate(() => { App.closeModal(); });
  await expect(emailButton).toHaveCount(0);

  // ── Enabled state + sent (202) ──
  await page.evaluate(() => App.viewContact('c-alice'));
  await emailButton.waitFor({ timeout: 10000 });
  await expect(emailButton).toBeEnabled();
  await expect(gateReason).toHaveCount(0);
  await emailButton.click();
  await page.waitForSelector('#contact-email-form', { timeout: 10000 });
  await expect(page.locator('#contact-email-recipient')).toHaveValue('alice@example.com');
  await expect.poll(() => calls.some((c) => c.method === 'GET'
    && /\/suppressions\/may-send/.test(c.url)
    && c.url.includes('email=alice%40example.com')), { timeout: 10000 }).toBe(true);
  await submitEmail('Quarterly check-in', 'Hi Alice, following up on our call.');
  await expect.poll(() => calls.some((c) => {
    if (c.method !== 'POST' || !/\/contacts\/c-alice\/send-email$/.test(c.url) || !c.body) return false;
    let b; try { b = JSON.parse(c.body); } catch (e) { return false; }
    return b.subject === 'Quarterly check-in' && b.body === 'Hi Alice, following up on our call.';
  }), { timeout: 10000 }).toBe(true);
  await expect(statusMessage).toContainText('Email accepted');
  await expect(statusMessage).toContainText('alice@example.com');
  await expect(page.locator('#contact-email-status button', { hasText: 'Try Again' })).toHaveCount(0);

  // ── Not allowed (409) — message carries the gate's reasons ──
  sendEmailResponse = { status: 409, body: { detail: 'Email send refused by send gate: address is suppressed; consent is not opted_in' } };
  await backToContact();
  await openEmailForm();
  await submitEmail('Retry after refusal', 'Second attempt.');
  await expect(statusMessage).toContainText('Email not allowed');
  await expect(statusMessage).toContainText('address is suppressed');
  await expect(statusMessage).toContainText('consent is not opted_in');

  // ── Sending not configured (503) ──
  sendEmailResponse = { status: 503, body: { detail: 'email sending is not configured' } };
  await tryAgain();
  await submitEmail('Still here', 'Third attempt.');
  await expect(statusMessage).toContainText('Email sending is not configured');

  // ── Could not be sent (502) ──
  sendEmailResponse = { status: 502, body: { detail: 'the email could not be sent' } };
  await tryAgain();
  await submitEmail('One more', 'Fourth attempt.');
  await expect(statusMessage).toContainText('The email could not be sent');
  await backToContact();

  // ── Review defect: hostile contact id stays inside its data attribute ──
  await page.evaluate(() => App.viewContact('c-"pwn="1'));
  await emailButton.waitFor({ timeout: 10000 });
  await expect(emailButton).toBeEnabled();
  await expect(emailButton).toHaveAttribute('data-contact-id', 'c-"pwn="1');
  // No forged "pwn" attribute from the embedded double quotes.
  expect(await emailButton.evaluate((el) => Array.from(el.attributes).map((a) => a.name)))
    .not.toContain('pwn');
  await emailButton.click();
  await page.waitForSelector('#contact-email-form', { timeout: 10000 });
  await expect(page.locator('#contact-email-recipient')).toHaveValue('ida@example.com');
  await page.locator('#contact-email-form button', { hasText: 'Cancel' }).click();
  await emailButton.waitFor({ timeout: 10000 });
  await page.evaluate(() => { App.closeModal(); });
  await expect(emailButton).toHaveCount(0);

  expect(errors).toEqual([]);
});
