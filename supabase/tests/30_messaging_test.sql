-- Messaging and scheduled jobs. Runs after 10_booking_engine_test.sql (reuses its helpers in schema t).
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- A fixed day 20 days ahead (D), so the result does not depend on when the tests run.
insert into t.ids (name, txt) values ('D', (((now() at time zone 'Africa/Cairo')::date) + 20)::text);
create function t.at(p_day_offset int, p_time time) returns timestamptz language sql stable as $$
  select (((select txt::date from t.ids where name = 'D') + p_day_offset) + p_time) at time zone 'Africa/Cairo'
$$;
grant execute on function t.at(int, time) to anon, authenticated, service_role;

insert into slots (id, experience_id, starts_at, capacity) values
  ('71000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', t.at(1, '09:00'), 20),
  ('71000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', t.at(3, '09:00'), 8),
  ('71000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', t.at(4, '09:00'), 10);

-- ---------------------------------------------------------------- M1 every booking change queues one message
select t.service();
do $$
declare r jsonb; q jsonb; c jsonb;
begin
  r := create_booking(t.req('71000000-0000-0000-0000-000000000003'));
  insert into t.ids values ('m_instant', (r->>'booking_id')::uuid, r->>'manage_token');
  perform t.ok((select count(*) from message_outbox where booking_id = (r->>'booking_id')::uuid and kind = 'booking_confirmed' and recipient = 'guest') = 1,
               'instant booking queues a confirmation for the guest');
  perform t.ok((select locale from message_outbox where booking_id = (r->>'booking_id')::uuid) = 'de', 'message keeps the guest''s language');

  q := create_booking(t.req('71000000-0000-0000-0000-000000000002', '{"experience_id": "50000000-0000-0000-0000-000000000002", "quantities": {"adult": 2}, "hotel_id": null, "transport": false}'));
  insert into t.ids values ('m_request', (q->>'booking_id')::uuid, q->>'manage_token');
  perform t.ok((select count(*) from message_outbox where booking_id = (q->>'booking_id')::uuid and kind = 'request_received') = 1, 'request: guest told we are asking the operator');
  perform t.ok((select count(*) from message_outbox where booking_id = (q->>'booking_id')::uuid and kind = 'operator_request' and recipient = 'operator') = 1, 'request: operator alerted');
end $$;
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000c1'); -- Desert Riders owner accepts
select decide_request((select id from t.ids where name = 'm_request'), true);
select t.reset();
select t.ok((select count(*) from message_outbox where booking_id = (select id from t.ids where name = 'm_request') and kind = 'request_accepted') = 1,
            'accepted request queues a confirmation');

select t.service();
select cancel_booking_by_token((select txt from t.ids where name = 'm_request'));
select t.reset();
select t.ok((select count(*) from message_outbox where booking_id = (select id from t.ids where name = 'm_request') and kind = 'cancelled_by_guest') = 1,
            'guest cancellation queues a confirmation of the cancellation');

-- the same change twice never sends twice
update bookings set status = status where id = (select id from t.ids where name = 'm_request');
select t.ok((select count(*) from message_outbox where booking_id = (select id from t.ids where name = 'm_request')) = 4, 'no duplicates (4 messages for 4 events)');

-- ---------------------------------------------------------------- M2 sealed link and delivery
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select store_link_secret((select id from t.ids where name = 'm_instant'), repeat('x', 40))$$, 'permission denied', 'portal users cannot write link secrets');
select t.fails($$select outbox_claim(10)$$, 'permission denied', 'portal users cannot claim messages');
select t.fails($$select run_scheduled_jobs()$$, 'permission denied', 'portal users cannot run the scheduled jobs');
select t.fails($$select admin_messages()$$, 'forbidden', 'operators cannot read the message log');
select t.fails($$select sealed_link_for((select id from t.ids where name = 'm_instant'))$$, 'forbidden', 'operators cannot read sealed links');
select t.reset();
select t.anon();
select t.fails($$select * from message_outbox$$, 'permission denied', 'visitors cannot read the outbox');
select t.fails($$select * from booking_link_secrets$$, 'permission denied', 'visitors cannot read link secrets');
select t.reset();

