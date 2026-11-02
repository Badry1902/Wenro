# Messages and scheduled jobs

## What is sent, and when

| Event | Who gets an email | Language |
| --- | --- | --- |
| Instant booking confirmed | Guest (with voucher link) | Guest's language |
| Request booking made | Guest ("we asked the operator") + operator ("answer within 12 h") | Guest / Arabic |
| Request accepted / declined / not answered in 12 h | Guest | Guest's language |
| 18:00 the day before | Guest: "please confirm before 22:00" (with link) | Guest's language |
| 21:00 | WENRO team: list of guests who have not confirmed | Arabic |
| 22:00 | Guest who did not confirm: "seats released" | Guest's language |
| Weather cancellation | Every booked guest | Guest's language |
| Guest cancels | Guest (confirmation) | Guest's language |

Bookings made for tomorrow after 18:00 count as confirmed (the guest just booked), so nobody is
cancelled minutes after booking.

The database decides what to send (a trigger on `bookings` fills `message_outbox`, once per event).
The server sends it. Every message is listed under **Admin → Messages**, with a preview of exactly what the
reader sees, and a "Send again" button.

## Setting it up (keys never go in chat or in Git)

Put these in the hosting provider's environment settings (e.g. Vercel → Project → Settings → Environment Variables)
and in `.env.local` on your computer. See `.env.example` for the full list.

1. `MESSAGE_LINK_KEY`: generate once (command in `.env.example`) and keep it.
2. `CRON_SECRET`: a random string of 32+ characters. The scheduled endpoint refuses to run without it.
3. Email provider (when the domain is ready):
   - Create an account at an email provider with an HTTP API (the code uses Resend; others need a small change in
     `src/lib/messaging/send.ts`).
   - Verify your domain there (it shows DNS records to add at your domain registrar: SPF, DKIM, and a DMARC record).
   - Create an API key and set `RESEND_API_KEY`, `MAIL_FROM` (e.g. `WENRO <bookings@your-domain>`),
     `MAIL_REPLY_TO` (team inbox) and `PLATFORM_ALERT_EMAIL`.
   Until then, everything runs in **log mode**: nothing is sent, messages show as "Logged".
4. Operator email addresses: stored per operator (contact email from the application form).

## The schedule

The endpoint `/api/cron/tick` does everything that is due and is safe to call often. Call it every 10 minutes
with the header `Authorization: Bearer <CRON_SECRET>`.

- **Free test site (Vercel Hobby)**: Hobby only allows daily cron jobs, so `vercel.json` has none. Use a free
  external scheduler such as cron-job.org: URL `https://<your-site>/api/cron/tick`, every 10 minutes,
  request header `Authorization: Bearer <CRON_SECRET>` (see `docs/deploy-preview.md`).
- **Vercel Pro or another host**: any scheduler that can call the URL every 10 minutes with that header
  (Vercel Cron on Pro sends the secret automatically when `CRON_SECRET` is set).
- **By hand**: Admin → Messages → "Run scheduled jobs now".

If the schedule stops, nothing breaks silently: the Admin overview keeps showing "Tomorrow: guests not reconfirmed",
and messages wait in the queue until the next run.

## WhatsApp (until the WhatsApp Business API is connected)

- Admin → Bookings: a green **WhatsApp** button opens WhatsApp with a message already written in the guest's
  language. For trips in the next 48 hours it asks the guest to confirm and includes their own link.
- Operator run sheet: tapping the guest's number (shown 24 h before the trip) opens WhatsApp with a short
  English greeting.

Connecting the WhatsApp Business API later means adding a second channel next to email in the same queue;
the events and texts stay the same.

## Not done yet / needs review

- German, Russian and French email texts are first drafts: native-speaker review needed.
- Emails are transactional only (no marketing). Any marketing email needs consent and an unsubscribe link,
  and a legal review.
- Email provider choice, domain and DNS records are yours to set up.
