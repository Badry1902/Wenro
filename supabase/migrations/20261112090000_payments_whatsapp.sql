-- Operator payments to WENRO with proof and review, a clearer finance dashboard, and WhatsApp trip details (Nov 2026).

-- 1. WENRO's payment methods (InstaPay first). Shown to operators when they pay; edited by owner and finance -----
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('instapay', 'bank', 'wallet', 'link')),
  label text not null check (length(label) between 2 and 60),
  account_name text check (length(account_name) <= 120),
  value text not null check (length(value) between 2 and 200),      -- InstaPay address, account number / IBAN, wallet number, or payment link
  extra text check (length(extra) <= 300),                          -- bank name, branch, SWIFT, notes
  pay_url text check (pay_url is null or pay_url ~ '^https://'),   -- opens the app / payment page
  sort int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table payment_methods enable row level security;
revoke all on payment_methods from anon, authenticated;
drop trigger if exists audit_payment_methods on payment_methods;
create trigger audit_payment_methods after insert or update or delete on payment_methods for each row execute function app.audit();

-- 2. Payments an operator reports (one or more open statements), with a receipt, reviewed by WENRO ---------------
create table if not exists operator_payments (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references organizations(id),
  statement_ids uuid[] not null check (cardinality(statement_ids) between 1 and 24),
  currency collect_currency not null,
  amount_minor money_minor not null,                   -- snapshot of what the statements said at the time
  method_id uuid references payment_methods(id),
  method_label text not null,                          -- snapshot (the method may change later)
  reference text check (length(reference) <= 80),
  proof_path text not null check (length(proof_path) <= 300),
  note text check (length(note) <= 500),
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  submitted_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text check (length(review_note) <= 500)
);
create index if not exists operator_payments_op on operator_payments (operator_id, created_at desc);
alter table operator_payments enable row level security;
revoke all on operator_payments from anon, authenticated;
drop trigger if exists audit_operator_payments on operator_payments;
create trigger audit_operator_payments after insert or update or delete on operator_payments for each row execute function app.audit();

-- Receipts live in a private storage bucket; only the server reads them (signed links for owner and finance)
do $$ begin
  insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict (id) do nothing;
exception when undefined_table or invalid_schema_name then null; end $$;

create or replace function payment_methods_list() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare admin boolean := app.is_platform(array['owner','finance']::member_role[]);
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(p) order by p.sort, p.label), '[]'::jsonb) from payment_methods p where p.active or admin);
end $$;

create or replace function save_payment_method(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id', '')::uuid;
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  if v_id is null then
    insert into payment_methods (kind, label, account_name, value, extra, pay_url, sort, active)
    values (p->>'kind', p->>'label', nullif(p->>'account_name', ''), p->>'value', nullif(p->>'extra', ''), nullif(p->>'pay_url', ''),
            coalesce((p->>'sort')::int, 0), coalesce((p->>'active')::boolean, true))
    returning id into v_id;
  else
    update payment_methods set kind = p->>'kind', label = p->>'label', account_name = nullif(p->>'account_name', ''), value = p->>'value',
      extra = nullif(p->>'extra', ''), pay_url = nullif(p->>'pay_url', ''), sort = coalesce((p->>'sort')::int, sort),
      active = coalesce((p->>'active')::boolean, active), updated_at = now()
     where id = v_id;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v_id;
end $$;

-- What the operator owes now: open statements (each can be paid once a receipt is under review it is locked)
create or replace function operator_dues(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform(array['owner','finance']::member_role[])) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'statements', (select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'currency', st.currency, 'period_start', st.period_start,
        'period_end', st.period_end, 'bookings_count', st.bookings_count, 'collected_minor', st.collected_minor, 'due_minor', st.due_minor,
        'in_review', exists (select 1 from operator_payments op where op.status = 'submitted' and st.id = any(op.statement_ids)))
        order by st.period_start), '[]'::jsonb)
        from operator_statements st where st.operator_id = p_operator and st.status = 'open'),
    'unsettled', (select coalesce(jsonb_object_agg(x.currency, jsonb_build_object('trips', x.cnt, 'due_minor', x.due)), '{}'::jsonb)
        from (select currency, count(*) cnt, sum(paid_minor - operator_net_minor) due from bookings
               where operator_id = p_operator and execution_status = 'executed' and settled_statement_id is null group by currency) x),
    'payments', (select coalesce(jsonb_agg(jsonb_build_object('id', op.id, 'currency', op.currency, 'amount_minor', op.amount_minor,
        'method', op.method_label, 'reference', op.reference, 'status', op.status, 'created_at', op.created_at,
        'reviewed_at', op.reviewed_at, 'review_note', op.review_note, 'statements', cardinality(op.statement_ids)) order by op.created_at desc), '[]'::jsonb)
        from (select * from operator_payments where operator_id = p_operator order by created_at desc limit 30) op)
  );
