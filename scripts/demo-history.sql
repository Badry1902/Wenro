-- ---------------------------------------------------------------------------
-- [DEMO] booking history: ~8 weeks back and 2 weeks ahead, made through the real booking engine
-- (prices, splits and commissions are computed exactly as for real bookings), then moved back in time.
-- Runs once: skipped when demo guests already exist.
-- ---------------------------------------------------------------------------
do $$
declare
  v_first text[] := array['Anna','Lukas','Sophie','Jonas','Lea','Felix','Olga','Dmitry','Elena','Ivan','Marie','Pierre','Camille','Emma','James','Oliver','Sara','Omar','Laura','Marco','Jan','Eva','Hannah','Nikolai'];
  v_last text[] := array['Becker','Schmidt','Wagner','Fischer','Weber','Ivanova','Petrov','Smirnova','Kuznetsov','Dubois','Martin','Bernard','Wilson','Brown','Taylor','Ahmed','Hassan','Rossi','Kowalski','Novak','Meyer','Volkova','Laurent','Hughes'];
  v_loc text[] := array['de','de','de','de','ru','ru','ru','en','en','en','en','fr','fr','ar'];
  v_codes text[] := array['BLOGGER10','BLOGGER10','INSIDER','SUNAGENCY','CORALDESK'];
  e record; v_slot uuid; v_ts timestamptz; r jsonb; b bookings; n int := 0; k int; d int; i int;
  v_q jsonb; v_req jsonb; v_hotel uuid; v_roll float; v_name text; v_l text; v_code text; v_extra uuid;
  m1 date := (date_trunc('month', now() at time zone 'Africa/Cairo') - interval '1 month')::date;  -- last month
  m2 date := (date_trunc('month', now() at time zone 'Africa/Cairo') - interval '2 months')::date; -- the month before
  st record;
