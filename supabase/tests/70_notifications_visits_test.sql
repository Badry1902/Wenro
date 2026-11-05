-- Notifications reach the right people; visits are counted without personal data.
\set ON_ERROR_STOP on
set client_min_messages = notice;

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select t.ok((my_notifications()->>'unread')::int > 0, 'operator owner has notifications from earlier bookings');
select t.ok(exists (select 1 from jsonb_array_elements(my_notifications()->'items') i where i->>'kind' in ('booking_new', 'request_new')), 'new bookings notify the operator');
select t.ok(not exists (select 1 from jsonb_array_elements(my_notifications()->'items') i where i->>'kind' like 'partner_%'), 'operators never get partner notices');
select t.ok(mark_notifications_read() > 0, 'mark all as read');
select t.ok(unread_notifications() = 0, 'nothing unread afterwards');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000d1'); -- marketer owner
select t.ok(exists (select 1 from jsonb_array_elements(my_notifications()->'items') i where i->>'kind' = 'partner_booking'), 'marketer hears about bookings through their link');
select t.ok(not (my_notifications()::text ~ 'phone|email'), 'no guest contact details in partner notices');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b2'); -- operator staff
select t.ok(not exists (select 1 from jsonb_array_elements(my_notifications()->'items') i where i->>'kind' like 'statement%'), 'staff get no money notices');
select t.reset();
select t.anon();
select t.fails($$select record_visit('abc', null)$$, 'permission denied', 'visitors cannot write visit counts directly');
select t.reset();
select t.service();
select record_visit('h1', 'sunset-cruise'), record_visit('h1', 'sunset-cruise'), record_visit('h2', null);
select t.ok((select views = 3 and visitors = 2 from site_daily order by day desc limit 1), 'site: 3 views from 2 visitors');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok((admin_visits(7)->'today'->>'views')::int = 3, 'admin sees today''s visits');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000c1');
select t.fails($$select operator_visits('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'no reading another operator''s visits');
select t.reset();
\echo NOTIFICATION AND VISIT TESTS PASSED