end $$;

create or replace function submit_operator_payment(p_operator uuid, p_statements uuid[], p_method uuid, p_reference text, p_proof text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_cur text; v_sum bigint; v_n int; m payment_methods;
begin
  if not app.has_role(p_operator, array['owner','manager']::member_role[]) then raise exception 'forbidden'; end if;
  if p_statements is null or cardinality(p_statements) = 0 then raise exception 'invalid_input'; end if;
  if p_proof is null or p_proof !~ ('^' || p_operator::text || '/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$') then raise exception 'invalid_input'; end if;
  select * into m from payment_methods where id = p_method and active;
  if not found then raise exception 'invalid_input'; end if;
  select count(*), min(currency::text), sum(due_minor) into v_n, v_cur, v_sum
    from operator_statements where id = any(p_statements) and operator_id = p_operator and status = 'open';
  if v_n <> cardinality(p_statements) then raise exception 'statement_not_found'; end if;
  if (select count(distinct currency) from operator_statements where id = any(p_statements)) > 1 then raise exception 'invalid_input'; end if;
  if exists (select 1 from operator_payments where status = 'submitted' and statement_ids && p_statements) then raise exception 'already_in_review'; end if;
  insert into operator_payments (operator_id, statement_ids, currency, amount_minor, method_id, method_label, reference, proof_path, note)
  values (p_operator, p_statements, v_cur::collect_currency, v_sum, m.id, m.label, nullif(left(trim(p_reference), 80), ''), p_proof, nullif(left(trim(p_note), 500), ''))
  returning id into v_id;
  perform app.notify(app.platform_org(), array['owner','finance']::member_role[], 'payment_submitted',
    jsonb_build_object('name', (select name from organizations where id = p_operator), 'amount_minor', v_sum, 'currency', v_cur),
    '/app/admin/finance?tab=review');
  return v_id;
end $$;

create or replace function admin_operator_payments(p_status text default 'submitted') returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', op.id, 'operator', o.name, 'operator_id', o.id, 'currency', op.currency,
      'amount_minor', op.amount_minor, 'method', op.method_label, 'reference', op.reference, 'note', op.note, 'status', op.status,
      'created_at', op.created_at, 'reviewed_at', op.reviewed_at, 'review_note', op.review_note,
      'proof_kind', case when op.proof_path ~ '\.pdf$' then 'pdf' else 'image' end,
      'statements', (select jsonb_agg(jsonb_build_object('period_start', st.period_start, 'period_end', st.period_end, 'due_minor', st.due_minor,
                       'bookings_count', st.bookings_count, 'status', st.status) order by st.period_start)
                       from operator_statements st where st.id = any(op.statement_ids)))
      order by op.created_at desc), '[]'::jsonb)
    from operator_payments op join organizations o on o.id = op.operator_id
   where p_status is null or op.status = p_status);
end $$;

