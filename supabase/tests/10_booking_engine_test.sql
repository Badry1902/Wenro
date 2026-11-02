-- Automated checks for pricing, permissions and the booking lifecycle.
-- Run with scripts/test-db.sh on a throwaway local Postgres (never on production).
\set ON_ERROR_STOP on
set client_min_messages = warning;

create schema t;
grant usage on schema t to anon, authenticated, service_role;
create table t.ids (name text primary key, id uuid, txt text);
grant all on t.ids to anon, authenticated, service_role;

create function t.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create function t.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false);
  execute 'set role anon';
end $$;
create function t.service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, false);
  execute 'set role service_role';
end $$;
create function t.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end $$;
create function t.ok(p boolean, p_msg text) returns void language plpgsql as $$
begin
  if p is not true then raise exception 'FAIL: %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;
create function t.fails(p_sql text, p_expect text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_expect || '%' then raise notice 'ok - %', p_msg; return; end if;
    raise exception 'FAIL: % (wrong error: %)', p_msg, sqlerrm;
  end;
  raise exception 'FAIL: % (no error raised)', p_msg;
end $$;
grant execute on all functions in schema t to anon, authenticated, service_role;

set client_min_messages = notice;

-- ---------------------------------------------------------------- fixtures
insert into slots (id, experience_id, starts_at, capacity) values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', now() + interval '3 days', 3),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', now() + interval '4 days', 20),
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', now() + interval '1 hour', 20),
  ('70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', now() + interval '5 days', 6),
  ('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', now() + interval '6 days', 10);

create function t.req(p_slot text, p_extra jsonb default '{}'::jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'experience_id', '50000000-0000-0000-0000-000000000001',
    'slot_id', p_slot,
    'quantities', jsonb_build_object('adult', 2, 'child', 1),
    'hotel_id', '31000000-0000-0000-0000-000000000001', 'transport', true,
    'customer', jsonb_build_object('full_name', 'Demo Guest', 'email', 'guest@demo.wenro.test', 'phone', '+49 151 0000000'),
    'locale', 'de', 'display_currency', 'USD') || p_extra
$$;
grant execute on function t.req(text, jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- T1 pricing, direct booking
select t.service();
do $$
declare r jsonb; b bookings;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000001'));
  select * into b from bookings where id = (r->>'booking_id')::uuid;
  insert into t.ids values ('direct', b.id, r->>'manage_token');
  perform t.ok(b.gross_minor = 9500, 'display total 95.00 EUR (60 adults + 15 child + 20 transfer)');
  perform t.ok(b.operator_net_minor = 7600, 'operator net 76.00 EUR');
  perform t.ok(b.partner_commission_minor = 0 and b.platform_share_minor = 1900, 'direct booking: WENRO keeps 19.00 (20%)');
  perform t.ok(b.status = 'confirmed', 'instant experience confirms immediately');
  perform t.ok((select booked from slots where id = '70000000-0000-0000-0000-000000000001') = 3, 'seats taken from allotment');
  perform t.ok(b.display_rate = 1.08, 'display rate snapshotted');
  perform t.ok((select count(*) from booking_lines where booking_id = b.id) = 3, 'three price lines stored');
end $$;

-- ---------------------------------------------------------------- T2 marketer + coupon
do $$
declare r jsonb; b bookings;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000002',
         '{"partner_code":"blogger10","coupon_code":"welcome10"}'));
  select * into b from bookings where id = (r->>'booking_id')::uuid;
  insert into t.ids values ('marketer', b.id, r->>'manage_token');
  perform t.ok(b.paid_minor = 8550 and b.discount_minor = 950, 'coupon: customer pays 85.50');
  perform t.ok(b.operator_net_minor = 7600, 'coupon never touches operator net');
  perform t.ok(b.partner_commission_minor = 855, 'marketer gets 10% of price after discount (8.55)');
  perform t.ok(b.platform_share_minor = 95, 'WENRO keeps 0.95 at the maximum discount, never negative');
  perform t.ok(b.source = 'marketer', 'attributed to marketer');
  perform t.ok((select status from commissions where booking_id = b.id) = 'pending', 'commission pending until the trip runs');
end $$;

-- ---------------------------------------------------------------- T3 coupon above the cap is capped
do $$
declare r jsonb;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000002', '{"coupon_code":"TOOBIG"}'));
  perform t.ok((r->>'discount_minor')::int = 950, '25% coupon capped at 10%');
