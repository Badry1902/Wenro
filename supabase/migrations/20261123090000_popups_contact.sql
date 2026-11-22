-- =============================================================================
-- 1. Operator contact details (the WhatsApp number that receives booking alerts) can be changed later
-- 2. Site pop-ups: announcements/offers on the public pages, managed from the WENRO dashboard
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Contact details of an operator or agency (owner/manager), read by WENRO owner/ops too
-- ---------------------------------------------------------------------------
create or replace function org_contact(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_org, array['owner','manager']::member_role[]) or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  return (select jsonb_build_object('phone', d.contact_phone, 'email', d.contact_email)
            from organizations o left join org_private_details d on d.org_id = o.id where o.id = p_org);
end $$;

create or replace function set_org_contact(p_org uuid, p_phone text, p_email text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not exists (select 1 from organizations where id = p_org and type in ('operator', 'agency'))
     or not app.has_role(p_org, array['owner','manager']::member_role[]) then
    raise exception 'forbidden';
  end if;
  -- international format: + country code + number (8 to 15 digits)
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'invalid_phone'; end if;
  if v_email <> '' and (length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'invalid_email'; end if;
  insert into org_private_details (org_id, contact_phone, contact_email) values (p_org, v_phone, nullif(v_email, ''))
  on conflict (org_id) do update set contact_phone = excluded.contact_phone,
    contact_email = coalesce(excluded.contact_email, org_private_details.contact_email);
  return jsonb_build_object('org_id', p_org);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Site pop-ups
--    Shown only on the public browsing pages (never during booking, sign-in, dashboards or legal pages),
--    at most one per visit, after a delay or some scrolling, and not again once closed (per frequency).
--    Texts are plain text (rendered as text, never as HTML). Stats are anonymous daily counters.
-- ---------------------------------------------------------------------------
create table if not exists site_popups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  layout text not null default 'card' check (layout in ('card', 'modal', 'bar')),
  -- {"ar": {"title": "...", "body": "...", "cta": "..."}, "en": {...}}
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  image_url text check (image_url is null or image_url ~ '^(https://[^\s"''<>]+|/api/dev-media/[A-Za-z0-9/._-]+)$'),
  cta_url text check (cta_url is null or cta_url ~ '^(/[A-Za-z0-9/_?=&%.~#-]*|https://[^\s"''<>]+)$'),
  pages text[] not null default array['home'] check (array_length(pages, 1) >= 1
    and pages <@ array['home', 'catalog', 'experience', 'explore', 'plan', 'wishlist']),
  locales text[] check (locales is null or locales <@ array['ar', 'en', 'de', 'ru', 'fr']),
  device text not null default 'all' check (device in ('all', 'mobile', 'desktop')),
  delay_seconds int not null default 6 check (delay_seconds between 0 and 120),
  scroll_percent int not null default 0 check (scroll_percent between 0 and 90),
  frequency text not null default 'once' check (frequency in ('once', 'weekly', 'daily', 'session')),
  starts_at timestamptz,
  ends_at timestamptz,
  priority int not null default 0 check (priority between -100 and 100),
  version int not null default 1,   -- raised to show a changed pop-up again to people who closed it
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
alter table site_popups enable row level security;   -- no policies: only the functions below touch it
create index if not exists site_popups_live_idx on site_popups (priority desc, created_at desc) where status = 'active';

drop trigger if exists site_popups_touch on site_popups;
create trigger site_popups_touch before update on site_popups for each row execute function app.touch_updated_at();
drop trigger if exists audit_site_popups on site_popups;
create trigger audit_site_popups after insert or update or delete on site_popups for each row execute function app.audit();

create table if not exists site_popup_stats (
  popup_id uuid not null references site_popups(id) on delete cascade,
  day date not null default (now() at time zone 'Africa/Cairo')::date,
  views int not null default 0,
  clicks int not null default 0,
  closes int not null default 0,
  primary key (popup_id, day)
);
alter table site_popup_stats enable row level security;

-- Text of one language, falling back to English, then Arabic, then any language that has a title
create or replace function app.popup_text(p_content jsonb, p_locale text) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(
    case when coalesce(p_content -> p_locale ->> 'title', '') <> '' then p_content -> p_locale end,
    case when coalesce(p_content -> 'en' ->> 'title', '') <> '' then p_content -> 'en' end,
    case when coalesce(p_content -> 'ar' ->> 'title', '') <> '' then p_content -> 'ar' end,
    (select v from jsonb_each(p_content) e(k, v) where coalesce(v ->> 'title', '') <> '' limit 1),
    '{}'::jsonb)
$$;

-- Public: the pop-ups that may show now, in this language (a few at most; the browser picks one)
create or replace function active_popups(p_locale text default 'en') returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.priority desc, x.created_at desc), '[]'::jsonb) from (
    select p.id, p.version, p.layout, p.image_url, p.cta_url, p.pages, p.device, p.delay_seconds, p.scroll_percent,
           p.frequency, p.priority, p.created_at,
           app.popup_text(p.content, p_locale) ->> 'title' as title,
           app.popup_text(p.content, p_locale) ->> 'body' as body,
           app.popup_text(p.content, p_locale) ->> 'cta' as cta
      from site_popups p
     where p.status = 'active'
       and (p.starts_at is null or p.starts_at <= now())
       and (p.ends_at is null or p.ends_at > now())
       and (p.locales is null or p_locale = any (p.locales))
       and coalesce(app.popup_text(p.content, p_locale) ->> 'title', '') <> ''
     order by p.priority desc, p.created_at desc
     limit 5) x