begin
  if exists (select 1 from booking_contacts where email like '%@guest.example') then
    raise notice 'demo history already present, skipped';
    return;
  end if;
  perform setseed(0.42);

  -- PAST: one departure per experience on ~40% of the last 56 days
  for d in 1..56 loop
    for e in select x.id, x.duration_minutes, x.booking_mode,
                    (select min(s.starts_at at time zone 'Africa/Cairo')::time from slots s where s.experience_id = x.id) as t0,
                    exists (select 1 from price_categories pc where pc.experience_id = x.id and pc.kind = 'child' and pc.active) as has_child
               from experiences x where x.slug like 'demo-%' and x.status = 'published' loop
      continue when random() > 0.4 or e.t0 is null;
      v_ts := ((current_date - d) + e.t0) at time zone 'Africa/Cairo';
      continue when exists (select 1 from slots where experience_id = e.id and starts_at = v_ts);
      n := n + 1;
      insert into slots (experience_id, starts_at, capacity) values (e.id, now() + interval '400 days' + n * interval '1 minute', 30)
      returning id into v_slot;
      for k in 1..(1 + floor(random() * 3))::int loop
        v_name := v_first[1 + floor(random() * array_length(v_first, 1))::int] || ' ' || v_last[1 + floor(random() * array_length(v_last, 1))::int];
        v_l := v_loc[1 + floor(random() * array_length(v_loc, 1))::int];
        v_code := case when random() < 0.45 then v_codes[1 + floor(random() * array_length(v_codes, 1))::int] end;
        v_hotel := case when random() < 0.45 then (select id from hotels where name like '[DEMO]%' and zone_id in (select zone_id from transport_prices where experience_id = e.id) order by random() limit 1) end;
        v_extra := case when random() < 0.2 then (select id from extras where experience_id = e.id and active order by random() limit 1) end;
        v_q := jsonb_build_object('adult', 1 + floor(random() * 3)::int, 'child', case when e.has_child and random() < 0.3 then 1 else 0 end);
        v_req := jsonb_build_object('experience_id', e.id, 'slot_id', v_slot, 'quantities', v_q,
          'hotel_id', v_hotel, 'transport', v_hotel is not null,
          'extras', case when v_extra is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id', v_extra)) end,
          'coupon_code', case when random() < 0.12 then 'WELCOME10' end, 'partner_code', v_code, 'locale', v_l,
          'display_currency', case v_l when 'ru' then 'RUB' when 'en' then 'USD' else null end,
          'customer', jsonb_build_object('full_name', v_name, 'phone', '+49 151 ' || lpad((floor(random() * 9999999))::int::text, 7, '0'),
            'email', lower(replace(v_name, ' ', '.')) || n || k || '@guest.example', 'room', case when v_hotel is not null then (100 + floor(random() * 400))::int::text end));
        r := create_booking(v_req);
        select * into b from bookings where id = (r->>'booking_id')::uuid;
        if b.status = 'pending_request' then update bookings set status = 'confirmed', request_expires_at = null where id = b.id; end if;
      end loop;
      -- move the departure and its bookings back in time
      update slots set starts_at = v_ts where id = v_slot;
      update bookings set starts_at = v_ts, created_at = v_ts - (1 + floor(random() * 12)) * interval '1 day',
                          reconfirm_status = 'confirmed' where slot_id = v_slot;
      -- what happened on the day
      for b in select * from bookings where slot_id = v_slot loop
        v_roll := random();
        if v_roll < 0.12 then
          perform app.release_booking(b, 'cancelled', 'customer');
          update bookings set cancelled_at = b.starts_at - interval '2 days' where id = b.id;
        elsif v_roll < 0.18 then
          update bookings set execution_status = 'no_show' where id = b.id;
          update commissions set status = 'void', updated_at = now() where booking_id = b.id;
        else
          update bookings set execution_status = 'executed', executed_at = b.starts_at + make_interval(mins => coalesce(e.duration_minutes, 120)) where id = b.id;
          update commissions set status = 'eligible', updated_at = now() where booking_id = b.id and status = 'pending';
          perform app.ledger('receivable_from_operator', b.id, b.operator_id, b.currency, b.paid_minor - b.operator_net_minor, '[DEMO] cash collected by operator on site');
          if b.partner_org_id is not null and b.partner_commission_minor > 0 then
            perform app.ledger('commission_accrued', b.id, b.partner_org_id, b.currency, -b.partner_commission_minor, '[DEMO] partner commission accrued');
          end if;
        end if;
      end loop;
    end loop;
  end loop;

  -- FUTURE: bookings on ~35% of the departures in the next 14 days
  for e in select s.id slot_id, s.experience_id, x.booking_mode,
                  exists (select 1 from price_categories pc where pc.experience_id = x.id and pc.kind = 'child' and pc.active) as has_child
             from slots s join experiences x on x.id = s.experience_id
            where x.slug like 'demo-%' and s.status = 'open' and s.starts_at between now() + interval '3 hours' and now() + interval '14 days' loop
    continue when random() > 0.35;
    for k in 1..(1 + floor(random() * 3))::int loop
      n := n + 1;
      v_name := v_first[1 + floor(random() * array_length(v_first, 1))::int] || ' ' || v_last[1 + floor(random() * array_length(v_last, 1))::int];
      v_l := v_loc[1 + floor(random() * array_length(v_loc, 1))::int];
      v_hotel := case when random() < 0.45 then (select id from hotels where name like '[DEMO]%' and zone_id in (select zone_id from transport_prices where experience_id = e.experience_id) order by random() limit 1) end;
      begin
        r := create_booking(jsonb_build_object('experience_id', e.experience_id, 'slot_id', e.slot_id,
          'quantities', jsonb_build_object('adult', 1 + floor(random() * 3)::int, 'child', case when e.has_child and random() < 0.3 then 1 else 0 end),
          'hotel_id', v_hotel, 'transport', v_hotel is not null,
          'coupon_code', case when random() < 0.1 then 'WELCOME10' end,
          'partner_code', case when random() < 0.45 then v_codes[1 + floor(random() * array_length(v_codes, 1))::int] end,
          'locale', v_l, 'display_currency', case v_l when 'ru' then 'RUB' when 'en' then 'USD' else null end,
          'customer', jsonb_build_object('full_name', v_name, 'phone', '+49 151 ' || lpad((floor(random() * 9999999))::int::text, 7, '0'),
            'email', lower(replace(v_name, ' ', '.')) || n || '@guest.example', 'room', case when v_hotel is not null then (100 + floor(random() * 400))::int::text end)));
        -- most requests already accepted; a few stay open for the operator to answer
        if (r->>'status') = 'pending_request' and random() < 0.75 then
          update bookings set status = 'confirmed', request_expires_at = null where id = (r->>'booking_id')::uuid;
        end if;
        update bookings set created_at = now() - (floor(random() * 10)) * interval '1 day' - interval '1 hour' where id = (r->>'booking_id')::uuid;
      exception when others then null; -- e.g. sold out: skip
      end;
    end loop;
  end loop;

  -- Guests booked days ahead are treated as already reconfirmed; tomorrow's go through the real 18:00 / 22:00 flow
  update bookings set reconfirm_status = 'confirmed'
   where status = 'confirmed' and execution_status = 'scheduled' and reconfirm_status = 'not_sent'
     and (starts_at at time zone 'Africa/Cairo')::date > (now() at time zone 'Africa/Cairo')::date + 1
     and id in (select booking_id from booking_contacts where email like '%@guest.example');

  -- SETTLEMENT: the month before last is settled and paid; last month is partly settled
  perform generate_operator_statements(m2, (m1 - 1));
  for st in select id from operator_statements where period_start = m2 and status = 'open' loop
    perform mark_statement_received(st.id);
  end loop;
  perform create_partner_payouts(m2);
  for st in select id from partner_payouts where period_month = m2 and status = 'pending' loop
    perform mark_payout_paid(st.id, 'DEMO-IPN-' || upper(substr(md5(st.id::text), 1, 6)));
  end loop;
  perform generate_operator_statements(m1, (date_trunc('month', now() at time zone 'Africa/Cairo') - interval '1 day')::date);
  for st in select s.id from operator_statements s where s.period_start = m1 and s.status = 'open'
             and s.operator_id in ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003') loop
    perform mark_statement_received(st.id);
  end loop;
  perform create_partner_payouts(m1);
  update operator_statements set received_at = (period_end + 6)::timestamp at time zone 'Africa/Cairo' where status = 'received' and period_start in (m1, m2);
  update partner_payouts set paid_at = (period_month + interval '1 month 4 days')::timestamp at time zone 'Africa/Cairo' where status = 'paid' and period_month = m2;

  -- Partner link visits over the last 30 days (no personal data)
  insert into attribution_clicks (partner_code_id, experience_id, created_at)
  select pc.id, (select id from experiences where slug like 'demo-%' order by random() limit 1), now() - random() * interval '30 days'
    from partner_codes pc, generate_series(1, 40) g
   where pc.code in ('BLOGGER10', 'INSIDER', 'SUNAGENCY', 'CORALDESK') and random() < case pc.code when 'BLOGGER10' then 0.9 when 'INSIDER' then 0.6 else 0.25 end;

  -- Demo guests never receive emails
  update message_outbox set status = 'skipped', last_error = '[DEMO] guest, not sent'
   where status in ('queued', 'failed') and booking_id in (select booking_id from booking_contacts where email like '%@guest.example');

  raise notice 'demo history: % departures/bookings rounds', n;
end $$;
