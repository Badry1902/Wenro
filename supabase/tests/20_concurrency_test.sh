#!/usr/bin/env bash
# Two customers press "Book" at the same moment for the last 2 seats.
# Exactly one booking must succeed; the other must get sold_out.
set -euo pipefail
DB=$1
q() { psql -X -q -t -A -d "$DB" "$@"; }

q -c "insert into slots (id, experience_id, starts_at, capacity) values
      ('7a000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001', now() + interval '10 days', 2)"

BOOK="select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false);
begin;
select (create_booking(jsonb_build_object(
  'experience_id','50000000-0000-0000-0000-000000000001',
  'slot_id','7a000000-0000-0000-0000-000000000001',
  'quantities', jsonb_build_object('adult', 2),
  'customer', jsonb_build_object('full_name','Race','email','race@demo.wenro.test','phone','+49 151 1111111'))))->>'ref';
select pg_sleep(1);
commit;"

out=$(mktemp -d)
q -c "$BOOK" >"$out/a" 2>&1 &
q -c "$BOOK" >"$out/b" 2>&1 &
wait || true

ok=$(grep -h -c '^WR-' "$out/a" "$out/b" | paste -sd+ | bc)
sold=$(grep -h -c 'sold_out' "$out/a" "$out/b" | paste -sd+ | bc)
booked=$(q -c "select booked from slots where id='7a000000-0000-0000-0000-000000000001'")
if [[ "$ok" == 1 && "$sold" == 1 && "$booked" == 2 ]]; then
  echo "  ok - concurrent booking on the last seats: one succeeds, one gets sold_out, no overbooking"
else
  echo "FAIL: concurrency (success=$ok sold_out=$sold booked=$booked)"; cat "$out/a" "$out/b"; exit 1
fi
