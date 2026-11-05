-- Machine translations, in-app notifications for every party, and visit counting (Nov 2026).

-- 1. Machine translations ---------------------------------------------------------------------------------
-- A language filled in automatically is marked machine_translated until a person edits and saves it.
alter table experience_translations add column if not exists machine_translated boolean not null default false;

create or replace function set_translation_flags(p_experience uuid, p_machine text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  update experience_translations set machine_translated = (locale::text = any(coalesce(p_machine, '{}')))
   where experience_id = p_experience;
end $$;

/** WENRO team: trips that miss one or more languages (for "translate all"). */
create or replace function experiences_missing_locales(p_limit int default 10) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', e.id, 'missing', (select jsonb_agg(l) from unnest(array['en','ar','de','ru','fr']) l
             where not exists (select 1 from experience_translations t where t.experience_id = e.id and t.locale::text = l))) x
      from experiences e
     where e.status <> 'archived'
       and (select count(*) from experience_translations t where t.experience_id = e.id) < 5
     order by e.status = 'published' desc, e.created_at
     limit least(greatest(coalesce(p_limit, 10), 1), 25)) y);
end $$;

/** Adds machine translations for languages that do not exist yet (never overwrites a person's text). */
create or replace function add_machine_translations(p_experience uuid, p_translations jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_loc text; v_tr jsonb; n int := 0;
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  for v_loc, v_tr in select * from jsonb_each(coalesce(p_translations, '{}'::jsonb)) loop
    if v_loc not in ('en', 'de', 'ru', 'fr', 'ar') or length(trim(coalesce(v_tr->>'title', ''))) = 0 then continue; end if;
    insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, machine_translated)
    values (p_experience, v_loc::locale_code, left(trim(v_tr->>'title'), 120), left(nullif(trim(v_tr->>'summary'), ''), 300), left(nullif(trim(v_tr->>'description'), ''), 5000),
            left(nullif(trim(v_tr->>'itinerary'), ''), 3000), left(nullif(trim(v_tr->>'included'), ''), 2000), left(nullif(trim(v_tr->>'excluded'), ''), 2000),
            left(nullif(trim(v_tr->>'requirements'), ''), 2000), left(nullif(trim(v_tr->>'meeting_info'), ''), 1000), true)
    on conflict (experience_id, locale) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- 2. Notifications -----------------------------------------------------------------------------------------
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;
alter table notifications enable row level security;
drop policy if exists own_notifications on notifications;
create policy own_notifications on notifications for select to authenticated using (user_id = (select auth.uid()));

/** One notification for every active member of an organisation with one of the given roles (null = all). */
create or replace function app.notify(p_org uuid, p_roles member_role[], p_kind text, p_params jsonb, p_link text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, org_id, kind, params, link)
  select m.user_id, p_org, p_kind, coalesce(p_params, '{}'::jsonb), p_link
    from memberships m where m.org_id = p_org and m.active and (p_roles is null or m.role = any(p_roles))
$$;

create or replace function app.trip_title(p_experience uuid) returns text
language sql stable security definer set search_path = public as $$
  select t.title from experience_translations t where t.experience_id = p_experience order by (t.locale = 'en') desc limit 1
$$;

create or replace function app.notify_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('ref', new.ref, 'title', app.trip_title(new.experience_id), 'starts_at', new.starts_at, 'seats', new.seats);
        op_link text := '/app/o/' || new.operator_id; pa_link text := '/app/p/' || new.partner_org_id || '/bookings';
        mgr member_role[] := array['owner','manager']::member_role[];
begin
  if tg_op = 'INSERT' then
    perform app.notify(new.operator_id, null, case when new.status = 'pending_request' then 'request_new' else 'booking_new' end, v, op_link);
    if new.partner_org_id is not null then
      perform app.notify(new.partner_org_id, mgr, 'partner_booking', v, pa_link);
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status = 'cancelled' then
      perform app.notify(new.operator_id, null, 'booking_cancelled', v, op_link);
      if new.partner_org_id is not null then perform app.notify(new.partner_org_id, mgr, 'partner_cancelled', v, pa_link); end if;
    elsif old.status = 'pending_request' and new.status in ('confirmed', 'declined', 'expired') then
      if new.partner_org_id is not null then
        perform app.notify(new.partner_org_id, mgr, 'request_' || new.status::text, v, pa_link);
      end if;
      if new.status = 'expired' then perform app.notify(new.operator_id, mgr, 'request_expired', v, op_link); end if;
    end if;
  end if;
  if new.execution_status = 'executed' and old.execution_status <> 'executed' and new.partner_org_id is not null then
    perform app.notify(new.partner_org_id, mgr, 'partner_executed', v || jsonb_build_object('currency', new.currency, 'commission_minor', new.partner_commission_minor), pa_link);
  end if;
  return new;