select t.service();
select store_link_secret((select id from t.ids where name = 'm_instant'), 'v1.sealed-test-value-0123456789');
do $$
declare a jsonb; b jsonb; m jsonb;
begin
  a := outbox_claim(100);
  b := outbox_claim(100);
  perform t.ok(jsonb_array_length(a) >= 4, 'worker claims the queued messages');
  perform t.ok(jsonb_array_length(b) = 0, 'a second worker gets nothing (no double sending)');
  select x into m from jsonb_array_elements(a) x where x->'booking'->>'id' = (select id::text from t.ids where name = 'm_instant');
  perform t.ok(m->'booking'->>'sealed_link' = 'v1.sealed-test-value-0123456789', 'claim carries the sealed link, not the token');
  perform t.ok(m->'booking'->>'title' is not null and m->'booking'->'customer'->>'email' = 'guest@demo.wenro.test', 'claim carries what the email needs');
  perform t.ok(not (a::text like '%net_minor%') and not (a::text like '%manage_token%'), 'claims carry no net prices and no tokens');
  perform outbox_result((m->>'id')::uuid, 'sent', null, 'provider-123');
  perform t.ok((select status from message_outbox where id = (m->>'id')::uuid) = 'sent', 'sent message recorded');
  select x into m from jsonb_array_elements(a) x where x->>'kind' = 'operator_request';
  perform outbox_result((m->>'id')::uuid, 'failed', 'smtp timeout');
  perform t.ok((select next_attempt_at > now() + interval '5 minutes' from message_outbox where id = (m->>'id')::uuid), 'failed message waits before retrying');
  -- leave the rest as "logged" (development mode)
  perform outbox_result((x->>'id')::uuid, 'logged') from jsonb_array_elements(a) x
   where (select status from message_outbox where id = (x->>'id')::uuid) = 'sending';
end $$;
select t.reset();

-- ---------------------------------------------------------------- M3 a simulated evening (D, trips on D+1 09:00)
select t.service();
do $$
declare r1 jsonb; r2 jsonb; r3 jsonb; v jsonb;
begin
  r1 := create_booking(t.req('71000000-0000-0000-0000-000000000001'));
  r2 := create_booking(t.req('71000000-0000-0000-0000-000000000001'));
  insert into t.ids values ('e1', (r1->>'booking_id')::uuid, r1->>'manage_token'), ('e2', (r2->>'booking_id')::uuid, r2->>'manage_token');
end $$;
select t.reset();
-- both were booked days earlier
update bookings set created_at = t.at(-5, '10:00') where id in (select id from t.ids where name in ('e1', 'e2'));

select t.service();
do $$
declare v jsonb; r3 jsonb;
begin
  v := run_scheduled_jobs(t.at(0, '17:00'));
  perform t.ok((v->>'reconfirm_sent')::int = 0, '17:00: nothing sent yet');

  v := run_scheduled_jobs(t.at(0, '18:05'));
  perform t.ok((v->>'reconfirm_sent')::int >= 2, '18:05: tomorrow''s guests are asked to confirm');
  perform t.ok((select count(*) from message_outbox where kind = 'reconfirm' and booking_id in (select id from t.ids where name in ('e1', 'e2'))) = 2,
               'one reconfirm message per booking');
  v := run_scheduled_jobs(t.at(0, '18:15'));
  perform t.ok((select count(*) from message_outbox where kind = 'reconfirm' and booking_id in (select id from t.ids where name in ('e1', 'e2'))) = 2,
               'running again sends nothing twice');

  perform reconfirm_by_token((select txt from t.ids where name = 'e1'));

  -- someone books for tomorrow at 21:55: they just booked, so they must not be cancelled at 22:00
  r3 := create_booking(t.req('71000000-0000-0000-0000-000000000001'));
  insert into t.ids values ('e3', (r3->>'booking_id')::uuid, r3->>'manage_token');
end $$;
select t.reset();
update bookings set created_at = t.at(0, '21:55') where id = (select id from t.ids where name = 'e3');

select t.service();
do $$
declare v jsonb;
begin
  v := run_scheduled_jobs(t.at(0, '21:10'));
  perform t.ok((v->>'late_bookings_marked_confirmed')::int >= 1, 'late booking treated as confirmed');
  perform t.ok((v->>'admin_alert')::int = 1, '21:00: one alert to the WENRO team');
  perform t.ok((select payload->'bookings' @> jsonb_build_array(jsonb_build_object('ref', (select ref from bookings where id = (select id from t.ids where name = 'e2'))))
                  from message_outbox where kind = 'admin_alert' and dedupe_key like '%' || (select txt from t.ids where name = 'D')),
               'alert lists the guest who has not confirmed');
  v := run_scheduled_jobs(t.at(0, '21:40'));
  perform t.ok((v->>'admin_alert')::int = 0, 'only one alert per evening');

  v := run_scheduled_jobs(t.at(0, '22:05'));
  perform t.ok((v->>'auto_cancelled')::int >= 1, '22:00: unconfirmed booking cancelled');
  perform t.ok((select status from bookings where id = (select id from t.ids where name = 'e2')) = 'cancelled', 'the silent guest is cancelled');
  perform t.ok((select status from bookings where id = (select id from t.ids where name = 'e1')) = 'confirmed', 'the guest who confirmed stays');
  perform t.ok((select status from bookings where id = (select id from t.ids where name = 'e3')) = 'confirmed', 'the late booker stays');
  perform t.ok((select count(*) from message_outbox where kind = 'auto_cancelled' and booking_id = (select id from t.ids where name = 'e2')) = 1,
               'the cancelled guest is told why');
  perform t.ok((select count(*) from bookings where id = (select id from t.ids where name = 'e3') and reconfirm_status <> 'sent') = 1,
               'no reconfirm request after 22:00');
