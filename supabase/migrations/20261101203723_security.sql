-- WENRO access control. Permissions are enforced in the database, not only in the UI.
-- Rule of thumb:
--   * Public (anon) reads only published content and derived display prices — never net prices.
--   * Operators/agencies/marketers see only their own organization's rows.
--   * Bookings, customer contacts and money are read through functions that apply
--     extra rules (phone reveal 24h before the trip, staff cannot see prices,
--     marketers never see personal data).
--   * Writes to bookings and money happen only inside security-definer functions.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
-- True for the server's service-role key, and for direct database jobs (pg_cron, migrations)
-- that carry no API JWT at all. False for every anon/authenticated API caller.
-- (current_user cannot be used: inside SECURITY DEFINER functions it is always the owner.)
create or replace function app.is_service() returns boolean
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    nullif(current_setting('request.jwt.claim.role', true), ''),
    'no_jwt') in ('service_role', 'no_jwt')
$$;

create or replace function app.platform_org() returns uuid
language sql stable security definer set search_path = public as $$
  select id from organizations where type = 'platform' limit 1
$$;

create or replace function app.has_role(p_org uuid, p_roles member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m join organizations o on o.id = m.org_id
    where m.org_id = p_org and m.user_id = auth.uid() and m.active
      and o.status <> 'suspended'
      and (p_roles is null or m.role = any (p_roles)))
$$;

