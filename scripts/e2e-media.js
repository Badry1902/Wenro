// End-to-end: photos and videos go straight to (fake) Cloudinary with a server signature, the server verifies
// Cloudinary's answer before saving, tampered answers are refused, deletes reach Cloudinary, the page shows video.
// Needs: app on :3100 with Cloudinary env pointing at scripts/fake-cloudinary.js on :4000.
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3100';
const LOG = process.env.CLOG || '/tmp/claude-0/cloudinary.jsonl';
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'ok    ' : 'NOT OK', name); };
const EXP = '50000000-0000-0000-0000-000000000003'; // [DEMO] Dolphin House
fs.writeFileSync('/tmp/claude-0/clip.mp4', Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(4000, 1)]));
fs.writeFileSync('/tmp/claude-0/pic.jpg', Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));
const lines = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${B}/en/signin`);
  await p.locator('form:has(input[name="uid"][value$="b1"]) button').click();
  await p.waitForURL(/\/app\/o\//, { waitUntil: 'commit' });
  const org = p.url().match(/\/app\/o\/([0-9a-f-]{36})/)[1];
  await p.goto(`${B}/en/app/o/${org}/experiences/${EXP}`);
  const tiles = () => p.locator('#photos ul li').count();
  const before = await tiles();
  check('editor offers photo or video upload (Cloudinary mode)', await p.getByText('Photo or short video').isVisible());

  // video
  const n0 = lines().length;
  await p.locator('#photos input[type="file"]').setInputFiles('/tmp/claude-0/clip.mp4');
  await p.getByLabel('Short description (for screen readers)').fill('Dolphins next to the boat');
  await p.getByRole('button', { name: 'Upload' }).click();
  await p.getByText('Added. It is on the page now.').waitFor({ timeout: 15000 });
  await p.waitForFunction((n) => document.querySelectorAll('#photos ul li').length > n, before, { timeout: 15000 });
  const up = lines().slice(n0).find((l) => l.op === 'upload');
  check('browser uploaded straight to Cloudinary with a valid server signature', !!up && up.resource_type === 'video');
  check(`stored in the experience's own folder (${up?.public_id})`, !!up && up.public_id.startsWith(`wenro/experiences/${EXP}/`));
  check('editor lists the video', await p.locator('#photos ul li', { hasText: 'Video' }).count() >= 1);

  // tampered answer from "Cloudinary" is refused
  await p.route('**/v1_1/**/auto/upload', async (route) => {
    const r = await route.fetch(); const j = await r.json();
    await route.fulfill({ response: r, json: { ...j, public_id: j.public_id.replace(EXP, '00000000-0000-0000-0000-000000000000') } });
  });
  await p.locator('#photos input[type="file"]').setInputFiles('/tmp/claude-0/pic.jpg');
  await p.getByRole('button', { name: 'Upload' }).click();
  check('a forged upload result is refused', await p.getByText('could not be verified').waitFor({ timeout: 15000 }).then(() => true, () => false));
  await p.unroute('**/v1_1/**/auto/upload');

  // photo
  await p.locator('#photos input[type="file"]').setInputFiles('/tmp/claude-0/pic.jpg');
  await p.getByRole('button', { name: 'Upload' }).click();
  await p.getByText('Added. It is on the page now.').waitFor({ timeout: 15000 });
  await p.waitForFunction((n) => document.querySelectorAll('#photos ul li').length > n + 1, before, { timeout: 15000 });
  const imgSrc = await p.locator('#photos ul li img').last().getAttribute('src');
  check(`photo shown through Cloudinary with auto format/size (${imgSrc?.slice(0, 80)}…)`, /res\.cloudinary\.com\/.+\/image\/upload\/f_auto,q_auto,c_fill/.test(imgSrc ?? ''));

  // make the video the cover, then the public page shows it in the large middle panel
  await p.locator('#photos ul li', { hasText: 'Video' }).first().getByRole('button', { name: 'Make cover' }).click();
  await p.waitForURL(/ok=photo_cover/, { waitUntil: 'commit' });
  await p.getByText('Cover photo changed').waitFor({ timeout: 10000 });
  // public page shows the video tile
  const pub = await b.newPage();
  await pub.goto(`${B}/en/experiences/demo-dolphin-house`);
  check('experience page shows the video in the gallery', (await pub.locator('.fold-panel video').count()) === 1 && (await pub.content()).includes('/video/upload/f_auto,q_auto'));
  const reduced = await (await b.newContext({ reducedMotion: 'reduce' })).newPage();
  await reduced.goto(`${B}/en/experiences/demo-dolphin-house`);
  await reduced.waitForTimeout(500);
  check('with reduce-motion the video does not autoplay', await reduced.locator('.fold-panel video').evaluate((v) => !v.autoplay && v.controls));

  // delete the video → Cloudinary destroy with a valid signature
  const n1 = lines().length;
  await p.locator('#photos ul li', { hasText: 'Video' }).first().getByRole('button', { name: 'Remove' }).click();
  await p.waitForURL(/ok=photo_removed/, { waitUntil: 'commit' });
  await p.waitForTimeout(800);
  const del = lines().slice(n1).find((l) => l.op === 'destroy');
  check('removing it deletes the file at Cloudinary too', !!del && del.ok === true && del.public_id === up?.public_id);
  // tidy: remove the photo too
  await p.locator('#photos ul li').last().getByRole('button', { name: 'Remove' }).click();
  await p.waitForURL(/ok=photo_removed/, { waitUntil: 'commit' });

  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
  const failed = results.filter((x) => !x).length;
  console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} MEDIA CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
