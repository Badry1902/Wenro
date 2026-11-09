-- Growth tools: partner stats, operator quality/to-do, week planner and phone alerts stay in their lanes.
\set ON_ERROR_STOP on
set client_min_messages = notice;

select t.login('00000000-0000-0000-0000-0000000000d1'); -- marketer owner
select t.ok(partner_stats('10000000-0000-0000-0000-000000000004') ? 'earned_minor', 'marketer reads own stats');
select t.ok(not (partner_stats('10000000-0000-0000-0000-000000000004')::text ~ 'phone|email|guest_name'), 'no guest details in partner stats');
select t.fails($$select partner_stats('10000000-0000-0000-0000-000000000005')$$, 'forbidden', 'no reading another partner''s stats');
select t.fails($$select operator_today('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'partners cannot read an operator''s day');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select t.ok(operator_today('10000000-0000-0000-0000-000000000002') ? 'requests', 'operator reads own to-do');
select t.ok(jsonb_typeof(operator_trip_quality('10000000-0000-0000-0000-000000000002')) = 'array', 'operator reads own quality');
select t.fails($$select operator_today('10000000-0000-0000-0000-000000000003')$$, 'forbidden', 'no reading another operator''s day');
select t.fails($$select operator_trip_quality('10000000-0000-0000-0000-000000000003')$$, 'forbidden', 'no reading another operator''s quality');
select t.fails($$select pending_pushes()$$, 'permission denied', 'users cannot pull the push queue');
select save_push_subscription('https://push.example.test/abc', 'k', 'a', 'en');
select t.fails($$select count(*) from push_subscriptions$$, 'permission denied', 'device keys are not readable by users');
select t.fails($$select save_push_subscription('http://evil.test/x', 'k', 'a', 'en')$$, 'invalid_input', 'only https push endpoints');
select t.reset();
select t.ok((select count(*) = 1 from push_subscriptions where endpoint = 'https://push.example.test/abc' and user_id = '00000000-0000-0000-0000-0000000000b1'), 'device saved for this user');

select t.anon();
select t.ok(jsonb_typeof(plan_slots(array(select id from experiences where status = 'published' limit 3), current_date, current_date + 7)) = 'array', 'guests can plan');
select t.fails($$select partner_stats('10000000-0000-0000-0000-000000000004')$$, 'permission denied', 'anonymous cannot read partner stats');
select t.fails($$select save_push_subscription('https://push.example.test/x', 'k', 'a', 'en')$$, 'permission denied', 'anonymous cannot register devices');
select t.reset();

select t.service();
select t.ok(jsonb_typeof(pending_pushes()) = 'array', 'service pulls the push queue');
select t.ok(not exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000b1' and pushed_at is null), 'queue marks notices as pushed');
select drop_push_endpoint('https://push.example.test/abc');
select t.ok(not exists (select 1 from push_subscriptions where endpoint = 'https://push.example.test/abc'), 'dead devices are dropped');
select t.reset();

-- answering a request stamps the decision time used for response speed
update bookings set status = 'pending_request', decided_at = null where id = (select id from bookings order by created_at limit 1);
update bookings set status = 'declined' where id = (select id from bookings order by created_at limit 1);
select t.ok((select decided_at is not null from bookings order by created_at limit 1), 'decision time stamped');
\echo GROWTH TESTS PASSED