end $$;

-- ---------------------------------------------------------------- T4 sold out
select t.fails($$select create_booking(t.req('70000000-0000-0000-0000-000000000001'))$$, 'sold_out',
               'cannot book beyond the allotment');

-- ---------------------------------------------------------------- T5 self-referral
do $$
declare r jsonb; b bookings;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000002',
         '{"partner_code":"BLOGGER10","customer":{"full_name":"Blogger","email":"b@demo.wenro.test","phone":"01000000004"}}'));
  select * into b from bookings where id = (r->>'booking_id')::uuid;
  perform t.ok(b.source = 'direct' and b.partner_commission_minor = 0, 'marketer booking for own phone earns nothing');
  perform t.ok((b.terms_snapshot->>'self_referral_blocked')::boolean, 'self-referral recorded on the booking');
end $$;
select t.reset();

-- ---------------------------------------------------------------- T6 isolation & visibility
select t.anon();
select t.ok((select count(*) from price_categories) = 0, 'public cannot read net prices');
select t.ok((select count(*) from bookings) = 0, 'public cannot read bookings');
select t.ok((select price_minor from public_prices('50000000-0000-0000-0000-000000000001') where kind = 'adult') = 3000,
            'public sees the display price 30.00');
select t.fails($$select create_booking(t.req('70000000-0000-0000-0000-000000000002'))$$, 'permission denied',
               'anonymous visitors cannot call create_booking directly');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000c1'); -- other operator
select t.ok((select count(*) from bookings) = 0, 'operator B sees no bookings of operator A');
select t.ok((select count(*) from booking_contacts) = 0, 'operator B sees no customer contacts');
select t.fails($$select * from operator_bookings('10000000-0000-0000-0000-000000000002', now(), now() + interval '30 days')$$,
               'forbidden', 'operator B cannot open operator A''s run sheet');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b2'); -- operator A staff
select t.ok((select count(*) from operator_bookings('10000000-0000-0000-0000-000000000002', now(), now() + interval '30 days')) >= 3,
            'operator staff sees own bookings');
select t.ok((select bool_and(paid_minor is null and operator_net_minor is null)
               from operator_bookings('10000000-0000-0000-0000-000000000002', now(), now() + interval '30 days')),
            'operator staff never sees money');
select t.ok((select bool_and(customer_phone is null)
               from operator_bookings('10000000-0000-0000-0000-000000000002', now() + interval '2 days', now() + interval '30 days')),
            'customer phone hidden more than 24h before the trip');
select t.ok((select count(*) from price_categories) = 0, 'operator staff cannot read net prices');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b1'); -- operator A owner
select t.ok((select bool_and(paid_minor is not null)
               from operator_bookings('10000000-0000-0000-0000-000000000002', now(), now() + interval '30 days')),
            'operator owner sees amounts');
select t.ok((select count(*) from price_categories) = 4, 'operator owner reads own net prices');
-- operator cannot publish or touch the booked counter
insert into experiences (operator_id, slug, collection_currency) values ('10000000-0000-0000-0000-000000000002', 'demo-draft-trip', 'EUR');
select t.fails($$update experiences set status = 'published' where slug = 'demo-draft-trip'$$, 'only the platform team',
               'operators cannot publish without platform review');
select t.fails($$update slots set booked = 0 where id = '70000000-0000-0000-0000-000000000001'$$, 'booking engine',
               'operators cannot edit booked seats');
select t.fails($$update slots set capacity = 1 where id = '70000000-0000-0000-0000-000000000001'$$, 'capacity cannot be lower',
               'capacity cannot drop below booked seats');
select t.reset();

-- ---------------------------------------------------------------- T7 marketer view has no personal data
select t.login('00000000-0000-0000-0000-0000000000d1');
select t.ok((select count(*) from partner_bookings('10000000-0000-0000-0000-000000000004')) = 1, 'marketer sees attributed booking');
select t.ok((select bool_and(customer_name is null) from partner_bookings('10000000-0000-0000-0000-000000000004')),
            'marketer never sees customer names');
select t.ok((select count(*) from booking_contacts) = 0, 'marketer cannot read contacts table');
select t.reset();

