-- Removes every [DEMO] row added by demo_content.sql (and anything booked on demo trips).
-- Run before launch. Ledger rows are append-only by design, so demo bookings must not reach check-in.
begin;
delete from commissions where booking_id in (select id from bookings where experience_id in (select id from experiences where slug like 'demo-%'));
delete from bookings where experience_id in (select id from experiences where slug like 'demo-%');
delete from slots where experience_id in (select id from experiences where slug like 'demo-%');
delete from experiences where slug like 'demo-%';
delete from hotels where name like '[DEMO]%';
delete from partner_codes where org_id in (select id from organizations where name like '[DEMO]%');
delete from organizations where name like '[DEMO]%';
commit;
