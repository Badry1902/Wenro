-- Experience editor, photos, team invitations, operator money page, coupons, support cancel, demo access.
-- Every function checks the caller itself (SECURITY DEFINER + explicit role checks).

-- ---------------------------------------------------------------------------
-- Experience editor
-- ---------------------------------------------------------------------------
-- Photos and videos. Files live with the media provider (Cloudinary) or Supabase Storage; the row keeps the URL.
alter table experience_media add column if not exists kind text not null default 'image' check (kind in ('image', 'video'));
create or replace function experience_editor(p_experience uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e experiences;
begin
  select * into e from experiences where id = p_experience;
  if not found then raise exception 'experience_not_found'; end if;
  if not app.can_edit_experience(e.id) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'status', e.status, 'operator_id', e.operator_id,
    'operator', (select name from organizations where id = e.operator_id),
    'category_id', e.category_id, 'booking_mode', e.booking_mode, 'duration_minutes', e.duration_minutes,
    'currency', e.collection_currency, 'cancellation_policy_id', e.cancellation_policy_id,
    'private_available', e.private_available, 'private_max_group', e.private_max_group,
    'translations', (select coalesce(jsonb_object_agg(t.locale, to_jsonb(t) - 'experience_id' - 'locale'), '{}'::jsonb)
                       from experience_translations t where t.experience_id = e.id),
    'prices', (select coalesce(jsonb_object_agg(pc.kind, jsonb_build_object('net_minor', pc.net_minor,
                 'display_minor', app.display_price(pc.net_minor), 'age_min', pc.age_min, 'age_max', pc.age_max,
                 'max_group', pc.max_group, 'active', pc.active)), '{}'::jsonb)
                 from price_categories pc where pc.experience_id = e.id),
    'extras', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'net_minor', x.net_minor, 'per', x.per,
                 'display_minor', app.display_price(x.net_minor), 'active', x.active,
                 'names', (select coalesce(jsonb_object_agg(xt.locale, xt.name), '{}'::jsonb) from extra_translations xt where xt.extra_id = x.id))
                 order by x.sort, x.id), '[]'::jsonb)
                 from extras x where x.experience_id = e.id and x.active),
    'transport', (select coalesce(jsonb_agg(jsonb_build_object('zone_id', tp.zone_id, 'net_minor', tp.net_minor,
                 'display_minor', app.display_price(tp.net_minor), 'per', tp.per, 'vehicle_capacity', tp.vehicle_capacity)), '[]'::jsonb)
                 from transport_prices tp where tp.experience_id = e.id),
    'media', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'path', m.storage_path, 'alt', m.alt, 'kind', m.kind) order by m.sort), '[]'::jsonb)
                from experience_media m where m.experience_id = e.id)
  );
end $$;

-- Choices for the editor's select lists (reference data)
create or replace function editor_options(p_locale text default 'en') returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'categories', (select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug,
        'name', (select ct.name from category_translations ct where ct.category_id = c.id
                  order by (ct.locale = p_locale) desc, (ct.locale = 'en') desc limit 1)) order by c.sort) from categories c),
    'policies', (select jsonb_agg(jsonb_build_object('id', p.id, 'code', p.code, 'hours', p.free_cancel_hours) order by p.sort)
                   from cancellation_policies p),
    'zones', (select jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name) order by z.sort) from zones z),
    'pricing', (select jsonb_build_object('operator_share_bps', ps.operator_share_bps, 'rounding_minor', ps.price_rounding_minor) from platform_settings ps limit 1),
    'operators', case when app.is_platform() then (select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name)
                   from organizations o where o.type = 'operator' and o.status <> 'suspended') end)
$$;

