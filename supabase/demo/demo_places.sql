-- DEMO DATA: city and activity points for the demo trips (slugs start with "demo-"). Approximate public landmarks.
update experiences set city = 'hurghada' where slug like 'demo-%' and city is null;
update experiences set city = 'el-gouna' where slug = 'demo-kitesurf-lesson';
update experiences e set activity_lat = v.lat, activity_lng = v.lng, activity_place = v.place
  from (values
    ('demo-luxor-day', 25.7188, 32.6573, 'Karnak Temple, Luxor'),
    ('demo-luxor-balloon', 25.7402, 32.6014, 'West Bank, Luxor'),
    ('demo-cairo-day', 29.9792, 31.1342, 'Pyramids of Giza'),
    ('demo-gouna-day', 27.3942, 33.6782, 'El Gouna'),
    ('demo-giftun-island', 27.1950, 33.9550, 'Giftun Island'),
    ('demo-island-beach', 27.1950, 33.9550, 'Giftun Island')
  ) v(slug, lat, lng, place)
 where e.slug = v.slug and e.activity_lat is null;
