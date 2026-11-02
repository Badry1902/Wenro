# Free test site (preview)

Goal: a link like `https://wenro-xxxx.vercel.app` to show operators and partners. Not the launch setup.

## Why Vercel for the test site

The app is Next.js with server code (bookings, dashboards, scheduled jobs). It needs a host that runs Next.js on a
server. Vercel (the company behind Next.js) has a free Hobby plan, connects to GitHub, and needs no card.

Limits to know:
- Hobby is meant for personal / non-commercial use. Fine for a private test; move to a paid plan or another host
  before taking real bookings.
- Hobby cron jobs run at most daily, so the 10-minute schedule uses a free external scheduler (step 6).
- Free Supabase projects pause after a period of inactivity; open the dashboard to resume if the site shows errors.

Google options (for later): Firebase App Hosting and Cloud Run both run Next.js from GitHub, but need a Google Cloud
billing account (a card), even when usage stays within the free quota. Google AI Studio's "Build" mode is for apps
it generates itself; it is not a host for this project.

## Steps

1. **GitHub**: push the project to the repository (private is fine).
2. **Vercel**: sign up at vercel.com with GitHub → Add New → Project → import the repository.
   Framework is detected as Next.js; keep the defaults.
3. **Environment variables** (Vercel → Project → Settings → Environment Variables), from your `.env.local`:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | same as `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as `.env.local` |
   | `SUPABASE_SERVICE_ROLE_KEY` | same as `.env.local` (secret) |
   | `CRON_SECRET` | same as `.env.local` (secret) |
   | `MESSAGE_LINK_KEY` | same as `.env.local` (secret) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` (fill after the first deploy, then redeploy) |
   | `NEXT_PUBLIC_SITE_MODE` | `preview` (test banner + hidden from Google) |
   Never set `WENRO_LOCAL_PG_URL` on Vercel.
4. **Deploy**, open the link, check `/en` and `/ar`.
5. **Supabase sign-in links** (Supabase → Authentication → URL Configuration):
   - Site URL: `https://<your-project>.vercel.app`
   - Redirect URLs: add `https://<your-project>.vercel.app/**`
   Then sign in at `/en/signin` with your email and claim the WENRO owner workspace at `/en/app/join`.
   Note: Supabase's built-in email sender is for testing only (few emails per hour, may only deliver to your
   project's team members). Operators signing in need a custom SMTP sender (Supabase → Authentication → SMTP),
   which comes with the email provider in `docs/messaging-and-schedule.md`.
6. **Schedule** (free, e.g. cron-job.org): new job → URL `https://<your-project>.vercel.app/api/cron/tick`,
   every 10 minutes, advanced → header `Authorization` = `Bearer <CRON_SECRET>`. Test run should return 200 with a JSON
   summary; 401 means the header is wrong.
7. **Check**: book a `[DEMO]` trip, open Admin → Messages (it shows "Logged" until an email provider is set),
   and the operator dashboard.

Every `git push` redeploys automatically. Each pull request gets its own preview link.

## Before launch (not for the test site)

Own domain, paid hosting plan, email provider + SMTP for sign-in, remove `[DEMO]` data
(`supabase/demo/remove_demo.sql`), remove `NEXT_PUBLIC_SITE_MODE`, legal texts, backup restore test.
