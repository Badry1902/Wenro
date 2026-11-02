-- Catalogue browsing: more trip categories, and richer cards (several photos, pickup, cancellation window)
-- so the public site can show galleries on cards, filters and "similar trips".
-- Additive only: new reference rows (skipped when present) and a replaced read function.

insert into categories (id, slug, sort) values
  ('20000000-0000-0000-0000-000000000004', 'diving', 4),
  ('20000000-0000-0000-0000-000000000005', 'watersports', 5),
  ('20000000-0000-0000-0000-000000000006', 'family', 6),
  ('20000000-0000-0000-0000-000000000007', 'evening', 7),
  ('20000000-0000-0000-0000-000000000008', 'daytrips', 8),
  ('20000000-0000-0000-0000-000000000009', 'wellness', 9)
on conflict (id) do nothing;

insert into category_translations (category_id, locale, name) values
  ('20000000-0000-0000-0000-000000000004', 'en', 'Diving'),       ('20000000-0000-0000-0000-000000000004', 'ar', 'غوص'),
  ('20000000-0000-0000-0000-000000000005', 'en', 'Water sports'), ('20000000-0000-0000-0000-000000000005', 'ar', 'رياضات مائية'),
  ('20000000-0000-0000-0000-000000000006', 'en', 'Family fun'),   ('20000000-0000-0000-0000-000000000006', 'ar', 'مرح عائلي'),
  ('20000000-0000-0000-0000-000000000007', 'en', 'Evenings'),     ('20000000-0000-0000-0000-000000000007', 'ar', 'سهرات'),
  ('20000000-0000-0000-0000-000000000008', 'en', 'Day trips'),    ('20000000-0000-0000-0000-000000000008', 'ar', 'رحلات اليوم الكامل'),
  ('20000000-0000-0000-0000-000000000009', 'en', 'Wellness'),     ('20000000-0000-0000-0000-000000000009', 'ar', 'استرخاء')
on conflict do nothing;

-- Cards: up to six photos (cover first), whether hotel pickup is offered, the free-cancellation window
create or replace function experience_list(p_locale text default 'en')
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'currency', e.collection_currency, 'duration_minutes', e.duration_minutes,
    'booking_mode', e.booking_mode,
    'category', (select c.slug from categories c where c.id = e.category_id),
    'title', (select t.title from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'summary', (select t.summary from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'cover', (select jsonb_build_object('path', m.storage_path, 'alt', m.alt, 'kind', m.kind) from experience_media m
               where m.experience_id = e.id order by (m.kind = 'image') desc, m.sort limit 1),
    'images', (select coalesce(jsonb_agg(x.storage_path order by x.sort), '[]'::jsonb) from (
                 select m.storage_path, m.sort from experience_media m
                  where m.experience_id = e.id and m.kind = 'image' order by m.sort limit 6) x),
    'pickup', exists (select 1 from public_prices(e.id) pp where pp.kind = 'transport'),
    'free_cancel_hours', (select p.free_cancel_hours from cancellation_policies p where p.id = e.cancellation_policy_id),
    'from_minor', (select min(pp.price_minor) from public_prices(e.id) pp where pp.kind = 'adult'))
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;
