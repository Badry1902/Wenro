-- Growth features (Nov 2026): explore map, week planner, partner levels and earnings, trip quality,
-- operator day list and response time, push notifications.

-- 1. Trip cards carry the meeting point (exact, or rounded to ~1 km when the operator keeps it private) -----
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
    'exact', e.meeting_exact_public)
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

-- 2. Week planner: open departures with free seats for a few trips between two dates -----------------------
create or replace function plan_slots(p_ids uuid[], p_from date, p_to date, p_locale text default 'en') returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'duration_minutes', e.duration_minutes,
    'title', (select t.title from experience_translations t where t.experience_id = e.id order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'slots', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'starts_at', s.starts_at, 'seats_left', s.capacity - s.booked) order by s.starts_at), '[]'::jsonb)
                from slots s where s.experience_id = e.id and s.status = 'open' and s.capacity > s.booked and s.starts_at > now() + interval '2 hours'
                 and (s.starts_at at time zone 'Africa/Cairo')::date between p_from and least(p_to, p_from + 30)))), '[]'::jsonb)
  from experiences e where e.id = any(p_ids[1:12]) and e.status = 'published'
$$;

-- 3. Partners: earnings this month, levels, and which trips work best from their links ------------------
create or replace function partner_stats(p_partner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m0 timestamptz := date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo';
begin
  if not (app.has_role(p_partner) or app.is_platform()) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'currency', 'EUR',
    -- trips done this month (commission earned), upcoming confirmed trips (on the way), paid out this month
    'earned_minor', (select coalesce(sum(b.partner_commission_minor), 0) from bookings b
                      where b.partner_org_id = p_partner and b.execution_status = 'executed' and b.starts_at >= m0),
    'pending_minor', (select coalesce(sum(b.partner_commission_minor), 0) from bookings b
                      where b.partner_org_id = p_partner and b.status in ('confirmed', 'pending_request') and b.execution_status = 'scheduled'),
    'paid_minor', (select coalesce(sum(po.amount_minor), 0) from partner_payouts po where po.partner_org_id = p_partner and po.status = 'paid' and po.paid_at >= m0),
    'month_trips', (select count(*) from bookings b where b.partner_org_id = p_partner and b.execution_status = 'executed' and b.starts_at >= m0),
    'month_bookings', (select count(*) from bookings b where b.partner_org_id = p_partner and b.created_at >= m0 and b.status <> 'cancelled'),
    'all_trips', (select count(*) from bookings b where b.partner_org_id = p_partner and b.execution_status = 'executed'),
    'distinct_trips', (select count(distinct b.experience_id) from bookings b where b.partner_org_id = p_partner and b.status <> 'cancelled'),
    'clicks_month', (select count(*) from attribution_clicks ac join partner_codes pc on pc.id = ac.partner_code_id
                      where pc.org_id = p_partner and ac.created_at >= m0),
    'trips', (select coalesce(jsonb_agg(x order by (x->>'bookings')::int desc, (x->>'clicks')::int desc), '[]'::jsonb) from (
      select jsonb_build_object('slug', e.slug, 'title', app.trip_title(e.id),
               'clicks', (select count(*) from attribution_clicks ac join partner_codes pc on pc.id = ac.partner_code_id
                           where pc.org_id = p_partner and ac.experience_id = e.id and ac.created_at > now() - interval '90 days'),
               'bookings', (select count(*) from bookings b where b.partner_org_id = p_partner and b.experience_id = e.id
                             and b.status <> 'cancelled' and b.created_at > now() - interval '90 days'),
               'commission_minor', (select coalesce(sum(b.partner_commission_minor), 0) from bookings b where b.partner_org_id = p_partner
                             and b.experience_id = e.id and b.execution_status = 'executed' and b.starts_at > now() - interval '90 days')) x
        from experiences e where e.status = 'published'
         and (exists (select 1 from bookings b where b.partner_org_id = p_partner and b.experience_id = e.id and b.created_at > now() - interval '90 days')
           or exists (select 1 from attribution_clicks ac join partner_codes pc on pc.id = ac.partner_code_id
                       where pc.org_id = p_partner and ac.experience_id = e.id and ac.created_at > now() - interval '90 days'))) y)
  );
end $$;

-- 4. Operators: trip quality (what is filled in) -------------------------------------------------------
create or replace function operator_trip_quality(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(x order by x->>'status', x->>'title'), '[]'::jsonb) from (
    select jsonb_build_object('id', e.id, 'slug', e.slug, 'status', e.status, 'title', app.trip_title(e.id),
      'photos', (select count(*) from experience_media m where m.experience_id = e.id and m.kind = 'image'),
      'videos', (select count(*) from experience_media m where m.experience_id = e.id and m.kind = 'video'),
      'languages', (select count(*) from experience_translations t where t.experience_id = e.id),
      'description', (select coalesce(length(t.description), 0) from experience_translations t where t.experience_id = e.id order by (t.locale = 'en') desc limit 1),
      'itinerary', exists (select 1 from experience_translations t where t.experience_id = e.id and coalesce(t.itinerary, '') <> ''),
      'included', exists (select 1 from experience_translations t where t.experience_id = e.id and coalesce(t.included, '') <> ''),
      'meeting', e.meeting_lat is not null,
      'departures', (select count(*) from slots s where s.experience_id = e.id and s.status = 'open' and s.starts_at between now() and now() + interval '30 days'),
      'reviews', (select count(*) from reviews r where r.experience_id = e.id and r.approved),
      'rating', (select round(avg(r.rating)::numeric, 1) from reviews r where r.experience_id = e.id and r.approved)) x
    from experiences e where e.operator_id = p_operator and e.status <> 'archived') y);