-- Create (p.id null, p.operator_id set) or update an experience. Net prices in minor units.
create or replace function save_experience(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_op uuid;
  v_title text := trim(coalesce(p->'translations'->'en'->>'title', ''));
  v_slug text;
  v_loc text; v_tr jsonb; k text; v jsonb; x jsonb; v_extra uuid; v_keep uuid[] := '{}'; z jsonb; v_zones uuid[] := '{}';
  v_sort int := 0;
begin
  if v_id is null then
    v_op := (p->>'operator_id')::uuid;
    if not exists (select 1 from organizations where id = v_op and type = 'operator') then raise exception 'operator_not_found'; end if;
    if not (app.has_role(v_op, array['owner','manager']::member_role[]) or app.is_platform(array['owner','ops','content']::member_role[])) then
      raise exception 'forbidden';
    end if;
  else
    select operator_id into v_op from experiences where id = v_id;
    if not found then raise exception 'experience_not_found'; end if;
    if not app.can_edit_experience(v_id) then raise exception 'forbidden'; end if;
  end if;

  -- validation
  if length(v_title) < 3 then raise exception 'title_required'; end if;
  if coalesce((p->'prices'->'adult'->>'net_minor')::bigint, 0) <= 0 and coalesce((p->'prices'->'private_group'->>'net_minor')::bigint, 0) <= 0 then
    raise exception 'price_required';
  end if;
  if coalesce((p->>'duration_minutes')::int, 60) not between 15 and 2880 then raise exception 'invalid_duration'; end if;
  for k, v in select * from jsonb_each(coalesce(p->'prices', '{}'::jsonb)) loop
    if k not in ('adult', 'child', 'infant', 'private_group') then raise exception 'invalid_price_kind'; end if;
    if coalesce((v->>'net_minor')::bigint, 0) < 0 or coalesce((v->>'net_minor')::bigint, 0) > 10000000 then raise exception 'invalid_price'; end if;
  end loop;

  if v_id is null then
    v_slug := trim(both '-' from regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'));
    if length(v_slug) < 3 then v_slug := 'experience'; end if;
    v_slug := left(v_slug, 60);
    if exists (select 1 from experiences where slug = v_slug) then v_slug := v_slug || '-' || substr(md5(random()::text), 1, 5); end if;
    insert into experiences (operator_id, slug, status, booking_mode, duration_minutes, category_id, cancellation_policy_id,
                             private_available, private_max_group, collection_currency)
    values (v_op, v_slug, 'draft', coalesce(nullif(p->>'booking_mode', ''), 'instant')::booking_mode,
            nullif(p->>'duration_minutes', '')::int, nullif(p->>'category_id', '')::uuid,
            coalesce(nullif(p->>'cancellation_policy_id', '')::uuid, '40000000-0000-0000-0000-000000000001'),
            coalesce((p->>'private_available')::boolean, false), nullif(p->>'private_max_group', '')::int, 'EUR')
    returning id into v_id;
  else
    update experiences set
      booking_mode = coalesce(nullif(p->>'booking_mode', ''), booking_mode::text)::booking_mode,
      duration_minutes = nullif(p->>'duration_minutes', '')::int,
      category_id = nullif(p->>'category_id', '')::uuid,
      cancellation_policy_id = coalesce(nullif(p->>'cancellation_policy_id', '')::uuid, cancellation_policy_id),
      private_available = coalesce((p->>'private_available')::boolean, private_available),
      private_max_group = nullif(p->>'private_max_group', '')::int
    where id = v_id;
  end if;

  -- texts: a locale with an empty title is removed (falls back to English)
  for v_loc, v_tr in select * from jsonb_each(coalesce(p->'translations', '{}'::jsonb)) loop
    if v_loc not in ('en', 'de', 'ru', 'fr', 'ar') then continue; end if;
    if length(trim(coalesce(v_tr->>'title', ''))) = 0 then
      if v_loc <> 'en' then delete from experience_translations where experience_id = v_id and locale = v_loc; end if;
      continue;
    end if;
    insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info)
    values (v_id, v_loc, left(trim(v_tr->>'title'), 120), left(nullif(trim(v_tr->>'summary'), ''), 300), left(nullif(trim(v_tr->>'description'), ''), 5000),
            left(nullif(trim(v_tr->>'itinerary'), ''), 3000), left(nullif(trim(v_tr->>'included'), ''), 2000), left(nullif(trim(v_tr->>'excluded'), ''), 2000),
            left(nullif(trim(v_tr->>'requirements'), ''), 2000), left(nullif(trim(v_tr->>'meeting_info'), ''), 1000))
    on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description,
      itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded,
      requirements = excluded.requirements, meeting_info = excluded.meeting_info, reviewed = false;
  end loop;

  -- prices: listed kinds are upserted; kinds not listed are switched off (existing bookings keep their snapshot)
  update price_categories set active = false where experience_id = v_id
     and kind::text not in (select key from jsonb_each(coalesce(p->'prices', '{}'::jsonb)) where (value->>'net_minor') is not null);
  for k, v in select * from jsonb_each(coalesce(p->'prices', '{}'::jsonb)) loop
    if (v->>'net_minor') is null then continue; end if;
    insert into price_categories (experience_id, kind, net_minor, age_min, age_max, max_group, active)
    values (v_id, k::price_kind, (v->>'net_minor')::bigint, nullif(v->>'age_min', '')::int, nullif(v->>'age_max', '')::int,
            nullif(v->>'max_group', '')::int, true)
    on conflict (experience_id, kind) do update set net_minor = excluded.net_minor, age_min = excluded.age_min,
      age_max = excluded.age_max, max_group = excluded.max_group, active = true;
  end loop;

  -- extras
  for x in select * from jsonb_array_elements(coalesce(p->'extras', '[]'::jsonb)) loop
    if length(trim(coalesce(x->'names'->>'en', ''))) = 0 or coalesce((x->>'net_minor')::bigint, -1) < 0 then continue; end if;
    v_sort := v_sort + 1;
    v_extra := nullif(x->>'id', '')::uuid;
    if v_extra is not null and exists (select 1 from extras where id = v_extra and experience_id = v_id) then
      update extras set net_minor = (x->>'net_minor')::bigint, per = coalesce(nullif(x->>'per', ''), 'person')::charge_per,
                        active = true, sort = v_sort where id = v_extra;
    else
      insert into extras (experience_id, net_minor, per, sort) values (v_id, (x->>'net_minor')::bigint,
        coalesce(nullif(x->>'per', ''), 'person')::charge_per, v_sort) returning id into v_extra;
    end if;
    v_keep := v_keep || v_extra;
    delete from extra_translations where extra_id = v_extra;
    insert into extra_translations (extra_id, locale, name)
    select v_extra, n.key, left(trim(n.value), 80) from jsonb_each_text(x->'names') n
     where n.key in ('en', 'de', 'ru', 'fr', 'ar') and length(trim(n.value)) > 0;
  end loop;
  update extras set active = false where experience_id = v_id and not (id = any (v_keep));

  -- hotel transfer per zone
  for z in select * from jsonb_array_elements(coalesce(p->'transport', '[]'::jsonb)) loop
    if (z->>'net_minor') is null or (z->>'zone_id') is null then continue; end if;
    v_zones := v_zones || (z->>'zone_id')::uuid;
    insert into transport_prices (experience_id, zone_id, net_minor, per, vehicle_capacity)
    values (v_id, (z->>'zone_id')::uuid, (z->>'net_minor')::bigint, coalesce(nullif(z->>'per', ''), 'vehicle')::charge_per,
            case when coalesce(nullif(z->>'per', ''), 'vehicle') = 'vehicle' then coalesce(nullif(z->>'vehicle_capacity', '')::int, 7) end)
    on conflict (experience_id, zone_id) do update set net_minor = excluded.net_minor, per = excluded.per,
      vehicle_capacity = excluded.vehicle_capacity;
  end loop;
  delete from transport_prices where experience_id = v_id and not (zone_id = any (v_zones));

  return v_id;
end $$;

-- Photos and videos: the file is uploaded first (signed upload), then the server records it here
create or replace function add_experience_media(p_experience uuid, p_path text, p_alt text, p_kind text default 'image') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  if p_kind not in ('image', 'video') then raise exception 'invalid_kind'; end if;
  if (select count(*) from experience_media where experience_id = p_experience) >= 12 then raise exception 'too_many_photos'; end if;
  if p_kind = 'video' and (select count(*) from experience_media where experience_id = p_experience and kind = 'video') >= 3 then
    raise exception 'too_many_videos';
  end if;
  if p_path !~ '^(https://|/)' or length(p_path) > 500 then raise exception 'invalid_path'; end if;
  insert into experience_media (experience_id, storage_path, alt, sort, kind)
  values (p_experience, p_path, left(nullif(trim(p_alt), ''), 200),
          coalesce((select max(sort) + 1 from experience_media where experience_id = p_experience), 0), p_kind)
  returning id into v_id;
  return v_id;
end $$;

create or replace function remove_experience_media(p_media uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m experience_media;
begin
  select * into m from experience_media where id = p_media;
  if not found then raise exception 'media_not_found'; end if;
  if not app.can_edit_experience(m.experience_id) then raise exception 'forbidden'; end if;
  delete from experience_media where id = p_media;
  return m.storage_path; -- the server deletes the stored file (the URL says which provider and type)
end $$;

create or replace function move_experience_media(p_media uuid, p_first boolean) returns void
language plpgsql security definer set search_path = public as $$
declare m experience_media;
begin
  select * into m from experience_media where id = p_media;
  if not found then raise exception 'media_not_found'; end if;
  if not app.can_edit_experience(m.experience_id) then raise exception 'forbidden'; end if;
  if p_first then
    update experience_media set sort = sort + 1 where experience_id = m.experience_id;
    update experience_media set sort = 0 where id = p_media;
  end if;
end $$;

-- Public bucket for experience photos (written only by the server)
do $$
begin
  if to_regclass('storage.buckets') is not null then -- absent in the local test database
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('experience-media', 'experience-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Team: owners/managers invite people by email; the invite is accepted on their next sign-in
-- ---------------------------------------------------------------------------
create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role member_role not null,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, email)
);
alter table org_invites enable row level security;
revoke all on org_invites from anon, authenticated;

-- (Invitation emails need a wider message_outbox check: see the next migration, invite_emails.)

create or replace function app.allowed_invite_roles(p_type org_type) returns member_role[]
language sql immutable set search_path = public as $$
  select case p_type
    when 'platform' then array['ops','finance','support','content']::member_role[]
    else array['manager','staff']::member_role[] end
$$;

create or replace function invite_member(p_org uuid, p_email text, p_role member_role) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o organizations; v_email text := lower(trim(p_email)); v_id uuid;
begin
  select * into o from organizations where id = p_org;
  if not found then raise exception 'org_not_found'; end if;
  if not app.has_role(p_org, array['owner','manager']::member_role[]) then raise exception 'forbidden'; end if;
  if not (p_role = any (app.allowed_invite_roles(o.type))) then raise exception 'invalid_role'; end if;
  if p_role = 'manager' and not app.has_role(p_org, array['owner']::member_role[]) then raise exception 'forbidden'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if exists (select 1 from memberships m join auth.users u on u.id = m.user_id where m.org_id = p_org and lower(u.email) = v_email and m.active) then
    raise exception 'already_member';
  end if;
  insert into org_invites (org_id, email, role, invited_by) values (p_org, v_email, p_role, auth.uid())
  on conflict (org_id, email) do update set role = excluded.role, accepted_at = null, created_at = now()
  returning id into v_id;
  begin -- the invitation works without the email; the email is queued once the outbox accepts it
    insert into message_outbox (kind, recipient, dedupe_key, locale, payload)
    values ('team_invite', 'invitee', 'team_invite:' || v_id || ':' || extract(epoch from now())::bigint, 'ar',
            jsonb_build_object('email', v_email, 'org', o.name, 'role', p_role))
    on conflict (dedupe_key) do nothing;
  exception when check_violation then null;
  end;
  return jsonb_build_object('invite_id', v_id, 'email', v_email);
end $$;

create or replace function cancel_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i org_invites;
begin
  select * into i from org_invites where id = p_invite;
  if not found then raise exception 'invite_not_found'; end if;
  if not app.has_role(i.org_id, array['owner','manager']::member_role[]) then raise exception 'forbidden'; end if;
  delete from org_invites where id = p_invite;
end $$;

-- Called on every dashboard visit: turns pending invites for the signed-in email into memberships
create or replace function accept_invites() returns int
language plpgsql security definer set search_path = public as $$
declare v_email text; n int;
begin
  if auth.uid() is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  insert into memberships (org_id, user_id, role)
  select i.org_id, auth.uid(), i.role from org_invites i where i.email = v_email and i.accepted_at is null
  on conflict (org_id, user_id) do update set role = excluded.role, active = true;
  get diagnostics n = row_count;
  update org_invites set accepted_at = now() where email = v_email and accepted_at is null;
  return n;
end $$;

create or replace function org_team(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_org, array['owner','manager']::member_role[]) or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'role', m.role,
                  'active', m.active, 'since', m.created_at, 'me', m.user_id = auth.uid()) order by m.created_at), '[]'::jsonb)
                  from memberships m join auth.users u on u.id = m.user_id where m.org_id = p_org),
    'invites', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role, 'created_at', i.created_at)
                  order by i.created_at desc), '[]'::jsonb)
                  from org_invites i where i.org_id = p_org and i.accepted_at is null),
    'roles', to_jsonb(app.allowed_invite_roles((select type from organizations where id = p_org))));