$$;

-- Server only (the API route rate-limits per visitor): one view / click / close
create or replace function popup_event(p_popup uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if p_kind not in ('view', 'click', 'close') then raise exception 'invalid_input'; end if;
  if not exists (select 1 from site_popups where id = p_popup and status = 'active') then return; end if;
  insert into site_popup_stats (popup_id, views, clicks, closes)
  values (p_popup, (p_kind = 'view')::int, (p_kind = 'click')::int, (p_kind = 'close')::int)
  on conflict (popup_id, day) do update set
    views = site_popup_stats.views + excluded.views,
    clicks = site_popup_stats.clicks + excluded.clicks,
    closes = site_popup_stats.closes + excluded.closes;
end $$;

-- WENRO dashboard (owner, ops, content): list with the last 30 days of numbers
create or replace function admin_popups() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
      'live', p.status = 'active' and (p.starts_at is null or p.starts_at <= now()) and (p.ends_at is null or p.ends_at > now()),
      'views', coalesce(s.views, 0), 'clicks', coalesce(s.clicks, 0), 'closes', coalesce(s.closes, 0))
      order by (p.status = 'archived'), (p.status = 'active') desc, p.priority desc, p.updated_at desc), '[]'::jsonb)
    from (select * from site_popups order by updated_at desc limit 200) p
    left join lateral (select sum(views) views, sum(clicks) clicks, sum(closes) closes from site_popup_stats st
                        where st.popup_id = p.id and st.day > (now() at time zone 'Africa/Cairo')::date - 30) s on true);
end $$;

