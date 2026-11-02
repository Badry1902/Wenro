-- Fix: a trip checked in after a period's statement was created (or received) could never be settled,
-- because only one statement per operator, currency and start date was allowed. Idempotency never relied on
-- that rule (each booking is linked to exactly one statement), so allow several statements per period:
-- a second run for the same dates creates a "top-up" statement with only the trips not yet settled.
alter table operator_statements drop constraint if exists operator_statements_operator_id_currency_period_start_key;
create index if not exists operator_statements_operator_period on operator_statements (operator_id, currency, period_start);

-- Fix: commissions that became payable after this month's payout was already paid made "Prepare payouts" fail
-- (payout_already_paid_for_month). They now go into the next month's payout, which matches monthly payouts.
create or replace function create_partner_payouts(p_month date) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_id uuid; v_month date; n int := 0;
begin
  if not (app.is_service() or app.is_platform(array['owner','finance']::member_role[])) then
    raise exception 'forbidden';
  end if;
  for r in select partner_org_id, currency, sum(amount_minor) amt from commissions
            where status = 'payable' and payout_id is null group by partner_org_id, currency loop
    v_month := date_trunc('month', p_month)::date;
    -- first month (from p_month on) whose payout for this partner is not paid yet
    while exists (select 1 from partner_payouts where partner_org_id = r.partner_org_id and currency = r.currency
                   and period_month = v_month and status = 'paid') loop
      v_month := (v_month + interval '1 month')::date;
    end loop;
    insert into partner_payouts (partner_org_id, currency, period_month, amount_minor)
    values (r.partner_org_id, r.currency, v_month, r.amt)
    on conflict (partner_org_id, currency, period_month)
      do update set amount_minor = partner_payouts.amount_minor + excluded.amount_minor
      where partner_payouts.status = 'pending'
    returning id into v_id;
    update commissions set payout_id = v_id, updated_at = now()
     where partner_org_id = r.partner_org_id and currency = r.currency and status = 'payable' and payout_id is null;
    n := n + 1;
  end loop;
  return n;
end $$;
