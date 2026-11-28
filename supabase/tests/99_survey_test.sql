-- Traveller survey: visitors only through the server, results only for the WENRO team.
\set ON_ERROR_STOP on
set client_min_messages = notice;

select t.anon();
select t.fails($$select submit_survey('travellers-test', 'en', null, '{"trips":"1"}', '{}', null)$$, 'permission denied', 'visitors cannot write answers directly');
select t.fails($$select count(*) from survey_responses$$, 'permission denied', 'visitors cannot read answers');
select t.reset();

select t.service();
select submit_survey('travellers-test', 'ar', 'WhatsApp', '{"trips":"2-3","where":["hotel","local"]}', '{"where":"Instagram"}', '  me@example.com ');
select t.fails($$select submit_survey('travellers-test', 'en', null, '{}', '{}', null)$$, 'invalid_input', 'an empty answer is refused');
select t.fails($$select submit_survey('Bad Survey!', 'en', null, '{"trips":"1"}', '{}', null)$$, 'violates check constraint', 'survey ids are checked');
select t.fails($$select submit_survey('travellers-test', 'xx', null, '{"trips":"1"}', '{}', null)$$, 'violates check constraint', 'unknown languages are refused');
select t.reset();

select t.ok((select source from survey_responses where survey = 'travellers-test') = 'whatsapp', 'source is stored lower-case');
select t.ok((select contact from survey_responses where survey = 'travellers-test') = 'me@example.com', 'contact is trimmed');

select t.login('00000000-0000-0000-0000-0000000000b1'); -- an operator owner
select t.fails($$select admin_survey('travellers-test')$$, 'forbidden', 'operators cannot read survey answers');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000a1'); -- WENRO owner
select t.ok(jsonb_array_length(admin_survey('travellers-test')) = 1, 'the WENRO team reads the answers');
select t.ok((admin_survey('travellers-test')->0->'answers'->>'trips') = '2-3', 'answers come back as sent');
select delete_survey_response((admin_survey('travellers-test')->0->>'id')::uuid);
select t.ok(jsonb_array_length(admin_survey('travellers-test')) = 0, 'an answer can be deleted');
select t.reset();
do $$ begin raise notice 'SURVEY TESTS PASSED'; end $$;
