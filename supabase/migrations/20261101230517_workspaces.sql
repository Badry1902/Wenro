-- Workspaces: everything the signed-in dashboards call. Each function checks the caller's
-- membership and role itself, so the web app cannot widen access by mistake.

-- ---------------------------------------------------------------------------
-- Who am I, where can I work
-- ---------------------------------------------------------------------------
create or replace function my_workspaces() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('org_id', o.id, 'type', o.type, 'name', o.name,
           'status', o.status, 'role', m.role) order by (o.type = 'platform') desc, o.name), '[]'::jsonb)
    from memberships m join organizations o on o.id = m.org_id
   where m.user_id = auth.uid() and m.active
$$;

-- First run only: the first signed-in user may claim ownership of the WENRO platform account.
create or replace function claim_platform_owner() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from memberships where org_id = app.platform_org() and role = 'owner' and active) then
    raise exception 'already_claimed';
  end if;
  insert into memberships (org_id, user_id, role) values (app.platform_org(), auth.uid(), 'owner');
  return jsonb_build_object('org_id', app.platform_org(), 'role', 'owner');
end $$;

create or replace function platform_has_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where org_id = app.platform_org() and role = 'owner' and active)
$$;

-- A signed-in person applies as an operator, marketer or agency. Starts as "pending".
create or replace function apply_organization(p_type org_type, p_name text, p_phone text, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_type not in ('operator', 'marketer', 'agency') then raise exception 'invalid_type'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(app.digits(p_phone)) < 8 then raise exception 'details_required'; end if;
  insert into organizations (type, status, name) values (p_type, 'pending', trim(p_name)) returning id into v_org;
  insert into org_private_details (org_id, contact_phone, contact_email) values (v_org, trim(p_phone), lower(trim(p_email)));
  insert into memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  if p_type in ('marketer', 'agency') then
    loop
      v_code := upper(substr(regexp_replace(trim(p_name), '[^A-Za-z]', '', 'g'), 1, 6)) ||
                lpad((floor(random() * 1000))::int::text, 3, '0');
      if length(v_code) < 4 then v_code := 'WR' || v_code; end if;
      exit when not exists (select 1 from partner_codes where code = v_code);
    end loop;
    insert into partner_codes (org_id, code) values (v_org, v_code);
  end if;
  return jsonb_build_object('org_id', v_org, 'status', 'pending');
end $$;

-- ---------------------------------------------------------------------------
-- Operator workspace
-- ---------------------------------------------------------------------------
create or replace function operator_experiences(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'slug', e.slug, 'status', e.status,
            'booking_mode', e.booking_mode,
            'title', (select t.title from experience_translations t where t.experience_id = e.id
                       order by (t.locale = 'en') desc limit 1)) order by e.created_at), '[]'::jsonb)
            from experiences e where e.operator_id = p_operator);
end $$;

create or replace function operator_slots(p_operator uuid, p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'experience_id', s.experience_id,
            'title', (select t.title from experience_translations t where t.experience_id = s.experience_id
                       order by (t.locale = 'en') desc limit 1),
            'starts_at', s.starts_at, 'capacity', s.capacity, 'booked', s.booked, 'status', s.status,
            'cancel_reason', s.cancel_reason) order by s.starts_at), '[]'::jsonb)
            from slots s join experiences e on e.id = s.experience_id
           where e.operator_id = p_operator and s.starts_at >= p_from and s.starts_at < p_to);
end $$;

-- Recurring departures: every chosen weekday (1 = Monday … 7 = Sunday) × time, in Hurghada time.
create or replace function create_slots(p_experience uuid, p_from date, p_to date, p_weekdays int[],
                                        p_times time[], p_capacity int) returns int
