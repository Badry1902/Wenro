// End-to-end check of messaging. Needs the app on :3100 (localpg) with CRON_SECRET set.
// Mode "log":  no provider → messages are "logged".
// Mode "send": RESEND_API_KEY/MAIL_FROM set and RESEND_API_URL pointing at scripts/fake-mail-provider.js →
//              emails are captured; the manage link inside the email must open the guest's own booking.
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3100';
const MODE = process.argv[2] || 'log';
const MAILS = process.env.MAILS || '/tmp/claude-0/mails.jsonl';
const SHOTS = process.env.SHOTS || '/tmp/claude-0/shots';
const CRON = process.env.CRON_SECRET;
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'ok    ' : 'NOT OK', name); };
const tick = (auth = true) => fetch(`${B}/api/cron/tick`, { headers: auth ? { Authorization: `Bearer ${CRON}` } : {} });

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const guestName = `Mia Krüger ${MODE}`;

  // 1. A German guest books on the site
  const g = await b.newPage({ viewport: { width: 1280, height: 900 } });
  g.on('pageerror', (e) => errors.push(e.message));
  await g.goto(`${B}/de/experiences/demo-giftun-island`);
  await g.getByRole('button', { name: 'Weiter' }).click();
  await g.waitForURL(/\/de\/book\//);
  await g.getByLabel('Vollständiger Name').fill(guestName);
  await g.getByLabel('E-Mail').fill('mia@example.com');
  await g.locator('#phone').fill('151 2223344');
  await g.getByRole('button', { name: 'Buchung prüfen' }).click();
  await g.getByLabel(/Ich akzeptiere/).check();
  await g.getByRole('button', { name: 'Buchung bestätigen' }).click();
  await g.waitForURL(/\/de\/booking\//, { timeout: 15000 });
  const voucherUrl = g.url();
  const ref = ((await g.locator('main').innerText()).match(/WR-\d+/) || [])[0];
  check(`guest booked (${ref})`, !!ref);

  // 2. The scheduled endpoint is protected
  check('scheduler refuses calls without the secret (401)', (await tick(false)).status === 401);
  const r = await tick();
  const body = await r.json();
  check(`scheduler runs with the secret (${JSON.stringify(body.mail)})`, r.ok && body.mail.claimed >= 1);

  // 3. WENRO team sees the message and its preview
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const a = await ctx.newPage();
  await a.goto(`${B}/en/signin`);
  await a.locator('form:has(input[name="uid"][value$="a1"]) button').click();
  await a.waitForURL(/admin/);
  await a.goto(`${B}/en/app/admin/messages`);
  const row = a.locator('li', { hasText: ref }).filter({ hasText: 'Booking confirmed' }).first();
  const rowText = await row.innerText();
  check(`message listed as ${MODE === 'log' ? 'Logged' : 'Sent'}`, rowText.includes(MODE === 'log' ? 'Logged' : 'Sent') && rowText.includes('DE'));
  await a.screenshot({ path: `${SHOTS}/m1-admin-messages-${MODE}.png`, fullPage: true });
  await row.getByRole('link', { name: 'Preview' }).click();
  await a.waitForURL(/messages\/[0-9a-f-]{36}/);
  const frame = a.frameLocator('iframe');
  const mailText = await frame.locator('body').innerText();
  check('preview is the German email with the booking details', mailText.includes('Ihre Buchung ist bestätigt') && mailText.includes(ref) && mailText.includes('Buchung ansehen'));
  check('preview hides the real manage link', !(await a.content()).includes(voucherUrl.split('/booking/')[1]));
  await a.screenshot({ path: `${SHOTS}/m2-preview-de-${MODE}.png`, fullPage: true });

  // 4. Run-now button works
  await a.goto(`${B}/en/app/admin/messages`);
  await a.getByRole('button', { name: 'Run scheduled jobs now' }).click();
  await a.waitForURL(/ok=jobs_ran/);
  await a.getByText('Scheduled jobs ran').waitFor({ timeout: 10000 }).catch(() => {});
  check('"Run scheduled jobs now" works', (await a.locator('main').innerText()).includes('Scheduled jobs ran'));

  // 5. Manual WhatsApp text for the WENRO team
  await a.goto(`${B}/en/app/admin/bookings?span=30`);
  const wa = await a.locator('li', { hasText: ref }).getByRole('link', { name: /WhatsApp/ }).getAttribute('href');
  const waText = decodeURIComponent(wa.split('text=')[1] || '');
  check('WhatsApp button carries a German prefilled message', wa.startsWith('https://wa.me/49') && waText.includes('Hallo'));

  // 6. Real sending through the (fake) provider: the email's link must open the guest's booking
  if (MODE === 'send') {
    const mails = fs.readFileSync(MAILS, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    const mine = mails.find((m) => m.to?.[0] === 'mia@example.com' && m.subject.includes('Buchung bestätigt') && m.text.includes(ref));
    check('provider received the email with an idempotency key', !!mine && /^wenro-/.test(mine.idem));
    const link = (mine?.text.match(/https?:\/\/\S+\/booking\/[a-f0-9]+/) || [])[0];
    check('email contains the guest\'s manage link', !!link && link === voucherUrl);
    const v = await b.newPage();
    await v.goto(link);
    check('the link opens the guest\'s own voucher', (await v.locator('main').innerText()).includes(ref));
    fs.writeFileSync(`${SHOTS}/m3-email-de.html`, mine.html);
  }
  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
  const failed = results.filter((x) => !x).length;
  console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} MESSAGING CHECKS PASSED (${MODE})`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
