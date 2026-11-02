-- Editor, photos, team invites, operator money, coupons, support cancel, demo access.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ---------------------------------------------------------------- E1 editor
select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
do $$
declare v uuid; e jsonb;
begin
  v := save_experience(jsonb_build_object('operator_id', '10000000-0000-0000-0000-000000000002',
    'booking_mode', 'instant', 'duration_minutes', 240, 'category_id', '20000000-0000-0000-0000-000000000001',
    'translations', jsonb_build_object('en', jsonb_build_object('title', 'Sunset Cruise Test', 'summary', 'Golden hour on the water'),
                                       'ar', jsonb_build_object('title', 'رحلة الغروب')),
    'prices', jsonb_build_object('adult', jsonb_build_object('net_minor', 2000, 'age_min', 12),
                                 'child', jsonb_build_object('net_minor', 1000, 'age_min', 4, 'age_max', 11)),
    'extras', jsonb_build_array(jsonb_build_object('net_minor', 400, 'per', 'person', 'names', jsonb_build_object('en', 'Drinks', 'ar', 'مشروبات'))),
    'transport', jsonb_build_array(jsonb_build_object('zone_id', '30000000-0000-0000-0000-000000000001', 'net_minor', 1600, 'per', 'vehicle', 'vehicle_capacity', 7))));
  insert into t.ids values ('new_exp', v, null);
  e := experience_editor(v);
  perform t.ok(e->>'status' = 'draft' and e->>'slug' = 'sunset-cruise-test', 'operator creates a draft with a slug from the English title');
  perform t.ok((e->'prices'->'adult'->>'display_minor')::int = 2500, 'editor shows the guest price (net 20.00 → 25.00)');
  perform t.ok(jsonb_array_length(e->'extras') = 1 and e->'extras'->0->'names'->>'ar' = 'مشروبات', 'extras with names per language');
  perform t.ok(jsonb_array_length(e->'transport') = 1, 'transfer price per zone');

  -- update: remove the child price and the extra, change the title
  perform save_experience(jsonb_build_object('id', v, 'booking_mode', 'request', 'duration_minutes', 240,
    'translations', jsonb_build_object('en', jsonb_build_object('title', 'Sunset Cruise'), 'ar', jsonb_build_object('title', '')),
    'prices', jsonb_build_object('adult', jsonb_build_object('net_minor', 2200)), 'extras', '[]'::jsonb, 'transport', '[]'::jsonb));
  e := experience_editor(v);
  perform t.ok(e->'translations'->'en'->>'title' = 'Sunset Cruise' and not (e->'translations' ? 'ar'), 'title updated; empty Arabic title removes the Arabic text');
  perform t.ok((e->'prices'->'child'->>'active')::boolean = false, 'removed price is switched off, not deleted');
  perform t.ok(jsonb_array_length(e->'extras') = 0 and jsonb_array_length(e->'transport') = 0, 'extras and transfers removed');
  perform t.ok(e->>'booking_mode' = 'request', 'booking mode saved');