language plpgsql security definer set search_path = public as $$
declare n int; s platform_settings := app.settings();
begin
  if not app.can_edit_experience(p_experience) then raise exception 'forbidden'; end if;
  if p_capacity < 1 or p_capacity > 500 then raise exception 'invalid_capacity'; end if;
  if p_to < p_from or p_to > p_from + 366 then raise exception 'invalid_range'; end if;
  insert into slots (experience_id, starts_at, capacity)
  select p_experience, (d::date + tm) at time zone s.business_timezone, p_capacity
    from generate_series(p_from, p_to, interval '1 day') d, unnest(p_times) tm
   where extract(isodow from d)::int = any (p_weekdays)
     and (d::date + tm) at time zone s.business_timezone > now()
  on conflict (experience_id, starts_at) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function set_slot(p_slot uuid, p_capacity int, p_open boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sl slots;
begin
  select * into sl from slots where id = p_slot for update;
  if not found then raise exception 'slot_not_found'; end if;
  if not app.can_edit_experience(sl.experience_id) then raise exception 'forbidden'; end if;
  if sl.status = 'cancelled' then raise exception 'slot_cancelled'; end if;
  if p_capacity < sl.booked then raise exception 'capacity_below_booked'; end if;
  update slots set capacity = p_capacity, status = case when p_open then 'open'::slot_status else 'closed'::slot_status end
   where id = p_slot;
  return jsonb_build_object('id', p_slot, 'capacity', p_capacity, 'open', p_open);
end $$;

-- Check in from the run sheet (same rules as scanning the QR code)
create or replace function check_in_booking(p_booking uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_qr text;
begin
  select qr_token into v_qr from bookings where id = p_booking;
  if v_qr is null then raise exception 'booking_not_found'; end if;
  return check_in(v_qr);
end $$;

-- ---------------------------------------------------------------------------
-- Platform (admin) workspace
-- ---------------------------------------------------------------------------
create or replace function admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s platform_settings := app.settings(); tomorrow date := (now() at time zone s.business_timezone)::date + 1;
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'pending_orgs', (select count(*) from organizations where status = 'pending'),
    'experiences_in_review', (select count(*) from experiences where status = 'in_review'),
    'pending_requests', (select count(*) from bookings where status = 'pending_request'),
    'tomorrow_bookings', (select count(*) from bookings where status = 'confirmed'
                            and (starts_at at time zone s.business_timezone)::date = tomorrow),
    'tomorrow_unconfirmed', (select count(*) from bookings where status = 'confirmed' and reconfirm_status = 'sent'
                            and (starts_at at time zone s.business_timezone)::date = tomorrow),
    'open_statements', (select count(*) from operator_statements where status = 'open'),
    'open_statements_due', (select coalesce(jsonb_object_agg(currency, due), '{}'::jsonb) from (
                              select currency, sum(due_minor) due from operator_statements where status = 'open' group by currency) x),
    'unsettled_executed', (select count(*) from bookings where execution_status = 'executed' and settled_statement_id is null),
    'pending_payouts', (select count(*) from partner_payouts where status = 'pending'),
    'payable_commissions', (select coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) from (
                              select currency, sum(amount_minor) amt from commissions where status = 'payable' and payout_id is null group by currency) x)
  );
end $$;

create or replace function admin_bookings(p_from timestamptz, p_to timestamptz, p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'ref', b.ref, 'starts_at', b.starts_at, 'status', b.status, 'execution_status', b.execution_status,
      'reconfirm_status', b.reconfirm_status, 'source', b.source, 'partner', p.name, 'operator', o.name,
      'title', (select t.title from experience_translations t where t.experience_id = b.experience_id order by (t.locale = 'en') desc limit 1),
      'customer', c.full_name, 'phone', c.phone, 'email', c.email, 'seats', b.seats,
      'currency', b.currency, 'paid_minor', b.paid_minor, 'operator_net_minor', b.operator_net_minor,
      'partner_commission_minor', b.partner_commission_minor, 'platform_share_minor', b.platform_share_minor,
      'created_at', b.created_at) order by b.starts_at), '[]'::jsonb)
    from bookings b join booking_contacts c on c.booking_id = b.id
    join organizations o on o.id = b.operator_id left join organizations p on p.id = b.partner_org_id
   where b.starts_at >= p_from and b.starts_at < p_to and (p_status is null or b.status::text = p_status));