end $$;
select t.reset();

-- ---------------------------------------------------------------- M4 weather and expiry messages
select t.login('00000000-0000-0000-0000-0000000000b1');
select cancel_slot('71000000-0000-0000-0000-000000000001', 'weather');
select t.reset();
select t.ok((select count(*) from message_outbox where kind = 'weather_cancelled' and booking_id in (select id from t.ids where name in ('e1', 'e3'))) = 2,
            'weather cancellation tells every booked guest');

select t.service();
do $$
declare q jsonb; v jsonb;
begin
  q := create_booking(t.req('71000000-0000-0000-0000-000000000002', '{"experience_id": "50000000-0000-0000-0000-000000000002", "quantities": {"adult": 1}, "hotel_id": null, "transport": false}'));
  v := run_scheduled_jobs(now() + interval '13 hours');
  perform t.ok((select status from bookings where id = (q->>'booking_id')::uuid) = 'expired', 'unanswered request expires after 12 hours');
  perform t.ok((select count(*) from message_outbox where kind = 'request_expired' and booking_id = (q->>'booking_id')::uuid) = 1, 'guest is told the request expired');
end $$;
select t.reset();

-- ---------------------------------------------------------------- M5 WENRO team view and retry
select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok(jsonb_array_length(admin_messages()->'messages') > 5, 'WENRO sees the message log');
select t.ok((select x->>'to_address' from jsonb_array_elements(admin_messages()->'messages') x where x->>'kind' = 'booking_confirmed' limit 1) = 'guest@demo.wenro.test', 'log shows who each message went to');
select t.reset();
insert into t.ids (name, id) select 'failed_msg', id from message_outbox where status = 'failed' limit 1;
select t.login('00000000-0000-0000-0000-0000000000a1');
select retry_message((select id from t.ids where name = 'failed_msg'));
select t.reset();
select t.ok((select status from message_outbox where id = (select id from t.ids where name = 'failed_msg')) = 'queued', 'a failed message can be retried by hand');
select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok(admin_message_detail((select id from t.ids where name = 'failed_msg'))->>'kind' = 'operator_request'
            and not (admin_message_detail((select id from t.ids where name = 'failed_msg'))::text like '%sealed%'), 'preview has the message but not the sealed link');
select t.ok(sealed_link_for((select id from t.ids where name = 'm_instant')) like 'v1.%', 'WENRO server can fetch the sealed link for a manual WhatsApp');
select t.reset();

-- ---------------------------------------------------------------- M6 late check-in after a statement (top-up statement)
select t.reset();
select t.ok((select count(*) from pg_constraint where conname = 'operator_statements_operator_id_currency_period_start_key') = 0,
            'a period can get a top-up statement for trips checked in later');


-- ---------------------------------------------------------------- M7 commissions earned after this month's payout was paid
select t.service();
do $$
declare r jsonb;
begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000003', '{"partner_code":"BLOGGER10"}'));
  insert into t.ids values ('late', (r->>'booking_id')::uuid, r->>'qr_token');
end $$;
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b1');
select check_in((select txt from t.ids where name = 'late'));
select t.reset();
select t.service();
select t.ok(generate_operator_statements((now() at time zone 'Africa/Cairo')::date - 7, (now() at time zone 'Africa/Cairo')::date) = 1,
            'trip checked in after the statement gets a top-up statement');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select mark_statement_received((select settled_statement_id from bookings where id = (select id from t.ids where name = 'late')));
select t.ok(create_partner_payouts(current_date) = 1, 'late commission can still be prepared for payout');
select t.reset();
select t.ok((select period_month from partner_payouts p join commissions c on c.payout_id = p.id
              where c.booking_id = (select id from t.ids where name = 'late')) = (date_trunc('month', current_date) + interval '1 month')::date,
            'it goes into next month''s payout because this month''s was already paid');

\echo 'MESSAGING TESTS PASSED'
