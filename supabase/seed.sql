-- DEMO DATA for LOCAL TESTS only. Every name is prefixed with [DEMO].
-- Never load into production. Prices are illustrative, not real offers.
-- The auth.users rows below only work on the local test stub; on a hosted Supabase
-- project, demo users must be created through Supabase Auth instead.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'op1-owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'op1-staff@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'op2-owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marketer@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'agency-manager@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'agency-staff@demo.wenro.test')
on conflict do nothing;

insert into organizations (id, type, status, name, slug) values
  ('10000000-0000-0000-0000-000000000002', 'operator', 'active', '[DEMO] Red Sea Boats', 'demo-red-sea-boats'),
  ('10000000-0000-0000-0000-000000000003', 'operator', 'active', '[DEMO] Desert Riders', 'demo-desert-riders'),
  ('10000000-0000-0000-0000-000000000004', 'marketer', 'active', '[DEMO] Travel Blogger', 'demo-blogger'),
  ('10000000-0000-0000-0000-000000000005', 'agency', 'active', '[DEMO] Sun Agency', 'demo-sun-agency');

insert into org_private_details (org_id, contact_phone, instapay_handle) values
  ('10000000-0000-0000-0000-000000000004', '+20 100 000 0004', 'demo-blogger@instapay'),
  ('10000000-0000-0000-0000-000000000005', '+20 100 000 0005', 'demo-sun@instapay');

insert into memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'staff'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d1', 'owner'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000e1', 'manager'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000e2', 'staff');

insert into partner_codes (org_id, code) values
  ('10000000-0000-0000-0000-000000000004', 'BLOGGER10'),
  ('10000000-0000-0000-0000-000000000005', 'SUNAGENCY');

insert into hotels (id, zone_id, name) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '[DEMO] Hurghada Beach Hotel'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '[DEMO] Gouna Lagoon Resort');

-- [DEMO] Giftun island trip: net 24 EUR adult, 12 EUR child, infants free
insert into experiences (id, operator_id, category_id, slug, status, booking_mode, duration_minutes,
                         collection_currency, cancellation_policy_id, private_available, private_max_group)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001', 'demo-giftun-island', 'published', 'instant', 420,
        'EUR', '40000000-0000-0000-0000-000000000001', true, 12),
       ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002', 'demo-quad-safari', 'published', 'request', 180,
        'EUR', '40000000-0000-0000-0000-000000000002', false, null);

insert into experience_translations (experience_id, locale, title, summary) values
  ('50000000-0000-0000-0000-000000000001', 'en', '[DEMO] Giftun Island Snorkeling', 'Demo listing for testing.'),
  ('50000000-0000-0000-0000-000000000001', 'ar', '[DEMO] رحلة جزيرة الجفتون', 'بيانات تجريبية للاختبار.'),
  ('50000000-0000-0000-0000-000000000002', 'en', '[DEMO] Quad Desert Safari', 'Demo listing for testing.');

insert into price_categories (experience_id, kind, net_minor, age_min, age_max, max_group) values
  ('50000000-0000-0000-0000-000000000001', 'adult', 2400, 12, null, null),
  ('50000000-0000-0000-0000-000000000001', 'child', 1200, 4, 11, null),
  ('50000000-0000-0000-0000-000000000001', 'infant', 0, 0, 3, null),
  ('50000000-0000-0000-0000-000000000001', 'private_group', 30000, null, null, 12),
  ('50000000-0000-0000-0000-000000000002', 'adult', 2500, 16, null, null);

insert into extras (id, experience_id, net_minor, per) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 800, 'person');
insert into extra_translations (extra_id, locale, name) values
  ('60000000-0000-0000-0000-000000000001', 'en', '[DEMO] Intro dive');

insert into transport_prices (experience_id, zone_id, net_minor, per, vehicle_capacity) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1600, 'vehicle', 7),
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 2400, 'vehicle', 7);

insert into coupons (code, percent_bps) values ('WELCOME10', 1000), ('TOOBIG', 2500);

insert into fx_rates (base, quote, rate, source) values ('EUR', 'USD', 1.08, 'manual'), ('EUR', 'RUB', 98.5, 'manual');
