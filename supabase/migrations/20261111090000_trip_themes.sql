-- Trip designs (Nov 2026): every trip belongs to one Coast Club collection — reef, desert, trail, heritage,
-- souk or nile — which sets its patterns and motifs on cards, the trip page, vouchers and social images.
-- Empty = chosen automatically from the trip's category and name (in the app).

alter table experiences add column if not exists theme text;
do $$ begin
  alter table experiences add constraint experiences_theme_check check (theme is null or theme in ('reef', 'desert', 'trail', 'heritage', 'souk', 'nile'));
exception when duplicate_object then null; end $$;

-- Trip cards and the trip page carry the design
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
    'theme', e.theme)
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

create or replace function experience_page(p_slug text, p_locale text default 'en')
returns jsonb language sql stable security invoker set search_path = public as $$
  with e as (
    select * from experiences where slug = p_slug and status = 'published'
  ), tr as (
    select t.* from experience_translations t join e on e.id = t.experience_id
     order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1
  )
  select jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'booking_mode', e.booking_mode, 'duration_minutes', e.duration_minutes,
    'currency', e.collection_currency, 'private_available', e.private_available,
    'locale', tr.locale, 'title', tr.title, 'summary', tr.summary, 'description', tr.description,
    'itinerary', tr.itinerary, 'included', tr.included, 'excluded', tr.excluded,
    'requirements', tr.requirements, 'meeting_info', tr.meeting_info,
    'category', (select c.slug from categories c where c.id = e.category_id),
    'theme', e.theme,
    'policy', (select jsonb_build_object('code', p.code, 'free_cancel_hours', p.free_cancel_hours)
                 from cancellation_policies p where p.id = e.cancellation_policy_id),
    'prices', (select coalesce(jsonb_agg(to_jsonb(pp)), '[]'::jsonb) from public_prices(e.id) pp),
    'extras', (select coalesce(jsonb_agg(jsonb_build_object('id', pp.ref_id, 'per', pp.per,
                 'price_minor', pp.price_minor,
                 'name', (select xt.name from extra_translations xt where xt.extra_id = pp.ref_id
                           order by (xt.locale = p_locale) desc, (xt.locale = 'en') desc limit 1))), '[]'::jsonb)
                 from public_prices(e.id) pp where pp.kind = 'extra'),
    'slots', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'starts_at', s.starts_at,
                 'seats_left', s.capacity - s.booked) order by s.starts_at), '[]'::jsonb)
                from slots s where s.experience_id = e.id and s.status = 'open'
                 and s.starts_at > now() and s.starts_at < now() + interval '90 days'),
    'hotels', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name,
                 'zone_id', z.id, 'zone', z.name) order by z.sort, h.name), '[]'::jsonb)
                 from hotels h join zones z on z.id = h.zone_id where h.active),
    'media', (select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'alt', m.alt, 'kind', m.kind) order by m.sort), '[]'::jsonb)
                from experience_media m where m.experience_id = e.id),
    'fx', (select coalesce(jsonb_object_agg(f.quote, f.rate), '{}'::jsonb) from (
             select distinct on (quote) quote, rate from fx_rates
              where base = e.collection_currency order by quote, effective_at desc) f)
  )
  from e left join tr on true
$$;

-- Editor: read and set a trip's design (anyone who may edit the trip)
create or replace function experience_theme(p_experience uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  return (select theme from experiences where id = p_experience);
end $$;

create or replace function set_experience_theme(p_experience uuid, p_theme text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  if p_theme is not null and p_theme not in ('reef', 'desert', 'trail', 'heritage', 'souk', 'nile') then raise exception 'invalid_input'; end if;
  update experiences set theme = p_theme, updated_at = now() where id = p_experience;
end $$;

-- Vouchers: the design of a published trip, by its address
create or replace function trip_theme(p_slug text) returns text
language sql stable security definer set search_path = public as $$
  select theme from experiences where slug = p_slug and status = 'published'
$$;

revoke execute on function experience_theme(uuid), set_experience_theme(uuid, text), trip_theme(text) from public, anon;
grant execute on function experience_theme(uuid), set_experience_theme(uuid, text) to authenticated, service_role;
grant execute on function trip_theme(text) to anon, authenticated, service_role;
