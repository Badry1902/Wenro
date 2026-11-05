-- Meeting point on a map, and the operator's identity kept back until shortly before the trip (Nov 2026).
--
-- Meeting point
--  * The operator pastes a Google Maps link in the editor; the server reads the coordinates from it.
--  * meeting_exact_public: true  -> the trip page shows the exact pin;
--                          false -> the trip page shows only the area (about 1 km); the exact pin comes with
--                                   the booking (voucher), for operators whose meeting point is their own shop.
--
-- Operator identity
--  * Guests (and agencies, who see the same voucher) get the operator's name and phone only from
--    platform_settings.operator_reveal_hours before the start. Before that the voucher says "local operator".
--    Operators already get the guest's phone only 24 hours before (operator_phone_reveal_hours).

-- meeting_lat / meeting_lng exist since the first schema (double precision, unused until now)
alter table experiences add column if not exists meeting_lat double precision;
alter table experiences add column if not exists meeting_lng double precision;
alter table experiences add column if not exists meeting_place text;
alter table experiences add column if not exists meeting_exact_public boolean not null default true;
alter table experiences add column if not exists meeting_maps_url text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'experiences_meeting_point') then
    alter table experiences add constraint experiences_meeting_point check (
      (meeting_lat is null) = (meeting_lng is null)
      and (meeting_lat is null or (meeting_lat between 21.5 and 31.8 and meeting_lng between 24.6 and 37.0)));
  end if;
end $$;

alter table platform_settings add column if not exists operator_reveal_hours int not null default 12;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'platform_settings_reveal_hours') then
    alter table platform_settings add constraint platform_settings_reveal_hours check (operator_reveal_hours between 0 and 168);
  end if;
end $$;

/** Editor: set or clear the meeting point. Operators (owner/manager) of the trip, or WENRO ops/content. */
create or replace function set_experience_location(p_experience uuid, p_lat numeric, p_lng numeric, p_place text,
                                                   p_exact_public boolean, p_url text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_place text := nullif(btrim(coalesce(p_place, '')), ''); v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  if p_lat is null or p_lng is null then
    update experiences set meeting_lat = null, meeting_lng = null, meeting_place = null, meeting_maps_url = null where id = p_experience;
    return jsonb_build_object('cleared', true);
  end if;
  if not (p_lat between 21.5 and 31.8 and p_lng between 24.6 and 37.0) then raise exception 'location_outside_egypt'; end if;
  if v_place is not null and length(v_place) > 120 then raise exception 'invalid_input'; end if;
  if v_url is not null and (length(v_url) > 600 or v_url !~ '^https://([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|app\.goo\.gl)/') then
    raise exception 'invalid_input';
  end if;
  update experiences set meeting_lat = round(p_lat, 6), meeting_lng = round(p_lng, 6), meeting_place = v_place,
         meeting_exact_public = coalesce(p_exact_public, true), meeting_maps_url = v_url
   where id = p_experience;
  if not found then raise exception 'experience_not_found'; end if;
  return jsonb_build_object('lat', round(p_lat, 6), 'lng', round(p_lng, 6));
end $$;

/** Editor: the stored meeting point. */
create or replace function experience_location(p_experience uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e experiences;
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  select * into e from experiences where id = p_experience;
  if e.meeting_lat is null then return null; end if;
  return jsonb_build_object('lat', e.meeting_lat, 'lng', e.meeting_lng, 'place', e.meeting_place,
                            'exact_public', e.meeting_exact_public, 'url', e.meeting_maps_url);
end $$;

/** Trip page: exact pin, or only the area (rounded to about 1 km) when the operator keeps it for booked guests. */
create or replace function public_location(p_experience uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when e.meeting_lat is null then null
    when e.meeting_exact_public then jsonb_build_object('lat', e.meeting_lat, 'lng', e.meeting_lng, 'place', e.meeting_place, 'exact', true)
    else jsonb_build_object('lat', round(e.meeting_lat::numeric, 2), 'lng', round(e.meeting_lng::numeric, 2), 'place', e.meeting_place, 'exact', false) end
  from experiences e where e.id = p_experience and e.status = 'published'
$$;

-- Voucher: operator name and phone only shortly before the trip; the exact meeting point always.
create or replace function booking_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'ref', b.ref, 'status', b.status, 'execution_status', b.execution_status,
    'starts_at', b.starts_at, 'currency', b.currency, 'paid_minor', b.paid_minor, 'gross_minor', b.gross_minor,
    'discount_minor', b.discount_minor, 'qr_token', b.qr_token, 'locale', b.locale,
    'reconfirm_status', b.reconfirm_status, 'terms', b.terms_snapshot, 'is_private', b.is_private,
    'display_currency', b.display_currency, 'display_rate', b.display_rate,
    'transport', b.transport, 'cancel_reason', b.cancel_reason,
    'experience', jsonb_build_object('slug', e.slug, 'title',
        (select t.title from experience_translations t where t.experience_id = e.id
          order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
        'meeting_info', (select t.meeting_info from experience_translations t where t.experience_id = e.id
          order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1)),
    'operator', case when r.revealed then o.name end,
    'operator_phone', case when r.revealed and b.status = 'confirmed' then d.contact_phone end,
    'operator_reveal_at', b.starts_at - make_interval(hours => s.operator_reveal_hours),
    'location', case when e.meeting_lat is null then null
                     else jsonb_build_object('lat', e.meeting_lat, 'lng', e.meeting_lng, 'place', e.meeting_place) end,
    'hotel', h.name, 'zone', z.name,
    'lines', (select jsonb_agg(jsonb_build_object('kind', l.kind, 'quantity', l.quantity,
                'unit_price_minor', l.unit_price_minor, 'line_price_minor', l.line_price_minor) order by l.kind)
                from booking_lines l where l.booking_id = b.id),
    'customer', jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'room', c.room))
  from bookings b
  cross join lateral (select * from platform_settings limit 1) s
  cross join lateral (select (now() >= b.starts_at - make_interval(hours => s.operator_reveal_hours)
                              or b.execution_status <> 'scheduled') as revealed) r
  join booking_contacts c on c.booking_id = b.id
  join experiences e on e.id = b.experience_id
  join organizations o on o.id = b.operator_id
  left join org_private_details d on d.org_id = o.id
  left join hotels h on h.id = b.hotel_id
  left join zones z on z.id = h.zone_id
  where b.manage_token_hash = app.token_hash(p_token)
$$;

revoke execute on function set_experience_location(uuid, numeric, numeric, text, boolean, text), experience_location(uuid) from public, anon;
grant execute on function set_experience_location(uuid, numeric, numeric, text, boolean, text), experience_location(uuid) to authenticated, service_role;
grant execute on function public_location(uuid) to anon, authenticated, service_role;
revoke execute on function booking_by_token(text) from public, anon, authenticated;
grant execute on function booking_by_token(text) to service_role;