end $$;
select t.fails($$select save_experience(jsonb_build_object('id', (select id from t.ids where name = 'new_exp'), 'translations', '{"en":{"title":"x"}}'::jsonb, 'prices', '{"adult":{"net_minor":100}}'::jsonb))$$, 'title_required', 'title is required');
select t.fails($$select save_experience(jsonb_build_object('id', (select id from t.ids where name = 'new_exp'), 'translations', '{"en":{"title":"Valid title"}}'::jsonb, 'prices', '{}'::jsonb))$$, 'price_required', 'a price is required');
select t.fails($$select save_experience(jsonb_build_object('operator_id', '10000000-0000-0000-0000-000000000003', 'translations', '{"en":{"title":"Hijack"}}'::jsonb, 'prices', '{"adult":{"net_minor":100}}'::jsonb))$$, 'forbidden', 'no creating experiences for another operator');
select t.fails($$select experience_editor('50000000-0000-0000-0000-000000000002')$$, 'forbidden', 'no editing another operator''s experience');
select t.ok(add_experience_media((select id from t.ids where name = 'new_exp'), 'https://example.supabase.co/storage/v1/object/public/experience-media/a.jpg', 'Deck') is not null, 'photo recorded');
select t.fails($$select add_experience_media((select id from t.ids where name = 'new_exp'), 'javascript:alert(1)', 'x')$$, 'invalid_path', 'only https or site paths are accepted for photos');
select t.ok(add_experience_media((select id from t.ids where name = 'new_exp'), 'https://res.cloudinary.com/demo/video/upload/v1/wenro/x', 'Clip', 'video') is not null, 'video recorded');
select t.ok((select kind from experience_media where storage_path like '%/video/upload/%') = 'video', 'media remembers it is a video');
select t.fails($$select add_experience_media((select id from t.ids where name = 'new_exp'), 'https://x/y', 'x', 'audio')$$, 'invalid_kind', 'only photos and videos');
select add_experience_media((select id from t.ids where name = 'new_exp'), 'https://res.cloudinary.com/demo/video/upload/v1/wenro/' || g, null, 'video') from generate_series(1, 2) g;
select t.fails($$select add_experience_media((select id from t.ids where name = 'new_exp'), 'https://res.cloudinary.com/demo/video/upload/v1/wenro/z', 'x', 'video')$$, 'too_many_videos', 'at most 3 videos per experience');
delete from experience_media where storage_path like '%/video/upload/%';
select t.ok(remove_experience_media((select id from experience_media where experience_id = (select id from t.ids where name = 'new_exp') limit 1)) like 'https://%', 'photo removed, path returned for file deletion');
select t.fails($$select set_experience_status((select id from t.ids where name = 'new_exp'), 'published')$$, 'forbidden', 'operators still cannot publish');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b2'); -- staff
select t.fails($$select experience_editor((select id from t.ids where name = 'new_exp'))$$, 'forbidden', 'staff cannot open the editor');
select t.fails($$select operator_finance('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'staff never see the money page');
select t.reset();

-- ---------------------------------------------------------------- E2 operator money
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.ok(jsonb_array_length(operator_finance('10000000-0000-0000-0000-000000000002')->'statements') >= 1, 'owner sees statements');
select t.ok(not (operator_finance('10000000-0000-0000-0000-000000000002')::text like '%partner_commission%'), 'money page shows what WENRO is owed, not partner details');
select t.fails($$select operator_finance('10000000-0000-0000-0000-000000000003')$$, 'forbidden', 'no reading another operator''s money');
select t.reset();

-- ---------------------------------------------------------------- E3 team invites
select t.login('00000000-0000-0000-0000-0000000000b1');
select invite_member('10000000-0000-0000-0000-000000000002', ' New.Captain@Demo.wenro.test ', 'staff');
select t.ok(jsonb_array_length(org_team('10000000-0000-0000-0000-000000000002')->'invites') = 1, 'invite listed as pending');
select t.fails($$select invite_member('10000000-0000-0000-0000-000000000002', 'x@demo.wenro.test', 'owner')$$, 'invalid_role', 'nobody can invite an owner');
select t.fails($$select invite_member('10000000-0000-0000-0000-000000000003', 'x@demo.wenro.test', 'staff')$$, 'forbidden', 'no inviting into another company');
select t.fails($$select invite_member('10000000-0000-0000-0000-000000000002', 'op1-staff@demo.wenro.test', 'staff')$$, 'already_member', 'existing members are not invited twice');
select t.reset();
select t.ok((select count(*) from message_outbox where kind = 'team_invite' and payload->>'email' = 'new.captain@demo.wenro.test') = 1, 'invitation email queued');

select t.login('00000000-0000-0000-0000-0000000000b2');
select t.fails($$select invite_member('10000000-0000-0000-0000-000000000002', 'y@demo.wenro.test', 'staff')$$, 'forbidden', 'staff cannot invite');
select t.fails($$select org_team('10000000-0000-0000-0000-000000000002')$$, 'forbidden', 'staff cannot see the team page');
select t.reset();

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f7', 'new.captain@demo.wenro.test');
select t.login('00000000-0000-0000-0000-0000000000f7');
select t.ok(accept_invites() = 1, 'invite accepted on sign-in');
select t.ok(my_workspaces()->0->>'role' = 'staff', 'new captain works as staff');
select t.ok(accept_invites() = 0, 'accepting twice does nothing');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b1');
select set_member_active('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f7', false);
select t.fails($$select set_member_active('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', false)$$, 'cannot_change_self', 'owner cannot lock themselves out');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000f7');
select t.ok(jsonb_array_length(my_workspaces()) = 0, 'removed member loses access');
select t.reset();

-- ---------------------------------------------------------------- E4 coupons and support cancel
select t.login('00000000-0000-0000-0000-0000000000a1');
select save_coupon('summer5', 500, current_date + 30, 100, true);
select t.ok((select percent_bps from coupons where code = 'SUMMER5') = 500, 'WENRO creates a coupon');
select t.fails($$select save_coupon('greedy', 1500, null, null, true)$$, 'discount_too_big', 'coupons cannot exceed 10%');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select save_coupon('mine', 500, null, null, true)$$, 'forbidden', 'operators cannot create coupons');
select t.fails($$select admin_cancel_booking((select id from bookings where status = 'confirmed' limit 1))$$, 'forbidden', 'operators cannot use support cancel');
select t.reset();

select t.service();
do $$ declare r jsonb; begin
  r := create_booking(t.req('70000000-0000-0000-0000-000000000005', '{"quantities":{"adult":1},"hotel_id":null,"transport":false}'));
  insert into t.ids values ('support', (r->>'booking_id')::uuid, null);
end $$;
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select admin_cancel_booking((select id from t.ids where name = 'support'));
select t.reset();
select t.ok((select status from bookings where id = (select id from t.ids where name = 'support')) = 'cancelled', 'support cancels a booking');
select t.ok((select count(*) from message_outbox where booking_id = (select id from t.ids where name = 'support') and kind = 'cancelled') = 1, 'guest is emailed about the cancellation');

-- ---------------------------------------------------------------- E5 demo access
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.fails($$select demo_join_all()$$, 'forbidden', 'only the WENRO owner can join demo workspaces');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok((demo_status()->>'available')::boolean and not (demo_status()->>'joined')::boolean, 'demo available, not joined yet');
select t.ok(demo_join_all() >= 3, 'owner joins the demo workspaces');
select t.ok((demo_status()->>'joined')::boolean and jsonb_array_length(my_workspaces()) >= 4, 'owner now switches between all dashboards');
select t.reset();

\echo 'EDITOR AND TEAM TESTS PASSED'