end $$;
drop trigger if exists bookings_notify on bookings;
create trigger bookings_notify after insert or update of status, execution_status on bookings for each row execute function app.notify_booking();

create or replace function app.notify_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('rating', new.rating, 'title', app.trip_title(new.experience_id));
        op uuid := (select operator_id from experiences where id = new.experience_id);
begin
  if tg_op = 'INSERT' then
    perform app.notify(app.platform_org(), array['owner','ops','content']::member_role[], 'review_pending', v, '/app/admin/reviews');
  elsif new.approved and not old.approved then
    perform app.notify(op, array['owner','manager']::member_role[], 'review_published', v, '/app/o/' || op || '/reviews');
  end if;
  return new;
end $$;
drop trigger if exists reviews_notify on reviews;
create trigger reviews_notify after insert or update of approved on reviews for each row execute function app.notify_review();

create or replace function app.notify_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.type <> 'platform' and new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    perform app.notify(app.platform_org(), array['owner','ops']::member_role[], 'org_applied', jsonb_build_object('name', new.name, 'type', new.type), '/app/admin/partners');
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status = 'pending' then
    perform app.notify(new.id, null, 'org_approved', jsonb_build_object('name', new.name), null);
  end if;
  return new;
end $$;
drop trigger if exists organizations_notify on organizations;
create trigger organizations_notify after insert or update of status on organizations for each row execute function app.notify_org();

create or replace function app.notify_experience() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('title', app.trip_title(new.id));
begin
  if new.status = 'in_review' and old.status is distinct from 'in_review' then
    perform app.notify(app.platform_org(), array['owner','ops','content']::member_role[], 'experience_review', v, '/app/admin/experiences');
  elsif new.status = 'published' and old.status is distinct from 'published' then
    perform app.notify(new.operator_id, array['owner','manager']::member_role[], 'experience_published', v, '/app/o/' || new.operator_id || '/experiences');
  end if;
  return new;
end $$;
drop trigger if exists experiences_notify on experiences;
create trigger experiences_notify after update of status on experiences for each row execute function app.notify_experience();

create or replace function app.notify_statement() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('currency', new.currency, 'due_minor', new.due_minor, 'period_start', new.period_start, 'period_end', new.period_end);
begin
  if tg_op = 'INSERT' then
    perform app.notify(new.operator_id, array['owner','manager']::member_role[], 'statement_created', v, '/app/o/' || new.operator_id || '/money');
  elsif new.status = 'received' and old.status <> 'received' then
    perform app.notify(new.operator_id, array['owner','manager']::member_role[], 'statement_received', v, '/app/o/' || new.operator_id || '/money');
  end if;
  return new;
end $$;
drop trigger if exists statements_notify on operator_statements;
create trigger statements_notify after insert or update of status on operator_statements for each row execute function app.notify_statement();

create or replace function app.notify_payout() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb := jsonb_build_object('currency', new.currency, 'amount_minor', new.amount_minor, 'month', new.period_month, 'reference', new.reference);
begin
  if tg_op = 'INSERT' then
    perform app.notify(new.partner_org_id, array['owner','manager']::member_role[], 'payout_prepared', v, '/app/p/' || new.partner_org_id);
  elsif new.status = 'paid' and old.status <> 'paid' then
    perform app.notify(new.partner_org_id, array['owner','manager']::member_role[], 'payout_paid', v, '/app/p/' || new.partner_org_id);
  end if;
  return new;
end $$;
drop trigger if exists payouts_notify on partner_payouts;
create trigger payouts_notify after insert or update of status on partner_payouts for each row execute function app.notify_payout();

create or replace function my_notifications(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'unread', (select count(*) from notifications where user_id = auth.uid() and read_at is null),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'params', n.params, 'link', n.link,
                'org', o.name, 'org_type', o.type, 'created_at', n.created_at, 'read', n.read_at is not null) order by n.created_at desc), '[]'::jsonb)
              from (select * from notifications where user_id = auth.uid() order by created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) n
              left join organizations o on o.id = n.org_id))
  where auth.uid() is not null
$$;

create or replace function unread_notifications() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and read_at is null
$$;