-- ---------------------------------------------------------------- T8 agency booking & staff scoping
select t.login('00000000-0000-0000-0000-0000000000e2'); -- agency staff
do $$
declare r jsonb;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000005', '{"agency_id":"10000000-0000-0000-0000-000000000005"}'));
  insert into t.ids values ('agency', (r->>'booking_id')::uuid, null);
end $$;
select t.ok((select count(*) from partner_bookings('10000000-0000-0000-0000-000000000005')) = 1, 'agency staff sees own booking');
select t.reset();
select t.ok((select source = 'agency' and partner_commission_minor = 950 from bookings where id = (select id from t.ids where name = 'agency')),
            'agency booking earns 10% commission');
select t.login('00000000-0000-0000-0000-0000000000e1'); -- agency manager
select t.ok((select count(*) from partner_bookings('10000000-0000-0000-0000-000000000005')) = 1, 'agency manager sees staff bookings');
select t.ok((select customer_name from partner_bookings('10000000-0000-0000-0000-000000000005') limit 1) = 'Demo Guest',
            'agency sees its own client name');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000d1');
select t.fails($$select create_booking(t.req('70000000-0000-0000-0000-000000000005', '{"agency_id":"10000000-0000-0000-0000-000000000005"}'))$$,
               'not_agency_member', 'non-members cannot book as an agency');
select t.reset();

-- ---------------------------------------------------------------- T9 trip day: check-in, statement, payout
select t.service();
do $$
declare r jsonb;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000003', '{"partner_code":"BLOGGER10"}'));
  insert into t.ids values ('today', (r->>'booking_id')::uuid, r->>'qr_token');
end $$;
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b2'); -- staff scans QR
select t.ok((select customer_phone is not null from operator_bookings('10000000-0000-0000-0000-000000000002', now(), now() + interval '2 hours')
              where booking_id = (select id from t.ids where name = 'today')), 'phone visible within 24h of the trip');
select t.ok((check_in((select txt from t.ids where name = 'today'))->>'execution_status') = 'executed', 'QR check-in marks executed');
select t.ok((check_in((select txt from t.ids where name = 'today'))->>'already')::boolean, 'second scan is harmless');
select t.reset();

select t.ok((select status from commissions where booking_id = (select id from t.ids where name = 'today')) = 'eligible',
            'commission eligible after execution');
select t.ok((select sum(amount_minor) from ledger_entries where booking_id = (select id from t.ids where name = 'today')
               and entry_type = 'receivable_from_operator') = 1900, 'ledger: operator owes 19.00');
select t.fails($$update ledger_entries set amount_minor = 0$$, 'append-only', 'ledger cannot be edited');
select t.fails($$delete from ledger_entries$$, 'append-only', 'ledger cannot be deleted');

select t.service();
select t.ok(generate_operator_statements((now() at time zone 'Africa/Cairo')::date - 7, (now() at time zone 'Africa/Cairo')::date) = 1,
            'weekly statement generated');
select t.ok(generate_operator_statements((now() at time zone 'Africa/Cairo')::date - 7, (now() at time zone 'Africa/Cairo')::date) = 0,
            'running the same period again adds nothing (each trip is on one statement only)');
select t.reset();
select t.ok((select due_minor = 1900 and collected_minor = 9500 from operator_statements), 'statement: collected 95.00, due 19.00');

select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select mark_statement_received((select id from operator_statements limit 1))$$, 'forbidden',
               'operator cannot mark own statement as received');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1'); -- platform owner
select mark_statement_received((select id from operator_statements limit 1));
select t.ok((select status from commissions where booking_id = (select id from t.ids where name = 'today')) = 'payable',
            'commission payable once WENRO has collected');
select t.ok(create_partner_payouts(current_date) = 1, 'monthly payout created');
select mark_payout_paid((select id from partner_payouts limit 1), 'INSTAPAY-DEMO-1');
select t.ok((select status from commissions where booking_id = (select id from t.ids where name = 'today')) = 'paid',
            'commission paid after InstaPay transfer recorded');
select t.reset();

-- ---------------------------------------------------------------- T10 weather cancellation
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.ok((cancel_slot('70000000-0000-0000-0000-000000000002', 'weather')->>'cancelled_bookings')::int = 3,
            'weather cancels every booking on the departure');
