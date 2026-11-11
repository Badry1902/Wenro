-- Trip city and activity point: only people who may edit a trip can set them; visitors see them on cards and the trip page.
\set ON_ERROR_STOP on
set client_min_messages = notice;
select set_config('t.own', (select id::text from experiences where operator_id = '10000000-0000-0000-0000-000000000002' order by created_at limit 1), false);
select set_config('t.other', (select id::text from experiences where operator_id = '10000000-0000-0000-0000-000000000003' order by created_at limit 1), false);

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select set_experience_place(current_setting('t.own')::uuid, 'luxor', 25.7188, 32.6573, 'Karnak', null);
select t.ok((experience_location(current_setting('t.own')::uuid)->>'city') = 'luxor', 'operator sets the city of an own trip');
select t.ok((experience_location(current_setting('t.own')::uuid)->'activity'->>'place') = 'Karnak', 'and where it happens');
select t.fails($$select set_experience_place(current_setting('t.own')::uuid, 'atlantis', null, null, null, null)$$, 'invalid_input', 'only known cities');
select t.fails($$select set_experience_place(current_setting('t.own')::uuid, 'luxor', 40, 10, null, null)$$, 'location_outside_egypt', 'activity point inside Egypt');
select t.fails($$select set_experience_place(current_setting('t.own')::uuid, 'luxor', 25.7, null, null, null)$$, 'invalid_input', 'both coordinates or none');
select t.fails($$select set_experience_place(current_setting('t.other')::uuid, 'cairo', null, null, null, null)$$, 'forbidden', 'no changing another operator''s trip');
select set_experience_place(current_setting('t.own')::uuid, 'hurghada', null, null, null, null, true);
select t.ok((experience_location(current_setting('t.own')::uuid)->'activity') = 'null'::jsonb, 'activity point cleared');
select t.reset();

select t.anon();
select t.fails($$select set_experience_place(current_setting('t.own')::uuid, 'cairo', null, null, null, null)$$, 'permission denied', 'visitors cannot change places');
select t.ok((select bool_and(x ? 'city' and x ? 'alat') from jsonb_array_elements(experience_list('en')) x), 'trip cards carry city and activity point');
select t.reset();
\echo TRIP PLACES TESTS PASSED