end $$;

create or replace function set_member_active(p_org uuid, p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_role member_role;
begin
  select role into v_role from memberships where org_id = p_org and user_id = p_user;
  if not found then raise exception 'member_not_found'; end if;
  if p_user = auth.uid() then raise exception 'cannot_change_self'; end if;
  if v_role = 'owner' then raise exception 'cannot_change_owner'; end if;
  if not (app.has_role(p_org, array['owner']::member_role[])
          or (app.has_role(p_org, array['manager']::member_role[]) and v_role = 'staff')) then
    raise exception 'forbidden';
  end if;
  update memberships set active = p_active where org_id = p_org and user_id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- Operator money page (owner / manager; staff never see money)
-- ---------------------------------------------------------------------------
create or replace function operator_finance(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s platform_settings := app.settings(); v_month date := date_trunc('month', now() at time zone s.business_timezone)::date;
begin
  if not (app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform(array['owner','finance']::member_role[])) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'month', v_month,
    'this_month', (select coalesce(jsonb_object_agg(currency, x), '{}'::jsonb) from (
        select currency, jsonb_build_object('trips', count(*), 'guests', sum(seats), 'collected', sum(paid_minor),
               'kept', sum(operator_net_minor), 'to_wenro', sum(paid_minor - operator_net_minor)) x
          from bookings where operator_id = p_operator and execution_status = 'executed'
           and (executed_at at time zone s.business_timezone)::date >= v_month group by currency) t),
    'unsettled', (select coalesce(jsonb_object_agg(currency, x), '{}'::jsonb) from (
        select currency, jsonb_build_object('trips', count(*), 'to_wenro', sum(paid_minor - operator_net_minor)) x
          from bookings where operator_id = p_operator and execution_status = 'executed' and settled_statement_id is null
         group by currency) t),
    'upcoming', (select jsonb_build_object('bookings', count(*), 'guests', coalesce(sum(seats), 0))
          from bookings where operator_id = p_operator and status = 'confirmed' and execution_status = 'scheduled' and starts_at > now()),
    'statements', (select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'currency', st.currency,
          'period_start', st.period_start, 'period_end', st.period_end, 'bookings_count', st.bookings_count,
          'collected_minor', st.collected_minor, 'due_minor', st.due_minor, 'status', st.status, 'received_at', st.received_at)
          order by st.period_start desc, st.created_at desc), '[]'::jsonb)
          from operator_statements st where st.operator_id = p_operator),
    'recent', (select coalesce(jsonb_agg(r order by r->>'executed_at' desc), '[]'::jsonb) from (
        select jsonb_build_object('ref', b.ref, 'executed_at', b.executed_at, 'seats', b.seats, 'currency', b.currency,
               'collected', b.paid_minor, 'kept', b.operator_net_minor, 'to_wenro', b.paid_minor - b.operator_net_minor,
               'settled', b.settled_statement_id is not null,
               'title', (select t.title from experience_translations t where t.experience_id = b.experience_id order by (t.locale = 'en') desc limit 1)) r
          from bookings b where b.operator_id = p_operator and b.execution_status = 'executed'
         order by b.executed_at desc limit 30) q)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Coupons (discounts come out of WENRO's share; capped by platform settings)
-- ---------------------------------------------------------------------------
create or replace function admin_coupons() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return jsonb_build_object('max_bps', (app.settings()).max_discount_bps,
    'coupons', (select coalesce(jsonb_agg(to_jsonb(c) order by c.active desc, c.code), '[]'::jsonb) from coupons c));
end $$;

create or replace function save_coupon(p_code text, p_percent_bps int, p_valid_to date, p_max_uses int, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(p_code));
begin
  if not app.is_platform(array['owner','finance','ops']::member_role[]) then raise exception 'forbidden'; end if;
  if v_code !~ '^[A-Z0-9]{3,20}$' then raise exception 'invalid_code'; end if;
  if p_percent_bps is null or p_percent_bps <= 0 or p_percent_bps > (app.settings()).max_discount_bps then raise exception 'discount_too_big'; end if;
  if p_max_uses is not null and p_max_uses < 1 then raise exception 'invalid_max_uses'; end if;
  insert into coupons (code, percent_bps, valid_to, max_uses, active)
  values (v_code, p_percent_bps, case when p_valid_to is null then null else ((p_valid_to + 1)::timestamp at time zone 'Africa/Cairo') end,
          p_max_uses, coalesce(p_active, true))
  on conflict (code) do update set percent_bps = excluded.percent_bps, valid_to = excluded.valid_to,
    max_uses = excluded.max_uses, active = excluded.active;
  return jsonb_build_object('code', v_code);
end $$;

-- ---------------------------------------------------------------------------
-- Support: WENRO cancels a booking for a guest (phone / WhatsApp request). The guest is emailed.
-- ---------------------------------------------------------------------------
create or replace function admin_cancel_booking(p_booking uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if not app.is_platform(array['owner','ops','support']::member_role[]) then raise exception 'forbidden'; end if;
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status not in ('confirmed', 'pending_request') or b.execution_status <> 'scheduled' then raise exception 'booking_not_cancellable'; end if;
  perform app.release_booking(b, 'cancelled', 'support');
  return jsonb_build_object('ref', b.ref, 'status', 'cancelled');
end $$;

-- ---------------------------------------------------------------------------
-- Demo access: the WENRO owner joins every [DEMO] organization to see all five dashboards.
-- Disappears with the demo data (memberships are deleted with the organizations).
-- ---------------------------------------------------------------------------
create or replace function demo_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner']::member_role[]) then return jsonb_build_object('available', false); end if;
  return jsonb_build_object(
    'available', exists (select 1 from organizations where name like '[DEMO]%'),
    'joined', not exists (select 1 from organizations o where o.name like '[DEMO]%'
                and not exists (select 1 from memberships m where m.org_id = o.id and m.user_id = auth.uid())));
end $$;

create or replace function demo_join_all() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not app.is_platform(array['owner']::member_role[]) then raise exception 'forbidden'; end if;
  insert into memberships (org_id, user_id, role)
  select o.id, auth.uid(), case when o.type = 'agency' then 'manager' else 'owner' end::member_role
    from organizations o where o.name like '[DEMO]%' and o.type <> 'platform'
  on conflict (org_id, user_id) do update set active = true;
  get diagnostics n = row_count;
  return n;
end $$;

-- Operators read the reference lists through editor_options(); nothing else is exposed.
revoke execute on function experience_editor(uuid), editor_options(text), save_experience(jsonb),
  add_experience_media(uuid, text, text, text), remove_experience_media(uuid), move_experience_media(uuid, boolean),
  app.allowed_invite_roles(org_type), invite_member(uuid, text, member_role), cancel_invite(uuid), accept_invites(),
  org_team(uuid), set_member_active(uuid, uuid, boolean), operator_finance(uuid), admin_coupons(),
  save_coupon(text, int, date, int, boolean), admin_cancel_booking(uuid), demo_status(), demo_join_all()
  from public, anon;
grant execute on function experience_editor(uuid), editor_options(text), save_experience(jsonb),
  add_experience_media(uuid, text, text, text), remove_experience_media(uuid), move_experience_media(uuid, boolean),
  invite_member(uuid, text, member_role), cancel_invite(uuid), accept_invites(),
  org_team(uuid), set_member_active(uuid, uuid, boolean), operator_finance(uuid), admin_coupons(),
  save_coupon(text, int, date, int, boolean), admin_cancel_booking(uuid), demo_status(), demo_join_all()
  to authenticated, service_role;
grant execute on function app.allowed_invite_roles(org_type) to authenticated, service_role;

-- Home page cards now carry the cover photo and booking mode
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
    'from_minor', (select min(pp.price_minor) from public_prices(e.id) pp where pp.kind = 'adult'))
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

-- Experience page: media now says whether each item is a photo or a video
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