create or replace function app.is_platform(p_roles member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select app.has_role(app.platform_org(), p_roles)
$$;

create or replace function app.settings() returns platform_settings
language sql stable security definer set search_path = public as $$
  select * from platform_settings limit 1
$$;

-- Display price derived from the operator's net price:
-- net / operator share, rounded UP to the rounding step, so the operator always gets
-- at least their net and the rounding difference goes to WENRO.
create or replace function app.display_price(p_net bigint) returns bigint
language sql stable security definer set search_path = public as $$
  select case when p_net = 0 then 0 else
    (ceil((p_net::numeric * 10000 / s.operator_share_bps) / s.price_rounding_minor)
     * s.price_rounding_minor)::bigint end
  from platform_settings s
$$;

-- Operators may not publish; only platform content/ops/owner can.
create or replace function app.guard_experience_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not app.is_platform(array['owner','ops','content']::member_role[])
     and not app.is_service() then
    raise exception 'only the platform team can publish an experience';
  end if;
  if tg_op = 'UPDATE' and new.operator_id <> old.operator_id
     and not app.is_platform(array['owner','ops']::member_role[])
     and not app.is_service() then
    raise exception 'operator_id cannot be changed';
  end if;
  return new;
end $$;
create trigger experiences_status_guard before insert or update on experiences
  for each row execute function app.guard_experience_status();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Platform staff with full read access to everything
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format($f$create policy platform_read on %I for select to authenticated
                     using (app.is_platform())$f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Settings & reference data: public read, platform write
-- ---------------------------------------------------------------------------
create policy public_read on platform_settings for select to anon, authenticated using (true);
create policy owner_write on platform_settings for update to authenticated
  using (app.is_platform(array['owner']::member_role[]));

do $$
declare t text;
begin
  foreach t in array array['categories','category_translations','zones','hotels',
    'cancellation_policies','cancellation_policy_translations','fx_rates'] loop
    execute format($f$create policy public_read on %I for select to anon, authenticated using (true)$f$, t);
    execute format($f$create policy platform_write on %I for all to authenticated
                     using (app.is_platform(array['owner','ops','content','finance']::member_role[]))
                     with check (app.is_platform(array['owner','ops','content','finance']::member_role[]))$f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create policy public_operators on organizations for select to anon, authenticated
  using (type = 'operator' and status = 'active');
create policy own_org on organizations for select to authenticated using (app.has_role(id));
create policy platform_manage on organizations for all to authenticated
  using (app.is_platform(array['owner','ops']::member_role[]))
  with check (app.is_platform(array['owner','ops']::member_role[]));

create policy own_private on org_private_details for select to authenticated
  using (app.has_role(org_id, array['owner','manager']::member_role[]));
create policy own_private_update on org_private_details for update to authenticated
  using (app.has_role(org_id, array['owner']::member_role[]))
  with check (app.has_role(org_id, array['owner']::member_role[]));
create policy platform_manage on org_private_details for all to authenticated
  using (app.is_platform(array['owner','ops','finance']::member_role[]))
  with check (app.is_platform(array['owner','ops','finance']::member_role[]));

create policy own_profile on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy own_memberships on memberships for select to authenticated
  using (user_id = auth.uid() or app.has_role(org_id, array['owner','manager']::member_role[]));
create policy platform_manage on memberships for all to authenticated
  using (app.is_platform(array['owner']::member_role[]))
  with check (app.is_platform(array['owner']::member_role[]));

create policy own_codes on partner_codes for select to authenticated using (app.has_role(org_id));
create policy platform_manage on partner_codes for all to authenticated
  using (app.is_platform(array['owner','ops']::member_role[]))
  with check (app.is_platform(array['owner','ops']::member_role[]));

-- ---------------------------------------------------------------------------
-- Experiences and their children
-- ---------------------------------------------------------------------------
create or replace function app.can_read_experience(p_exp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from experiences e where e.id = p_exp
    and (e.status = 'published' or app.has_role(e.operator_id) or app.is_platform()))
$$;
create or replace function app.can_edit_experience(p_exp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from experiences e where e.id = p_exp
    and (app.has_role(e.operator_id, array['owner','manager']::member_role[])
         or app.is_platform(array['owner','ops','content']::member_role[])))
$$;

create policy read_visible on experiences for select to anon, authenticated
  using (status = 'published' or app.has_role(operator_id));
create policy operator_insert on experiences for insert to authenticated
  with check (app.has_role(operator_id, array['owner','manager']::member_role[])
              or app.is_platform(array['owner','ops','content']::member_role[]));
create policy operator_update on experiences for update to authenticated
  using (app.can_edit_experience(id)) with check (app.can_edit_experience(id));

do $$
declare t text;
begin
  -- Public-safe children (no net prices inside)
  foreach t in array array['experience_translations','experience_media','extra_translations'] loop
    if t = 'extra_translations' then
      execute format($f$create policy read_visible on %I for select to anon, authenticated
        using (app.can_read_experience((select x.experience_id from extras x where x.id = extra_id)))$f$, t);
      execute format($f$create policy edit_own on %I for all to authenticated
        using (app.can_edit_experience((select x.experience_id from extras x where x.id = extra_id)))
        with check (app.can_edit_experience((select x.experience_id from extras x where x.id = extra_id)))$f$, t);
    else
      execute format($f$create policy read_visible on %I for select to anon, authenticated
        using (app.can_read_experience(experience_id))$f$, t);
      execute format($f$create policy edit_own on %I for all to authenticated
        using (app.can_edit_experience(experience_id)) with check (app.can_edit_experience(experience_id))$f$, t);
    end if;
  end loop;

  -- Net-price tables: only operator owner/manager and platform. Public reads display
  -- prices through public_prices() below. Operator staff never see prices.
  foreach t in array array['price_categories','extras','transport_prices'] loop
    execute format($f$create policy edit_own on %I for all to authenticated
      using (app.can_edit_experience(experience_id)) with check (app.can_edit_experience(experience_id))$f$, t);
  end loop;
end $$;

-- Slots: public sees open slots of published experiences; operators manage their own
create policy read_visible on slots for select to anon, authenticated
  using (app.can_read_experience(experience_id));
create policy edit_own on slots for insert to authenticated
  with check (app.can_edit_experience(experience_id) and booked = 0);
create policy update_own on slots for update to authenticated
  using (app.can_edit_experience(experience_id)) with check (app.can_edit_experience(experience_id));

-- Slot changes by operators may not touch the booked counter or drop capacity below it.
create or replace function app.guard_slot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_service() and current_setting('app.internal', true) is distinct from 'on' then
    if new.booked <> old.booked then
      raise exception 'booked seats are managed by the booking engine';
    end if;
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      raise exception 'use cancel_slot() to cancel a departure';
    end if;
  end if;
  if new.capacity < new.booked then
    raise exception 'capacity cannot be lower than seats already booked (%)', new.booked;
  end if;
  return new;
end $$;
create trigger slots_guard before update on slots for each row execute function app.guard_slot();

-- Public, display-price view of an experience's prices (net prices stay hidden)
create or replace function public_prices(p_experience uuid)
returns table (kind text, ref_id uuid, per text, currency text, price_minor bigint,
               vehicle_capacity int, zone_id uuid, age_min int, age_max int, max_group int)
language sql stable security definer set search_path = public as $$
  select pc.kind::text, pc.id, 'person', e.collection_currency, app.display_price(pc.net_minor),
         null::int, null::uuid, pc.age_min, pc.age_max, pc.max_group
    from price_categories pc join experiences e on e.id = pc.experience_id
   where pc.experience_id = p_experience and pc.active and app.can_read_experience(p_experience)
  union all
  select 'extra', x.id, x.per::text, e.collection_currency, app.display_price(x.net_minor),
         null, null, null, null, null
    from extras x join experiences e on e.id = x.experience_id
   where x.experience_id = p_experience and x.active and app.can_read_experience(p_experience)
  union all
  select 'transport', null, t.per::text, e.collection_currency, app.display_price(t.net_minor),
         t.vehicle_capacity, t.zone_id, null, null, null
    from transport_prices t join experiences e on e.id = t.experience_id
   where t.experience_id = p_experience and app.can_read_experience(p_experience)
$$;

-- ---------------------------------------------------------------------------
-- Money and bookings: no direct access except platform read (policy above).
-- Partners can read their own commissions/payouts; operators their statements.
-- ---------------------------------------------------------------------------
create policy own_commissions on commissions for select to authenticated
  using (app.has_role(partner_org_id, array['owner','manager']::member_role[]));
create policy own_payouts on partner_payouts for select to authenticated
  using (app.has_role(partner_org_id, array['owner','manager']::member_role[]));
create policy own_statements on operator_statements for select to authenticated
  using (app.has_role(operator_id, array['owner','manager']::member_role[]));

create policy platform_coupons on coupons for all to authenticated
  using (app.is_platform(array['owner','ops']::member_role[]))
  with check (app.is_platform(array['owner','ops']::member_role[]));

create policy public_reviews on reviews for select to anon, authenticated using (approved);
create policy platform_reviews on reviews for update to authenticated
  using (app.is_platform(array['owner','ops','support','content']::member_role[]));

create policy own_favorites on favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log & ledger_entries & bookings & booking_contacts & booking_lines &
-- attribution_clicks: only the platform_read policy applies; no write policies.

-- ---------------------------------------------------------------------------
-- Function privileges: internal helpers are not callable through the API
-- ---------------------------------------------------------------------------
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.has_role(uuid, member_role[]), app.is_platform(member_role[]),
  app.platform_org(), app.can_read_experience(uuid), app.can_edit_experience(uuid),
  app.display_price(bigint), app.settings(), app.is_service() to anon, authenticated, service_role;