-- Only the WENRO owner and finance team can open a receipt
create or replace function payment_proof(p_payment uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return (select proof_path from operator_payments where id = p_payment);
end $$;

create or replace function review_operator_payment(p_payment uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare op operator_payments; s uuid;
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  select * into op from operator_payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if op.status <> 'submitted' then raise exception 'already_reviewed'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'reason_required'; end if;
  if p_approve then
    foreach s in array op.statement_ids loop
      if (select status from operator_statements where id = s) = 'open' then perform mark_statement_received(s); end if;
    end loop;
  end if;
  update operator_payments set status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(left(trim(p_note), 500), '')
   where id = op.id;
  perform app.notify(op.operator_id, array['owner','manager']::member_role[], case when p_approve then 'payment_approved' else 'payment_rejected' end,
    jsonb_build_object('amount_minor', op.amount_minor, 'currency', op.currency, 'note', nullif(trim(p_note), '')), '/app/o/' || op.operator_id || '/money');
end $$;

-- 3. Finance dashboard: one call with everything the accounts page shows -----------------------------------------
create or replace function finance_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m0 timestamptz := date_trunc('month', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo';
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'month', (m0 at time zone 'Africa/Cairo')::date,
    -- money per currency
    'totals', (select coalesce(jsonb_object_agg(c, jsonb_build_object(
        'guests_paid_month', (select coalesce(sum(paid_minor), 0) from bookings where currency::text = c and execution_status = 'executed' and starts_at >= m0),
        'wenro_share_month', (select coalesce(sum(b.paid_minor - b.operator_net_minor), 0) - coalesce(sum(cm.amount_minor), 0)
                                from bookings b left join commissions cm on cm.booking_id = b.id and cm.status <> 'void'
                               where b.currency::text = c and b.execution_status = 'executed' and b.starts_at >= m0),
        'operators_owe', (select coalesce(sum(due_minor), 0) from operator_statements where currency::text = c and status = 'open')
                       + (select coalesce(sum(paid_minor - operator_net_minor), 0) from bookings where currency::text = c and execution_status = 'executed' and settled_statement_id is null),
        'received_month', (select coalesce(sum(due_minor), 0) from operator_statements where currency::text = c and status = 'received' and received_at >= m0),
        'in_review', (select coalesce(sum(amount_minor), 0) from operator_payments where currency::text = c and status = 'submitted'),
        'partners_owed', (select coalesce(sum(amount_minor), 0) from commissions where currency::text = c and status in ('eligible', 'payable')),
        'partners_ready', (select coalesce(sum(amount_minor), 0) from commissions where currency::text = c and status = 'payable'),
        'paid_partners_month', (select coalesce(sum(amount_minor), 0) from partner_payouts where currency::text = c and status = 'paid' and paid_at >= m0))), '{}'::jsonb)
      from (select distinct currency::text c from bookings union select distinct currency::text from operator_statements) cur),
    -- one row per operator
    'operators', (select coalesce(jsonb_agg(r order by (r->>'owe')::bigint desc), '[]'::jsonb) from (
        select jsonb_build_object('id', o.id, 'name', o.name, 'status', o.status, 'currency', x.currency,
          'unsettled_trips', x.u_cnt, 'unsettled_minor', x.u_due, 'open_statements', x.s_cnt, 'open_minor', x.s_due,
          'owe', x.u_due + x.s_due, 'in_review', x.r_cnt,
          'last_received', (select max(received_at) from operator_statements s where s.operator_id = o.id and s.status = 'received')) r
        from organizations o
        join lateral (
          select cur.currency,
            (select count(*) from bookings b where b.operator_id = o.id and b.currency = cur.currency and b.execution_status = 'executed' and b.settled_statement_id is null) u_cnt,
            (select coalesce(sum(b.paid_minor - b.operator_net_minor), 0) from bookings b where b.operator_id = o.id and b.currency = cur.currency and b.execution_status = 'executed' and b.settled_statement_id is null) u_due,
            (select count(*) from operator_statements s where s.operator_id = o.id and s.currency = cur.currency and s.status = 'open') s_cnt,
            (select coalesce(sum(s.due_minor), 0) from operator_statements s where s.operator_id = o.id and s.currency = cur.currency and s.status = 'open') s_due,
            (select count(*) from operator_payments p where p.operator_id = o.id and p.currency = cur.currency and p.status = 'submitted') r_cnt
          from (select distinct currency from bookings where operator_id = o.id) cur) x on true
        where o.type = 'operator') t),
    -- one row per partner
    'partners', (select coalesce(jsonb_agg(r order by (r->>'owed')::bigint desc), '[]'::jsonb) from (
        select jsonb_build_object('id', o.id, 'name', o.name, 'type', o.type, 'instapay', d.instapay_handle, 'currency', cm.currency,
          'waiting', sum(cm.amount_minor) filter (where cm.status in ('pending')),
          'earned', sum(cm.amount_minor) filter (where cm.status = 'eligible'),
          'ready', sum(cm.amount_minor) filter (where cm.status = 'payable'),
          'paid', sum(cm.amount_minor) filter (where cm.status = 'paid'),
          'owed', coalesce(sum(cm.amount_minor) filter (where cm.status in ('eligible', 'payable')), 0)) r
        from commissions cm join organizations o on o.id = cm.partner_org_id left join org_private_details d on d.org_id = o.id
        where cm.status <> 'void'
        group by o.id, o.name, o.type, d.instapay_handle, cm.currency) t),
    -- latest money movements in plain words
    'movements', (select coalesce(jsonb_agg(jsonb_build_object('at', l.occurred_at, 'type', l.entry_type, 'org', o.name,
        'currency', l.currency, 'amount_minor', l.amount_minor, 'memo', l.memo) order by l.occurred_at desc), '[]'::jsonb)
        from (select * from ledger_entries order by occurred_at desc limit 40) l left join organizations o on o.id = l.org_id),
    'review_count', (select count(*) from operator_payments where status = 'submitted')
  );
end $$;

-- 4. WhatsApp trip details for the guest (if they agreed) and the operator ------------------------------------------
alter table bookings add column if not exists whatsapp_opt_in boolean not null default false;
alter table message_outbox drop constraint if exists message_outbox_channel_check;
alter table message_outbox add constraint message_outbox_channel_check check (channel in ('email', 'whatsapp'));
alter table message_outbox drop constraint if exists message_outbox_kind_check;
alter table message_outbox add constraint message_outbox_kind_check check (kind in (
  'booking_confirmed', 'request_received', 'request_accepted', 'request_declined', 'request_expired',
  'reconfirm', 'cancelled_by_guest', 'weather_cancelled', 'auto_cancelled', 'cancelled',
  'operator_request', 'operator_booking', 'admin_alert', 'team_invite'));

create or replace function app.enqueue_whatsapp(p_kind text, p_booking bookings, p_recipient text) returns void
language sql security definer set search_path = public as $$
  insert into message_outbox (kind, booking_id, recipient, channel, dedupe_key, locale)
  values (p_kind, p_booking.id, p_recipient, 'whatsapp', 'wa:' || p_kind || ':' || p_recipient || ':' || p_booking.id,
          case when p_recipient = 'guest' then coalesce(p_booking.locale, 'en') else 'ar' end)
  on conflict (dedupe_key) do nothing
$$;

-- Called by the server right after a booking is placed (the guest's choice comes from the booking form)
create or replace function queue_booking_whatsapp(p_booking uuid, p_guest_opt_in boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  update bookings set whatsapp_opt_in = coalesce(p_guest_opt_in, false) where id = p_booking returning * into b;
  if not found then return; end if;
  if b.whatsapp_opt_in then
    perform app.enqueue_whatsapp(case when b.status = 'pending_request' then 'request_received' else 'booking_confirmed' end, b, 'guest');
  end if;
  perform app.enqueue_whatsapp(case when b.status = 'pending_request' then 'operator_request' else 'operator_booking' end, b, 'operator');
end $$;

-- When an operator accepts a request, the guest also hears it on WhatsApp
create or replace function app.booking_whatsapp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.whatsapp_opt_in and old.status = 'pending_request' and new.status = 'confirmed' then
    perform app.enqueue_whatsapp('request_accepted', new, 'guest');
  end if;
  return null;
end $$;
drop trigger if exists booking_whatsapp on bookings;
create trigger booking_whatsapp after update of status on bookings for each row execute function app.booking_whatsapp();

-- Message context now also carries what a WhatsApp message needs
create or replace function app.message_context(p_booking uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'ref', b.ref, 'status', b.status, 'starts_at', b.starts_at,
    'currency', b.currency, 'paid_minor', b.paid_minor, 'locale', b.locale, 'transport', b.transport,
    'request_expires_at', b.request_expires_at, 'cancel_reason', b.cancel_reason,
    'free_cancel_hours', (b.terms_snapshot->'cancellation_policy'->>'free_cancel_hours')::int,
    'title', (select t.title from experience_translations t where t.experience_id = b.experience_id
               order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
    'title_ar', (select t.title from experience_translations t where t.experience_id = b.experience_id
               order by (t.locale = 'ar') desc, (t.locale = 'en') desc limit 1),
    'meeting_info', (select t.meeting_info from experience_translations t where t.experience_id = b.experience_id
               order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
    'meeting_place', e.meeting_place, 'meeting_lat', e.meeting_lat, 'meeting_lng', e.meeting_lng,
    'hotel', h.name, 'room', c.room, 'operator', o.name, 'operator_email', d.contact_email, 'operator_phone', d.contact_phone,
    'whatsapp_opt_in', b.whatsapp_opt_in,
    'lines', (select jsonb_agg(jsonb_build_object('kind', l.kind, 'quantity', l.quantity) order by l.kind)
                from booking_lines l where l.booking_id = b.id),
    'customer', jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone),
    'sealed_link', (select s.sealed from booking_link_secrets s where s.booking_id = b.id))
  from bookings b
  join booking_contacts c on c.booking_id = b.id
  join experiences e on e.id = b.experience_id
  join organizations o on o.id = b.operator_id
  left join org_private_details d on d.org_id = o.id
  left join hotels h on h.id = b.hotel_id
  where b.id = p_booking
$$;

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
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'kind', u.kind, 'recipient', u.recipient, 'channel', u.channel,
           'locale', u.locale, 'payload', u.payload, 'attempts', u.attempts,
           'booking', case when u.booking_id is not null then app.message_context(u.booking_id) end)
           order by u.created_at), '[]'::jsonb)
    into v from u;
  return v;
end $$;

revoke execute on function payment_methods_list(), save_payment_method(jsonb), operator_dues(uuid),
  submit_operator_payment(uuid, uuid[], uuid, text, text, text), admin_operator_payments(text), payment_proof(uuid),
  review_operator_payment(uuid, boolean, text), finance_dashboard(), queue_booking_whatsapp(uuid, boolean),
  app.enqueue_whatsapp(text, bookings, text) from public, anon;
grant execute on function payment_methods_list(), save_payment_method(jsonb), operator_dues(uuid),
  submit_operator_payment(uuid, uuid[], uuid, text, text, text), admin_operator_payments(text), payment_proof(uuid),
  review_operator_payment(uuid, boolean, text), finance_dashboard() to authenticated, service_role;
grant execute on function queue_booking_whatsapp(uuid, boolean) to service_role;
