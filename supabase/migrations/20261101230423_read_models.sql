-- Read models for the public site. One call returns everything a page needs,
-- so the web app stays thin and the rules stay in the database.

-- Everything the experience page needs, in the visitor's language (falls back to English).
-- SECURITY INVOKER: row-level security applies, so only published experiences are visible
-- to visitors, and prices come from public_prices() (display prices, never net).
create or replace function experience_page(p_slug text, p_locale text default 'en')
returns jsonb language sql stable security invoker set search_path = public as $$
  with e as (
    select * from experiences where slug = p_slug and status = 'published'
  ), tr as (
    select t.* from experience_translations t join e on e.id = t.experience_id
     order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1
  )
  select jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'booking_mode', e.booking_mode, 'duration_minutes', e.duration_minutes,
    'currency', e.collection_currency, 'private_available', e.private_available,
    'locale', tr.locale, 'title', tr.title, 'summary', tr.summary, 'description', tr.description,
    'itinerary', tr.itinerary, 'included', tr.included, 'excluded', tr.excluded,
    'requirements', tr.requirements, 'meeting_info', tr.meeting_info,
    'category', (select c.slug from categories c where c.id = e.category_id),
    'policy', (select jsonb_build_object('code', p.code, 'free_cancel_hours', p.free_cancel_hours)
                 from cancellation_policies p where p.id = e.cancellation_policy_id),
    'prices', (select coalesce(jsonb_agg(to_jsonb(pp)), '[]'::jsonb) from public_prices(e.id) pp),
    -- extras come from public_prices() (the extras table itself holds net prices and is not public)
    'extras', (select coalesce(jsonb_agg(jsonb_build_object('id', pp.ref_id, 'per', pp.per,
                 'price_minor', pp.price_minor,
                 'name', (select xt.name from extra_translations xt where xt.extra_id = pp.ref_id
                           order by (xt.locale = p_locale) desc, (xt.locale = 'en') desc limit 1))), '[]'::jsonb)
                 from public_prices(e.id) pp where pp.kind = 'extra'),
    'slots', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'starts_at', s.starts_at,
                 'seats_left', s.capacity - s.booked) order by s.starts_at), '[]'::jsonb)
                from slots s where s.experience_id = e.id and s.status = 'open'
                 and s.starts_at > now() and s.starts_at < now() + interval '90 days'),
    'hotels', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name,
                 'zone_id', z.id, 'zone', z.name) order by z.sort, h.name), '[]'::jsonb)
                 from hotels h join zones z on z.id = h.zone_id where h.active),
    'media', (select coalesce(jsonb_agg(jsonb_build_object('path', m.storage_path, 'alt', m.alt) order by m.sort), '[]'::jsonb)
                from experience_media m where m.experience_id = e.id),
    -- latest rate per display currency (1 collection unit = rate display units); display only
    'fx', (select coalesce(jsonb_object_agg(f.quote, f.rate), '{}'::jsonb) from (
             select distinct on (quote) quote, rate from fx_rates
              where base = e.collection_currency order by quote, effective_at desc) f)
  )
  from e left join tr on true
$$;

-- Cards for the home page: published experiences with their lowest adult display price
create or replace function experience_list(p_locale text default 'en')
returns jsonb language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'currency', e.collection_currency, 'duration_minutes', e.duration_minutes,
    'category', (select c.slug from categories c where c.id = e.category_id),
    'title', (select t.title from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'summary', (select t.summary from experience_translations t where t.experience_id = e.id
               order by (t.locale = p_locale) desc, (t.locale = 'en') desc limit 1),
    'from_minor', (select min(pp.price_minor) from public_prices(e.id) pp where pp.kind = 'adult'))
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

-- Voucher / manage page: richer than before (title, operator, pickup)
create or replace function booking_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', b.id, 'ref', b.ref, 'status', b.status, 'execution_status', b.execution_status,
    'starts_at', b.starts_at, 'currency', b.currency, 'paid_minor', b.paid_minor, 'gross_minor', b.gross_minor,
    'discount_minor', b.discount_minor, 'qr_token', b.qr_token, 'locale', b.locale,
    'reconfirm_status', b.reconfirm_status, 'terms', b.terms_snapshot, 'is_private', b.is_private,
    'display_currency', b.display_currency, 'display_rate', b.display_rate,
    'transport', b.transport, 'cancel_reason', b.cancel_reason,
    'experience', jsonb_build_object('slug', e.slug, 'title',
        (select t.title from experience_translations t where t.experience_id = e.id
          order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1),
        'meeting_info', (select t.meeting_info from experience_translations t where t.experience_id = e.id
          order by (t.locale = b.locale) desc, (t.locale = 'en') desc limit 1)),
    'operator', o.name,
    'hotel', h.name, 'zone', z.name,
    'lines', (select jsonb_agg(jsonb_build_object('kind', l.kind, 'quantity', l.quantity,
                'unit_price_minor', l.unit_price_minor, 'line_price_minor', l.line_price_minor) order by l.kind)
                from booking_lines l where l.booking_id = b.id),
    'customer', jsonb_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone, 'room', c.room))
  from bookings b
  join booking_contacts c on c.booking_id = b.id
  join experiences e on e.id = b.experience_id
  join organizations o on o.id = b.operator_id
  left join hotels h on h.id = b.hotel_id
  left join zones z on z.id = h.zone_id
  where b.manage_token_hash = app.token_hash(p_token)
$$;

revoke execute on function experience_page(text, text), experience_list(text), booking_by_token(text)
  from public, anon, authenticated;
grant execute on function experience_page(text, text), experience_list(text) to anon, authenticated, service_role;
grant execute on function booking_by_token(text) to service_role;

-- Fix: extra_translations policies looked up the parent extra through the extras table,
-- which visitors cannot read (it holds net prices), so extra names were invisible to them.
create or replace function app.extra_experience(p_extra uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select experience_id from extras where id = p_extra
$$;
revoke execute on function app.extra_experience(uuid) from public;
grant execute on function app.extra_experience(uuid) to anon, authenticated, service_role;

alter policy read_visible on extra_translations
  using (app.can_read_experience(app.extra_experience(extra_id)));
alter policy edit_own on extra_translations
  using (app.can_edit_experience(app.extra_experience(extra_id)))
  with check (app.can_edit_experience(app.extra_experience(extra_id)));