select t.reset();
select t.ok((select booked = 0 and status = 'cancelled' from slots where id = '70000000-0000-0000-0000-000000000002'),
            'seats released and departure closed');
select t.ok((select status from commissions where booking_id = (select id from t.ids where name = 'marketer')) = 'void',
            'no commission on a weather cancellation');

-- ---------------------------------------------------------------- T11 on-request booking expires
select t.service();
do $$
declare r jsonb;
begin
  r := create_booking(jsonb_build_object('experience_id', '50000000-0000-0000-0000-000000000002',
        'slot_id', '70000000-0000-0000-0000-000000000004', 'quantities', '{"adult":2}'::jsonb,
        'customer', '{"full_name":"Demo","email":"d@demo.wenro.test","phone":"+7 900 000 0000"}'::jsonb));
  perform t.ok(r->>'status' = 'pending_request', 'request-mode experience waits for the operator');
  perform t.ok(expire_requests(now() + interval '13 hours') = 1, 'unanswered request expires after 12h');
end $$;
select t.reset();
select t.ok((select booked from slots where id = '70000000-0000-0000-0000-000000000004') = 0, 'expired request releases seats');

-- ---------------------------------------------------------------- T12 customer cancel via manage link
select t.service();
select t.ok((cancel_booking_by_token((select txt from t.ids where name = 'direct'))->>'within_free_window')::boolean,
            'customer cancels free of charge 3 days before');
select t.fails($$select cancel_booking_by_token('not-a-real-token')$$, 'booking_not_found', 'wrong token finds nothing');
select t.reset();
select t.ok((select booked from slots where id = '70000000-0000-0000-0000-000000000001') = 0, 'customer cancellation releases seats');

-- ---------------------------------------------------------------- T13 reconfirmation and auto-cancel
insert into slots (id, experience_id, starts_at, capacity) values
  ('70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001',
   ((((now() at time zone 'Africa/Cairo')::date + 1) + time '09:00') at time zone 'Africa/Cairo'), 10);
select t.service();
do $$
declare r1 jsonb; r2 jsonb; v_cutoff timestamptz;
begin
  r1 := create_booking(t.req('70000000-0000-0000-0000-000000000006'));
  r2 := create_booking(t.req('70000000-0000-0000-0000-000000000006'));
  perform t.ok((select count(*) from due_reconfirmations()) = 2, 'two reconfirmations due for tomorrow');
  perform mark_reconfirm_sent(array[(r1->>'booking_id')::uuid, (r2->>'booking_id')::uuid]);
  perform reconfirm_by_token(r1->>'manage_token');
  perform t.ok((select count(*) from unconfirmed_for_tomorrow()) = 1, 'admin alert lists the one unconfirmed booking');
  v_cutoff := ((((now() at time zone 'Africa/Cairo')::date) + time '22:30') at time zone 'Africa/Cairo');
  perform t.ok(auto_cancel_unconfirmed(v_cutoff) = 1, 'unconfirmed booking auto-cancelled after 22:00');
  perform t.ok((select status from bookings where id = (r1->>'booking_id')::uuid) = 'confirmed', 'reconfirmed booking stays');
end $$;
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select expire_requests()$$, 'permission denied', 'portal users cannot run scheduled jobs');
select t.reset();

-- ---------------------------------------------------------------- T14 audit trail
select t.ok((select count(*) from audit_log where table_name = 'bookings') > 0, 'booking changes are audited');
select t.ok((select count(*) from audit_log where table_name = 'operator_statements' and action = 'UPDATE') = 1,
            'statement receipt is audited');

\echo 'BOOKING ENGINE TESTS PASSED'

-- ---------------------------------------------------------------- T15 public page read model
select t.anon();
select t.ok((experience_page('demo-giftun-island', 'ar'))->>'title' like '%الجفتون%', 'page in Arabic when a translation exists');
select t.ok((experience_page('demo-quad-safari', 'ar'))->>'title' like '%Quad%', 'falls back to English otherwise');
select t.ok(jsonb_array_length((experience_page('demo-giftun-island', 'en'))->'extras') = 1
            and (experience_page('demo-giftun-island', 'en'))->'extras'->0->>'name' is not null, 'visitors see extra names and prices');