end $$;

-- 5. Operators: response time to requests and the day's list -------------------------------------------
alter table bookings add column if not exists decided_at timestamptz;
create or replace function app.stamp_decision() returns trigger language plpgsql as $$
begin
  if old.status = 'pending_request' and new.status in ('confirmed', 'declined') and new.decided_at is null then new.decided_at := now(); end if;
  return new;
end $$;
drop trigger if exists bookings_decided on bookings;
create trigger bookings_decided before update of status on bookings for each row execute function app.stamp_decision();

create or replace function operator_today(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d date := (now() at time zone 'Africa/Cairo')::date;
begin
  if not (app.has_role(p_operator) or app.is_platform()) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'requests', (select count(*) from bookings where operator_id = p_operator and status = 'pending_request'),
    'oldest_request_at', (select min(created_at) from bookings where operator_id = p_operator and status = 'pending_request'),
    'to_check_in', (select count(*) from bookings where operator_id = p_operator and status = 'confirmed' and execution_status = 'scheduled'
                      and (starts_at at time zone 'Africa/Cairo')::date = d and starts_at < now() + interval '3 hours'),
    'today_guests', (select coalesce(sum(seats), 0) from bookings where operator_id = p_operator and status = 'confirmed' and (starts_at at time zone 'Africa/Cairo')::date = d),
    'past_unmarked', (select count(*) from bookings where operator_id = p_operator and status = 'confirmed' and execution_status = 'scheduled'
                      and starts_at < now() - interval '3 hours' and starts_at > now() - interval '7 days'),
    'trips_without_departures', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'title', app.trip_title(e.id))), '[]'::jsonb) from experiences e
                      where e.operator_id = p_operator and e.status = 'published'
                        and not exists (select 1 from slots s where s.experience_id = e.id and s.status = 'open' and s.starts_at between now() and now() + interval '7 days')),
    'response_hours', (select round((extract(epoch from avg(decided_at - created_at)) / 3600)::numeric, 1) from bookings
                       where operator_id = p_operator and decided_at is not null and decided_at > now() - interval '60 days'),
    'decided_count', (select count(*) from bookings where operator_id = p_operator and decided_at > now() - interval '60 days')
  );
end $$;

-- 6. Push notifications to phones and computers ------------------------------------------------------------
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon, authenticated; -- device keys: reached only through the functions below
alter table notifications add column if not exists pushed_at timestamptz;

create or replace function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_locale text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then raise exception 'invalid_input'; end if;
  insert into push_subscriptions (endpoint, user_id, p256dh, auth, locale)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, case when p_locale in ('en', 'de', 'ru', 'fr', 'ar') then p_locale else 'en' end)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, locale = excluded.locale;
end $$;

create or replace function delete_push_subscription(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;

/** Server only: notifications from the last 15 minutes not pushed yet, with the devices to send them to. */
create or replace function pending_pushes() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  with picked as (
    update notifications n set pushed_at = now()
     where n.pushed_at is null and n.created_at > now() - interval '15 minutes'
       and exists (select 1 from push_subscriptions s where s.user_id = n.user_id)
       and n.id in (select id from notifications where pushed_at is null and created_at > now() - interval '15 minutes' order by id limit 200 for update skip locked)
    returning n.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'params', p.params, 'link', p.link, 'org', o.name,
           'devices', (select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'locale', s.locale))
                         from push_subscriptions s where s.user_id = p.user_id))), '[]'::jsonb)
    into v from picked p left join organizations o on o.id = p.org_id;
  -- notifications for people without devices are simply marked as handled
  update notifications set pushed_at = now() where pushed_at is null and created_at <= now() - interval '15 minutes';
  return v;
end $$;

create or replace function drop_push_endpoint(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  delete from push_subscriptions where endpoint = p_endpoint;
end $$;

-- Privileges
grant execute on function plan_slots(uuid[], date, date, text) to anon, authenticated, service_role;
revoke execute on function partner_stats(uuid), operator_trip_quality(uuid), operator_today(uuid), save_push_subscription(text, text, text, text), delete_push_subscription(text) from public, anon;
grant execute on function partner_stats(uuid), operator_trip_quality(uuid), operator_today(uuid), save_push_subscription(text, text, text, text), delete_push_subscription(text) to authenticated, service_role;
revoke execute on function pending_pushes(), drop_push_endpoint(text) from public, anon, authenticated;
grant execute on function pending_pushes(), drop_push_endpoint(text) to service_role;