-- Create or update. p_show_again raises the version so people who closed it see the new one.
create or replace function save_popup(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_content jsonb := '{}'::jsonb;
  v_loc text;
  v_row site_popups;
  v_pages text[] := case when jsonb_typeof(p -> 'pages') = 'array' then (select array_agg(x) from jsonb_array_elements_text(p -> 'pages') x) end;
  v_locales text[] := case when jsonb_typeof(p -> 'locales') = 'array' then (select array_agg(x) from jsonb_array_elements_text(p -> 'locales') x) end;
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  -- keep only known languages and fields, trimmed and capped (plain text)
  foreach v_loc in array array['ar', 'en', 'de', 'ru', 'fr'] loop
    if coalesce(btrim(p -> 'content' -> v_loc ->> 'title'), '') <> '' then
      v_content := v_content || jsonb_build_object(v_loc, jsonb_build_object(
        'title', left(btrim(p -> 'content' -> v_loc ->> 'title'), 80),
        'body', left(btrim(coalesce(p -> 'content' -> v_loc ->> 'body', '')), 280),
        'cta', left(btrim(coalesce(p -> 'content' -> v_loc ->> 'cta', '')), 30)));
    end if;
  end loop;
  if v_content = '{}'::jsonb then raise exception 'title_required'; end if;
  if nullif(btrim(p ->> 'cta_url'), '') is not null and btrim(p ->> 'cta_url') !~ '^(/[A-Za-z0-9/_?=&%.~#-]*|https://[^\s"''<>]+)$' then
    raise exception 'invalid_link';
  end if;

  if v_id is null then
    insert into site_popups (name, layout, content, image_url, cta_url, pages, locales, device, delay_seconds,
                             scroll_percent, frequency, starts_at, ends_at, priority, status)
    values (left(btrim(p ->> 'name'), 80), coalesce(p ->> 'layout', 'card'), v_content, nullif(p ->> 'image_url', ''),
            nullif(btrim(p ->> 'cta_url'), ''),
            coalesce(v_pages, array['home']), v_locales,
            coalesce(p ->> 'device', 'all'), coalesce((p ->> 'delay_seconds')::int, 6), coalesce((p ->> 'scroll_percent')::int, 0),
            coalesce(p ->> 'frequency', 'once'), nullif(p ->> 'starts_at', '')::timestamptz, nullif(p ->> 'ends_at', '')::timestamptz,
            coalesce((p ->> 'priority')::int, 0), 'draft')
    returning * into v_row;
  else
    update site_popups set
      name = left(btrim(p ->> 'name'), 80), layout = coalesce(p ->> 'layout', layout), content = v_content,
      image_url = case when p ? 'image_url' then nullif(p ->> 'image_url', '') else image_url end,
      cta_url = nullif(btrim(p ->> 'cta_url'), ''),
      pages = coalesce(v_pages, pages), locales = v_locales,
      device = coalesce(p ->> 'device', device), delay_seconds = coalesce((p ->> 'delay_seconds')::int, delay_seconds),
      scroll_percent = coalesce((p ->> 'scroll_percent')::int, scroll_percent), frequency = coalesce(p ->> 'frequency', frequency),
      starts_at = nullif(p ->> 'starts_at', '')::timestamptz, ends_at = nullif(p ->> 'ends_at', '')::timestamptz,
      priority = coalesce((p ->> 'priority')::int, priority),
      version = version + case when coalesce((p ->> 'show_again')::boolean, false) then 1 else 0 end
    where id = v_id and status <> 'archived'
    returning * into v_row;
    if not found then raise exception 'not_found'; end if;
  end if;
  return jsonb_build_object('id', v_row.id, 'image_url', v_row.image_url);
end $$;

create or replace function set_popup_status(p_popup uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  if p_status not in ('draft', 'active', 'paused', 'archived') then raise exception 'invalid_input'; end if;
  update site_popups set status = p_status where id = p_popup and (status <> 'archived' or p_status = 'archived');
  if not found then raise exception 'not_found'; end if;
  return jsonb_build_object('id', p_popup, 'status', p_status);
end $$;

-- Image changes go through the server (upload) after the permission check above
create or replace function set_popup_image(p_popup uuid, p_url text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  select image_url into v_old from site_popups where id = p_popup for update;
  if not found then raise exception 'not_found'; end if;
  update site_popups set image_url = nullif(p_url, '') where id = p_popup;
  return jsonb_build_object('old', v_old);
end $$;

-- ---------------------------------------------------------------------------
-- Privileges (Supabase grants new functions to anon by default: take it back, then grant explicitly)
-- ---------------------------------------------------------------------------
revoke all on table site_popups, site_popup_stats from anon, authenticated;
revoke execute on function org_contact(uuid), set_org_contact(uuid, text, text), active_popups(text),
  popup_event(uuid, text), admin_popups(), save_popup(jsonb), set_popup_status(uuid, text),
  set_popup_image(uuid, text), app.popup_text(jsonb, text) from public, anon, authenticated;
grant execute on function active_popups(text), app.popup_text(jsonb, text) to anon, authenticated, service_role;
grant execute on function org_contact(uuid), set_org_contact(uuid, text, text), admin_popups(), save_popup(jsonb),
  set_popup_status(uuid, text), set_popup_image(uuid, text) to authenticated, service_role;
grant execute on function popup_event(uuid, text) to service_role;
