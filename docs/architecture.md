# Architecture notes

## Money
- Integer minor units + currency on every amount. No floats.
- Operator enters **net** prices. Display price = `net / 0.80`, rounded **up** to the rounding step
  (`platform_settings.price_rounding_minor`, default 1.00). The operator always receives exactly the net;
  the rounding difference goes to WENRO.
- Split of what the customer pays (`paid = gross − discount`):
  - operator: net
  - partner (marketer or agency): 10% of `paid`, only when attributed
  - WENRO: the rest (≥ 0 is enforced; the booking is rejected otherwise)
- Coupons are funded by WENRO only and capped at 10% of the display price.
- Every commercial term is copied into `bookings.terms_snapshot` at creation. Changing settings
  later never changes existing bookings.

## Separate state machines
| Field | Values |
| --- | --- |
| `bookings.status` | pending_request → confirmed / declined / expired; confirmed → cancelled |
| `bookings.execution_status` | scheduled → executed / no_show / not_operated |
| `bookings.reconfirm_status` | not_sent → sent → confirmed |
| `commissions.status` | pending → eligible (executed) → payable (WENRO collected from operator) → paid; or void |
| `operator_statements.status` | open → received |
| `partner_payouts.status` | pending → paid |

## Cash flow (launch: cash on site)
1. Customer pays the operator in cash on the trip day; voucher QR is scanned → `executed`.
2. Weekly `generate_operator_statements` → operator owes `paid − net` per currency.
3. Finance marks the statement received → partner commissions become `payable`.
4. Monthly `create_partner_payouts` → InstaPay transfer → `mark_payout_paid`.
5. `ledger_entries` is append-only; corrections are new entries.

## Access rules (enforced in the database)
- Public: published content and display prices via `public_prices()`. Net prices are never public.
- Operators: their own experiences, slots and run sheet (`operator_bookings()`).
  Staff role sees no money. Customer WhatsApp appears 24h before the trip.
- Marketers: `partner_bookings()` without any personal data.
- Agencies: staff see their own bookings, managers the whole agency; client name only.
- Platform team: full read; writes limited by role (owner, ops, finance, support, content).
- Publishing an experience requires a platform role.
- Seat counters change only inside the booking engine (row lock on the departure).

## Scheduled jobs (to wire in Week 3+)
| Job | When (Africa/Cairo) |
| --- | --- |
| `expire_requests()` | every 15 min |
| `due_reconfirmations()` → send → `mark_reconfirm_sent()` | 18:00 daily |
| `unconfirmed_for_tomorrow()` → admin alert | 21:00 daily |
| `auto_cancel_unconfirmed()` | 22:00 daily |
| `generate_operator_statements()` | weekly |
| `create_partner_payouts()` | monthly |

## Open decisions
- Price rounding step (currently up to the next 1.00 of the collection currency).
- Arabic display typeface for headings (DM Serif Display has no Arabic glyphs).
- Native-speaker review of de/ru/fr/ar UI texts.
