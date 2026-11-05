-- Meeting point from a map link; operator identity on the voucher only shortly before the trip.
\set ON_ERROR_STOP on
set client_min_messages = notice;

select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select t.ok((set_experience_location('50000000-0000-0000-0000-000000000001', 27.2246, 33.8411, 'Hurghada New Marina', false,
  'https://maps.app.goo.gl/abc123')->>'lat')::numeric = 27.2246, 'operator sets the meeting point');
select t.fails($$select set_experience_location('50000000-0000-0000-0000-000000000001', 48.85, 2.35, null, true, null)$$, 'location_outside_egypt', 'points outside Egypt are refused');
select t.fails($$select set_experience_location('50000000-0000-0000-0000-000000000001', 27.2, 33.8, null, true, 'https://evil.example/x')$$, 'invalid_input', 'only Google Maps links are stored');
select t.fails($$select set_experience_location('50000000-0000-0000-0000-000000000002', 27.2, 33.8, null, true, null)$$, 'forbidden', 'no setting another operator''s meeting point');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b2'); -- staff
select t.fails($$select set_experience_location('50000000-0000-0000-0000-000000000001', 27.2, 33.8, null, true, null)$$, 'forbidden', 'staff cannot change the meeting point');
select t.reset();

select t.anon();
do $$
declare l jsonb := public_location('50000000-0000-0000-0000-000000000001');
begin
  perform t.ok((l->>'exact')::boolean = false and (l->>'lat')::numeric = 27.22, 'trip page gets only the area when the pin is kept for guests');
  perform t.ok(not (l ? 'url'), 'the original link is not public');
end $$;
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b1');
select set_experience_location('50000000-0000-0000-0000-000000000001', 27.2246, 33.8411, 'Hurghada New Marina', true, null);
select t.reset();
select t.anon();
select t.ok((public_location('50000000-0000-0000-0000-000000000001')->>'lat')::numeric = 27.2246, 'exact pin when the operator allows it');
select t.reset();

select t.service();
do $$
declare v jsonb; tok text := (select txt from t.ids where name = 'direct');
begin
  update platform_settings set operator_reveal_hours = 1;
  update bookings set starts_at = now() + interval '3 days', execution_status = 'scheduled' where id = (select id from t.ids where name = 'direct');
  v := booking_by_token(tok);
  perform t.ok(v->>'operator' is null and v->>'operator_phone' is null, 'voucher days before the trip: operator not named');
  perform t.ok((v->'location'->>'lat')::numeric = 27.2246, 'voucher always has the exact meeting point');
  update platform_settings set operator_reveal_hours = 168;
  v := booking_by_token(tok);
  perform t.ok(v->>'operator' is not null, 'within the reveal window the operator is named');
  update platform_settings set operator_reveal_hours = 12;
end $$;
select t.reset();

\echo LOCATION AND IDENTITY TESTS PASSED
