#!/usr/bin/env bash
# Runs the database test-suite against a THROWAWAY local Postgres database.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres ./scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-wenro_test}

dropdb --if-exists "$DB" >/dev/null
createdb "$DB"
args=(-v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/tests/00_local_supabase_stub.sql)
for f in supabase/migrations/*.sql; do args+=(-f "$f"); done
args+=(-f supabase/seed.sql)
psql "${args[@]}"
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/10_booking_engine_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/30_messaging_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/40_editor_team_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/50_reviews_accounts_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/60_locations_identity_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/70_notifications_visits_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/80_growth_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
psql -v ON_ERROR_STOP=1 -q -o /dev/null -d "$DB" -f supabase/tests/90_trip_themes_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
bash supabase/tests/20_concurrency_test.sh "$DB"
