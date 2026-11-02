-- [DEMO] content for the hosted project during development. No users, no bookings.
-- Remove everything with supabase/demo/remove_demo.sql before launch.
insert into organizations (id, type, status, name, slug) values
  ('10000000-0000-0000-0000-000000000002', 'operator', 'active', '[DEMO] Red Sea Boats', 'demo-red-sea-boats'),
  ('10000000-0000-0000-0000-000000000003', 'operator', 'active', '[DEMO] Desert Riders', 'demo-desert-riders'),
  ('10000000-0000-0000-0000-000000000004', 'marketer', 'active', '[DEMO] Travel Blogger', 'demo-blogger')
on conflict (id) do nothing;
insert into partner_codes (org_id, code) values ('10000000-0000-0000-0000-000000000004', 'BLOGGER10') on conflict do nothing;

insert into hotels (id, zone_id, name) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '[DEMO] Hurghada Beach Hotel'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '[DEMO] Gouna Lagoon Resort')
on conflict (id) do nothing;

insert into experiences (id, operator_id, category_id, slug, status, booking_mode, duration_minutes,
                         collection_currency, cancellation_policy_id, private_available, private_max_group)
values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000001', 'demo-giftun-island', 'published', 'instant', 420,
        'EUR', '40000000-0000-0000-0000-000000000001', true, 12),
       ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002', 'demo-quad-safari', 'published', 'request', 180,
        'EUR', '40000000-0000-0000-0000-000000000002', false, null)
on conflict (id) do nothing;

insert into experience_translations (experience_id, locale, title, summary) values
  ('50000000-0000-0000-0000-000000000001', 'en', '[DEMO] Giftun Island Snorkeling', 'Demo listing for testing.'),
  ('50000000-0000-0000-0000-000000000001', 'ar', '[DEMO] رحلة جزيرة الجفتون', 'بيانات تجريبية للاختبار.'),
  ('50000000-0000-0000-0000-000000000002', 'en', '[DEMO] Quad Desert Safari', 'Demo listing for testing.')
on conflict do nothing;

insert into price_categories (experience_id, kind, net_minor, age_min, age_max, max_group) values
  ('50000000-0000-0000-0000-000000000001', 'adult', 2400, 12, null, null),
  ('50000000-0000-0000-0000-000000000001', 'child', 1200, 4, 11, null),
  ('50000000-0000-0000-0000-000000000001', 'infant', 0, 0, 3, null),
  ('50000000-0000-0000-0000-000000000002', 'adult', 2500, 16, null, null)
on conflict do nothing;

insert into extras (id, experience_id, net_minor, per) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 800, 'person') on conflict do nothing;
insert into extra_translations (extra_id, locale, name) values
  ('60000000-0000-0000-0000-000000000001', 'en', '[DEMO] Intro dive') on conflict do nothing;

insert into transport_prices (experience_id, zone_id, net_minor, per, vehicle_capacity) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1600, 'vehicle', 7),
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 2400, 'vehicle', 7)
on conflict do nothing;

insert into fx_rates (base, quote, rate, source) values ('EUR', 'USD', 1.08, 'manual'), ('EUR', 'RUB', 98.5, 'manual')
on conflict do nothing;

-- Daily departures for the next 30 days (Hurghada time)
insert into slots (experience_id, starts_at, capacity)
select e.id, ((current_date + d) + tm) at time zone 'Africa/Cairo', e.cap
  from (values ('50000000-0000-0000-0000-000000000001'::uuid, 20), ('50000000-0000-0000-0000-000000000002'::uuid, 8)) e(id, cap),
       generate_series(1, 30) d, (values (time '08:30'), (time '13:00')) t(tm)
on conflict (experience_id, starts_at) do nothing;
