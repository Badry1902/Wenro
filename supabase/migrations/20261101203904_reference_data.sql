-- Reference data WENRO needs in every environment (not demo data).
-- Fixed IDs so other environments and tests can refer to them.

insert into organizations (id, type, status, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'platform', 'active', 'WENRO', 'wenro');

insert into categories (id, slug, sort) values
  ('20000000-0000-0000-0000-000000000001', 'sea', 1),
  ('20000000-0000-0000-0000-000000000002', 'desert', 2),
  ('20000000-0000-0000-0000-000000000003', 'culture', 3);
insert into category_translations (category_id, locale, name) values
  ('20000000-0000-0000-0000-000000000001', 'en', 'Sea'), ('20000000-0000-0000-0000-000000000001', 'ar', 'بحر'),
  ('20000000-0000-0000-0000-000000000002', 'en', 'Desert'), ('20000000-0000-0000-0000-000000000002', 'ar', 'صحراء'),
  ('20000000-0000-0000-0000-000000000003', 'en', 'Culture'), ('20000000-0000-0000-0000-000000000003', 'ar', 'ثقافة');

insert into zones (id, slug, name, sort) values
  ('30000000-0000-0000-0000-000000000001', 'hurghada', 'Hurghada', 1),
  ('30000000-0000-0000-0000-000000000002', 'el-gouna', 'El Gouna', 2),
  ('30000000-0000-0000-0000-000000000003', 'makadi', 'Makadi Bay', 3),
  ('30000000-0000-0000-0000-000000000004', 'sahl-hasheesh', 'Sahl Hasheesh', 4),
  ('30000000-0000-0000-0000-000000000005', 'soma-bay', 'Soma Bay', 5),
  ('30000000-0000-0000-0000-000000000006', 'safaga', 'Safaga', 6);

insert into cancellation_policies (id, code, free_cancel_hours, sort) values
  ('40000000-0000-0000-0000-000000000001', 'flexible_24h', 24, 1),
  ('40000000-0000-0000-0000-000000000002', 'moderate_48h', 48, 2),
  ('40000000-0000-0000-0000-000000000003', 'strict_72h', 72, 3);
insert into cancellation_policy_translations (policy_id, locale, title, body) values
  ('40000000-0000-0000-0000-000000000001', 'en', 'Free cancellation up to 24 hours before', 'DRAFT — needs legal review before launch.'),
  ('40000000-0000-0000-0000-000000000002', 'en', 'Free cancellation up to 48 hours before', 'DRAFT — needs legal review before launch.'),
  ('40000000-0000-0000-0000-000000000003', 'en', 'Free cancellation up to 72 hours before', 'DRAFT — needs legal review before launch.');

