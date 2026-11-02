-- WENRO core data model
-- Money is stored in minor units (cents/piasters) as bigint, always with an explicit currency.
-- All times are timestamptz; the business timezone is Africa/Cairo (Hurghada).

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type org_type as enum ('platform', 'operator', 'agency', 'marketer');
create type org_status as enum ('pending', 'active', 'suspended');
create type member_role as enum ('owner', 'manager', 'staff', 'ops', 'finance', 'support', 'content');
create type experience_status as enum ('draft', 'in_review', 'published', 'archived');
create type booking_mode as enum ('instant', 'request');
create type price_kind as enum ('adult', 'child', 'infant', 'private_group');
create type charge_per as enum ('person', 'booking', 'vehicle');
create type slot_status as enum ('open', 'closed', 'cancelled');
create type booking_status as enum ('pending_request', 'confirmed', 'cancelled', 'expired', 'declined');
create type execution_status as enum ('scheduled', 'executed', 'no_show', 'not_operated');
create type booking_source as enum ('direct', 'marketer', 'agency');
create type reconfirm_status as enum ('not_sent', 'sent', 'confirmed');
create type commission_status as enum ('pending', 'eligible', 'payable', 'paid', 'void');
create type statement_status as enum ('open', 'received');
create type payout_status as enum ('pending', 'paid');

create domain collect_currency as text check (value in ('EUR', 'USD', 'EGP'));
create domain display_currency as text check (value in ('EUR', 'USD', 'GBP', 'RUB', 'EGP'));
create domain locale_code as text check (value in ('en', 'de', 'ru', 'fr', 'ar'));
create domain money_minor as bigint check (value >= 0);

-- ---------------------------------------------------------------------------
-- Platform settings (single row). Commercial rules live here, never in the client.
-- ---------------------------------------------------------------------------
create table platform_settings (
  id boolean primary key default true check (id),
  operator_share_bps int not null default 8000 check (operator_share_bps between 1 and 10000),
  partner_share_bps int not null default 1000 check (partner_share_bps between 0 and 10000),
  max_discount_bps int not null default 1000 check (max_discount_bps between 0 and 10000),
  price_rounding_minor int not null default 100 check (price_rounding_minor > 0),
  attribution_days int not null default 30,
  request_expiry_hours int not null default 12,
  reconfirm_send_local time not null default '18:00',
  admin_alert_local time not null default '21:00',
  reconfirm_cutoff_local time not null default '22:00',
  operator_phone_reveal_hours int not null default 24,
  business_timezone text not null default 'Africa/Cairo',
  updated_at timestamptz not null default now()
);
insert into platform_settings default values;

-- ---------------------------------------------------------------------------
-- Organizations, people and roles
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  type org_type not null,
  status org_status not null default 'pending',
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);
create unique index one_platform_org on organizations ((type)) where type = 'platform';

-- Private details: legal data, documents, payout handle. Never public.
create table org_private_details (
  org_id uuid primary key references organizations(id) on delete cascade,
  legal_name text,
  tax_id text,
  contact_phone text,
  contact_email text,
  instapay_handle text,
  documents jsonb not null default '[]'::jsonb,
  notes text
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  locale locale_code not null default 'en',
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user on memberships(user_id) where active;

-- Referral codes for marketers and agencies
create table partner_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{4,20}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort int not null default 0
);
create table category_translations (
  category_id uuid not null references categories(id) on delete cascade,
  locale locale_code not null,
  name text not null,
  primary key (category_id, locale)
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort int not null default 0
);
create table hotels (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id),
  name text not null,
  active boolean not null default true,
  unique (zone_id, name)
);

-- Cancellation policy templates the operator chooses from.
-- rules: [{"hours_before": 24, "refundable": true}, ...] interpreted by app.can_cancel_free()
create table cancellation_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  free_cancel_hours int not null check (free_cancel_hours >= 0),
  sort int not null default 0
);
create table cancellation_policy_translations (
  policy_id uuid not null references cancellation_policies(id) on delete cascade,
  locale locale_code not null,
  title text not null,
  body text not null,
  primary key (policy_id, locale)
);

