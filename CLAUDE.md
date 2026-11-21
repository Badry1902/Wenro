# WENRO — notes for coding agents

## Performance profile
- Tier: S data, M users (decided 2026-11-22)
- Expected users (6 months): 1,000–10,000 guests and partners
- Biggest growing tables: bookings, booking_lines, notifications, message_outbox, ledger_entries (< 10k bookings/year); < 300 experiences
- Freshness: public catalog can be up to 5 minutes old (ISR); dashboards, seats and money are always live (no caching)
- Images: many (trip galleries) — always through `mediaSrc()` (Cloudinary/Unsplash transforms), lazy below the fold
- Infra budget: a small monthly cost is OK when it clearly helps
- Always use the `speed-engineer` skill when touching DB queries/schema, lists, data fetching, images or loading states.

## Rules that keep the site light
- Only client-side namespaces reach the browser (`clientMessages` in `src/app/[locale]/layout.tsx`); server-only texts go under `app`, `email`, `voucher`, `whatsapp`.
- Header and footer links use `prefetch={false}`.
- Every list RPC has a server-side cap or a date window; every foreign key has an index (migration).
