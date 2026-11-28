-- Traveller survey (wenro.site/survey): anonymous answers from travellers, read only by the WENRO team.
-- Answers are checked against the question list on the server (src/lib/survey.ts) before they get here;
-- this layer caps sizes, keeps the table closed to everyone but the server, and lets the team read results.

create table if not exists survey_responses (
  id         uuid primary key default gen_random_uuid(),
  survey     text not null check (survey ~ '^[a-z0-9-]{3,40}$'),
  locale     text not null check (locale in ('ar', 'en', 'de', 'ru', 'fr')),
  source     text check (source ~ '^[a-z0-9_-]{1,30}$'),
  answers    jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 12000),
  other      jsonb not null default '{}'::jsonb check (jsonb_typeof(other) = 'object' and pg_column_size(other) < 4000),
  -- only when the traveller chose to leave it, for a follow-up chat
  contact    text check (char_length(contact) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists survey_responses_survey_created on survey_responses (survey, created_at desc);

alter table survey_responses enable row level security;
-- no policies: only the database functions below read or write it
revoke all on survey_responses from public, anon, authenticated;

-- The server, for a visitor (rate-limited in /api/survey)
create or replace function submit_survey(p_survey text, p_locale text, p_source text, p_answers jsonb, p_other jsonb, p_contact text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not app.is_service() then raise exception 'forbidden'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or p_answers = '{}'::jsonb then raise exception 'invalid_input'; end if;
  insert into survey_responses (survey, locale, source, answers, other, contact)
  values (p_survey, coalesce(p_locale, 'en'), nullif(lower(btrim(p_source)), ''),
          p_answers, coalesce(case when jsonb_typeof(p_other) = 'object' then p_other end, '{}'::jsonb),
          nullif(left(btrim(p_contact), 120), ''))
  returning id into v_id;
  return v_id;
end $$;

-- WENRO dashboard (owner, ops, content): the latest 2000 answers of one survey
create or replace function admin_survey(p_survey text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops','content']::member_role[]) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'locale', r.locale, 'source', r.source, 'answers', r.answers, 'other', r.other,
      'contact', r.contact, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
    from (select * from survey_responses where survey = p_survey order by created_at desc limit 2000) r);
end $$;

-- Remove one answer (spam, or a traveller asked for their contact details to be deleted)
create or replace function delete_survey_response(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.is_platform(array['owner','ops']::member_role[]) then raise exception 'forbidden'; end if;
  delete from survey_responses where id = p_id;
end $$;

revoke all on function submit_survey(text, text, text, jsonb, jsonb, text), admin_survey(text), delete_survey_response(uuid)
  from public, anon, authenticated;
grant execute on function admin_survey(text), delete_survey_response(uuid) to authenticated, service_role;
grant execute on function submit_survey(text, text, text, jsonb, jsonb, text) to service_role;
