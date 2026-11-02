-- Removes ALL [DEMO] data: demo organizations, their experiences, departures, bookings (also real test bookings
-- made on demo trips), statements, payouts, commissions, link visits, invitations and memberships.
-- Run once before launch, as the database owner (Supabase SQL editor). Real data is not touched.
--
-- The money ledger is append-only by design. Demo bookings that were checked in wrote ledger rows,
-- so this script switches the append-only guard off for this transaction only, deletes the demo rows,
-- and switches it back on before committing.
begin;

create temporary table demo_orgs on commit drop as
  select id from organizations where name like '[DEMO]%';
create temporary table demo_exps on commit drop as
  select id from experiences where slug like 'demo-%' or operator_id in (select id from demo_orgs);
create temporary table demo_bookings on commit drop as
  select id from bookings where experience_id in (select id from demo_exps) or operator_id in (select id from demo_orgs)
     or partner_org_id in (select id from demo_orgs);

alter table ledger_entries disable trigger ledger_no_update;
delete from ledger_entries where booking_id in (select id from demo_bookings) or org_id in (select id from demo_orgs);
alter table ledger_entries enable trigger ledger_no_update;

delete from commissions where booking_id in (select id from demo_bookings) or partner_org_id in (select id from demo_orgs);
delete from partner_payouts where partner_org_id in (select id from demo_orgs);
delete from bookings where id in (select id from demo_bookings); -- contacts, lines, messages and link secrets go with them
delete from operator_statements where operator_id in (select id from demo_orgs);
delete from attribution_clicks where partner_code_id in (select id from partner_codes where org_id in (select id from demo_orgs))
   or experience_id in (select id from demo_exps);
delete from slots where experience_id in (select id from demo_exps);
delete from experiences where id in (select id from demo_exps); -- texts, prices, extras, transfers, photos go with them
delete from partner_codes where org_id in (select id from demo_orgs);
delete from hotels where name like '[DEMO]%' and not exists (select 1 from bookings b where b.hotel_id = hotels.id);
delete from coupons where code in ('NOVEMBER5') and uses = 0;
delete from organizations where id in (select id from demo_orgs); -- memberships, invites and private details go with them

commit;
