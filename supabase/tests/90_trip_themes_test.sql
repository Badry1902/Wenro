-- Trip designs: only people who may edit a trip can change its collection; anyone can read a published trip's design.
\set ON_ERROR_STOP on
set client_min_messages = notice;

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select set_experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1), 'nile');
select t.ok(experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1)) = 'nile', 'operator sets the design of an own trip');
select t.fails($$select set_experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1), 'space')$$, 'invalid_input', 'only the six collections');
select t.fails($$select set_experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000003' order by created_at limit 1), 'reef')$$, 'forbidden', 'no changing another operator''s trip');
select set_experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1), null);
select t.ok(experience_theme((select id from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1)) is null, 'back to automatic');
select t.reset();

select t.anon();
select t.fails($$select set_experience_theme((select id from experiences limit 1), 'reef')$$, 'permission denied', 'visitors cannot change designs');
select t.ok(jsonb_typeof(experience_list('en')) = 'array' and (experience_list('en')->0) ? 'theme', 'trip cards carry the design');
select t.reset();
\echo TRIP THEME TESTS PASSED
