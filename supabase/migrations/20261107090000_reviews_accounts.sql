-- Reviews from real guests, and usernames + passwords for team accounts (Nov 2026).
--
-- Reviews
--  * Only a guest whose trip was checked in (execution_status = 'executed') can review, through the private
--    link of their own booking, once per booking, within 120 days of the trip. Nobody else can create one.
--  * New reviews wait for the WENRO team (owner, ops, content) to publish or hide them. Only published
--    reviews are public. Publishing never changes what the guest wrote.
--  * Shown with the guest's first name and initial only, and a "verified booking" mark.
--
-- Accounts
--  * A username (unique, lower case) and a flag that the person has set a password (the password itself
--    lives only in Supabase Auth, hashed). Sign-in with a username looks up the email on the server only.

-- Reviews ----------------------------------------------------------------------------------------------
alter table reviews add column if not exists author_name text;
alter table reviews add column if not exists moderated_at timestamptz;
alter table reviews add column if not exists moderated_by uuid references auth.users(id);
create index if not exists reviews_pending_idx on reviews (created_at) where not approved and moderated_at is null;

drop trigger if exists audit_reviews on reviews;
create trigger audit_reviews after insert or update or delete on reviews for each row execute function app.audit();

/** "Ahmed Badry" -> "Ahmed B." (never the full name) */
create or replace function app.short_name(p text) returns text language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when array_length(regexp_split_to_array(btrim(p), '\s+'), 1) = 1 then btrim(p)
    else split_part(btrim(p), ' ', 1) || ' ' ||
         left((regexp_split_to_array(btrim(p), '\s+'))[array_length(regexp_split_to_array(btrim(p), '\s+'), 1)], 1) || '.'
  end
$$;

/** What the guest's booking page needs: may they review, and their review if they already did. Server only. */
create or replace function review_for_token(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare b bookings; r reviews;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  select * into b from bookings where manage_token_hash = app.token_hash(p_token);
  if not found then return null; end if;
  select * into r from reviews where booking_id = b.id;
  return jsonb_build_object(
    'eligible', r.id is null and b.execution_status = 'executed' and b.starts_at > now() - interval '120 days',
    'review', case when r.id is null then null else jsonb_build_object('rating', r.rating, 'body', r.body,
              'status', case when r.approved then 'published' when r.moderated_at is not null then 'hidden' else 'pending' end) end);
end $$;

create or replace function submit_review_by_token(p_token text, p_rating int, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare b bookings; v_body text := nullif(btrim(coalesce(p_body, '')), ''); v_id uuid;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  select * into b from bookings where manage_token_hash = app.token_hash(p_token);
  if not found then raise exception 'booking_not_found'; end if;
  if b.execution_status <> 'executed' then raise exception 'review_not_yet'; end if;
  if b.starts_at < now() - interval '120 days' then raise exception 'review_too_late'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'invalid_rating'; end if;
  if v_body is not null and length(v_body) > 1500 then raise exception 'review_too_long'; end if;
  insert into reviews (booking_id, experience_id, rating, body, locale, author_name)
  values (b.id, b.experience_id, p_rating, v_body, b.locale,
          app.short_name((select c.full_name from booking_contacts c where c.booking_id = b.id)))
  on conflict (booking_id) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'already_reviewed'; end if;
  return jsonb_build_object('id', v_id, 'status', 'pending');
end $$;

/** Public: rating summary and the latest published reviews of one trip. */
create or replace function experience_reviews(p_experience uuid, p_limit int default 12) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'count', (select count(*) from reviews where experience_id = p_experience and approved),
    'average', (select round(avg(rating)::numeric, 1) from reviews where experience_id = p_experience and approved),
    'stars', (select coalesce(jsonb_object_agg(rating, n), '{}'::jsonb) from (
               select rating, count(*) n from reviews where experience_id = p_experience and approved group by rating) x),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'body', r.body,
               'author', coalesce(r.author_name, 'Guest'), 'locale', r.locale, 'trip_date', b.starts_at, 'created_at', r.created_at)
               order by r.created_at desc), '[]'::jsonb)
               from (select * from reviews where experience_id = p_experience and approved
                      order by created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 50)) r
               join bookings b on b.id = r.booking_id)
  )
$$;