create or replace function mark_notifications_read(p_ids bigint[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  update notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  -- keep the table small: read notifications older than 90 days go
  delete from notifications where user_id = auth.uid() and read_at < now() - interval '90 days';
  return n;
end $$;

-- 3. Visits ------------------------------------------------------------------------------------------------
-- Counted per day, without cookies. A visitor is an anonymous daily hash (salted IP + browser) that is
-- deleted after two days; nothing about the person is stored.
create table if not exists site_daily (day date primary key, views int not null default 0, visitors int not null default 0);
create table if not exists trip_daily (day date not null, experience_id uuid not null references experiences(id) on delete cascade,
  views int not null default 0, visitors int not null default 0, primary key (day, experience_id));
create table if not exists visit_seen (day date not null, h text not null, scope text not null, primary key (day, scope, h));
alter table site_daily enable row level security;
alter table trip_daily enable row level security;
alter table visit_seen enable row level security;

create or replace function record_visit(p_hash text, p_slug text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone (select business_timezone from platform_settings limit 1))::date; v_exp uuid; v_new int;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if p_hash is null or length(p_hash) > 64 then return; end if;
  insert into visit_seen (day, h, scope) values (d, p_hash, 'site') on conflict do nothing;
  get diagnostics v_new = row_count;
  insert into site_daily (day, views, visitors) values (d, 1, v_new)
  on conflict (day) do update set views = site_daily.views + 1, visitors = site_daily.visitors + v_new;
  if p_slug is not null then
    select id into v_exp from experiences where slug = p_slug and status = 'published';
    if v_exp is not null then
      insert into visit_seen (day, h, scope) values (d, p_hash, v_exp::text) on conflict do nothing;
      get diagnostics v_new = row_count;
      insert into trip_daily (day, experience_id, views, visitors) values (d, v_exp, 1, v_new)
      on conflict (day, experience_id) do update set views = trip_daily.views + 1, visitors = trip_daily.visitors + v_new;
    end if;
  end if;
  if random() < 0.01 then delete from visit_seen where day < d - 1; end if;
end $$;

/** WENRO team: visits per day and the most viewed trips with their bookings (last p_days days). */
create or replace function admin_visits(p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d0 date := (now() at time zone (select business_timezone from platform_settings limit 1))::date;
        n int := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'today', (select jsonb_build_object('views', coalesce(views, 0), 'visitors', coalesce(visitors, 0)) from (select 1) x left join site_daily s on s.day = d0),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'views', coalesce(s.views, 0), 'visitors', coalesce(s.visitors, 0)) order by g.day), '[]'::jsonb)
               from (select (d0 - i)::date as day from generate_series(0, n - 1) i) g left join site_daily s on s.day = g.day),
    'bookings', (select count(*) from bookings where created_at >= (d0 - (n - 1))::timestamp at time zone 'Africa/Cairo'),
    'top', (select coalesce(jsonb_agg(x order by (x->>'views')::int desc), '[]'::jsonb) from (
              select jsonb_build_object('title', app.trip_title(t.experience_id), 'slug', e.slug, 'views', sum(t.views), 'visitors', sum(t.visitors),
                       'bookings', (select count(*) from bookings b where b.experience_id = t.experience_id
                                     and b.created_at >= (d0 - (n - 1))::timestamp at time zone 'Africa/Cairo')) x
                from trip_daily t join experiences e on e.id = t.experience_id
               where t.day > d0 - n group by t.experience_id, e.slug order by sum(t.views) desc limit 10) y));
end $$;

/** Operators (owner/manager): views of their own trips. */
create or replace function operator_visits(p_operator uuid, p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d0 date := (now() at time zone (select business_timezone from platform_settings limit 1))::date;
        n int := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  if not (app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(x order by (x->>'views')::int desc), '[]'::jsonb) from (
    select jsonb_build_object('title', app.trip_title(e.id), 'slug', e.slug,
             'views', coalesce((select sum(views) from trip_daily t where t.experience_id = e.id and t.day > d0 - n), 0),
             'visitors', coalesce((select sum(visitors) from trip_daily t where t.experience_id = e.id and t.day > d0 - n), 0),
             'bookings', (select count(*) from bookings b where b.experience_id = e.id and b.created_at >= (d0 - (n - 1))::timestamp at time zone 'Africa/Cairo')) x
      from experiences e where e.operator_id = p_operator and e.status = 'published') y);
end $$;

-- Privileges
revoke execute on function set_translation_flags(uuid, text[]), add_machine_translations(uuid, jsonb), experiences_missing_locales(int),
  my_notifications(int), unread_notifications(), mark_notifications_read(bigint[]), admin_visits(int), operator_visits(uuid, int) from public, anon;
grant execute on function set_translation_flags(uuid, text[]), add_machine_translations(uuid, jsonb), experiences_missing_locales(int),
  my_notifications(int), unread_notifications(), mark_notifications_read(bigint[]), admin_visits(int), operator_visits(uuid, int) to authenticated, service_role;
revoke execute on function record_visit(text, text) from public, anon, authenticated;
grant execute on function record_visit(text, text) to service_role;
revoke execute on function app.notify(uuid, member_role[], text, jsonb, text), app.trip_title(uuid) from public, anon, authenticated;
