-- Messaging and scheduled jobs.
--
-- How it works
--  * Every booking change that a guest (or operator) must hear about adds ONE row to message_outbox
--    (a trigger on bookings, so no code path can forget). dedupe_key makes it idempotent.
--  * The server's scheduled endpoint calls run_scheduled_jobs() (expiry, 18:00 reconfirm, 21:00 alert,
--    22:00 auto-cancel), then claims queued messages, renders them in the guest's language and sends them.
--  * The guest's manage link is NOT stored in clear: the server seals it with a key that lives only in the
--    server's environment (MESSAGE_LINK_KEY). The database keeps the sealed text, so a database copy alone
--    cannot be used to open or cancel bookings.

create table message_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'booking_confirmed', 'request_received', 'request_accepted', 'request_declined', 'request_expired',
    'reconfirm', 'cancelled_by_guest', 'weather_cancelled', 'auto_cancelled', 'cancelled',
    'operator_request', 'admin_alert')),
  booking_id uuid references bookings(id) on delete cascade,
  recipient text not null check (recipient in ('guest', 'operator', 'platform')),
  channel text not null default 'email' check (channel in ('email')),
  dedupe_key text not null unique,
  locale text not null default 'en',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'logged', 'failed', 'skipped')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index message_outbox_due on message_outbox (next_attempt_at) where status in ('queued', 'failed', 'sending');
create index message_outbox_booking on message_outbox (booking_id);
alter table message_outbox enable row level security; -- no policies: only the functions below touch it
revoke all on message_outbox from anon, authenticated;

create table booking_link_secrets (
  booking_id uuid primary key references bookings(id) on delete cascade,
  sealed text not null check (length(sealed) between 20 and 400),
  created_at timestamptz not null default now()
);
alter table booking_link_secrets enable row level security;
revoke all on booking_link_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enqueue: one trigger decides which message each booking change produces
-- ---------------------------------------------------------------------------
create or replace function app.enqueue(p_kind text, p_booking bookings, p_recipient text default 'guest')
returns void language sql security definer set search_path = public as $$
  insert into message_outbox (kind, booking_id, recipient, dedupe_key, locale)
  values (p_kind, p_booking.id, p_recipient, p_kind || ':' || p_recipient || ':' || p_booking.id, coalesce(p_booking.locale, 'en'))
  on conflict (dedupe_key) do nothing
$$;

create or replace function app.booking_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'confirmed' then
      perform app.enqueue('booking_confirmed', new);
    elsif new.status = 'pending_request' then
      perform app.enqueue('request_received', new);
      perform app.enqueue('operator_request', new, 'operator');
    end if;
    return null;
  end if;

  if new.status is distinct from old.status then
    if old.status = 'pending_request' and new.status = 'confirmed' then
      perform app.enqueue('request_accepted', new);
    elsif new.status = 'declined' then
      perform app.enqueue('request_declined', new);
    elsif new.status = 'expired' then
      perform app.enqueue('request_expired', new);
    elsif new.status = 'cancelled' then
      perform app.enqueue(case
        when new.cancel_reason = 'weather' then 'weather_cancelled'
        when new.cancel_reason = 'unconfirmed' then 'auto_cancelled'
        when new.cancel_reason in ('customer', 'customer_late') then 'cancelled_by_guest'
        else 'cancelled' end, new);
    end if;
  end if;

  if old.reconfirm_status = 'not_sent' and new.reconfirm_status = 'sent' and new.status = 'confirmed' then
    perform app.enqueue('reconfirm', new);
  end if;
  return null;
end $$;

create trigger booking_messages after insert or update of status, reconfirm_status on bookings
  for each row execute function app.booking_messages();