end $$;

create or replace function admin_organizations() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'type', o.type, 'name', o.name, 'status', o.status,
      'phone', d.contact_phone, 'email', d.contact_email, 'instapay', d.instapay_handle, 'created_at', o.created_at,
      'codes', (select jsonb_agg(pc.code) from partner_codes pc where pc.org_id = o.id))
      order by (o.status = 'pending') desc, o.created_at desc), '[]'::jsonb)
    from organizations o left join org_private_details d on d.org_id = o.id where o.type <> 'platform');
end $$;

create or replace function set_org_status(p_org uuid, p_status org_status) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops']::member_role[]) then raise exception 'forbidden'; end if;
  update organizations set status = p_status where id = p_org and type <> 'platform';
  if not found then raise exception 'org_not_found'; end if;
  return jsonb_build_object('id', p_org, 'status', p_status);
end $$;

create or replace function admin_experiences() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'slug', e.slug, 'status', e.status,
      'operator', o.name, 'operator_status', o.status, 'booking_mode', e.booking_mode,
      'title', (select t.title from experience_translations t where t.experience_id = e.id order by (t.locale = 'en') desc limit 1),
      'locales', (select jsonb_agg(t.locale order by t.locale) from experience_translations t where t.experience_id = e.id),
      'upcoming_slots', (select count(*) from slots s where s.experience_id = e.id and s.status = 'open' and s.starts_at > now()))
      order by (e.status = 'in_review') desc, e.updated_at desc), '[]'::jsonb)
    from experiences e join organizations o on o.id = e.operator_id);
end $$;

-- Operators send for review (draft → in_review); the platform publishes, unpublishes or archives.
create or replace function set_experience_status(p_experience uuid, p_status experience_status) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e experiences;
begin
  select * into e from experiences where id = p_experience for update;
  if not found then raise exception 'experience_not_found'; end if;
  if app.is_platform(array['owner','ops','content']::member_role[]) then
    null;
  elsif app.has_role(e.operator_id, array['owner','manager']::member_role[])
        and ((e.status = 'draft' and p_status = 'in_review') or (e.status = 'in_review' and p_status = 'draft')) then
    null;
  else
    raise exception 'forbidden';
  end if;
  update experiences set status = p_status where id = p_experience;
  return jsonb_build_object('id', p_experience, 'status', p_status);
end $$;

create or replace function finance_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'statements', (select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'operator', o.name, 'currency', st.currency,
        'period_start', st.period_start, 'period_end', st.period_end, 'bookings_count', st.bookings_count,
        'collected_minor', st.collected_minor, 'due_minor', st.due_minor, 'status', st.status, 'received_at', st.received_at)
        order by (st.status = 'open') desc, st.period_start desc), '[]'::jsonb)
        from operator_statements st join organizations o on o.id = st.operator_id),
    'payouts', (select coalesce(jsonb_agg(jsonb_build_object('id', po.id, 'partner', o.name, 'partner_type', o.type,
        'instapay', d.instapay_handle, 'currency', po.currency, 'period_month', po.period_month,
        'amount_minor', po.amount_minor, 'status', po.status, 'reference', po.reference, 'paid_at', po.paid_at)
        order by (po.status = 'pending') desc, po.period_month desc), '[]'::jsonb)
        from partner_payouts po join organizations o on o.id = po.partner_org_id
        left join org_private_details d on d.org_id = o.id),
    'unsettled', (select coalesce(jsonb_agg(jsonb_build_object('operator', o.name, 'currency', x.currency,
        'count', x.cnt, 'due_minor', x.due)), '[]'::jsonb)
        from (select operator_id, currency, count(*) cnt, sum(paid_minor - operator_net_minor) due from bookings
               where execution_status = 'executed' and settled_statement_id is null group by operator_id, currency) x
        join organizations o on o.id = x.operator_id)
  );
