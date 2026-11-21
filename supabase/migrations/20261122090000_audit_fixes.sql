-- Audit fixes (speed + security), 2026-11-22
-- 1. Indexes on the foreign keys that had none (Postgres does not index them automatically).
-- 2. A fixed search_path on the two helper functions the Supabase Security Advisor flagged.
-- 3. Server-side caps on lists that grow forever: newest 200 rows (pending items always first).

create index if not exists notifications_org_id_idx on public.notifications (org_id);
create index if not exists operator_payments_method_id_idx on public.operator_payments (method_id);
create index if not exists operator_payments_reviewed_by_idx on public.operator_payments (reviewed_by);
create index if not exists operator_payments_submitted_by_idx on public.operator_payments (submitted_by);
create index if not exists reviews_moderated_by_idx on public.reviews (moderated_by);
create index if not exists trip_daily_experience_id_idx on public.trip_daily (experience_id);

alter function app.short_name(text) set search_path = public;
alter function app.stamp_decision() set search_path = public, app;

create or replace function public.admin_reviews(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'rating', x.rating, 'body', x.body,
      'author', x.author_name, 'locale', x.locale, 'created_at', x.created_at, 'ref', x.ref, 'trip_date', x.starts_at,
      'title', app.booking_title(x.experience_id), 'slug', x.slug, 'operator', x.operator,
      'status', case when x.approved then 'published' when x.moderated_at is not null then 'hidden' else 'pending' end)
      order by x.created_at desc), '[]'::jsonb)
    from (select r.id, r.rating, r.body, r.author_name, r.locale, r.created_at, r.experience_id, r.approved, r.moderated_at,
                 b.ref, b.starts_at, e.slug, o.name as operator
            from reviews r join bookings b on b.id = r.booking_id join experiences e on e.id = r.experience_id
            join organizations o on o.id = e.operator_id
           where case p_status when 'pending' then not r.approved and r.moderated_at is null
                               when 'published' then r.approved
                               when 'hidden' then not r.approved and r.moderated_at is not null
                               else true end
           order by r.created_at desc
           limit 200) x);
end $$;

create or replace function public.operator_reviews(p_operator uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('rating', x.rating, 'body', x.body, 'author', x.author_name,
      'created_at', x.created_at, 'title', app.booking_title(x.experience_id), 'ref', x.ref) order by x.created_at desc), '[]'::jsonb)
    from (select r.rating, r.body, r.author_name, r.created_at, r.experience_id, b.ref
            from reviews r join experiences e on e.id = r.experience_id join bookings b on b.id = r.booking_id
           where e.operator_id = p_operator and r.approved
           order by r.created_at desc
           limit 200) x);
end $$;

create or replace function public.admin_operator_payments(p_status text default 'submitted')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','finance']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'operator', x.operator, 'operator_id', x.operator_id, 'currency', x.currency,
      'amount_minor', x.amount_minor, 'method', x.method_label, 'reference', x.reference, 'note', x.note, 'status', x.status,
      'created_at', x.created_at, 'reviewed_at', x.reviewed_at, 'review_note', x.review_note,
      'proof_kind', case when x.proof_path ~ '\.pdf$' then 'pdf' else 'image' end,
      'statements', (select jsonb_agg(jsonb_build_object('period_start', st.period_start, 'period_end', st.period_end, 'due_minor', st.due_minor,
                       'bookings_count', st.bookings_count, 'status', st.status) order by st.period_start)
                       from operator_statements st where st.id = any(x.statement_ids)))
      order by x.created_at desc), '[]'::jsonb)
    from (select op.*, o.name as operator
            from operator_payments op join organizations o on o.id = op.operator_id
           where p_status is null or op.status = p_status
           order by (op.status = 'submitted') desc, op.created_at desc
           limit 200) x);
end $$;
