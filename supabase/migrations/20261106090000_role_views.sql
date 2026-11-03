-- Role-aware admin views (Nov 2026).
--  1. admin_overview only returns money figures to owner/finance; other WENRO roles get counts for
--     their own work. It also says which role is asking, so the page shows the right cards.
--  2. admin_operator_dues: what operators owe WENRO, statement by statement, with the trips behind it,
--     plus checked-in trips not on a statement yet.
--  3. admin_partner_dues: what WENRO owes partners, partner by partner, with the trips behind it.

create or replace function admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s platform_settings := app.settings(); tomorrow date := (now() at time zone s.business_timezone)::date + 1;
        fin boolean := app.is_platform(array['owner','finance']::member_role[]);
        base jsonb;
begin
  if not app.is_platform() then raise exception 'forbidden'; end if;
  base := jsonb_build_object(
    'pending_orgs', (select count(*) from organizations where status = 'pending'),
    'experiences_in_review', (select count(*) from experiences where status = 'in_review'),
    'pending_requests', (select count(*) from bookings where status = 'pending_request'),
    'tomorrow_bookings', (select count(*) from bookings where status = 'confirmed'
                            and (starts_at at time zone s.business_timezone)::date = tomorrow),
    'tomorrow_unconfirmed', (select count(*) from bookings where status = 'confirmed' and reconfirm_status = 'sent'
                            and (starts_at at time zone s.business_timezone)::date = tomorrow),
    'failed_messages', (select count(*) from message_outbox where status = 'failed'));
  if not fin then return base; end if;
  return base || jsonb_build_object(
    'open_statements', (select count(*) from operator_statements where status = 'open'),
    'open_statements_due', (select coalesce(jsonb_object_agg(currency, due), '{}'::jsonb) from (
                              select currency, sum(due_minor) due from operator_statements where status = 'open' group by currency) x),
    'unsettled_executed', (select count(*) from bookings where execution_status = 'executed' and settled_statement_id is null),
    'unsettled_due', (select coalesce(jsonb_object_agg(currency, due), '{}'::jsonb) from (
                              select currency, sum(paid_minor - operator_net_minor) due from bookings
                               where execution_status = 'executed' and settled_statement_id is null group by currency) x),
    'pending_payouts', (select count(*) from partner_payouts where status = 'pending'),
    'payable_commissions', (select coalesce(jsonb_object_agg(currency, amt), '{}'::jsonb) from (
                              select currency, sum(amount_minor) amt from commissions where status = 'payable' and payout_id is null group by currency) x));
end $$;

create or replace function app.booking_title(p_experience uuid) returns text
language sql stable security definer set search_path = public as $$
  select t.title from experience_translations t where t.experience_id = p_experience order by (t.locale = 'en') desc limit 1
$$;

create or replace function admin_operator_dues() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'statements', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', st.id, 'operator', o.name, 'currency', st.currency, 'period_start', st.period_start, 'period_end', st.period_end,
        'collected_minor', st.collected_minor, 'due_minor', st.due_minor, 'status', st.status,
        'trips', (select coalesce(jsonb_agg(jsonb_build_object('ref', b.ref, 'starts_at', b.starts_at, 'title', app.booking_title(b.experience_id),
                    'seats', b.seats, 'source', b.source, 'paid_minor', b.paid_minor, 'operator_net_minor', b.operator_net_minor,
                    'due_minor', b.paid_minor - b.operator_net_minor) order by b.starts_at), '[]'::jsonb)
                    from bookings b where b.settled_statement_id = st.id))
        order by o.name, st.period_start), '[]'::jsonb)
        from operator_statements st join organizations o on o.id = st.operator_id where st.status = 'open'),
    'unsettled', (select coalesce(jsonb_agg(jsonb_build_object('ref', b.ref, 'operator', o.name, 'currency', b.currency,
        'starts_at', b.starts_at, 'title', app.booking_title(b.experience_id), 'seats', b.seats, 'source', b.source,
        'paid_minor', b.paid_minor, 'operator_net_minor', b.operator_net_minor, 'due_minor', b.paid_minor - b.operator_net_minor)
        order by o.name, b.starts_at), '[]'::jsonb)
        from bookings b join organizations o on o.id = b.operator_id
       where b.execution_status = 'executed' and b.settled_statement_id is null)
  );
end $$;

create or replace function admin_partner_dues() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(x order by x->>'partner'), '[]'::jsonb) from (
    select jsonb_build_object('partner', p.name, 'partner_type', p.type, 'instapay', d.instapay_handle, 'currency', cm.currency,
           'total_minor', sum(cm.amount_minor),
           'trips', jsonb_agg(jsonb_build_object('ref', b.ref, 'starts_at', b.starts_at, 'title', app.booking_title(b.experience_id),
                    'operator', o.name, 'seats', b.seats, 'paid_minor', b.paid_minor, 'commission_minor', cm.amount_minor)
                    order by b.starts_at)) x
      from commissions cm join bookings b on b.id = cm.booking_id
      join organizations p on p.id = cm.partner_org_id join organizations o on o.id = b.operator_id
      left join org_private_details d on d.org_id = p.id
     where cm.status = 'payable' and cm.payout_id is null
     group by p.id, p.name, p.type, d.instapay_handle, cm.currency) y);
end $$;

revoke execute on function admin_operator_dues(), admin_partner_dues(), app.booking_title(uuid) from public, anon;
grant execute on function admin_operator_dues(), admin_partner_dues() to authenticated, service_role;
grant execute on function app.booking_title(uuid) to authenticated, service_role;
