-- Where a trip belongs and where it happens (Nov 2026).
--
--  * city: the city the trip is sold in and starts from (where guests stay / are picked up). Set by the operator.
--  * activity point: where the trip actually takes place (a Luxor temple, an island, a dive site), as opposed
--    to the meeting point (meeting_lat/lng). Public: it's a destination, not someone's shop.
--  Distance for a guest = the farther of the two from their city, so a "Luxor day trip" meeting in Hurghada
--  counts as ~210 km, not 0.

alter table experiences add column if not exists city text;
alter table experiences add column if not exists activity_lat double precision;
alter table experiences add column if not exists activity_lng double precision;
alter table experiences add column if not exists activity_place text;
alter table experiences add column if not exists activity_maps_url text;
do $$ begin
  alter table experiences add constraint experiences_city_check check (city is null or city in ('hurghada','el-gouna','makadi','sahl-hasheesh','soma-bay','safaga','el-quseir','marsa-alam','sharm','dahab','nuweiba','st-catherine','luxor','aswan','abu-simbel','cairo','giza','alexandria','marsa-matrouh','siwa'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table experiences add constraint experiences_activity_point check (
    (activity_lat is null) = (activity_lng is null)
    and (activity_lat is null or (activity_lat between 21.5 and 31.8 and activity_lng between 24.6 and 37.0)));
exception when duplicate_object then null; end $$;

/** Editor: the trip's city and (optionally) where it happens. Same people who may edit the trip. */
create or replace function set_experience_place(p_experience uuid, p_city text, p_lat numeric, p_lng numeric,
                                                p_place text, p_url text, p_clear_activity boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_place text := nullif(btrim(coalesce(p_place, '')), ''); v_url text := nullif(btrim(coalesce(p_url, '')), '');
        v_city text := nullif(btrim(coalesce(p_city, '')), '');
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  if v_city is not null and v_city not in ('hurghada','el-gouna','makadi','sahl-hasheesh','soma-bay','safaga','el-quseir','marsa-alam','sharm','dahab','nuweiba','st-catherine','luxor','aswan','abu-simbel','cairo','giza','alexandria','marsa-matrouh','siwa') then raise exception 'invalid_input'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'invalid_input'; end if;
  if p_lat is not null and not (p_lat between 21.5 and 31.8 and p_lng between 24.6 and 37.0) then raise exception 'location_outside_egypt'; end if;
  if v_place is not null and length(v_place) > 120 then raise exception 'invalid_input'; end if;
  if v_url is not null and (length(v_url) > 600 or v_url !~ '^https://([a-z0-9-]+\.)*(google\.[a-z.]+|goo\.gl|app\.goo\.gl)/') then
    raise exception 'invalid_input';
  end if;
  update experiences set city = v_city where id = p_experience;
  if not found then raise exception 'experience_not_found'; end if;
  if coalesce(p_clear_activity, false) then
    update experiences set activity_lat = null, activity_lng = null, activity_place = null, activity_maps_url = null where id = p_experience;
  elsif p_lat is not null then
    update experiences set activity_lat = round(p_lat, 6), activity_lng = round(p_lng, 6), activity_place = v_place, activity_maps_url = v_url
     where id = p_experience;
  elsif v_place is not null then
    update experiences set activity_place = v_place where id = p_experience and activity_lat is not null;
  end if;
  return (select jsonb_build_object('city', city, 'lat', activity_lat, 'lng', activity_lng) from experiences where id = p_experience);
end $$;

/** Editor: the stored meeting point, city and activity point (meeting may be empty). */
create or replace function experience_location(p_experience uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e experiences;
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  select * into e from experiences where id = p_experience;
  if e.meeting_lat is null and e.city is null and e.activity_lat is null then return null; end if;
  return jsonb_build_object('lat', e.meeting_lat, 'lng', e.meeting_lng, 'place', e.meeting_place,
                            'exact_public', e.meeting_exact_public, 'url', e.meeting_maps_url,
                            'city', e.city, 'activity', case when e.activity_lat is null then null else
                              jsonb_build_object('lat', e.activity_lat, 'lng', e.activity_lng, 'place', e.activity_place, 'url', e.activity_maps_url) end);
end $$;

/** Trip page: meeting pin (exact or area), the city, and where it happens. */
create or replace function public_location(p_experience uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when e.meeting_lat is null and e.activity_lat is null and e.city is null then null else jsonb_build_object(
    'lat', case when e.meeting_lat is null then null when e.meeting_exact_public then e.meeting_lat else round(e.meeting_lat::numeric, 2) end,
    'lng', case when e.meeting_lng is null then null when e.meeting_exact_public then e.meeting_lng else round(e.meeting_lng::numeric, 2) end,
    'place', e.meeting_place, 'exact', e.meeting_exact_public, 'city', e.city,
    'activity', case when e.activity_lat is null then null else jsonb_build_object('lat', e.activity_lat, 'lng', e.activity_lng, 'place', e.activity_place) end) end
  from experiences e where e.id = p_experience and e.status = 'published'
$$;

-- Cards carry the city and the activity point
create or replace function experience_list(p_locale text default 'en')
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'currency', e.collection_currency, 'duration_minutes', e.duration_minutes,
    'booking_mode', e.booking_mode,
    'category', (select c.slug from categories c where c.id = e.category_id),
    'title', (select t.title from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'summary', (select t.summary from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'cover', (select jsonb_build_object('path', m.storage_path, 'alt', m.alt, 'kind', m.kind) from experience_media m
               where m.experience_id = e.id order by (m.kind = 'image') desc, m.sort limit 1),
    'images', (select coalesce(jsonb_agg(x.storage_path order by x.sort), '[]'::jsonb) from (
                 select m.storage_path, m.sort from experience_media m
                  where m.experience_id = e.id and m.kind = 'image' order by m.sort limit 6) x),
    'pickup', exists (select 1 from public_prices(e.id) pp where pp.kind = 'transport'),
    'free_cancel_hours', (select p.free_cancel_hours from cancellation_policies p where p.id = e.cancellation_policy_id),
    'from_minor', (select min(pp.price_minor) from public_prices(e.id) pp where pp.kind = 'adult'),
    'rating', (select round(avg(r.rating)::numeric, 1) from reviews r where r.experience_id = e.id and r.approved),
    'reviews', (select count(*) from reviews r where r.experience_id = e.id and r.approved),
    'lat', case when e.meeting_lat is null then null when e.meeting_exact_public then e.meeting_lat else round(e.meeting_lat::numeric, 2) end,
    'lng', case when e.meeting_lng is null then null when e.meeting_exact_public then e.meeting_lng else round(e.meeting_lng::numeric, 2) end,
    'exact', e.meeting_exact_public,
    'theme', e.theme,
    'city', e.city,
    'alat', e.activity_lat, 'alng', e.activity_lng)
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

revoke execute on function set_experience_place(uuid, text, numeric, numeric, text, text, boolean) from public, anon;
grant execute on function set_experience_place(uuid, text, numeric, numeric, text, text, boolean) to authenticated, service_role;
grant execute on function experience_list(text) to anon, authenticated, service_role;
