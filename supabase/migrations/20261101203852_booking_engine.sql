-- WENRO booking engine. All prices, commissions and seat counts are computed here,
-- inside one transaction per action, never trusted from the browser.

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create or replace function app.digits(p text) returns text
language sql immutable as $$ select regexp_replace(coalesce(p, ''), '\D', '', 'g') $$;

create or replace function app.token_hash(p text) returns bytea
language sql immutable as $$ select sha256(convert_to(p, 'UTF8')) $$;



create or replace function app.ledger(p_type text, p_booking uuid, p_org uuid, p_cur text, p_amount bigint, p_memo text)
returns void language sql security definer set search_path = public as $$
  insert into ledger_entries(entry_type, booking_id, org_id, currency, amount_minor, memo, actor)
  values (p_type, p_booking, p_org, p_cur, p_amount, p_memo, auth.uid())
$$;

-- Release held seats and void a pending commission. Caller must hold the booking row lock.
create or replace function app.release_booking(p_booking bookings, p_status booking_status, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.internal', 'on', true);
  if p_booking.slot_id is not null and p_booking.seats > 0 then
    update slots set booked = booked - p_booking.seats where id = p_booking.slot_id;
  end if;
  perform set_config('app.internal', 'off', true);
  update bookings set status = p_status, cancelled_at = now(), cancel_reason = p_reason
   where id = p_booking.id;
  update commissions set status = 'void', updated_at = now()
   where booking_id = p_booking.id and status in ('pending', 'eligible');
end $$;

-- ---------------------------------------------------------------------------
-- create_booking: the single entry point for new bookings (site, agency portal)
-- ---------------------------------------------------------------------------
create or replace function create_booking(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s platform_settings := app.settings();
  e experiences;
  sl slots;
  v_private boolean := coalesce((p->>'is_private')::boolean, false);
  v_adult int := coalesce((p->'quantities'->>'adult')::int, 0);
  v_child int := coalesce((p->'quantities'->>'child')::int, 0);
  v_infant int := coalesce((p->'quantities'->>'infant')::int, 0);
  v_group int := coalesce((p->>'private_group_size')::int, 0);
  v_seats int := 0;
  v_persons int;
  v_starts timestamptz;
  v_status booking_status;
  v_source booking_source := 'direct';
  v_partner uuid;
  v_code_id uuid;
  v_created_by uuid;
  v_self_referral boolean := false;
  v_lines jsonb := '[]'::jsonb;
  v_gross bigint := 0;
  v_net bigint := 0;
  v_discount bigint := 0;
  v_paid bigint;
  v_partner_amt bigint := 0;
  v_platform bigint;
  v_coupon coupons;
  v_hotel hotels;
  v_tp transport_prices;
  v_pc price_categories;
  v_x extras;
  v_qty int;
  v_rate numeric;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_booking bookings;
  v_policy cancellation_policies;
  k text;
  item jsonb;
begin
  -- 1. Experience must be bookable
  select * into e from experiences where id = (p->>'experience_id')::uuid;
  if not found or e.status <> 'published' then raise exception 'experience_not_bookable'; end if;
  if not exists (select 1 from organizations where id = e.operator_id and status = 'active') then
    raise exception 'operator_inactive';
  end if;
  if v_adult < 0 or v_child < 0 or v_infant < 0 or v_group < 0 then raise exception 'invalid_quantity'; end if;
  if coalesce(trim(p->'customer'->>'full_name'), '') = '' or coalesce(trim(p->'customer'->>'email'), '') = ''
     or length(app.digits(p->'customer'->>'phone')) < 8 then
    raise exception 'customer_details_required';
  end if;

  -- 2. Seats and time
  if v_private then
    if not e.private_available then raise exception 'private_not_available'; end if;
    v_starts := (p->>'private_starts_at')::timestamptz;
    if v_starts is null or v_starts <= now() then raise exception 'invalid_start_time'; end if;
    select * into v_pc from price_categories where experience_id = e.id and kind = 'private_group' and active;
    if not found then raise exception 'private_price_missing'; end if;
    if v_group < 1 or v_group > coalesce(v_pc.max_group, e.private_max_group, 1000) then
      raise exception 'invalid_group_size';
    end if;
    v_persons := v_group;
    v_status := 'pending_request';
    v_lines := v_lines || jsonb_build_object('kind', 'private_group', 'ref_id', v_pc.id, 'quantity', 1,
                 'unit_net', v_pc.net_minor, 'unit_price', app.display_price(v_pc.net_minor));
  else
    v_seats := v_adult + v_child;
    if v_seats < 1 then raise exception 'invalid_quantity'; end if;
    if v_infant > v_adult then raise exception 'infants_need_adult'; end if;
    -- Lock the departure row: concurrent bookings for the same slot queue here.
    select * into sl from slots where id = (p->>'slot_id')::uuid and experience_id = e.id for update;
    if not found then raise exception 'slot_not_found'; end if;
    if sl.status <> 'open' or sl.starts_at <= now() then raise exception 'slot_closed'; end if;
    if sl.booked + v_seats > sl.capacity then raise exception 'sold_out'; end if;
    v_starts := sl.starts_at;
    v_persons := v_seats + v_infant;
    v_status := case when e.booking_mode = 'instant' then 'confirmed' else 'pending_request' end;
    foreach k in array array['adult', 'child', 'infant'] loop
      v_qty := case k when 'adult' then v_adult when 'child' then v_child else v_infant end;
      if v_qty > 0 then
        select * into v_pc from price_categories where experience_id = e.id and kind = k::price_kind and active;
        if not found then raise exception 'price_missing_%', k; end if;
        v_lines := v_lines || jsonb_build_object('kind', k, 'ref_id', v_pc.id, 'quantity', v_qty,
                     'unit_net', v_pc.net_minor, 'unit_price', app.display_price(v_pc.net_minor));
      end if;
    end loop;
  end if;

  -- 3. Extras
  for item in select * from jsonb_array_elements(coalesce(p->'extras', '[]'::jsonb)) loop
    select * into v_x from extras where id = (item->>'id')::uuid and experience_id = e.id and active;
    if not found then raise exception 'extra_not_found'; end if;
    v_qty := case when v_x.per = 'booking' then 1 else coalesce((item->>'quantity')::int, v_persons) end;
    if v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;
    v_lines := v_lines || jsonb_build_object('kind', 'extra', 'ref_id', v_x.id, 'quantity', v_qty,
                 'unit_net', v_x.net_minor, 'unit_price', app.display_price(v_x.net_minor));
  end loop;

  -- 4. Optional hotel transfer
  if p ? 'hotel_id' and p->>'hotel_id' is not null then
    select * into v_hotel from hotels where id = (p->>'hotel_id')::uuid and active;
    if not found then raise exception 'hotel_not_found'; end if;
    if coalesce((p->>'transport')::boolean, false) then
      select * into v_tp from transport_prices where experience_id = e.id and zone_id = v_hotel.zone_id;
      if not found then raise exception 'transport_not_available_for_zone'; end if;
      v_qty := case when v_tp.per = 'vehicle' then ceil(v_persons::numeric / v_tp.vehicle_capacity)::int
                    else greatest(v_seats, v_group) end;
      v_lines := v_lines || jsonb_build_object('kind', 'transport', 'ref_id', v_hotel.zone_id, 'quantity', v_qty,
                   'unit_net', v_tp.net_minor, 'unit_price', app.display_price(v_tp.net_minor));
    end if;
  end if;

  select coalesce(sum((l->>'quantity')::bigint * (l->>'unit_price')::bigint), 0),
         coalesce(sum((l->>'quantity')::bigint * (l->>'unit_net')::bigint), 0)
    into v_gross, v_net from jsonb_array_elements(v_lines) l;

  -- 5. Coupon (funded from WENRO's share only, capped by settings)
  if coalesce(p->>'coupon_code', '') <> '' then
    select * into v_coupon from coupons where code = upper(p->>'coupon_code') and active
      and (valid_from is null or valid_from <= now()) and (valid_to is null or valid_to > now())
      and (max_uses is null or uses < max_uses)
      for update;
    if not found then raise exception 'coupon_invalid'; end if;
    v_discount := floor(v_gross * least(v_coupon.percent_bps, s.max_discount_bps)::numeric / 10000);
    update coupons set uses = uses + 1 where id = v_coupon.id;
  end if;
  v_paid := v_gross - v_discount;

  -- 6. Attribution: agency booking from the portal, else referral code
  if p ? 'agency_id' and p->>'agency_id' is not null then
    if not exists (select 1 from organizations where id = (p->>'agency_id')::uuid and type = 'agency' and status = 'active')
       or not app.has_role((p->>'agency_id')::uuid) then
      raise exception 'not_agency_member';
    end if;
    v_source := 'agency';
    v_partner := (p->>'agency_id')::uuid;
    v_created_by := auth.uid();
  elsif coalesce(p->>'partner_code', '') <> '' then
    select pc.id, pc.org_id, o.type::text::booking_source into v_code_id, v_partner, v_source
      from partner_codes pc join organizations o on o.id = pc.org_id
     where pc.code = upper(p->>'partner_code') and pc.active and o.status = 'active'
       and o.type in ('marketer', 'agency');
    if not found then v_source := 'direct'; v_partner := null; v_code_id := null; end if;
  end if;

  -- Self-referral: the partner booking for their own phone earns nothing
  if v_partner is not null and v_source = 'marketer' and exists (
       select 1 from org_private_details d where d.org_id = v_partner
          and app.digits(d.contact_phone) <> ''
          and right(app.digits(d.contact_phone), 9) = right(app.digits(p->'customer'->>'phone'), 9)) then
    v_self_referral := true;
    v_source := 'direct'; v_partner := null; v_code_id := null;
  end if;

  if v_source <> 'direct' then
    v_partner_amt := floor(v_paid * s.partner_share_bps::numeric / 10000);
  end if;
  v_platform := v_paid - v_net - v_partner_amt;
  if v_platform < 0 then raise exception 'pricing_invariant_violated'; end if;

  -- 7. Display currency rate (informational only)
  if coalesce(p->>'display_currency', '') <> '' and p->>'display_currency' <> e.collection_currency then
    select rate into v_rate from fx_rates where base = e.collection_currency and quote = p->>'display_currency'
     order by effective_at desc limit 1;
  end if;

  select * into v_policy from cancellation_policies where id = e.cancellation_policy_id;

  insert into bookings (experience_id, operator_id, slot_id, is_private, starts_at, seats, status,
      currency, gross_minor, discount_minor, paid_minor, operator_net_minor, partner_commission_minor,
      platform_share_minor, terms_snapshot, display_currency, display_rate, source, partner_org_id,
      partner_code_id, created_by_user, coupon_id, hotel_id, transport, locale, manage_token_hash,
      request_expires_at)
  values (e.id, e.operator_id, case when v_private then null else sl.id end, v_private, v_starts, v_seats, v_status,
      e.collection_currency, v_gross, v_discount, v_paid, v_net, v_partner_amt, v_platform,
      jsonb_build_object(
        'operator_share_bps', s.operator_share_bps, 'partner_share_bps', s.partner_share_bps,
        'price_rounding_minor', s.price_rounding_minor, 'max_discount_bps', s.max_discount_bps,
        'coupon', case when v_coupon.id is null then null else jsonb_build_object('code', v_coupon.code, 'percent_bps', v_coupon.percent_bps) end,
        'cancellation_policy', case when v_policy.id is null then null else jsonb_build_object('code', v_policy.code, 'free_cancel_hours', v_policy.free_cancel_hours) end,
        'self_referral_blocked', v_self_referral,
        'payment_method', 'cash_on_site'),
      nullif(p->>'display_currency', ''), v_rate, v_source, v_partner, v_code_id, v_created_by,
      v_coupon.id, v_hotel.id, coalesce((p->>'transport')::boolean, false) and v_hotel.id is not null,
      coalesce(nullif(p->>'locale', ''), 'en'), app.token_hash(v_token),
      case when v_status = 'pending_request' then now() + make_interval(hours => s.request_expiry_hours) end)
  returning * into v_booking;

  insert into booking_contacts (booking_id, full_name, email, phone, room, notes)
  values (v_booking.id, trim(p->'customer'->>'full_name'), lower(trim(p->'customer'->>'email')),
          trim(p->'customer'->>'phone'), p->'customer'->>'room', p->'customer'->>'notes');

  insert into booking_lines (booking_id, kind, ref_id, quantity, unit_net_minor, unit_price_minor,
                             line_net_minor, line_price_minor)
  select v_booking.id, l->>'kind', (l->>'ref_id')::uuid, (l->>'quantity')::int,
         (l->>'unit_net')::bigint, (l->>'unit_price')::bigint,
         (l->>'quantity')::bigint * (l->>'unit_net')::bigint,
         (l->>'quantity')::bigint * (l->>'unit_price')::bigint
    from jsonb_array_elements(v_lines) l;

  if v_partner is not null then
    insert into commissions (booking_id, partner_org_id, currency, amount_minor)
    values (v_booking.id, v_partner, e.collection_currency, v_partner_amt);
  end if;

  if not v_private then
    perform set_config('app.internal', 'on', true);
    update slots set booked = booked + v_seats where id = sl.id;
    perform set_config('app.internal', 'off', true);
  end if;

  return jsonb_build_object('booking_id', v_booking.id, 'ref', v_booking.ref, 'status', v_booking.status,
    'manage_token', v_token, 'qr_token', v_booking.qr_token, 'currency', v_booking.currency,
    'gross_minor', v_gross, 'discount_minor', v_discount, 'paid_minor', v_paid,
    'display_currency', v_booking.display_currency, 'display_rate', v_rate);
end $$;

-- ---------------------------------------------------------------------------
-- Customer actions via the private manage link (no account needed)
-- ---------------------------------------------------------------------------
create or replace function booking_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'ref', b.ref, 'status', b.status, 'execution_status', b.execution_status,
    'starts_at', b.starts_at, 'currency', b.currency, 'paid_minor', b.paid_minor, 'gross_minor', b.gross_minor,
    'discount_minor', b.discount_minor, 'experience_id', b.experience_id, 'qr_token', b.qr_token,
    'reconfirm_status', b.reconfirm_status, 'terms', b.terms_snapshot,
    'lines', (select jsonb_agg(jsonb_build_object('kind', l.kind, 'quantity', l.quantity,
                'unit_price_minor', l.unit_price_minor, 'line_price_minor', l.line_price_minor))
                from booking_lines l where l.booking_id = b.id),
    'customer', jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone))
  from bookings b join booking_contacts c on c.booking_id = b.id
  where b.manage_token_hash = app.token_hash(p_token)
$$;

create or replace function cancel_booking_by_token(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings; v_free boolean;
begin
  select * into b from bookings where manage_token_hash = app.token_hash(p_token) for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status not in ('confirmed', 'pending_request') or b.execution_status <> 'scheduled' then
    raise exception 'booking_not_cancellable';
  end if;
  if b.starts_at <= now() then raise exception 'trip_started'; end if;
  v_free := b.starts_at - now() >= make_interval(hours =>
              coalesce((b.terms_snapshot->'cancellation_policy'->>'free_cancel_hours')::int, 0));
  perform app.release_booking(b, 'cancelled', case when v_free then 'customer' else 'customer_late' end);
  return jsonb_build_object('ref', b.ref, 'status', 'cancelled', 'within_free_window', v_free);
end $$;

create or replace function reconfirm_by_token(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  update bookings set reconfirm_status = 'confirmed'
   where manage_token_hash = app.token_hash(p_token) and status = 'confirmed' and execution_status = 'scheduled'
  returning * into b;
  if not found then raise exception 'booking_not_found'; end if;
  return jsonb_build_object('ref', b.ref, 'reconfirm_status', b.reconfirm_status);
end $$;

-- ---------------------------------------------------------------------------
-- Operator actions
-- ---------------------------------------------------------------------------
create or replace function decide_request(p_booking uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found'; end if;
  if not (app.has_role(b.operator_id, array['owner','manager']::member_role[])
          or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  if b.status <> 'pending_request' then raise exception 'not_pending'; end if;
  if p_accept then
    update bookings set status = 'confirmed', request_expires_at = null where id = b.id;
  else
    perform app.release_booking(b, 'declined', 'declined');
  end if;
  return jsonb_build_object('ref', b.ref, 'status', case when p_accept then 'confirmed' else 'declined' end);
end $$;

-- Check-in by scanning the voucher QR. Any operator team member may scan.
create or replace function check_in(p_qr text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where qr_token = p_qr for update;
  if not found then raise exception 'booking_not_found'; end if;
  if not (app.has_role(b.operator_id) or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.execution_status = 'executed' then
    return jsonb_build_object('ref', b.ref, 'execution_status', 'executed', 'already', true);
  end if;
  if b.execution_status <> 'scheduled' then raise exception 'not_scheduled'; end if;
  if abs(extract(epoch from (now() - b.starts_at))) > 18 * 3600 then raise exception 'not_trip_day'; end if;
  update bookings set execution_status = 'executed', executed_at = now() where id = b.id;
  update commissions set status = 'eligible', updated_at = now() where booking_id = b.id and status = 'pending';
  perform app.ledger('receivable_from_operator', b.id, b.operator_id, b.currency,
                     b.paid_minor - b.operator_net_minor, 'cash collected by operator on site');
  if b.partner_org_id is not null and b.partner_commission_minor > 0 then
    perform app.ledger('commission_accrued', b.id, b.partner_org_id, b.currency,
                       -b.partner_commission_minor, 'partner commission accrued');
  end if;
  return jsonb_build_object('ref', b.ref, 'execution_status', 'executed', 'already', false);
end $$;

create or replace function mark_no_show(p_booking uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_booking for update;
  if not found then raise exception 'booking_not_found'; end if;
  if not (app.has_role(b.operator_id) or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  if b.status <> 'confirmed' or b.execution_status <> 'scheduled' then raise exception 'not_scheduled'; end if;
  if now() < b.starts_at then raise exception 'trip_not_started'; end if;
  update bookings set execution_status = 'no_show' where id = b.id;
  update commissions set status = 'void', updated_at = now() where booking_id = b.id and status = 'pending';
  return jsonb_build_object('ref', b.ref, 'execution_status', 'no_show');
end $$;

-- Weather / port closure: cancels every booking on the departure, no commissions anywhere.
create or replace function cancel_slot(p_slot uuid, p_reason text default 'weather') returns jsonb
language plpgsql security definer set search_path = public as $$
declare sl slots; e experiences; b bookings; n int := 0;
begin
  select * into sl from slots where id = p_slot for update;
  if not found then raise exception 'slot_not_found'; end if;
  select * into e from experiences where id = sl.experience_id;
  if not (app.has_role(e.operator_id, array['owner','manager']::member_role[])
          or app.is_platform(array['owner','ops']::member_role[])) then
    raise exception 'forbidden';
  end if;
  for b in select * from bookings where slot_id = sl.id and status in ('confirmed', 'pending_request')
             and execution_status = 'scheduled' for update loop
    perform app.release_booking(b, 'cancelled', p_reason);
    update bookings set execution_status = 'not_operated' where id = b.id;
    n := n + 1;
  end loop;
  perform set_config('app.internal', 'on', true);
  update slots set status = 'cancelled', cancel_reason = p_reason where id = sl.id;
  perform set_config('app.internal', 'off', true);
  return jsonb_build_object('slot_id', sl.id, 'cancelled_bookings', n);
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs (called by the server with the service role)
-- ---------------------------------------------------------------------------
create or replace function expire_requests(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare b bookings; n int := 0;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  for b in select * from bookings where status = 'pending_request' and request_expires_at <= p_now for update loop
    perform app.release_booking(b, 'expired', 'request_expired');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Bookings for tomorrow (business timezone) that need a reconfirmation message
create or replace function due_reconfirmations(p_now timestamptz default now())
returns table (booking_id uuid, ref text, locale text, email text, phone text, starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.ref, b.locale, c.email, c.phone, b.starts_at
    from bookings b join booking_contacts c on c.booking_id = b.id, platform_settings s
   where app.is_service() and b.status = 'confirmed' and b.execution_status = 'scheduled'
     and b.reconfirm_status = 'not_sent'
     and (b.starts_at at time zone s.business_timezone)::date = (p_now at time zone s.business_timezone)::date + 1
$$;

create or replace function mark_reconfirm_sent(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  update bookings set reconfirm_status = 'sent' where id = any (p_ids) and reconfirm_status = 'not_sent';
  get diagnostics n = row_count;
  return n;
end $$;

-- Unconfirmed bookings for tomorrow, listed for the admin alert (21:00) before auto-cancel (22:00)
create or replace function unconfirmed_for_tomorrow(p_now timestamptz default now())
returns table (booking_id uuid, ref text, starts_at timestamptz, full_name text, phone text)
language sql stable security definer set search_path = public as $$
  select b.id, b.ref, b.starts_at, c.full_name, c.phone
    from bookings b join booking_contacts c on c.booking_id = b.id, platform_settings s
   where (app.is_service() or app.is_platform(array['owner','ops','support']::member_role[]))
     and b.status = 'confirmed' and b.execution_status = 'scheduled' and b.reconfirm_status = 'sent'
     and (b.starts_at at time zone s.business_timezone)::date = (p_now at time zone s.business_timezone)::date + 1
$$;

create or replace function auto_cancel_unconfirmed(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare s platform_settings := app.settings(); b bookings; n int := 0;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if (p_now at time zone s.business_timezone)::time < s.reconfirm_cutoff_local then
    raise exception 'before_cutoff';
  end if;
  for b in select bk.* from bookings bk
            where bk.status = 'confirmed' and bk.execution_status = 'scheduled' and bk.reconfirm_status = 'sent'
              and (bk.starts_at at time zone s.business_timezone)::date = (p_now at time zone s.business_timezone)::date + 1
            for update loop
    perform app.release_booking(b, 'cancelled', 'unconfirmed');
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------------
-- Weekly: what each operator owes WENRO for trips executed in the period (per currency)
create or replace function generate_operator_statements(p_start date, p_end date) returns int
language plpgsql security definer set search_path = public as $$
declare s platform_settings := app.settings(); r record; v_id uuid; n int := 0;
begin
  if not (app.is_service() or app.is_platform(array['owner','finance']::member_role[])) then
    raise exception 'forbidden';
  end if;
  for r in select b.operator_id, b.currency, count(*) cnt, sum(b.paid_minor) collected,
                  sum(b.paid_minor - b.operator_net_minor) due
             from bookings b
            where b.execution_status = 'executed' and b.settled_statement_id is null
              and (b.executed_at at time zone s.business_timezone)::date between p_start and p_end
            group by b.operator_id, b.currency loop
    insert into operator_statements (operator_id, currency, period_start, period_end, bookings_count,
                                     collected_minor, due_minor)
    values (r.operator_id, r.currency, p_start, p_end, r.cnt, r.collected, r.due)
    returning id into v_id;
    update bookings set settled_statement_id = v_id
     where operator_id = r.operator_id and currency = r.currency and execution_status = 'executed'
       and settled_statement_id is null
       and (executed_at at time zone s.business_timezone)::date between p_start and p_end;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function mark_statement_received(p_statement uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare st operator_statements;
begin
  if not app.is_platform(array['owner','finance']::member_role[]) and not app.is_service() then
    raise exception 'forbidden';
  end if;
  select * into st from operator_statements where id = p_statement for update;
  if not found then raise exception 'statement_not_found'; end if;
  if st.status = 'received' then raise exception 'already_received'; end if;
  update operator_statements set status = 'received', received_at = now(), received_by = auth.uid()
   where id = st.id;
  update commissions c set status = 'payable', updated_at = now()
    from bookings b where b.id = c.booking_id and b.settled_statement_id = st.id and c.status = 'eligible';
  perform app.ledger('operator_settlement_received', null, st.operator_id, st.currency, -st.due_minor,
                     'statement ' || st.id::text);
  return jsonb_build_object('statement_id', st.id, 'status', 'received');
end $$;

-- Monthly: group payable commissions into one payout per partner and currency
create or replace function create_partner_payouts(p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_id uuid; n int := 0;
begin
  if not (app.is_service() or app.is_platform(array['owner','finance']::member_role[])) then
    raise exception 'forbidden';
  end if;
  for r in select partner_org_id, currency, sum(amount_minor) amt from commissions
            where status = 'payable' and payout_id is null group by partner_org_id, currency loop
    v_id := null;
    insert into partner_payouts (partner_org_id, currency, period_month, amount_minor)
    values (r.partner_org_id, r.currency, date_trunc('month', p_month)::date, r.amt)
    on conflict (partner_org_id, currency, period_month)
      do update set amount_minor = partner_payouts.amount_minor + excluded.amount_minor
      where partner_payouts.status = 'pending'
    returning id into v_id;
    if v_id is null then raise exception 'payout_already_paid_for_month'; end if;
    update commissions set payout_id = v_id, updated_at = now()
     where partner_org_id = r.partner_org_id and currency = r.currency and status = 'payable' and payout_id is null;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function mark_payout_paid(p_payout uuid, p_reference text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare po partner_payouts;
begin
  if not app.is_platform(array['owner','finance']::member_role[]) and not app.is_service() then
    raise exception 'forbidden';
  end if;
  select * into po from partner_payouts where id = p_payout for update;
  if not found then raise exception 'payout_not_found'; end if;
  if po.status = 'paid' then raise exception 'already_paid'; end if;
  update partner_payouts set status = 'paid', paid_at = now(), paid_by = auth.uid(), reference = p_reference
   where id = po.id;
  update commissions set status = 'paid', updated_at = now() where payout_id = po.id;
  perform app.ledger('partner_payout', null, po.partner_org_id, po.currency, po.amount_minor,
                     'payout ' || coalesce(p_reference, ''));
  return jsonb_build_object('payout_id', po.id, 'status', 'paid');
end $$;

-- ---------------------------------------------------------------------------
-- Read models for portals (apply visibility rules)
-- ---------------------------------------------------------------------------
-- Operator: customer WhatsApp appears only N hours before the trip; staff never see money.
create or replace function operator_bookings(p_operator uuid, p_from timestamptz, p_to timestamptz)
returns table (booking_id uuid, ref text, experience_id uuid, starts_at timestamptz, status text,
               execution_status text, reconfirm_status text, adults int, children int, infants int,
               is_private boolean, hotel text, zone text, transport boolean, room text,
               customer_name text, customer_phone text, currency text, paid_minor bigint,
               operator_net_minor bigint, qr_token text)
language plpgsql stable security definer set search_path = public as $$
declare v_money boolean; s platform_settings := app.settings();
begin
  if not (app.has_role(p_operator) or app.is_platform()) then raise exception 'forbidden'; end if;
  v_money := app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform();
  return query
  select b.id, b.ref, b.experience_id, b.starts_at, b.status::text, b.execution_status::text,
         b.reconfirm_status::text,
         coalesce((select sum(l.quantity) from booking_lines l where l.booking_id = b.id and l.kind = 'adult'), 0)::int,
         coalesce((select sum(l.quantity) from booking_lines l where l.booking_id = b.id and l.kind = 'child'), 0)::int,
         coalesce((select sum(l.quantity) from booking_lines l where l.booking_id = b.id and l.kind = 'infant'), 0)::int,
         b.is_private, h.name, z.name, b.transport, c.room, c.full_name,
         case when b.starts_at - now() <= make_interval(hours => s.operator_phone_reveal_hours)
                   and b.status = 'confirmed' then c.phone end,
         b.currency::text,
         case when v_money then b.paid_minor::bigint end,
         case when v_money then b.operator_net_minor::bigint end,
         null::text
    from bookings b
    join booking_contacts c on c.booking_id = b.id
    left join hotels h on h.id = b.hotel_id
    left join zones z on z.id = h.zone_id
   where b.operator_id = p_operator and b.starts_at >= p_from and b.starts_at < p_to
   order by b.starts_at, h.name;
end $$;

-- Marketers see no personal data. Agencies see the client name they entered;
-- agency staff see only their own bookings, managers see the whole agency.
create or replace function partner_bookings(p_partner uuid)
returns table (booking_id uuid, ref text, experience_id uuid, starts_at timestamptz, status text,
               execution_status text, currency text, paid_minor bigint, commission_minor bigint,
               commission_status text, customer_name text, created_by_user uuid)
language plpgsql stable security definer set search_path = public as $$
declare o organizations; v_all boolean;
begin
  select * into o from organizations where id = p_partner;
  if not found or not (app.has_role(p_partner) or app.is_platform()) then raise exception 'forbidden'; end if;
  v_all := app.has_role(p_partner, array['owner','manager']::member_role[]) or app.is_platform();
  return query
  select b.id, b.ref, b.experience_id, b.starts_at, b.status::text, b.execution_status::text,
         b.currency::text, b.paid_minor::bigint, cm.amount_minor::bigint, cm.status::text,
         case when o.type = 'agency' then c.full_name end,
         b.created_by_user
    from bookings b
    join booking_contacts c on c.booking_id = b.id
    left join commissions cm on cm.booking_id = b.id
   where b.partner_org_id = p_partner
     and (v_all or b.created_by_user = auth.uid())
   order by b.created_at desc;
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.has_role(uuid, member_role[]), app.is_platform(member_role[]),
  app.platform_org(), app.can_read_experience(uuid), app.can_edit_experience(uuid),
  app.display_price(bigint), app.settings(), app.digits(text), app.token_hash(text), app.is_service()
  to anon, authenticated, service_role;

-- Supabase grants EXECUTE on new public functions to anon by default: take it all back,
-- then grant explicitly. Every function also checks the caller's role internally.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public_prices(uuid) to anon, authenticated, service_role;

-- Public booking and manage-link actions go through the Next.js server (service role).
grant execute on function booking_by_token(text), cancel_booking_by_token(text), reconfirm_by_token(text),
  expire_requests(timestamptz), due_reconfirmations(timestamptz), mark_reconfirm_sent(uuid[]),
  auto_cancel_unconfirmed(timestamptz) to service_role;

-- Signed-in portals (each function verifies membership/role itself)
grant execute on function create_booking(jsonb), decide_request(uuid, boolean), check_in(text),
  mark_no_show(uuid), cancel_slot(uuid, text), generate_operator_statements(date, date),
  mark_statement_received(uuid), create_partner_payouts(date), mark_payout_paid(uuid, text),
  operator_bookings(uuid, timestamptz, timestamptz), partner_bookings(uuid),
  unconfirmed_for_tomorrow(timestamptz) to authenticated, service_role;
