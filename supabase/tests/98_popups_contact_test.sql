-- Site pop-ups (WENRO team only, plain text, anonymous counters) and operator contact details.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- operator contact: owner/manager of the operator only, international phone format
select t.login('00000000-0000-0000-0000-0000000000b1'); -- Red Sea Boats owner
select set_org_contact('10000000-0000-0000-0000-000000000002', '+20 100 123 4567', 'ops@redsea.example');
select t.ok((org_contact('10000000-0000-0000-0000-000000000002')->>'phone') = '+201001234567', 'owner saves the WhatsApp number (spaces removed)');
select t.fails($$select set_org_contact('10000000-0000-0000-0000-000000000002', '0100', null)$$, 'invalid_phone', 'phone needs the country code');
select t.fails($$select set_org_contact('10000000-0000-0000-0000-000000000003', '+201001234567', null)$$, 'forbidden', 'no changing another operator');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000b2'); -- staff
select t.fails($$select set_org_contact('10000000-0000-0000-0000-000000000002', '+201001234567', null)$$, 'forbidden', 'staff cannot change contact details');
select t.reset();

-- pop-ups: created as drafts by the WENRO team
select t.login('00000000-0000-0000-0000-0000000000a1'); -- WENRO owner
select set_config('t.pop', (save_popup(jsonb_build_object('name', 'Winter offer', 'layout', 'card', 'pages', jsonb_build_array('home', 'catalog'),
  'cta_url', '/experiences?cat=sea', 'content', jsonb_build_object(
    'ar', jsonb_build_object('title', 'عرض الشتا', 'body', '<b>خصم</b> 10%', 'cta', 'شوف الرحلات'),
    'en', jsonb_build_object('title', 'Winter offer', 'body', '10% off', 'cta', 'See trips'),
    'xx', jsonb_build_object('title', 'ignored')))) ->> 'id'), false);
select t.fails($$select save_popup('{"name":"x","content":{}}'::jsonb)$$, 'title_required', 'a title is required');
select t.fails($$select save_popup(jsonb_build_object('name','x','cta_url','javascript:alert(1)','content',jsonb_build_object('en',jsonb_build_object('title','t'))))$$, 'invalid_link', 'only site paths or https links');
select t.reset();
select t.ok((select status from site_popups where id = current_setting('t.pop')::uuid) = 'draft', 'a new pop-up starts as a draft');
select t.ok((select not (content ? 'xx') from site_popups where id = current_setting('t.pop')::uuid), 'unknown languages are dropped');

select t.anon();
select t.ok(jsonb_array_length(active_popups('ar')) = 0, 'drafts are not shown');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000a1');
select set_popup_status(current_setting('t.pop')::uuid, 'active');
select t.reset();
select t.anon();
select t.ok((active_popups('ar')->0->>'title') = 'عرض الشتا', 'visitors get the pop-up in their language');
select t.ok((active_popups('de')->0->>'title') = 'Winter offer', 'other languages fall back to English');
select t.ok((active_popups('ar')->0->>'body') = '<b>خصم</b> 10%', 'texts are stored as typed (the site shows them as plain text)');
select t.fails($$select popup_event(current_setting('t.pop')::uuid, 'view')$$, 'permission denied', 'visitors cannot write counters directly');
select t.fails($$select admin_popups()$$, 'permission denied', 'visitors cannot list pop-ups');
select t.fails($$select * from site_popups$$, 'permission denied', 'visitors cannot read the table');
select t.reset();

select t.service();
select popup_event(current_setting('t.pop')::uuid, 'view');
select popup_event(current_setting('t.pop')::uuid, 'view');
select popup_event(current_setting('t.pop')::uuid, 'click');
select t.reset();
select t.login('00000000-0000-0000-0000-0000000000a1');
select t.ok((select (x->>'views')::int = 2 and (x->>'clicks')::int = 1 from jsonb_array_elements(admin_popups()) x where x->>'id' = current_setting('t.pop')), 'daily counters add up');
select save_popup(jsonb_build_object('id', current_setting('t.pop'), 'name', 'Winter offer', 'show_again', true,
  'content', jsonb_build_object('en', jsonb_build_object('title', 'Winter offer 2'))));
select t.reset();
select t.ok((select version = 2 from site_popups where id = current_setting('t.pop')::uuid), 'show again raises the version');
select t.login('00000000-0000-0000-0000-0000000000a1');
select set_popup_status(current_setting('t.pop')::uuid, 'archived');
select t.fails($$select set_popup_status(current_setting('t.pop')::uuid, 'active')$$, 'not_found', 'archived pop-ups stay archived');
select t.reset();

select t.login('00000000-0000-0000-0000-0000000000b1'); -- an operator is not the WENRO team
select t.fails($$select admin_popups()$$, 'forbidden', 'operators cannot manage pop-ups');
select t.reset();
\echo POPUPS AND CONTACT TESTS PASSED