/** WENRO team: reviews to moderate (pending first), or all. */
create or replace function admin_reviews(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'rating', r.rating, 'body', r.body,
      'author', r.author_name, 'locale', r.locale, 'created_at', r.created_at, 'ref', b.ref, 'trip_date', b.starts_at,
      'title', app.booking_title(r.experience_id), 'slug', e.slug, 'operator', o.name,
      'status', case when r.approved then 'published' when r.moderated_at is not null then 'hidden' else 'pending' end)
      order by r.created_at desc), '[]'::jsonb)
    from reviews r join bookings b on b.id = r.booking_id join experiences e on e.id = r.experience_id
    join organizations o on o.id = e.operator_id
   where case p_status when 'pending' then not r.approved and r.moderated_at is null
                       when 'published' then r.approved
                       when 'hidden' then not r.approved and r.moderated_at is not null
                       else true end);
end $$;

create or replace function moderate_review(p_review uuid, p_publish boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  update reviews set approved = p_publish, moderated_at = now(), moderated_by = auth.uid() where id = p_review;
  if not found then raise exception 'review_not_found'; end if;
  return jsonb_build_object('id', p_review, 'published', p_publish);
end $$;

/** Operators (owner/manager): published reviews of their own trips. */
create or replace function operator_reviews(p_operator uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (app.has_role(p_operator, array['owner','manager']::member_role[]) or app.is_platform()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('rating', r.rating, 'body', r.body, 'author', r.author_name,
      'created_at', r.created_at, 'title', app.booking_title(r.experience_id), 'ref', b.ref) order by r.created_at desc), '[]'::jsonb)
    from reviews r join experiences e on e.id = r.experience_id join bookings b on b.id = r.booking_id
   where e.operator_id = p_operator and r.approved);
end $$;

-- Trip cards: average and count of published reviews (security invoker: only published rows are readable)
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
    'from_minor', (select min(pp.price_minor) from public_prices(e.id) pp where pp.kind = 'adult'),
    'rating', (select round(avg(r.rating)::numeric, 1) from reviews r where r.experience_id = e.id and r.approved),
    'reviews', (select count(*) from reviews r where r.experience_id = e.id and r.approved))
    order by e.created_at), '[]'::jsonb)
  from experiences e where e.status = 'published'
$$;

revoke execute on function review_for_token(text), submit_review_by_token(text, int, text) from public, anon, authenticated;
grant execute on function review_for_token(text), submit_review_by_token(text, int, text) to service_role;
revoke execute on function admin_reviews(text), moderate_review(uuid, boolean), operator_reviews(uuid) from public, anon;
grant execute on function admin_reviews(text), moderate_review(uuid, boolean), operator_reviews(uuid) to authenticated, service_role;
grant execute on function experience_reviews(uuid, int) to anon, authenticated, service_role;
revoke execute on function app.short_name(text) from public, anon, authenticated;

-- Accounts ---------------------------------------------------------------------------------------------
alter table profiles add column if not exists username text;
alter table profiles add column if not exists password_set_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table profiles add constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$');
  end if;
end $$;
create unique index if not exists profiles_username_key on profiles (username);

create or replace function my_account() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email', (select email from auth.users where id = auth.uid()),
    'username', p.username, 'password_set', p.password_set_at is not null, 'full_name', p.full_name)
  from (select auth.uid() uid) me left join profiles p on p.id = me.uid
  where me.uid is not null
$$;

create or replace function set_username(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v text := lower(btrim(coalesce(p_username, '')));
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if v !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then raise exception 'invalid_username'; end if;
  if v in ('admin', 'wenro', 'support', 'root', 'owner', 'system', 'help') then raise exception 'username_taken'; end if;
  if exists (select 1 from profiles where username = v and id <> auth.uid()) then raise exception 'username_taken'; end if;
  insert into profiles (id, username) values (auth.uid(), v)
  on conflict (id) do update set username = excluded.username;
  return jsonb_build_object('username', v);
exception when unique_violation then raise exception 'username_taken';
end $$;

create or replace function mark_password_set() returns void
language sql security definer set search_path = public as $$
  insert into profiles (id, password_set_at) values (auth.uid(), now())
  on conflict (id) do update set password_set_at = now()
$$;

/** Server only: the email behind a username, for password sign-in. */
create or replace function email_for_username(p_username text) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  return (select u.email from profiles p join auth.users u on u.id = p.id where p.username = lower(btrim(p_username)));
end $$;

revoke execute on function my_account(), set_username(text), mark_password_set() from public, anon;
grant execute on function my_account(), set_username(text), mark_password_set() to authenticated, service_role;
revoke execute on function email_for_username(text) from public, anon, authenticated;
grant execute on function email_for_username(text) to service_role;
