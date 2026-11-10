-- Operator payments with receipts are checked by WENRO owner/finance only; WhatsApp messages are queued per booking.
\set ON_ERROR_STOP on
set client_min_messages = notice;

insert into operator_statements (id, operator_id, currency, period_start, period_end, bookings_count, collected_minor, due_minor)
values ('99000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'EUR', '2030-01-01', '2030-01-31', 3, 30000, 6000);

select t.login('00000000-0000-0000-0000-0000000000a1'); -- WENRO owner
select save_payment_method('{"kind":"instapay","label":"InstaPay","account_name":"WENRO","value":"wenro@instapay","sort":0,"active":true}'::jsonb);
select t.ok(jsonb_array_length(finance_dashboard()->'operators') > 0, 'owner sees the finance dashboard');
select t.reset();
select set_config('t.mid', (select id::text from payment_methods limit 1), false);

select t.login('00000000-0000-0000-0000-0000000000b2'); -- operator staff
select t.fails($$select operator_dues('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'staff cannot see what the operator owes');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000c1'); -- another operator
select t.fails($$select operator_dues('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'no reading another operator''s dues');
select t.fails($$select finance_dashboard()$$, 'forbidden', 'operators cannot open WENRO accounts');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select t.ok(jsonb_array_length(payment_methods_list()) = 1, 'operator sees the active payment methods');
select t.ok((operator_dues('10000000-0000-0000-0000-000000000002')->'statements'->0->>'in_review')::boolean = false, 'open statement is payable');
select t.fails($$select submit_operator_payment('10000000-0000-0000-0000-000000000002', array['99000000-0000-0000-0000-000000000001']::uuid[], current_setting('t.mid')::uuid, 'X1', '../etc/passwd', null)$$, 'invalid_input', 'receipt path must be the operator''s own file');
select submit_operator_payment('10000000-0000-0000-0000-000000000002', array['99000000-0000-0000-0000-000000000001']::uuid[],
  current_setting('t.mid')::uuid, 'IPN-123', '10000000-0000-0000-0000-000000000002/11111111-2222-3333-4444-555555555555.jpg', 'paid');
select t.reset();
select set_config('t.pid', (select id::text from operator_payments limit 1), false);
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select submit_operator_payment('10000000-0000-0000-0000-000000000002', array['99000000-0000-0000-0000-000000000001']::uuid[], current_setting('t.mid')::uuid, null, '10000000-0000-0000-0000-000000000002/11111111-2222-3333-4444-555555555556.png', null)$$, 'already_in_review', 'one payment in review per statement');
select t.fails($$select payment_proof(current_setting('t.pid')::uuid)$$, 'forbidden', 'operators cannot open receipts');
select t.fails($$select review_operator_payment(current_setting('t.pid')::uuid, true, null)$$, 'forbidden', 'operators cannot approve their own payment');
select t.fails($$select save_payment_method('{"kind":"bank","label":"Mine","value":"123"}'::jsonb)$$, 'forbidden', 'operators cannot change WENRO''s payment details');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok(jsonb_array_length(admin_operator_payments('submitted')) = 1, 'finance sees the payment to check');
select t.ok(payment_proof(current_setting('t.pid')::uuid) like '10000000-0000-0000-0000-000000000002/%', 'owner can open the receipt');
select t.fails($$select review_operator_payment(current_setting('t.pid')::uuid, false, '')$$, 'reason_required', 'rejecting needs a reason');
select review_operator_payment(current_setting('t.pid')::uuid, true, null);
select t.reset();
select t.ok((select status = 'approved' from operator_payments limit 1), 'payment approved');
select t.ok((select status = 'received' from operator_statements where id = '99000000-0000-0000-0000-000000000001'), 'approving marks the statement received');
select t.ok(exists (select 1 from notifications where kind = 'payment_approved'), 'operator is told');
select t.ok(exists (select 1 from notifications where kind = 'payment_submitted'), 'WENRO finance was told');

-- WhatsApp: queued for the operator always, for the guest only with their agreement
select t.service();
select queue_booking_whatsapp((select id from bookings where status = 'confirmed' order by created_at desc limit 1), false);
select t.ok((select count(*) = 1 from message_outbox where channel = 'whatsapp' and recipient = 'operator'), 'operator gets WhatsApp');
select t.ok(not exists (select 1 from message_outbox where channel = 'whatsapp' and recipient = 'guest'), 'no WhatsApp to a guest who did not agree');
select queue_booking_whatsapp((select id from bookings where status = 'confirmed' order by created_at limit 1), true);
select t.ok(exists (select 1 from message_outbox where channel = 'whatsapp' and recipient = 'guest'), 'guest who agreed gets WhatsApp');
select t.ok((outbox_claim(100)->0) ? 'channel', 'sender knows the channel');
select t.reset();
select t.anon();
select t.fails($$select queue_booking_whatsapp((select id from bookings limit 1), true)$$, 'permission denied', 'visitors cannot queue messages');
select t.reset();
\echo PAYMENT AND WHATSAPP TESTS PASSED