end $$;

-- ---------------------------------------------------------------------------
-- Partner workspace (marketers and agencies): no customer personal data for marketers
-- ---------------------------------------------------------------------------
create or replace function partner_summary(p_partner uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o organizations;
begin
  select * into o from organizations where id = p_partner and type in ('marketer', 'agency');
  if not found or not (app.has_role(p_partner) or app.is_platform()) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'org', jsonb_build_object('id', o.id, 'type', o.type, 'name', o.name, 'status', o.status,
             'instapay', (select d.instapay_handle from org_private_details d where d.org_id = o.id)),
    'codes', (select coalesce(jsonb_agg(jsonb_build_object('code', pc.code, 'active', pc.active,
                'clicks', (select count(*) from attribution_clicks ac where ac.partner_code_id = pc.id))), '[]'::jsonb)
                from partner_codes pc where pc.org_id = o.id),
    'totals', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
                 select cm.currency || ':' || cm.status::text k, sum(cm.amount_minor) v
                   from commissions cm where cm.partner_org_id = o.id group by cm.currency, cm.status) x),
    'payouts', (select coalesce(jsonb_agg(jsonb_build_object('period_month', po.period_month, 'currency', po.currency,
                  'amount_minor', po.amount_minor, 'status', po.status, 'paid_at', po.paid_at) order by po.period_month desc), '[]'::jsonb)
                  from partner_payouts po where po.partner_org_id = o.id)
  );
end $$;

-- Partner sets where monthly commissions are sent (owner/manager only)
create or replace function set_payout_handle(p_org uuid, p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(p_handle), '');
begin
  if not exists (select 1 from organizations where id = p_org and type in ('marketer', 'agency'))
     or not app.has_role(p_org, array['owner','manager']::member_role[]) then
    raise exception 'forbidden';
  end if;
  if v is not null and length(v) > 80 then raise exception 'invalid_handle'; end if;
  insert into org_private_details (org_id, instapay_handle) values (p_org, v)
  on conflict (org_id) do update set instapay_handle = excluded.instapay_handle;
  return jsonb_build_object('org_id', p_org, 'instapay', v);
end $$;

-- Count a referral click (no personal data stored)
create or replace function record_click(p_code text, p_experience uuid default null) returns void
language sql security definer set search_path = public as $$
  insert into attribution_clicks (partner_code_id, experience_id)
  select pc.id, p_experience from partner_codes pc where pc.code = upper(p_code) and pc.active
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function my_workspaces(), claim_platform_owner(), platform_has_owner(),
  apply_organization(org_type, text, text, text), operator_experiences(uuid),
  operator_slots(uuid, timestamptz, timestamptz), create_slots(uuid, date, date, int[], time[], int),
  set_slot(uuid, int, boolean), check_in_booking(uuid), admin_overview(),
  admin_bookings(timestamptz, timestamptz, text), admin_organizations(), set_org_status(uuid, org_status),
  admin_experiences(), set_experience_status(uuid, experience_status), finance_overview(),
  partner_summary(uuid), set_payout_handle(uuid, text), record_click(text, uuid) from public, anon;
grant execute on function my_workspaces(), claim_platform_owner(), platform_has_owner(),
  apply_organization(org_type, text, text, text), operator_experiences(uuid),
  operator_slots(uuid, timestamptz, timestamptz), create_slots(uuid, date, date, int[], time[], int),
  set_slot(uuid, int, boolean), check_in_booking(uuid), admin_overview(),
  admin_bookings(timestamptz, timestamptz, text), admin_organizations(), set_org_status(uuid, org_status),
  admin_experiences(), set_experience_status(uuid, experience_status), finance_overview(),
  partner_summary(uuid), set_payout_handle(uuid, text) to authenticated, service_role;
revoke execute on function record_click(text, uuid) from authenticated;
grant execute on function record_click(text, uuid) to service_role;