-- ---------------------------------------------------------------------------
-- Experiences and pricing (operator enters NET prices; display prices are derived)
-- ---------------------------------------------------------------------------
create table experiences (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references organizations(id),
  category_id uuid references categories(id),
  slug text not null unique,
  status experience_status not null default 'draft',
  booking_mode booking_mode not null default 'instant',
  duration_minutes int check (duration_minutes > 0),
  collection_currency collect_currency not null default 'EUR',
  cancellation_policy_id uuid references cancellation_policies(id),
  private_available boolean not null default false,
  private_max_group int check (private_max_group > 0),
  meeting_lat double precision,
  meeting_lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiences_operator on experiences(operator_id);
create index experiences_published on experiences(status) where status = 'published';

create table experience_translations (
  experience_id uuid not null references experiences(id) on delete cascade,
  locale locale_code not null,
  title text not null,
  summary text,
  description text,
  itinerary text,
  included text,
  excluded text,
  requirements text,
  meeting_info text,
  reviewed boolean not null default false, -- human-reviewed translation
  primary key (experience_id, locale)
);

create table experience_media (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  storage_path text not null,
  alt text,
  sort int not null default 0
);

create table price_categories (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  kind price_kind not null,
  net_minor money_minor not null,
  age_min int,
  age_max int,
  max_group int check (max_group > 0), -- for private_group
  active boolean not null default true,
  unique (experience_id, kind)
);

create table extras (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  net_minor money_minor not null,
  per charge_per not null default 'person' check (per in ('person', 'booking')),
  active boolean not null default true,
  sort int not null default 0
);
create table extra_translations (
  extra_id uuid not null references extras(id) on delete cascade,
  locale locale_code not null,
  name text not null,
  primary key (extra_id, locale)
);

-- Optional hotel transfer priced per zone, per person or per vehicle
create table transport_prices (
  experience_id uuid not null references experiences(id) on delete cascade,
  zone_id uuid not null references zones(id),
  net_minor money_minor not null,
  per charge_per not null check (per in ('person', 'vehicle')),
  vehicle_capacity int check (vehicle_capacity > 0),
  primary key (experience_id, zone_id),
  check (per = 'person' or vehicle_capacity is not null)
);

-- Departures with the seat allotment reserved for WENRO
create table slots (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  starts_at timestamptz not null,
  capacity int not null check (capacity >= 0),
  booked int not null default 0 check (booked >= 0),
  status slot_status not null default 'open',
  cancel_reason text,
  unique (experience_id, starts_at),
  check (booked <= capacity)
);
create index slots_upcoming on slots(experience_id, starts_at) where status = 'open';

-- ---------------------------------------------------------------------------
-- Commercial
-- ---------------------------------------------------------------------------
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  percent_bps int not null check (percent_bps > 0 and percent_bps <= 10000),
  valid_from timestamptz,
  valid_to timestamptz,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true
);

create table fx_rates (
  quote display_currency not null,
  base collect_currency not null,
  rate numeric(18, 8) not null check (rate > 0), -- 1 base = rate quote
  source text not null check (source in ('auto', 'manual')),
  effective_at timestamptz not null default now(),
  primary key (base, quote, effective_at)
);

-- ---------------------------------------------------------------------------
-- Bookings. Every commercial term is snapshotted at creation and never recomputed.
-- Booking, execution, settlement and commission states are tracked separately.
-- ---------------------------------------------------------------------------
create sequence booking_ref_seq start 1001;

