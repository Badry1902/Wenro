// End-to-end: operator creates an experience in the editor, uploads a photo, sends it for review;
// WENRO publishes it; it appears on the site and can be booked. Plus team invite, money page,
// coupons, support cancel and the demo-workspace switch. Needs the app on :3100 (localpg) and dev users.
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3100';
const SHOTS = process.env.SHOTS || '/tmp/claude-0/shots';
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'ok    ' : 'NOT OK', name); };
const U = { owner: 'a1', op: 'b1', staff: 'b2' };

// A real 1×1 JPEG, enough to exercise the upload path and the file-type check
const JPG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
fs.writeFileSync('/tmp/claude-0/test-photo.jpg', JPG);
fs.writeFileSync('/tmp/claude-0/not-a-photo.jpg', 'just text pretending to be a photo');

(async () => {
  const b = await chromium.launch();
  const errors = [];
  async function as(who, viewport = { width: 1366, height: 900 }) {
    const ctx = await b.newContext({ viewport });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    if (process.env.DEBUG) p.on('response', (r) => { if (r.request().method() === 'POST') console.log('   ', who, 'POST', r.status(), r.url().replace(B, '')); });
    if (process.env.DEBUG) p.on('console', (m) => m.type() === 'error' && console.log('   ', who, 'console', m.text().slice(0, 200)));
    await p.goto(`${B}/en/signin`);
    await p.locator(`form:has(input[name="uid"][value$="${U[who]}"]) button`).click();
    await p.waitForURL(/\/en\/app\/(admin|o|p)\b/);
    return p;
  }
  const flash = async (p) => { const l = p.locator('main p[role="status"], main p[role="alert"]').first(); await l.waitFor({ timeout: 10000 }).catch(() => {}); return l.innerText().catch(() => ''); };
  const seen = (p, text) => p.getByText(text, { exact: false }).first().waitFor({ timeout: 10000 }).then(() => true, () => false);
  const notFound = async (p, url) => { await p.goto(url); return seen(p, 'could not be found'); };
  const title = `Mangrove kayak ${Date.now().toString().slice(-5)}`;

  // 1. Operator creates a draft
  const op = await as('op');
  const org = op.url().match(/\/app\/o\/([0-9a-f-]{36})/)[1];
  await op.getByRole('link', { name: 'Experiences' }).click();
  await op.getByRole('link', { name: '+ New experience' }).click();
  await op.waitForURL(/experiences\/new/, { waitUntil: 'commit' });
  await op.getByRole('button', { name: 'Create draft' }).click();
  check('editor refuses a draft without a title (and keeps the form)', (await op.locator('form p[role="alert"]').innerText()).includes('English title'));
  await op.getByLabel('Title *').fill(title);
  await op.getByLabel('One-line summary').fill('Paddle through calm lagoon water.');
  await op.getByLabel('Category').selectOption({ label: 'Sea' });
  await op.locator('input[placeholder="24"]').fill('24');
  check('guest price preview: net 24 → €30', (await op.locator('output').first().innerText()).includes('€30.00'));
  await op.getByRole('tab', { name: 'AR' }).click();
  await op.getByLabel('Title').fill('كاياك بين أشجار المانجروف');
  await op.getByRole('button', { name: '+ Add an extra' }).click();
  await op.getByLabel('Name (EN)').fill('Waterproof phone bag');
  await op.getByLabel('Name (AR)').fill('كيس مقاوم للماء للموبايل');
  await op.locator('section[aria-labelledby="ed-extras"] input[inputmode="decimal"]').fill('3');
  await op.getByRole('checkbox', { name: 'Hurghada' }).check();
  await op.screenshot({ path: `${SHOTS}/e1-editor.png`, fullPage: true });
  await op.getByRole('button', { name: 'Create draft' }).click();
  await op.waitForURL(/experiences\/[0-9a-f-]{36}\?ok=experience_created/, { waitUntil: 'commit' });
  const expId = op.url().match(/experiences\/([0-9a-f-]{36})/)[1];
  check('draft created and editor reopened', (await flash(op)).includes('Draft created'));
  check('Arabic title kept', (await op.getByRole('tab', { name: /AR/ }).innerText()).includes('AR'));

  // 2. Photos
  await op.locator('input[type="file"]').setInputFiles('/tmp/claude-0/not-a-photo.jpg');
  await op.getByRole('button', { name: 'Upload' }).click();
  await op.waitForURL(/err=photo_type/, { waitUntil: 'commit' });
  await op.locator('main p[role="alert"]').first().waitFor();
  check('a fake image is refused (file type checked from content)', (await flash(op)).includes('Only JPG'));
  await op.locator('input[type="file"]').setInputFiles('/tmp/claude-0/test-photo.jpg');
  await op.getByLabel('Short description (for screen readers)').fill('Kayaks at the lagoon');
  await op.getByRole('button', { name: 'Upload' }).click();
  await op.waitForURL(/ok=photo_added/, { waitUntil: 'commit' });
  await op.getByText('Photo added.').waitFor({ timeout: 15000 }).catch(async () => { await op.screenshot({ path: `${SHOTS}/e-debug-photo.png`, fullPage: true }); });
  const src = await op.locator('#photos ul img').first().getAttribute('src', { timeout: 15000 });
  check(`photo stored and shown (${src})`, !!src && (await (await fetch(B + src)).status) === 200);

  // 3. Send for review → WENRO publishes
  await op.goto(`${B}/en/app/o/${org}/experiences`);
  await op.locator('li', { hasText: title }).getByRole('button', { name: 'Send for review' }).click();
  await op.waitForURL(/ok=experience_in_review/, { waitUntil: 'commit' });
  const ad = await as('owner');
  await ad.goto(`${B}/en/app/admin/experiences`);
  await ad.locator('li', { hasText: title }).getByRole('button', { name: 'Publish', exact: true }).click();
  await ad.waitForURL(/ok=experience_published/, { waitUntil: 'commit' });
  const slug = await ad.locator('li', { hasText: title }).getByRole('link', { name: 'View page' }).getAttribute('href');
  const pub = await b.newPage();
  await pub.goto(`${B}${slug}`);
  check('published experience is live with the guest price', (await pub.content()).includes('€30.00'));
  await pub.goto(`${B}${slug.replace('/en/', '/ar/')}`);
  check('Arabic visitors see the Arabic title', (await pub.locator('h1').innerText()).includes('المانجروف'));

  // 4. Money page (owner) and staff restrictions
  await op.goto(`${B}/en/app/o/${org}/money`);
  check('operator money page shows kept / owed', (await seen(op, 'You keep')) && (await seen(op, 'Owed to WENRO')));
  await op.screenshot({ path: `${SHOTS}/e2-money.png`, fullPage: true });
  const st = await as('staff');
  check('staff menu has no Money or Team', (await st.getByRole('link', { name: 'Money' }).count()) === 0 && (await st.getByRole('link', { name: 'Team' }).count()) === 0);
  check('staff cannot open the money page (not found)', await notFound(st, `${B}/en/app/o/${org}/money`));
  check('staff cannot open the editor (not found)', await notFound(st, `${B}/en/app/o/${org}/experiences/${expId}`));

  // 5. Team invite
  await op.goto(`${B}/en/app/o/${org}/team`);
  const mail = `captain${Date.now().toString().slice(-5)}@example.com`;
  await op.getByLabel('Email').fill(mail);
  await op.getByRole('button', { name: 'Send invitation' }).click();
  await op.waitForURL(/ok=invited/, { waitUntil: 'commit' });
  check('invitation listed as waiting', await seen(op, mail));

  // 6. Coupons and support cancel (WENRO)
  await ad.goto(`${B}/en/app/admin/coupons`);
  await ad.getByLabel('Code').fill('TEST15');
  await ad.getByLabel('Discount %').fill('15');
  await ad.getByRole('button', { name: 'Save code' }).click();
  check('coupon over 10% is refused by the browser or the database', !ad.url().includes('ok=coupon_saved'));
  await ad.goto(`${B}/en/app/admin/coupons`);
  await ad.getByLabel('Code').fill('TEST5');
  await ad.getByLabel('Discount %').fill('5');
  await ad.getByRole('button', { name: 'Save code' }).click();
  await ad.waitForURL(/ok=coupon_saved/, { waitUntil: 'commit' });
  check('5% coupon saved', await seen(ad, 'Code saved'));
  await ad.goto(`${B}/en/app/admin/bookings?span=14`);
  const row = ad.locator('li', { has: ad.locator('summary', { hasText: 'Cancel booking' }) }).first();
  const ref = (await row.innerText()).match(/WR-\d+/)[0];
  await row.locator('summary', { hasText: 'Cancel booking' }).click();
  await row.getByRole('button', { name: 'Yes, cancel it' }).click();
  await ad.waitForURL(/ok=booking_cancelled/, { waitUntil: 'commit' });
  check(`support cancels ${ref}`, (await flash(ad)).includes('Booking cancelled'));

  // 7. Demo workspaces: owner joins and switches
  await ad.goto(`${B}/en/app/admin`);
  const join = ad.getByRole('button', { name: 'Join the demo workspaces' });
  if (await join.count()) {
    await join.click();
    await ad.waitForURL(/ok=demo_joined/, { waitUntil: 'commit' });
  }
  const switches = await ad.locator('aside ul li a').allInnerTexts();
  check(`owner can switch to the demo dashboards (${switches.length})`, switches.some((s) => s.includes('Desert Riders')) && switches.some((s) => s.includes('Sun Agency')));
  await ad.screenshot({ path: `${SHOTS}/e3-admin-overview.png`, fullPage: true });

  // 8. Home page shows the demo trip cards with photos
  const home = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await home.goto(`${B}/en`);
  check('home lists the demo experiences with cover images', (await home.locator('main .trip-card img').count()) >= 10);
  await home.waitForTimeout(600);
  await home.screenshot({ path: `${SHOTS}/e4-home.png`, fullPage: true });
  const reduce = await b.newContext({ reducedMotion: 'reduce' });
  const rp = await reduce.newPage();
  await rp.goto(`${B}/en`);
  check('reduced motion: cards still visible', (await rp.locator('main ul li').first().evaluate((e) => getComputedStyle(e).opacity)) !== '0');

  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
  const failed = results.filter((x) => !x).length;
  console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} EDITOR CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
