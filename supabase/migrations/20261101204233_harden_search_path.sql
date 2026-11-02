-- Supabase security advisor: pin search_path on helper functions.
alter function app.digits(text) set search_path = pg_catalog;
alter function app.token_hash(text) set search_path = pg_catalog;
alter function app.is_service() set search_path = pg_catalog;
alter function app.forbid_mutation() set search_path = pg_catalog;
alter function app.touch_updated_at() set search_path = pg_catalog;