-- ---------------------------------------------------------------------------
-- Sealed manage link (written by the server right after the booking is created)
-- ---------------------------------------------------------------------------
create or replace function store_link_secret(p_booking uuid, p_sealed text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  insert into booking_link_secrets (booking_id, sealed) values (p_booking, p_sealed)
  on conflict (booking_id) do nothing;
end $$;

-- Sealed link for the WENRO team's manual WhatsApp messages (opened by the server, never by the browser)
create or replace function sealed_link_for(p_booking uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.is_service() or app.is_platform(array['owner','ops','support']::member_role[])) then
    raise exception 'forbidden';
  end if;
  return (select sealed from booking_link_secrets where booking_id = p_booking);
end $$;

-- ---------------------------------------------------------------------------
-- Delivery (server, service role)
-- ---------------------------------------------------------------------------
create or replace function app.message_context(p_booking uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'ref', b.ref, 'status', b.status, 'starts_at', b.starts_at,
    'currency', b.currency, 'paid_minor', b.paid_minor, 'locale', b.locale, 'transport', b.transport,
    'request_expires_at', b.request_expires_at, 'cancel_reason', b.cancel_reason,
    'free_cancel_hours', (b.terms_snapshot->'cancellation_policy'->>'free_cancel_hours')::int,
    'title', (select t.title from experience_translations t where t.experience_id = b.experience_id
               order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
    'meeting_info', (select t.meeting_info from experience_translations t where t.experience_id = b.experience_id
               order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
    'hotel', h.name, 'operator', o.name, 'operator_email', d.contact_email,
    'lines', (select jsonb_agg(jsonb_build_object('kind', l.kind, 'quantity', l.quantity) order by l.kind)
                from booking_lines l where l.booking_id = b.id),
    'customer', jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone),
    'sealed_link', (select s.sealed from booking_link_secrets s where s.booking_id = b.id))
  from bookings b
  join booking_contacts c on c.booking_id = b.id
  join organizations o on o.id = b.operator_id
  left join org_private_details d on d.org_id = o.id
  left join hotels h on h.id = b.hotel_id
  where b.id = p_booking
$$;

-- Claim due messages. SKIP LOCKED: two workers never send the same message.
-- A message stuck in "sending" for 10 minutes (worker crashed) is claimed again.
create or replace function outbox_claim(p_limit int default 25) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  with c as (
    select id from message_outbox
     where ((status in ('queued', 'failed') and next_attempt_at <= now())
            or (status = 'sending' and claimed_at < now() - interval '10 minutes'))
       and attempts < 5
     order by created_at
     limit least(greatest(p_limit, 1), 100)
     for update skip locked
  ), u as (
    update message_outbox m set status = 'sending', attempts = m.attempts + 1, claimed_at = now()
      from c where m.id = c.id
    returning m.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'kind', u.kind, 'recipient', u.recipient,
           'locale', u.locale, 'payload', u.payload, 'attempts', u.attempts,
           'booking', case when u.booking_id is not null then app.message_context(u.booking_id) end)
           order by u.created_at), '[]'::jsonb)
    into v from u;
  return v;
end $$;

create or replace function outbox_result(p_id uuid, p_status text, p_error text default null, p_provider_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if p_status not in ('sent', 'logged', 'skipped', 'failed') then raise exception 'invalid_status'; end if;
  update message_outbox set
    status = p_status,
    last_error = left(p_error, 500),
    provider_id = coalesce(p_provider_id, provider_id),
    sent_at = case when p_status in ('sent', 'logged') then now() else sent_at end,
    -- retry after 10, 20, 30, 40 minutes; after 5 attempts it stays failed for a person to look at
    next_attempt_at = case when p_status = 'failed' then now() + make_interval(mins => 10 * attempts) else next_attempt_at end
  where id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Scheduled jobs: one call does everything that is due (safe to call every few minutes)
-- ---------------------------------------------------------------------------
create or replace function run_scheduled_jobs(p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s platform_settings := app.settings();
  v_local timestamp := p_now at time zone s.business_timezone;
  v_today date := v_local::date;
  v_expired int := 0; v_auto_ok int := 0; v_reconfirm int := 0; v_alert int := 0; v_cancelled int := 0;
  v_ids uuid[];
begin
  if not app.is_service() then raise exception 'forbidden'; end if;

  -- 1. Requests the operator did not answer within 12 hours
  v_expired := expire_requests(p_now);

  -- 2. Bookings for tomorrow made after 18:00 today: the guest just booked, so treat them as reconfirmed
  --    (otherwise someone booking at 21:55 would be cancelled at 22:00).
  if v_local::time >= s.reconfirm_send_local then
    update bookings b set reconfirm_status = 'confirmed'
     where b.status = 'confirmed' and b.execution_status = 'scheduled' and b.reconfirm_status = 'not_sent'
       and (b.starts_at at time zone s.business_timezone)::date = v_today + 1
       and b.created_at >= (v_today + s.reconfirm_send_local) at time zone s.business_timezone;
    get diagnostics v_auto_ok = row_count;
  end if;

  -- 3. 18:00 → 22:00: ask tomorrow's guests to confirm (the trigger queues the message)
  if v_local::time >= s.reconfirm_send_local and v_local::time < s.reconfirm_cutoff_local then
    select array_agg(d.booking_id) into v_ids from due_reconfirmations(p_now) d;
    if v_ids is not null then v_reconfirm := mark_reconfirm_sent(v_ids); end if;
  end if;

  -- 4. 21:00: one alert per day to the WENRO team listing who has not confirmed yet
  if v_local::time >= s.admin_alert_local and v_local::time < s.reconfirm_cutoff_local then
    insert into message_outbox (kind, recipient, dedupe_key, payload)
    select 'admin_alert', 'platform', 'admin_alert:' || v_today,
           jsonb_build_object('date', v_today + 1, 'bookings', jsonb_agg(jsonb_build_object(
             'ref', u.ref, 'starts_at', u.starts_at, 'full_name', u.full_name, 'phone', u.phone) order by u.starts_at))
      from unconfirmed_for_tomorrow(p_now) u
    having count(*) > 0
    on conflict (dedupe_key) do nothing;
    get diagnostics v_alert = row_count;
  end if;

  -- 5. 22:00: cancel tomorrow's bookings that were asked and did not confirm
  if v_local::time >= s.reconfirm_cutoff_local then
    v_cancelled := auto_cancel_unconfirmed(p_now);
  end if;

  return jsonb_build_object('local_time', to_char(v_local, 'YYYY-MM-DD HH24:MI'), 'expired', v_expired,
    'late_bookings_marked_confirmed', v_auto_ok, 'reconfirm_sent', v_reconfirm, 'admin_alert', v_alert,
    'auto_cancelled', v_cancelled,
    'queued_messages', (select count(*) from message_outbox where status in ('queued', 'failed') and attempts < 5));
end $$;

-- ---------------------------------------------------------------------------
-- WENRO team: see and retry messages
-- ---------------------------------------------------------------------------
create or replace function admin_messages(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
                 select status, count(*) n from message_outbox group by status) x),
    'messages', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb) from (
      select m.id, m.kind, m.recipient, m.status, m.attempts, m.last_error, m.created_at, m.sent_at, m.locale,
             b.ref, case m.recipient when 'guest' then c.email when 'operator' then d.contact_email end as to_address
        from message_outbox m
        left join bookings b on b.id = m.booking_id
        left join booking_contacts c on c.booking_id = b.id
        left join org_private_details d on d.org_id = b.operator_id
       order by m.created_at desc limit least(greatest(p_limit, 1), 500)) x)
  );
