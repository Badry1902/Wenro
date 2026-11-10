// Public catalogue in a real browser (LOCAL developer database): header account button, home rails,
// listing filters, trip gallery slideshow, similar trips. Stock photos are replaced by local files offline.
const { chromium } = require('playwright');
const B = 'http://localhost:3100';
const results = [];
const check = (name, ok) => { results.push(ok); console.log(ok ? 'ok    ' : 'NOT OK', name); };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route(/images\.unsplash\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="#3046d9"/></svg>' }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));

  await p.goto(`${B}/en`);
  await p.getByRole('link', { name: 'Sign in' }).first().waitFor({ timeout: 5000 }).catch(() => {});
  check('header shows Sign in to visitors', await p.getByRole('link', { name: 'Sign in' }).first().isVisible());
  check('home shows 9 category tiles', (await p.locator('a.cat-tile').count()) === 9);
  check('home shows trip cards with photos', (await p.locator('.trip-card img').count()) >= 10);
  await p.getByRole('button', { name: 'Categories' }).click();
  check('categories menu opens', await p.getByRole('link', { name: /Diving/ }).first().isVisible());
  await p.keyboard.press('Escape');

  // search from the hero
  await p.getByPlaceholder('Snorkelling, quad, Luxor…').first().fill('dolphin');
  await p.getByRole('button', { name: 'Explore experiences' }).click();
  await p.waitForURL(/\/en\/experiences\?q=dolphin/);
  await p.waitForTimeout(500);
  const titles = await p.locator('main .trip-card a').allInnerTexts();
  check(`search "dolphin" finds Dolphin House only (${titles.length})`, titles.length >= 1 && titles.every((x) => /dolphin/i.test(x)));

  await p.goto(`${B}/en/experiences?cat=daytrips`);
  await p.waitForTimeout(500);
  const dayTrips = await p.locator('main .trip-card').count();
  check(`category link filters the list (${dayTrips} day trips)`, dayTrips >= 3 && (await p.locator('main .trip-card').allInnerTexts()).length === dayTrips);
  await p.getByLabel('Instant confirmation').first().check();
  await p.waitForTimeout(300);
  const instant = await p.locator('main .trip-card').count();
  check(`instant-only filter narrows day trips (${dayTrips} → ${instant})`, instant < dayTrips || (await p.getByText('No experiences match these filters.').count()) === 1);
  await p.getByRole('button', { name: 'Clear filters' }).first().click();
  check('clear filters shows every trip', (await p.locator('main .trip-card').count()) >= 28);

  // trip page: gallery moves on by itself, thumbnails jump, similar trips
  await p.goto(`${B}/en/experiences/demo-dolphin-house`);
  const counter = p.locator('[aria-roledescription="carousel"] [aria-live="polite"]');
  check('gallery starts at 1 / 6', (await counter.innerText()) === '1 / 6');
  await p.mouse.move(5, 5); // not hovering the gallery
  await p.waitForTimeout(5600);
  check(`gallery advances by itself (${await counter.innerText()})`, (await counter.innerText()) === '2 / 6');
  await p.getByRole('button', { name: 'Photo 5 of 6' }).click();
  check('thumbnail jumps to photo 5', (await counter.innerText()) === '5 / 6');
  await p.getByRole('button', { name: 'Show all 6 photos' }).click();
  check('full-screen view opens', await p.getByRole('dialog').isVisible());
  await p.keyboard.press('Escape');
  check('full-screen view closes with Escape', (await p.getByRole('dialog').count()) === 0);
  const aside = await p.locator('aside[aria-labelledby="similar-aside"] li').allInnerTexts();
  check(`similar trips listed beside the booking card (${aside.length})`, aside.length === 4 && !aside.some((x) => x.includes('Dolphin House')));
  check('"You might also like" rail', await p.getByRole('heading', { name: 'You might also like' }).isVisible());

  // wishlist heart keeps its state across pages (this browser only)
  await p.getByRole('button', { name: 'Save to wishlist' }).first().click();
  await p.reload();
  await p.getByRole('button', { name: 'Saved to wishlist' }).first().waitFor({ timeout: 5000 }).catch(() => {});
  check('wishlist heart remembered', (await p.getByRole('button', { name: 'Saved to wishlist' }).count()) >= 1);

  // signed-in visitor sees Dashboard
  await p.goto(`${B}/en/signin`);
  await p.locator('form:has(input[name="uid"][value$="b1"]) button').click();
  await p.waitForURL(/\/en\/app\//);
  await p.goto(`${B}/en`);
  await p.getByRole('link', { name: 'Dashboard' }).first().waitFor({ timeout: 5000 }).catch(() => {});
  check('header shows Dashboard when signed in', await p.getByRole('link', { name: 'Dashboard' }).first().isVisible());
  await p.getByRole('link', { name: 'Dashboard' }).first().click();
  await p.waitForURL(/\/en\/app\/(o|p|admin)/);
  check('Dashboard button opens the workspace', true);

  // phone, Arabic: menu sheet, no sideways scroll
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  await m.goto(`${B}/ar`);
  check('no sideways scroll on phone (home)', !(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await m.getByRole('button', { name: 'القائمة' }).click();
  check('phone menu opens', await m.getByRole('dialog').isVisible());
  await m.goto(`${B}/ar/experiences/demo-luxor-balloon`);
  check('no sideways scroll on phone (trip page)', !(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth)));

  console.log('page errors:', errors.length ? errors : 'none');
  await b.close();
  const failed = results.filter((r) => !r).length + (errors.length ? 1 : 0);
  console.log(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} CATALOGUE CHECKS PASSED`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('E2E FAILED:', e.message); process.exit(1); });