create table bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('WR-' || nextval('booking_ref_seq')),
  experience_id uuid not null references experiences(id),
  operator_id uuid not null references organizations(id),
  slot_id uuid references slots(id),
  is_private boolean not null default false,
  starts_at timestamptz not null,
  seats int not null check (seats >= 0),
  status booking_status not null,
  execution_status execution_status not null default 'scheduled',
  reconfirm_status reconfirm_status not null default 'not_sent',
  -- money (collection currency, minor units)
  currency collect_currency not null,
  gross_minor money_minor not null,
  discount_minor money_minor not null default 0,
  paid_minor money_minor not null,          -- what the customer pays in cash
  operator_net_minor money_minor not null,  -- operator keeps this
  partner_commission_minor money_minor not null default 0,
  platform_share_minor money_minor not null,
  check (paid_minor = gross_minor - discount_minor),
  check (paid_minor = operator_net_minor + partner_commission_minor + platform_share_minor),
  -- snapshots
  terms_snapshot jsonb not null,            -- shares, rounding, policy, coupon
  display_currency display_currency,
  display_rate numeric(18, 8),
  -- source / attribution
  source booking_source not null default 'direct',
  partner_org_id uuid references organizations(id),
  partner_code_id uuid references partner_codes(id),
  created_by_user uuid references auth.users(id), -- agency staff who booked
  coupon_id uuid references coupons(id),
  -- pickup
  hotel_id uuid references hotels(id),
  transport boolean not null default false,
  locale locale_code not null default 'en',
  manage_token_hash bytea not null,
  qr_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  request_expires_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  executed_at timestamptz,
  settled_statement_id uuid,
  created_at timestamptz not null default now(),
  check (source = 'direct' or partner_org_id is not null)
);
create index bookings_operator on bookings(operator_id, starts_at);
create index bookings_partner on bookings(partner_org_id) where partner_org_id is not null;
create index bookings_slot on bookings(slot_id);

-- Customer PII kept apart so access can be controlled precisely.
create table booking_contacts (
  booking_id uuid primary key references bookings(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  room text,
  notes text
);

create table booking_lines (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  kind text not null check (kind in ('adult', 'child', 'infant', 'private_group', 'extra', 'transport')),
  ref_id uuid,
  quantity int not null check (quantity > 0),
  unit_net_minor money_minor not null,
  unit_price_minor money_minor not null,
  line_net_minor money_minor not null,
  line_price_minor money_minor not null
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  partner_org_id uuid not null references organizations(id),
  currency collect_currency not null,
  amount_minor money_minor not null,
  status commission_status not null default 'pending',
  payout_id uuid,
  updated_at timestamptz not null default now()
);

create table operator_statements (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references organizations(id),
  currency collect_currency not null,
  period_start date not null,
  period_end date not null,
  bookings_count int not null,
  collected_minor money_minor not null,  -- cash the operator collected
  due_minor money_minor not null,        -- owed to WENRO (platform + partner shares)
  status statement_status not null default 'open',
  received_at timestamptz,
  received_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (operator_id, currency, period_start)
);
alter table bookings add constraint bookings_statement_fk
  foreign key (settled_statement_id) references operator_statements(id);

create table partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_org_id uuid not null references organizations(id),
  currency collect_currency not null,
  period_month date not null,
  amount_minor money_minor not null,
  status payout_status not null default 'pending',
  method text not null default 'instapay',
  reference text,
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (partner_org_id, currency, period_month)
);
alter table commissions add constraint commissions_payout_fk
  foreign key (payout_id) references partner_payouts(id);

-- Append-only financial ledger. Corrections are new entries, never edits.
create table ledger_entries (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  entry_type text not null,
  booking_id uuid references bookings(id),
  org_id uuid references organizations(id),
  currency collect_currency not null,
  amount_minor bigint not null, -- signed
  memo text,
  actor uuid
);
create index ledger_booking on ledger_entries(booking_id);

create or replace function app.forbid_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries is append-only';
end $$;
create trigger ledger_no_update before update or delete on ledger_entries
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Reviews and favorites
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id),
  experience_id uuid not null references experiences(id),
  rating int not null check (rating between 1 and 5),
  body text,
  locale locale_code not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid not null references experiences(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

-- Attribution clicks (for marketer stats; no personal data)
create table attribution_clicks (
  id bigint generated always as identity primary key,
  partner_code_id uuid not null references partner_codes(id),
  experience_id uuid references experiences(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log for sensitive changes
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null,
  before jsonb,
  after jsonb
);

create or replace function app.audit() returns trigger language plpgsql security definer set search_path = public as $$
declare
  rid text;
begin
  rid := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'org_id');
  insert into audit_log(actor, table_name, row_id, action, before, after)
  values (auth.uid(), tg_table_name, rid, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['platform_settings','organizations','org_private_details','memberships',
    'partner_codes','experiences','price_categories','extras','transport_prices','slots','coupons',
    'bookings','commissions','operator_statements','partner_payouts','fx_rates']
  loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I
                    for each row execute function app.audit()', t);
  end loop;
end $$;

create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger experiences_touch before update on experiences
  for each row execute function app.touch_updated_at();