select t.ok(not ((experience_page('demo-giftun-island', 'en'))::text like '%net_minor%'), 'page payload carries no net prices');
select t.ok(experience_page('demo-draft-trip', 'en') is null, 'drafts are not visible to visitors');
select t.reset();
\echo 'READ MODEL TESTS PASSED'

-- ---------------------------------------------------------------- T16 workspaces
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.ok(jsonb_array_length(my_workspaces()) = 1 and my_workspaces()->0->>'type' = 'operator', 'operator sees one workspace');
select t.fails($$select admin_overview()$$, 'forbidden', 'operators cannot open the admin overview');
select t.fails($$select finance_overview()$$, 'forbidden', 'operators cannot open finance');
select t.fails($$select claim_platform_owner()$$, 'already_claimed', 'platform ownership cannot be claimed twice');
select t.ok(create_slots('50000000-0000-0000-0000-000000000001', current_date + 40, current_date + 46, array[1,3,5], array[time '09:00', time '14:00'], 12) = 6,
            'recurring departures: 3 weekdays × 2 times in one week = 6');
select t.fails($$select set_slot('70000000-0000-0000-0000-000000000005', 0, true)$$, 'capacity_below_booked', 'capacity cannot go below booked seats');
select t.ok((set_experience_status((select id from experiences where slug = 'demo-draft-trip'), 'in_review'))->>'status' = 'in_review', 'operator sends a draft for review');
select t.fails($$select set_experience_status((select id from experiences where slug = 'demo-draft-trip'), 'published')$$, 'forbidden', 'operator cannot publish');
select t.ok(jsonb_array_length(operator_experiences('10000000-0000-0000-0000-000000000002')) = 2, 'operator lists own experiences');
select t.fails($$select operator_slots('10000000-0000-0000-0000-000000000003', now(), now() + interval '30 days')$$, 'forbidden', 'no access to another operator''s departures');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000a1'); -- platform owner
select t.ok((admin_overview()->>'experiences_in_review')::int = 1, 'admin sees the experience waiting for review');
select t.ok((set_experience_status((select id from experiences where slug = 'demo-draft-trip'), 'published'))->>'status' = 'published', 'admin publishes');
select t.ok(jsonb_array_length(finance_overview()->'statements') = 1, 'finance lists statements');
select t.reset();

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'new-marketer@demo.wenro.test');
select t.login('00000000-0000-0000-0000-0000000000f1');
select t.ok(jsonb_array_length(my_workspaces()) = 0, 'a new user has no workspace');
select t.ok((apply_organization('marketer', 'Sunny Blog', '+49 170 1234567', 'sunny@demo.wenro.test'))->>'status' = 'pending', 'applying creates a pending organization');
select t.ok(jsonb_array_length(partner_summary((my_workspaces()->0->>'org_id')::uuid)->'codes') = 1, 'a referral code is issued');
select t.fails($$select set_org_status((my_workspaces()->0->>'org_id')::uuid, 'active')$$, 'forbidden', 'applicants cannot approve themselves');
select t.reset();
select t.ok((select status from organizations where name = 'Sunny Blog') = 'pending', 'still pending until the platform approves');

select t.login('00000000-0000-0000-0000-0000000000b2'); -- operator staff
select t.ok(jsonb_array_length(operator_slots('10000000-0000-0000-0000-000000000002', now(), now() + interval '60 days')) > 0, 'staff sees departures');
select t.fails($$select create_slots('50000000-0000-0000-0000-000000000001', current_date + 50, current_date + 51, array[1,2,3,4,5,6,7], array[time '09:00'], 5)$$, 'forbidden', 'staff cannot create departures');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000e2'); -- agency staff
select t.fails($$select set_payout_handle('10000000-0000-0000-0000-000000000005', 'x@instapay')$$, 'forbidden', 'agency staff cannot change payout details');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000e1'); -- agency manager
select t.ok((set_payout_handle('10000000-0000-0000-0000-000000000005', ' sun@instapay '))->>'instapay' = 'sun@instapay', 'agency manager sets payout details');
select t.fails($$select set_payout_handle('10000000-0000-0000-0000-000000000004', 'steal@instapay')$$, 'forbidden', 'no changing another partner''s payout details');
select t.ok(partner_summary('10000000-0000-0000-0000-000000000005')->'org'->>'instapay' = 'sun@instapay', 'partner summary shows payout details');
select t.reset();
\echo 'WORKSPACE TESTS PASSED'
