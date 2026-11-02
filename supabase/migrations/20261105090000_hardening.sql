-- Hardening after the security review (Nov 2026).
--  1. Bookings made by a signed-in person (not the server) must be agency counter bookings by a member
--     of that agency. Stops anyone with an account from calling create_booking directly through the API,
--     around the server's spam checks.
--  2. A shared rate limiter for the server (sign-in emails, bookings, partner applications, link visits).
--     IPs are stored only as salted hashes and expire within a day.
--  3. Policies evaluate auth.uid() once per query (performance advisor), and indexes for foreign keys
--     that the dashboards join on.

-- 1 ---------------------------------------------------------------------------------------------------
create or replace function app.guard_booking_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if app.is_service() then return new; end if;
  if new.source = 'agency' and new.partner_org_id is not null and new.created_by_user = auth.uid()
     and app.has_role(new.partner_org_id) then
    return new;
  end if;
  raise exception 'forbidden';
end $$;

create or replace trigger bookings_guard_insert before insert on bookings
  for each row execute function app.guard_booking_insert();

-- 2 ---------------------------------------------------------------------------------------------------
create table if not exists rate_limits (
  bucket text not null,              -- e.g. 'signin:<hash>'
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);
alter table rate_limits enable row level security; -- no policies: only the function below touches it

/** Counts one hit in a fixed window; true while the bucket is under its limit. Server only. */
create or replace function hit_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_hits int;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if p_bucket is null or length(p_bucket) > 200 or p_max < 1 or p_window_seconds < 1 then raise exception 'invalid_input'; end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (bucket, window_start, hits) values (p_bucket, v_start, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  -- tidy up now and then (cheap: about one call in fifty)
  if random() < 0.02 then delete from rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_max;
end $$;
revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, int, int) to service_role;

-- 3 ---------------------------------------------------------------------------------------------------
alter policy own_profile on profiles using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy own_favorites on favorites using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy own_memberships on memberships
  using ((user_id = (select auth.uid())) or app.has_role(org_id, array['owner'::member_role, 'manager'::member_role]));

create index if not exists bookings_experience_idx on bookings (experience_id, starts_at);
create index if not exists bookings_hotel_idx on bookings (hotel_id);
create index if not exists bookings_coupon_idx on bookings (coupon_id);
create index if not exists bookings_partner_code_idx on bookings (partner_code_id);
create index if not exists bookings_created_by_idx on bookings (created_by_user);
create index if not exists bookings_statement_idx on bookings (settled_statement_id);
create index if not exists booking_lines_booking_idx on booking_lines (booking_id);
create index if not exists commissions_partner_idx on commissions (partner_org_id);
create index if not exists commissions_payout_idx on commissions (payout_id);
create index if not exists experience_media_exp_idx on experience_media (experience_id, sort);
create index if not exists experiences_category_idx on experiences (category_id);
create index if not exists experiences_policy_idx on experiences (cancellation_policy_id);
create index if not exists extras_experience_idx on extras (experience_id);
create index if not exists attribution_clicks_code_idx on attribution_clicks (partner_code_id);
create index if not exists attribution_clicks_exp_idx on attribution_clicks (experience_id);
create index if not exists partner_codes_org_idx on partner_codes (org_id);
create index if not exists ledger_entries_org_idx on ledger_entries (org_id);
create index if not exists favorites_experience_idx on favorites (experience_id);
create index if not exists reviews_experience_idx on reviews (experience_id);
create index if not exists transport_prices_zone_idx on transport_prices (zone_id);
create index if not exists org_invites_invited_by_idx on org_invites (invited_by);
create index if not exists operator_statements_received_by_idx on operator_statements (received_by);
create index if not exists partner_payouts_paid_by_idx on partner_payouts (paid_by);
