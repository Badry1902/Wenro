-- LOCAL DEVELOPER DATABASE ONLY (the test stub's auth.users). Never run on the hosted project:
-- there, people sign in with Supabase Auth and get workspaces through /app/join and approval.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000b1', 'op1-owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'op1-staff@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'op2-owner@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000d1', 'marketer@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'agency-manager@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000e2', 'agency-staff@demo.wenro.test'),
  ('00000000-0000-0000-0000-0000000000f9', 'new-user@demo.wenro.test')
on conflict (id) do nothing;

insert into organizations (id, type, status, name, slug) values
  ('10000000-0000-0000-0000-000000000005', 'agency', 'active', '[DEMO] Sun Agency', 'demo-sun-agency')
on conflict (id) do nothing;

insert into org_private_details (org_id, contact_phone, instapay_handle) values
  ('10000000-0000-0000-0000-000000000004', '+20 100 000 0004', 'demo-blogger@instapay'),
  ('10000000-0000-0000-0000-000000000005', '+20 100 000 0005', 'demo-sun@instapay')
on conflict (org_id) do nothing;

insert into memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'staff'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c1', 'owner'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d1', 'owner'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000e1', 'manager'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000e2', 'staff')
on conflict do nothing;

insert into partner_codes (org_id, code) values
  ('10000000-0000-0000-0000-000000000004', 'BLOGGER10'),
  ('10000000-0000-0000-0000-000000000005', 'SUNAGENCY')
on conflict do nothing;