end $$;

-- One message as the WENRO team sees it (for the preview page). No sealed link: previews show a placeholder.
create or replace function admin_message_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m message_outbox;
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  select * into m from message_outbox where id = p_id;
  if not found then raise exception 'message_not_found'; end if;
  return jsonb_build_object('id', m.id, 'kind', m.kind, 'recipient', m.recipient, 'locale', m.locale,
    'status', m.status, 'payload', m.payload, 'created_at', m.created_at, 'sent_at', m.sent_at, 'last_error', m.last_error,
    'booking', case when m.booking_id is not null then app.message_context(m.booking_id) - 'sealed_link' end);
end $$;

create or replace function retry_message(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','support']::member_role[]) then raise exception 'forbidden'; end if;
  update message_outbox set status = 'queued', attempts = 0, next_attempt_at = now(), last_error = null
   where id = p_id and status in ('failed', 'skipped', 'logged');
  if not found then raise exception 'message_not_retryable'; end if;
  return jsonb_build_object('id', p_id, 'status', 'queued');
end $$;

-- Admin bookings list now also returns the guest's language (for the manual WhatsApp text)
create or replace function admin_bookings(p_from timestamptz, p_to timestamptz, p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'ref', b.ref, 'starts_at', b.starts_at, 'status', b.status, 'execution_status', b.execution_status,
      'reconfirm_status', b.reconfirm_status, 'source', b.source, 'partner', p.name, 'operator', o.name, 'locale', b.locale,
      'title', (select t.title from experience_translations t where t.experience_id = b.experience_id
                 order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
      'customer', c.full_name, 'phone', c.phone, 'email', c.email, 'seats', b.seats,
      'currency', b.currency, 'paid_minor', b.paid_minor, 'operator_net_minor', b.operator_net_minor,
      'partner_commission_minor', b.partner_commission_minor, 'platform_share_minor', b.platform_share_minor,
      'created_at', b.created_at) order by b.starts_at), '[]'::jsonb)
    from bookings b join booking_contacts c on c.booking_id = b.id
    join organizations o on o.id = b.operator_id left join organizations p on p.id = b.partner_org_id
   where b.starts_at >= p_from and b.starts_at < p_to and (p_status is null or b.status::text = p_status));
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke execute on function app.enqueue(text, bookings, text), app.booking_messages(), app.message_context(uuid)
  from public, anon, authenticated;
revoke execute on function store_link_secret(uuid, text), sealed_link_for(uuid), outbox_claim(int),
  outbox_result(uuid, text, text, text), run_scheduled_jobs(timestamptz), admin_messages(int), retry_message(uuid),
  admin_message_detail(uuid) from public, anon, authenticated;
grant execute on function store_link_secret(uuid, text), outbox_claim(int), outbox_result(uuid, text, text, text),
  run_scheduled_jobs(timestamptz) to service_role;
grant execute on function sealed_link_for(uuid), admin_messages(int), retry_message(uuid), admin_message_detail(uuid)
  to authenticated, service_role;
