// End-to-end check of the five workspaces in a real browser, on the LOCAL developer database.
// Needs: app on :3100 in localpg mode, dev users loaded (supabase/demo/dev_users_local.sql), Playwright.
// Story: operator adds departures → marketer link visit → agency books for a client → operator checks in
// → WENRO creates the statement, marks it received, prepares and pays the agency payout → agency sees "Paid".

const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3100';
const SHOTS = process.env.SHOTS || '/tmp/claude-0/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const U = { owner: 'a1', op: 'b1', staff: 'b2', marketer: 'd1', agency: 'e1' };
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const results = [];
const check = (name, ok) => { results.push([ok ? 'ok' : 'NOT OK', name]); console.log(ok ? 'ok    ' : 'NOT OK', name); };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  async function as(who, viewport = { width: 1366, height: 900 }) {
    const ctx = await b.newContext({ viewport });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    await p.goto(`${B}/en/signin`);
    await p.locator(`form:has(input[name="uid"][value$="${U[who]}"]) button`).click();
    await p.waitForURL(/\/en\/app\/(admin|o|p)\b/);
    return p;
  }
  const flash = async (p) => { const l = p.locator('main p[role="status"], main p[role="alert"]').first(); await l.waitFor({ timeout: 10000 }).catch(() => {}); return l.innerText().catch(() => ''); };

  // 1. Operator owner adds a repeating 17:00 departure
  const op = await as('op');
  check('operator lands on the run sheet', (await op.locator('h1').innerText()) === 'Run sheet');
  await op.screenshot({ path: `${SHOTS}/d1-operator-today.png`, fullPage: true });
  await op.getByRole('link', { name: 'Departures', exact: true }).click();
  await op.getByLabel('Experience').selectOption({ label: '[DEMO] Giftun Island Snorkeling' }).catch(async () => {
    await op.getByLabel('Experience').selectOption({ index: 0 });
  });
  await op.getByLabel('Start times').fill('17:00');
  await op.locator('form:has(button:has-text("Add departures")) input[name="capacity"]').fill('10');
  await op.getByRole('button', { name: 'Add departures' }).click();
  await op.waitForURL(/ok=slots_created/);
  check('operator creates repeating departures', (await flash(op)).includes('Departures added'));
  await op.screenshot({ path: `${SHOTS}/d2-operator-departures.png`, fullPage: true });

  // 2. Marketer: link + QR; a visit through the link is counted
  const mk = await as('marketer');
  const before = Number(((await mk.getByText(/\d+ visits?/).first().innerText()).match(/\d+/) || ['0'])[0]);
  const visitor = await b.newPage();
  const counted = visitor.waitForResponse((r) => r.url().endsWith('/api/click'), { timeout: 15000 }).catch(() => null);
  await visitor.goto(`${B}/en/experiences/demo-giftun-island?ref=BLOGGER10`);
  await counted; // the visit is counted from the browser, so the trip page itself can stay cached
  await visitor.close();
  await mk.reload();
  const after = Number(((await mk.getByText(/\d+ visits?/).first().innerText()).match(/\d+/) || ['0'])[0]);
  check(`marketer sees the link visit counted (${before} → ${after})`, after === before + 1);
  check('marketer sees a QR code', (await mk.locator('figure svg').count()) === 1);
  await mk.getByLabel('Link to').selectOption({ index: 1 });
  await mk.getByRole('button', { name: 'Make link' }).click();
  check('marketer builds an experience link', (await mk.locator('p.font-mono').innerText()).includes('/experiences/') );
  await mk.screenshot({ path: `${SHOTS}/d3-marketer.png`, fullPage: true });

  // 3. Agency manager books for a walk-in client
  const ag = await as('agency');
  await ag.getByRole('link', { name: 'Book for a client' }).first().click();
  await ag.locator('li', { hasText: 'Giftun' }).getByRole('link', { name: 'Choose date' }).click();
  await ag.waitForURL(/ag=/);
  await ag.getByRole('button', { name: 'Continue' }).click();
  await ag.waitForURL(/\/en\/book\//);
  check('checkout shows the agency banner', await ag.getByText('Booking for a client of [DEMO] Sun Agency').isVisible());
  await ag.getByLabel('Full name').fill('Lena Hoffmann');
  await ag.getByLabel('Email').fill('lena@example.com');
  await ag.locator('#phone').fill('160 1112233');
  await ag.getByRole('button', { name: 'Review booking' }).click();
  await ag.getByLabel(/I accept/).check();
  await ag.getByRole('button', { name: 'Confirm booking' }).click();
  await ag.waitForURL(/\/en\/booking\//, { timeout: 15000 });
  const voucher = await ag.locator('main').innerText();
  const ref = (voucher.match(/WR-\d+/) || [])[0];
  check(`agency booking confirmed (${ref})`, !!ref);
  await ag.goto(`${B}/en/app`);
  await ag.getByRole('link', { name: 'Bookings' }).click();
  await ag.waitForURL(/\/bookings$/);
  await ag.getByRole('heading', { name: 'Bookings' }).waitFor();
  check('agency sees the booking with the client name', (await ag.locator('main').innerText()).includes('Lena Hoffmann'));
  await ag.screenshot({ path: `${SHOTS}/d4-agency-bookings.png`, fullPage: true });

  // 4. Operator staff: sees the guest, no money; owner checks in
  const st = await as('staff');
  const staffView = await st.locator('main').innerText();
  check('staff sees the client on the run sheet', staffView.includes('Lena Hoffmann'));
  check('staff sees no money', !/Collect .*in cash/.test(staffView) && !st.url().includes('experiences'));
  check('staff has no Experiences menu', (await st.getByRole('link', { name: 'Experiences' }).count()) === 0);
  await op.goto(`${B}/en/app`);
  const row = op.locator('li', { hasText: ref });
  check('owner sees cash to collect', (await row.innerText()).includes('in cash'));
  await row.getByRole('button', { name: 'Check in' }).click();
  await op.waitForURL(/ok=checked_in/);
  check('operator checks the guest in', (await flash(op)).includes('Checked in'));
  await op.screenshot({ path: `${SHOTS}/d5-operator-checked-in.png`, fullPage: true });

  // 5. WENRO: statement → received → payout → paid
  const ad = await as('owner');
  check('admin overview opens', (await ad.locator('h1').innerText()).includes('WENRO'));
  await ad.screenshot({ path: `${SHOTS}/d6-admin-overview.png`, fullPage: true });
  await ad.getByRole('link', { name: 'Bookings', exact: true }).click();
  check('admin sees the agency booking with its split', (await ad.locator('li', { hasText: ref }).innerText()).includes('Via agency'));
  await ad.getByRole('link', { name: 'Money' }).click();
  await ad.locator('input[name="from"]').fill(today);
  await ad.locator('input[name="to"]').fill(today);
  await ad.getByRole('button', { name: 'Create statements' }).click();
  await ad.waitForURL(/(ok|err)=/);
  check(`admin creates statements (${new URL(ad.url()).search})`, ad.url().includes('ok=statements_generated'));
  const stmt = ad.locator('#statements li', { hasText: 'Red Sea Boats' }).filter({ has: ad.getByRole('button', { name: 'Mark received' }) }).first();
  await stmt.getByRole('button', { name: 'Mark received' }).click();
  await ad.waitForURL(/ok=statement_received/);
  check('admin marks the statement received', (await flash(ad)).includes('received'));
  await ad.getByRole('button', { name: 'Prepare payouts' }).click();
  await ad.waitForURL(/ok=payouts_created/);
  const po = ad.locator('#payouts li', { hasText: 'Sun Agency' }).filter({ has: ad.getByRole('button', { name: 'Mark paid' }) }).first();
  await po.getByLabel('InstaPay reference').fill('IPN-TEST-001');
  await po.getByRole('button', { name: 'Mark paid' }).click();
  await ad.waitForURL(/ok=payout_paid/);
  check('admin pays the agency payout', (await flash(ad)).includes('paid'));
  await ad.screenshot({ path: `${SHOTS}/d7-admin-finance.png`, fullPage: true });

  // 6. Agency sees the payout as paid
  await ag.goto(`${B}/en/app`);
  check('agency sees the payout as Paid', (await ag.locator('main').innerText()).match(/Paid/g)?.length >= 1);
  await ag.screenshot({ path: `${SHOTS}/d8-agency-overview.png`, fullPage: true });

  // 7. Permissions: other workspaces are not reachable by URL
  const opOrg = op.url().match(/\/app\/o\/([0-9a-f-]{36})/)[1];
  const notFound = async (p, url) => { await p.goto(url); return p.getByText('could not be found').first().waitFor({ timeout: 10000 }).then(() => true, () => false); };
  check('marketer cannot open the operator workspace (not found)', await notFound(mk, `${B}/en/app/o/${opOrg}`));
  check('operator cannot open WENRO finance (not found)', await notFound(op, `${B}/en/app/admin/finance`));

  // 8. Arabic, phone width: operator run sheet
  const ar = await as('op', { width: 390, height: 844 });
  await ar.goto(ar.url().replace('/en/', '/ar/'));
  check('Arabic dashboard is RTL', (await ar.evaluate(() => document.documentElement.dir)) === 'rtl');
  check('no sideways scroll on phone', !(await ar.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await ar.screenshot({ path: `${SHOTS}/d9-operator-ar-mobile.png`, fullPage: true });

  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
  const failed = results.filter((r) => r[0] !== 'ok').length;
  console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} DASHBOARD CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
