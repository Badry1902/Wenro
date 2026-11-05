-- Reviews from real guests only, moderation, public summary; usernames for team accounts.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ---------------------------------------------------------------- R1 guest review through the booking link
select t.service();
insert into t.ids select 'review_exp', experience_id, null from bookings where id = (select id from t.ids where name = 'direct');
select t.fails($$select submit_review_by_token((select txt from t.ids where name = 'direct'), 5, 'Great')$$, 'review_not_yet', 'no review before the trip is checked in');
select t.ok((review_for_token((select txt from t.ids where name = 'direct'))->>'eligible')::boolean = false, 'booking page: not eligible yet');
update bookings set execution_status = 'executed' where id = (select id from t.ids where name = 'direct');
select t.ok((review_for_token((select txt from t.ids where name = 'direct'))->>'eligible')::boolean, 'eligible once the trip was done');
select t.fails($$select submit_review_by_token((select txt from t.ids where name = 'direct'), 6, 'x')$$, 'invalid_rating', 'rating must be 1 to 5');
select t.fails($$select submit_review_by_token((select txt from t.ids where name = 'direct'), 4, repeat('a', 1501))$$, 'review_too_long', 'review text is limited');
select t.ok(submit_review_by_token((select txt from t.ids where name = 'direct'), 4, '  Lovely day on the boat  ')->>'status' = 'pending', 'guest review saved, waiting for moderation');
select t.fails($$select submit_review_by_token((select txt from t.ids where name = 'direct'), 5, 'again')$$, 'already_reviewed', 'one review per booking');
select t.fails($$select submit_review_by_token(repeat('0', 64), 5, 'fake')$$, 'booking_not_found', 'no review without a real booking link');
select t.ok((select body from reviews where booking_id = (select id from t.ids where name = 'direct')) = 'Lovely day on the boat', 'text trimmed, kept as written');
select t.ok((select author_name from reviews where booking_id = (select id from t.ids where name = 'direct')) !~ '\w+\s\w{2,}$', 'only first name and initial are kept for display');
select t.reset();

-- not callable by visitors or signed-in people directly
select t.anon();
select t.fails($$select submit_review_by_token((select txt from t.ids where name = 'direct'), 5, 'x')$$, 'permission denied', 'visitors cannot call the review function');
select t.ok((experience_reviews((select id from t.ids where name = 'review_exp'))->>'count')::int = 0, 'pending review is not public');
select t.reset();

-- ---------------------------------------------------------------- R2 moderation
select t.login('00000000-0000-0000-0000-0000000000b1'); -- operator owner
select t.fails($$select moderate_review((select id from reviews limit 1), true)$$, 'forbidden', 'operators cannot publish reviews');
select t.fails($$select admin_reviews('pending')$$, 'forbidden', 'operators do not see the moderation queue');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1'); -- WENRO owner
select t.ok(jsonb_array_length(admin_reviews('pending')) = 1, 'owner sees the pending review');
select t.ok((moderate_review((select id from reviews limit 1), true)->>'published')::boolean, 'owner publishes it');
select t.ok(jsonb_array_length(admin_reviews('pending')) = 0 and jsonb_array_length(admin_reviews('published')) = 1, 'moved to published');
select t.reset();
select t.anon();
do $$
declare s jsonb := experience_reviews((select id from t.ids where name = 'review_exp'));
begin
  perform t.ok((s->>'count')::int = 1 and (s->>'average')::numeric = 4.0, 'public summary: 1 review, 4.0');
  perform t.ok(not (s::text like '%@%') and not (s::text ~ 'booking_id|phone|email'), 'no contact details in the public data');
  perform t.ok((select (x->>'reviews')::int from jsonb_array_elements(experience_list('en')) x
                 where x->>'id' = (select id::text from t.ids where name = 'review_exp')) = 1,
               'trip card shows the review count');
end $$;
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select moderate_review((select id from reviews limit 1), false);
select t.reset();
select t.anon();
select t.ok((experience_reviews((select id from t.ids where name = 'review_exp'))->>'count')::int = 0, 'hidden review disappears from the trip page');
select t.reset();

-- ---------------------------------------------------------------- A1 usernames
select t.login('00000000-0000-0000-0000-0000000000b1');
select t.ok(set_username('  Red.Sea_Boats ')->>'username' = 'red.sea_boats', 'username saved in lower case');
select t.fails($$select set_username('ab')$$, 'invalid_username', 'too short');
select t.fails($$select set_username('me@mail.com')$$, 'invalid_username', 'no email addresses as usernames');
select t.fails($$select set_username('admin')$$, 'username_taken', 'reserved names refused');
select mark_password_set();
select t.ok((my_account()->>'password_set')::boolean and my_account()->>'username' = 'red.sea_boats', 'account shows username and password set');
select t.fails($$select email_for_username('red.sea_boats')$$, 'permission denied', 'signed-in people cannot look up emails by username');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b2');
select t.fails($$select set_username('RED.SEA_BOATS')$$, 'username_taken', 'usernames are unique regardless of case');
select t.reset();
select t.service();
select t.ok(email_for_username('Red.Sea_Boats') like '%@%', 'server finds the email for password sign-in');
select t.ok(email_for_username('nobody') is null, 'unknown username gives nothing');
select t.reset();

\echo REVIEWS AND ACCOUNTS TESTS PASSED
