# WENRO

Booking platform for local trips and experiences, starting in Hurghada.
Stack: **Next.js 15 (App Router, TypeScript, Tailwind v4)** + **Supabase (PostgreSQL, Auth, Storage)**.

> Status: **public booking flow + all five workspaces built and tested** (local database and Supabase).
> Not production-ready yet: messaging, scheduled jobs, experience editor, legal texts and SVG logo are open.

## What is real vs. not yet

| Area | State |
| --- | --- |
| Data model, roles, row-level security | Implemented and tested |
| Booking engine (prices, 80/10/10 split, coupons, seats, request mode, cancellations, weather, check-in, statements, payouts) | Implemented as database functions and tested |
| 5 languages + Arabic RTL, brand tokens, self-hosted fonts | Implemented (foundation page only) |
| Experience page, booking steps, voucher with QR, manage/cancel link, referral links (`?ref=CODE`) | Built and tested end to end (EN + AR, desktop + phone) |
| Workspaces: operator (run sheet, QR check-in, requests, weather cancel, departures), WENRO admin (overview, bookings, partner approval, publishing, money: statements → received → payouts → paid), marketer (link, QR, visits, earnings, payouts), agency (book for a client, bookings, earnings) | Built; 23-step browser test `scripts/e2e-dashboards.js` |
| Emails to guests, operators and the team (5 languages; de/ru/fr need native review), message log with preview, manual WhatsApp buttons | Built and tested; runs in **log mode** until an email provider + domain are set (`docs/messaging-and-schedule.md`) |
| Scheduled jobs (12h request expiry, 18:00 reconfirm, 21:00 alert, 22:00 auto-cancel) | Built (`/api/cron/tick`, `vercel.json`); needs `CRON_SECRET` and a scheduler on the host |
| Experience editor for operators | Not built — WENRO enters content during launch |
| WhatsApp Business API | Later; manual WhatsApp buttons meanwhile |
| Online payment | Out of scope for launch (cash on site); data model is ready for it |
| Logo | **Temporary PNG** in `public/brand/` — replace with the SVG master before launch |
| Terms, privacy, cancellation texts | Drafts only — **need legal review** |

## First-time setup

1. Install Node.js 20+ and run `npm install`.
2. Supabase project `uogaucwogtnmihnzhhax` (eu-west-1) already has all migrations in
   `supabase/migrations/` applied, plus the reference data (WENRO org, zones, categories,
   cancellation policies). File names match the project's migration history, so
   `supabase link --project-ref uogaucwogtnmihnzhhax` + `supabase db push` only applies new ones.
3. `supabase/seed.sql` is for **local tests only** (it writes fake rows into `auth.users`).
   Never run it on the hosted project.
4. Copy `.env.example` to `.env.local`. The URL and publishable key are already filled in;
   add the secret key from Supabase → Project Settings → API Keys, and a random `CRON_SECRET`.
   Keys stay in `.env.local` / your hosting provider's settings. Never commit them or paste them in chat.
5. `npm run dev` → http://localhost:3000 (redirects to `/en`; try `/ar` for RTL).

## Running without Supabase (developers)

Set `WENRO_LOCAL_PG_URL` to a local Postgres that has the stub, the migrations and
`supabase/demo/demo_content.sql` loaded; the app then talks to that database directly.
Never set this variable in production. For dashboards, also load
`supabase/demo/dev_users_local.sql`; the sign-in page then offers test people (owner, operator owner/staff,
marketer, agency manager/staff, new user). On Supabase, people sign in by email link instead.

## Demo content

`supabase/demo/demo_content.sql` adds `[DEMO]` trips with 30 days of departures.
`supabase/demo/remove_demo.sql` removes them. Run the remove script before launch.

## Database tests

The suite runs on a throwaway local PostgreSQL 15+ (never on a real project):

```bash
PGHOST=localhost PGUSER=postgres ./scripts/test-db.sh
```

Browser tests (app running on :3100 against the local database): `node scripts/e2e-booking.js`,
`node scripts/e2e-dashboards.js`, `node scripts/e2e-messaging.js log|send` (send mode uses
`scripts/fake-mail-provider.js` in place of the real provider).

The database suite checks, among others: the 95.00 / 76.00 / 19.00 example, coupons capped at 10%,
WENRO never going negative, sold-out protection under concurrent bookings, operator
isolation, staff not seeing money, the customer phone appearing only 24h before the trip,
marketers never seeing personal data, the append-only ledger, weather cancellations,
request expiry after 12h, reconfirmation and auto-cancel at 22:00, statements and payouts.

## Where things live

```
supabase/migrations/   schema, security (RLS), booking engine
supabase/seed.sql      [DEMO] data for local/staging
supabase/tests/        database tests (+ local-only Supabase stub)
src/i18n/              languages, routing, RTL
messages/*.json        UI texts (de/ru/fr/ar are first drafts — need native review)
src/lib/supabase/      user client (RLS) and service client (server only)
docs/                  architecture notes and decisions
```
