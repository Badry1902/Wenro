"""Builds supabase/demo/demo_content.sql: [DEMO] operators, partners, hotels, 28 experiences in 9 categories (EN + AR),
stock photos (see demo_catalog.py), 60 days of departures and a realistic booking history (statements, payouts, commissions).
Everything is fake and removable with supabase/demo/remove_demo.sql. Run: python3 scripts/make-demo-sql.py"""
import json, os

def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"

OPS = [
    ("10000000-0000-0000-0000-000000000002", "[DEMO] Red Sea Boats", "demo-red-sea-boats", "+20 100 000 0002", "ops@redseaboats.example"),
    ("10000000-0000-0000-0000-000000000003", "[DEMO] Desert Riders", "demo-desert-riders", "+20 100 000 0003", "ops@desertriders.example"),
    ("10000000-0000-0000-0000-000000000006", "[DEMO] Blue Depth Diving", "demo-blue-depth", "+20 100 000 0006", "ops@bluedepth.example"),
    ("10000000-0000-0000-0000-000000000007", "[DEMO] Hurghada Heritage Tours", "demo-heritage", "+20 100 000 0007", "ops@heritage.example"),
]
PARTNERS = [
    ("10000000-0000-0000-0000-000000000004", "marketer", "[DEMO] Travel Blogger", "demo-blogger", "BLOGGER10", "+20 100 000 0004", "demo-blogger@instapay"),
    ("10000000-0000-0000-0000-000000000008", "marketer", "[DEMO] Red Sea Insider", "demo-insider", "INSIDER", "+20 100 000 0008", "insider@instapay"),
    ("10000000-0000-0000-0000-000000000005", "agency", "[DEMO] Sun Agency", "demo-sun-agency", "SUNAGENCY", "+20 100 000 0005", "demo-sun@instapay"),
    ("10000000-0000-0000-0000-000000000009", "agency", "[DEMO] Coral Hotel Desk", "demo-coral-desk", "CORALDESK", "+20 100 000 0009", None),
]
Z = {"hurghada": "30000000-0000-0000-0000-000000000001", "gouna": "30000000-0000-0000-0000-000000000002",
     "makadi": "30000000-0000-0000-0000-000000000003", "sahl": "30000000-0000-0000-0000-000000000004",
     "soma": "30000000-0000-0000-0000-000000000005", "safaga": "30000000-0000-0000-0000-000000000006"}
HOTELS = [
    ("31000000-0000-0000-0000-000000000001", "hurghada", "[DEMO] Hurghada Beach Hotel"),
    ("31000000-0000-0000-0000-000000000003", "hurghada", "[DEMO] Marina View Resort"),
    ("31000000-0000-0000-0000-000000000004", "hurghada", "[DEMO] Sekalla Garden Inn"),
    ("31000000-0000-0000-0000-000000000002", "gouna", "[DEMO] Gouna Lagoon Resort"),
    ("31000000-0000-0000-0000-000000000005", "gouna", "[DEMO] Abu Tig Suites"),
    ("31000000-0000-0000-0000-000000000006", "makadi", "[DEMO] Makadi Palms"),
    ("31000000-0000-0000-0000-000000000007", "sahl", "[DEMO] Sahl Hasheesh Bay Hotel"),
    ("31000000-0000-0000-0000-000000000008", "soma", "[DEMO] Soma Breeze Resort"),
]
SEA, DESERT, CULTURE = ("20000000-0000-0000-0000-00000000000%d" % i for i in (1, 2, 3))
P24, P48, P72 = ("40000000-0000-0000-0000-00000000000%d" % i for i in (1, 2, 3))
STD_TRANSPORT = [("hurghada", 1600, 7), ("gouna", 2400, 7), ("makadi", 2400, 7), ("sahl", 2000, 7)]

# id, slug, operator, category, mode, minutes, policy, nets{adult,child,infant}, private(net,max), extras[(net,per,en,ar)], transport, times, capacity, images, en, ar
EXPS = [
 dict(id="50000000-0000-0000-0000-000000000001", slug="demo-giftun-island", op=0, cat=SEA, mode="instant", minutes=420, policy=P24,
      prices=dict(adult=(2400, 12, None), child=(1200, 4, 11), infant=(0, 0, 3)), private=(30000, 12),
      extras=[(800, "person", "Intro dive (15 min, with instructor)", "غطسة تجريبية (15 دقيقة مع مدرب)"), (400, "person", "Lunch upgrade: grilled fish", "ترقية الغداء: سمك مشوي")],
      transport=STD_TRANSPORT, times=["08:30"], cap=24, images=["island", "reef", "sea-boat"],
      en=dict(title="Giftun Island snorkelling day", summary="Two reef stops, a beach on Giftun Island and lunch on board.",
              description="A relaxed full day on the water. The boat leaves Hurghada marina in the morning and anchors at two reefs inside the Giftun protected area, where the crew shows you the best spots for coral and fish. Between the snorkel stops you spend time on the white beach of Giftun Island.\nSnorkelling gear and a buoyancy vest are provided; the crew stays with beginners in the water.",
              itinerary="08:30 pickup from your hotel (if booked)\n09:30 boat leaves the marina\n10:30 first reef stop: snorkelling\n12:00 Giftun Island beach time\n13:30 lunch on board\n14:30 second reef stop\n16:00 back at the marina",
              included="Boat trip with crew\nSnorkelling mask, fins and vest\nLunch on board, water and soft drinks\nProtected-area fee",
              excluded="Hotel transfer (optional add-on)\nTowels\nTips",
              requirements="Bring sunscreen that is safe for reefs, a towel and a hat.\nNot recommended for people who cannot swim at all; vests are available.",
              meeting_info="Hurghada New Marina, gate 2. Look for the WENRO sign at the pier 20 minutes before departure."),
      ar=dict(title="رحلة سنوركل جزيرة الجفتون", summary="محطتان على الشعاب، وشاطئ جزيرة الجفتون، وغداء على المركب.",
              description="يوم كامل هادئ في البحر. يغادر المركب مارينا الغردقة صباحًا ويرسو عند شعبتين داخل محمية الجفتون، ويوضح لك الطاقم أفضل الأماكن لمشاهدة الشعاب والأسماك. وبين محطات السنوركل تقضي وقتًا على شاطئ الجزيرة الأبيض.\nمعدات السنوركل وسترة الطفو متوفرة، ويبقى الطاقم مع المبتدئين في الماء.",
              itinerary="08:30 الاستلام من الفندق (إن تم حجز التوصيل)\n09:30 تحرك المركب من المارينا\n10:30 الشعبة الأولى: سنوركل\n12:00 وقت على شاطئ الجفتون\n13:30 الغداء على المركب\n14:30 الشعبة الثانية\n16:00 العودة إلى المارينا",
              included="رحلة المركب مع الطاقم\nقناع السنوركل والزعانف والسترة\nغداء على المركب ومياه ومشروبات غازية\nرسوم المحمية",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nالمناشف\nالإكراميات",
              requirements="أحضر واقي شمس آمن للشعاب ومنشفة وقبعة.\nغير مناسبة لمن لا يجيد السباحة إطلاقًا؛ السترات متوفرة.",
              meeting_info="مارينا الغردقة الجديدة، البوابة 2. ابحث عن لافتة WENRO على الرصيف قبل الموعد بـ 20 دقيقة.")),
 dict(id="50000000-0000-0000-0000-000000000002", slug="demo-quad-safari", op=1, cat=DESERT, mode="request", minutes=180, policy=P48,
      prices=dict(adult=(2500, 16, None)), private=None, extras=[(600, "person", "Second rider on the same quad", "راكب ثانٍ على نفس الموتوسيكل")],
      transport=STD_TRANSPORT, times=["08:30", "13:00"], cap=12, images=["quad", "tent", "camel"],
      en=dict(title="Quad ride to a Bedouin village", summary="One hour on your own quad through the desert, tea in a Bedouin village.",
              description="After a short safety briefing you ride your own quad in a guided line across open desert tracks. Halfway you stop at a Bedouin village for tea and bread baked on the fire, and a short camel walk.\nThe operator confirms your request within 12 hours because riders and helmets are assigned in advance.",
              itinerary="Safety briefing and helmet fitting\n1 hour quad ride with a guide in front and behind\nBedouin village: tea, bread, short camel walk\nRide back to camp",
              included="Quad bike and fuel\nHelmet, goggles and scarf\nGuide\nBedouin tea and bread",
              excluded="Hotel transfer (optional add-on)\nPhotos sold at the camp",
              requirements="Minimum age 16 to drive. Closed shoes recommended.\nNot suitable during pregnancy or with back problems.",
              meeting_info="Desert camp on the Hurghada–Safaga road. Exact pin is sent with your voucher."),
      ar=dict(title="جولة بالموتوسيكل الرباعي إلى قرية بدوية", summary="ساعة على موتوسيكل رباعي خاص بك في الصحراء، وشاي في قرية بدوية.",
              description="بعد شرح قصير للسلامة تقود موتوسيكلك الرباعي في صف مع المرشد عبر مسارات الصحراء المفتوحة. وفي منتصف الطريق تتوقف في قرية بدوية لتناول الشاي والخبز المخبوز على النار، وجولة قصيرة على الجمل.\nيؤكد المشغّل طلبك خلال 12 ساعة لأن الموتوسيكلات والخوذ تُحجز مسبقًا.",
              itinerary="شرح السلامة وتجهيز الخوذة\nساعة قيادة مع مرشد في المقدمة والمؤخرة\nالقرية البدوية: شاي وخبز وجولة قصيرة على الجمل\nالعودة إلى المعسكر",
              included="الموتوسيكل الرباعي والوقود\nخوذة ونظارة وشال\nمرشد\nشاي وخبز بدوي",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nالصور المباعة في المعسكر",
              requirements="الحد الأدنى للسن 16 عامًا للقيادة. يُفضل حذاء مغلق.\nغير مناسبة أثناء الحمل أو لمن يعاني من مشاكل في الظهر.",
              meeting_info="معسكر الصحراء على طريق الغردقة–سفاجا. الموقع الدقيق يصلك مع القسيمة.")),
 dict(id="50000000-0000-0000-0000-000000000003", slug="demo-dolphin-house", op=0, cat=SEA, mode="instant", minutes=360, policy=P24,
      prices=dict(adult=(3200, 12, None), child=(1600, 4, 11), infant=(0, 0, 3)), private=(28000, 10), extras=[],
      transport=STD_TRANSPORT, times=["08:00"], cap=20, images=["dolphins", "reef", "sea-boat"],
      en=dict(title="Dolphin House by speedboat", summary="A fast boat to the reef where spinner dolphins often rest, with two snorkel stops.",
              description="Dolphin House is a horseshoe reef where wild spinner dolphins often come to rest. The crew keeps a respectful distance and follows the local code of conduct: no chasing, no feeding, no touching.\nDolphins are wild animals, so sightings are likely but never guaranteed. The second stop is a coral garden for snorkelling.",
              itinerary="08:00 boat leaves the marina\n09:15 Dolphin House: watch and snorkel with care\n11:30 coral garden snorkel stop\n12:30 lunch on board\n14:00 back at the marina",
              included="Speedboat with crew\nSnorkelling gear\nLunch, water and soft drinks",
              excluded="Hotel transfer (optional add-on)\nTips",
              requirements="Sea can be choppy; tell the crew if you get seasick.\nChildren must wear a vest in the water.",
              meeting_info="Hurghada New Marina, gate 2, 20 minutes before departure."),
      ar=dict(title="بيت الدلافين بالمركب السريع", summary="مركب سريع إلى الشعبة التي تستريح فيها الدلافين غالبًا، مع محطتين للسنوركل.",
              description="بيت الدلافين شعبة على شكل حدوة حصان تأتي إليها الدلافين البرية للراحة غالبًا. يلتزم الطاقم بمسافة محترمة وبقواعد السلوك المحلية: لا مطاردة ولا إطعام ولا لمس.\nالدلافين حيوانات برية، لذلك رؤيتها مرجحة لكنها غير مضمونة. المحطة الثانية حديقة شعاب للسنوركل.",
              itinerary="08:00 تحرك المركب من المارينا\n09:15 بيت الدلافين: مشاهدة وسنوركل بهدوء\n11:30 محطة سنوركل عند الشعاب\n12:30 الغداء على المركب\n14:00 العودة إلى المارينا",
              included="مركب سريع مع الطاقم\nمعدات السنوركل\nغداء ومياه ومشروبات غازية",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nالإكراميات",
              requirements="البحر قد يكون متقلبًا؛ أخبر الطاقم إن كنت تعاني من دوار البحر.\nيرتدي الأطفال السترة في الماء.",
              meeting_info="مارينا الغردقة الجديدة، البوابة 2، قبل الموعد بـ 20 دقيقة.")),
 dict(id="50000000-0000-0000-0000-000000000004", slug="demo-orange-bay", op=0, cat=SEA, mode="instant", minutes=420, policy=P24,
      prices=dict(adult=(2000, 12, None), child=(1000, 4, 11), infant=(0, 0, 3)), private=None,
      extras=[(500, "person", "Sun lounger and umbrella on the beach", "شيزلونج وشمسية على الشاطئ")],
      transport=STD_TRANSPORT, times=["09:00"], cap=30, images=["island", "sea-boat", "reef"],
      en=dict(title="Orange Bay beach day", summary="A long beach stop on a white-sand bay, one snorkel stop and lunch.",
              description="A slow day built around the beach. Most of the time is spent on a white-sand bay with shallow turquoise water, good for families and non-swimmers. One snorkel stop on the way back.",
              itinerary="09:00 boat leaves the marina\n10:30 arrival at the bay: free beach time\n13:00 lunch\n14:30 snorkel stop\n16:30 back at the marina",
              included="Boat trip\nBeach entrance\nLunch and soft drinks\nSnorkelling gear",
              excluded="Hotel transfer (optional add-on)\nLoungers (optional extra)",
              requirements="Bring a towel and reef-safe sunscreen.",
              meeting_info="Hurghada New Marina, gate 2, 20 minutes before departure."),
      ar=dict(title="يوم على شاطئ أورانج باي", summary="وقت طويل على خليج رمله أبيض، ومحطة سنوركل واحدة وغداء.",
              description="يوم هادئ يدور حول الشاطئ. معظم الوقت على خليج رمله أبيض ومياهه فيروزية ضحلة، مناسب للعائلات ومن لا يسبح. ومحطة سنوركل واحدة في طريق العودة.",
              itinerary="09:00 تحرك المركب من المارينا\n10:30 الوصول للخليج: وقت حر على الشاطئ\n13:00 الغداء\n14:30 محطة سنوركل\n16:30 العودة إلى المارينا",
              included="رحلة المركب\nدخول الشاطئ\nغداء ومشروبات غازية\nمعدات السنوركل",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nالشيزلونج (إضافة اختيارية)",
              requirements="أحضر منشفة وواقي شمس آمن للشعاب.",
              meeting_info="مارينا الغردقة الجديدة، البوابة 2، قبل الموعد بـ 20 دقيقة.")),
 dict(id="50000000-0000-0000-0000-000000000005", slug="demo-discover-scuba", op=2, cat=SEA, mode="instant", minutes=300, policy=P48,
      prices=dict(adult=(4400, 10, None)), private=None, extras=[(1200, "person", "Second guided dive", "غطسة ثانية مع مدرب")],
      transport=STD_TRANSPORT, times=["08:30"], cap=8, images=["diver", "reef", "sea-boat"],
      en=dict(title="Discover scuba: your first dive", summary="No experience needed: training in shallow water, then a guided dive to 6–12 m.",
              description="A first taste of diving with a licensed instructor, one instructor for every two guests. You learn the basics in shallow water first; only when you feel ready do you go down to a calm reef.\nYou fill in a short medical questionnaire before the trip.",
              itinerary="08:30 meet at the dive centre\n09:00 briefing and equipment fitting\n10:30 shallow-water practice\n11:30 guided dive (about 30 minutes)\n13:00 back on land",
              included="All diving equipment\nInstructor (1 for 2 guests)\nBoat trip, water and snacks",
              excluded="Hotel transfer (optional add-on)\nDive photos",
              requirements="Minimum age 10. Medical questionnaire required.\nNo flying within 24 hours after diving.",
              meeting_info="Dive centre, Sheraton Road. Pin on your voucher."),
      ar=dict(title="تجربة الغوص الأولى", summary="بدون خبرة سابقة: تدريب في مياه ضحلة ثم غطسة مع مدرب إلى عمق 6–12 مترًا.",
              description="تجربة أولى للغوص مع مدرب مرخّص، مدرب لكل ضيفين. تتعلم الأساسيات في المياه الضحلة أولًا، ولا تنزل إلى الشعبة الهادئة إلا عندما تشعر بالاستعداد.\nتملأ استبيانًا طبيًا قصيرًا قبل الرحلة.",
              itinerary="08:30 اللقاء في مركز الغوص\n09:00 الشرح وتجهيز المعدات\n10:30 تدريب في المياه الضحلة\n11:30 غطسة مع المدرب (حوالي 30 دقيقة)\n13:00 العودة إلى البر",
              included="كل معدات الغوص\nمدرب (واحد لكل ضيفين)\nرحلة المركب ومياه ووجبة خفيفة",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nصور الغوص",
              requirements="الحد الأدنى للسن 10 سنوات. الاستبيان الطبي مطلوب.\nممنوع الطيران خلال 24 ساعة بعد الغوص.",
              meeting_info="مركز الغوص، طريق الشيراتون. الموقع في القسيمة.")),
 dict(id="50000000-0000-0000-0000-000000000006", slug="demo-glass-boat", op=0, cat=SEA, mode="instant", minutes=120, policy=P24,
      prices=dict(adult=(1600, 12, None), child=(800, 3, 11), infant=(0, 0, 2)), private=None, extras=[],
      transport=STD_TRANSPORT, times=["10:00", "14:00"], cap=40, images=["glass-boat", "reef", "marina"],
      en=dict(title="Glass-bottom boat: reefs without getting wet", summary="Two hours watching coral and fish through the boat's glass floor.",
              description="The easiest way to see the Red Sea reefs: sit in the lower deck and watch coral and fish through large glass windows. Good for small children, grandparents and anyone who prefers to stay dry.",
              itinerary="Departure from the marina\nSlow cruise over two reefs\nShort stop to feed nothing and touch nothing: just watch\nReturn to the marina",
              included="Boat trip\nWater",
              excluded="Hotel transfer (optional add-on)",
              requirements="Suitable for all ages.",
              meeting_info="Hurghada New Marina, gate 1, 15 minutes before departure."),
      ar=dict(title="المركب الزجاجي: الشعاب بدون ما تتبل", summary="ساعتان لمشاهدة الشعاب والأسماك من أرضية المركب الزجاجية.",
              description="أسهل طريقة لرؤية شعاب البحر الأحمر: تجلس في الطابق السفلي وتشاهد الشعاب والأسماك من نوافذ زجاجية كبيرة. مناسب للأطفال الصغار وكبار السن ولمن يفضل عدم النزول للماء.",
              itinerary="التحرك من المارينا\nجولة بطيئة فوق شعبتين\nتوقف قصير للمشاهدة فقط بدون لمس أو إطعام\nالعودة إلى المارينا",
              included="رحلة المركب\nمياه",
              excluded="التوصيل من الفندق (إضافة اختيارية)",
              requirements="مناسب لكل الأعمار.",
              meeting_info="مارينا الغردقة الجديدة، البوابة 1، قبل الموعد بـ 15 دقيقة.")),
 dict(id="50000000-0000-0000-0000-000000000007", slug="demo-sunset-sail", op=0, cat=SEA, mode="instant", minutes=150, policy=P24,
      prices=dict(adult=(2400, 12, None), child=(1200, 4, 11), infant=(0, 0, 3)), private=(20000, 8), extras=[],
      transport=STD_TRANSPORT, times=["16:00"], cap=16, images=["sunset", "sea-boat", "marina"],
      en=dict(title="Sunset sailing cruise", summary="Two and a half hours under sail as the sun goes down, with tea and snacks.",
              description="A small sailing boat leaves the marina in the late afternoon and sails along the coast while the sun sets behind the mountains. Quiet, slow and good for couples.",
              itinerary="16:00 boarding\n16:15 sailing along the coast\nSunset on deck with tea and snacks\n18:30 back at the marina",
              included="Sailing trip with skipper\nTea, soft drinks and snacks",
              excluded="Hotel transfer (optional add-on)",
              requirements="Bring a light jacket: it gets cooler on the water after sunset.",
              meeting_info="Hurghada Marina boulevard, pier C."),
      ar=dict(title="رحلة إبحار وقت الغروب", summary="ساعتان ونصف بالشراع وقت غروب الشمس مع الشاي والوجبات الخفيفة.",
              description="مركب شراعي صغير يغادر المارينا آخر العصر ويبحر بمحاذاة الساحل بينما تغرب الشمس خلف الجبال. هادئ وبطيء ومناسب للأزواج.",
              itinerary="16:00 الصعود للمركب\n16:15 الإبحار بمحاذاة الساحل\nالغروب على السطح مع الشاي والوجبات الخفيفة\n18:30 العودة إلى المارينا",
              included="رحلة الإبحار مع القبطان\nشاي ومشروبات غازية ووجبات خفيفة",
              excluded="التوصيل من الفندق (إضافة اختيارية)",
              requirements="أحضر جاكيت خفيف: الجو يبرد على الماء بعد الغروب.",
              meeting_info="ممشى مارينا الغردقة، رصيف C.")),
 dict(id="50000000-0000-0000-0000-000000000008", slug="demo-desert-stars", op=1, cat=DESERT, mode="instant", minutes=300, policy=P48,
      prices=dict(adult=(2800, 12, None), child=(1400, 4, 11), infant=(0, 0, 3)), private=None, extras=[],
      transport=STD_TRANSPORT, times=["17:00"], cap=30, images=["stars", "tent", "camel"],
      en=dict(title="Desert stargazing and barbecue dinner", summary="Sunset in the dunes, dinner at a Bedouin camp and the night sky through a telescope.",
              description="You drive out of town in the late afternoon to reach a quiet desert camp before sunset. After a barbecue dinner around the fire, the lights go off and a guide shows you the stars and planets through a telescope.",
              itinerary="17:00 pickup and drive to the camp\nSunset from a dune\nBarbecue dinner and tea\nStargazing with a telescope\n22:00 back at your hotel",
              included="Transport from the meeting point to the camp\nDinner, tea and water\nTelescope session with a guide",
              excluded="Hotel transfer (optional add-on)",
              requirements="Bring a warm layer: desert nights are cold from November to March.",
              meeting_info="Meeting point: Safari office, El Nasr Road."),
      ar=dict(title="مشاهدة النجوم في الصحراء مع عشاء مشويات", summary="الغروب بين الكثبان، وعشاء في معسكر بدوي، والسماء ليلًا من التلسكوب.",
              description="تخرج من المدينة آخر العصر لتصل إلى معسكر هادئ في الصحراء قبل الغروب. وبعد عشاء مشويات حول النار تُطفأ الأنوار ويعرض لك المرشد النجوم والكواكب من خلال التلسكوب.",
              itinerary="17:00 الاستلام والتحرك إلى المعسكر\nالغروب من فوق الكثبان\nعشاء مشويات وشاي\nمشاهدة النجوم بالتلسكوب\n22:00 العودة إلى الفندق",
              included="المواصلات من نقطة التجمع إلى المعسكر\nالعشاء والشاي والمياه\nجلسة التلسكوب مع مرشد",
              excluded="التوصيل من الفندق (إضافة اختيارية)",
              requirements="أحضر ملابس دافئة: ليالي الصحراء باردة من نوفمبر إلى مارس.",
              meeting_info="نقطة التجمع: مكتب السفاري، شارع النصر.")),
 dict(id="50000000-0000-0000-0000-000000000009", slug="demo-sunrise-camel", op=1, cat=DESERT, mode="request", minutes=180, policy=P48,
      prices=dict(adult=(2000, 8, None), child=(1000, 6, 11)), private=None, extras=[],
      transport=STD_TRANSPORT, times=["05:30"], cap=10, images=["sunrise", "camel", "tent"],
      en=dict(title="Sunrise camel ride", summary="A slow camel ride into the mountains at dawn, then breakfast at camp.",
              description="An early start, rewarded with the desert at its quietest. You ride a camel led by a Bedouin guide to a viewpoint for sunrise, then share a simple breakfast at the camp.",
              itinerary="05:30 pickup\n06:00 camel ride to the viewpoint\nSunrise\n07:30 breakfast at camp\n08:30 back to town",
              included="Camel ride with guide\nBreakfast and tea",
              excluded="Hotel transfer (optional add-on)",
              requirements="Minimum age 6. Long trousers recommended.",
              meeting_info="Desert camp, Hurghada–Safaga road."),
      ar=dict(title="ركوب الجمل وقت الشروق", summary="جولة هادئة على الجمل نحو الجبال مع الفجر، ثم فطار في المعسكر.",
              description="تبدأ مبكرًا لترى الصحراء في أهدأ أوقاتها. تركب جملًا يقوده مرشد بدوي إلى نقطة مطلة لمشاهدة الشروق، ثم تتناول فطارًا بسيطًا في المعسكر.",
              itinerary="05:30 الاستلام\n06:00 جولة الجمل إلى النقطة المطلة\nالشروق\n07:30 الفطار في المعسكر\n08:30 العودة إلى المدينة",
              included="ركوب الجمل مع مرشد\nفطار وشاي",
              excluded="التوصيل من الفندق (إضافة اختيارية)",
              requirements="الحد الأدنى للسن 6 سنوات. يُفضل بنطلون طويل.",
              meeting_info="معسكر الصحراء، طريق الغردقة–سفاجا.")),
 dict(id="50000000-0000-0000-0000-000000000010", slug="demo-super-safari", op=1, cat=DESERT, mode="instant", minutes=360, policy=P48,
      prices=dict(adult=(3600, 16, None), child=(1800, 6, 15)), private=None, extras=[],
      transport=STD_TRANSPORT, times=["13:00"], cap=20, images=["quad", "camel", "stars"],
      en=dict(title="Super safari: jeep, quad, camel and dinner", summary="Half a day in the desert: jeep ride, quad, camel, a Bedouin village and dinner.",
              description="Everything in one afternoon. A jeep takes you deep into the desert, you ride a quad and a camel, visit a Bedouin village and end with dinner and a show under the stars.",
              itinerary="13:00 jeep ride into the desert\nQuad ride (30 minutes)\nCamel ride and Bedouin village\nSunset and dinner\n19:00 back in town",
              included="Jeep, quad and camel rides\nGuide\nDinner and drinks",
              excluded="Hotel transfer (optional add-on)",
              requirements="Children ride as passengers with an adult on the quad.",
              meeting_info="Safari office, El Nasr Road."),
      ar=dict(title="سوبر سفاري: جيب وموتوسيكل وجمل وعشاء", summary="نصف يوم في الصحراء: جيب وموتوسيكل رباعي وجمل وقرية بدوية وعشاء.",
              description="كل شيء في عصرية واحدة. ينقلك الجيب إلى عمق الصحراء، وتركب الموتوسيكل الرباعي والجمل، وتزور قرية بدوية، ثم تختم بعشاء وعرض تحت النجوم.",
              itinerary="13:00 جولة الجيب في الصحراء\nقيادة الموتوسيكل الرباعي (30 دقيقة)\nركوب الجمل والقرية البدوية\nالغروب والعشاء\n19:00 العودة إلى المدينة",
              included="جولات الجيب والموتوسيكل والجمل\nمرشد\nعشاء ومشروبات",
              excluded="التوصيل من الفندق (إضافة اختيارية)",
              requirements="الأطفال يركبون كركاب مع شخص بالغ على الموتوسيكل.",
              meeting_info="مكتب السفاري، شارع النصر.")),
 dict(id="50000000-0000-0000-0000-000000000011", slug="demo-old-town-walk", op=3, cat=CULTURE, mode="instant", minutes=180, policy=P24,
      prices=dict(adult=(1600, 12, None), child=(0, 0, 11)), private=(12000, 8), extras=[],
      transport=STD_TRANSPORT, times=["10:00", "17:00"], cap=14, images=["oldtown", "market", "marina"],
      en=dict(title="El Dahar old town and market walk", summary="Walk the old quarter with a local guide: the mosque, the fish market and a spice shop.",
              description="A walking tour of El Dahar, the oldest part of Hurghada. Your guide explains how the fishing town grew into a resort city, takes you through the market lanes and stops at a family spice shop for tea.",
              itinerary="Meet at El Mina Mosque square\nOld quarter lanes\nFish market and fruit market\nTea at a spice shop\nEnd near the Hurghada Marina",
              included="Local guide\nTea at the spice shop",
              excluded="Hotel transfer (optional add-on)\nPurchases",
              requirements="Shoulders and knees covered for the mosque visit.",
              meeting_info="El Mina Mosque square, by the main gate."),
      ar=dict(title="جولة الدهار القديمة والسوق", summary="تمشية في الحي القديم مع مرشد محلي: المسجد وسوق السمك ومحل عطارة.",
              description="جولة على الأقدام في الدهار، أقدم أحياء الغردقة. يشرح لك المرشد كيف تحولت قرية الصيادين إلى مدينة سياحية، ويمر بك على حواري السوق ويتوقف عند محل عطارة عائلي لشرب الشاي.",
              itinerary="اللقاء في ساحة مسجد الميناء\nحواري الحي القديم\nسوق السمك وسوق الفاكهة\nشاي في محل العطارة\nالنهاية بالقرب من مارينا الغردقة",
              included="مرشد محلي\nشاي في محل العطارة",
              excluded="التوصيل من الفندق (إضافة اختيارية)\nالمشتريات",
              requirements="تغطية الكتفين والركبتين لزيارة المسجد.",
              meeting_info="ساحة مسجد الميناء، عند البوابة الرئيسية.")),
 dict(id="50000000-0000-0000-0000-000000000012", slug="demo-luxor-day", op=3, cat=CULTURE, mode="request", minutes=840, policy=P72,
      prices=dict(adult=(7200, 12, None), child=(3600, 4, 11), infant=(0, 0, 3)), private=None,
      extras=[(2000, "person", "Hot-air balloon at sunrise (subject to weather)", "منطاد وقت الشروق (حسب الطقس)")],
      transport=[("hurghada", 0, 7), ("gouna", 800, 7), ("makadi", 800, 7), ("sahl", 400, 7)], times=["05:00"], cap=16, images=["temple", "nile", "sunrise"],
      en=dict(title="Luxor day trip: temples and the West Bank", summary="A long day by road to Luxor with an Egyptologist guide: Karnak, the Valley of the Kings and lunch by the Nile.",
              description="A full day: about four hours each way by air-conditioned minibus. In Luxor an Egyptologist guide takes you to Karnak Temple, across the Nile to the Valley of the Kings, and to lunch with a view of the river.\nEntrance fees are included for the sites in the itinerary; special tombs cost extra on site.",
              itinerary="05:00 pickup from your hotel\n09:00 Karnak Temple\n11:30 Valley of the Kings\n13:30 lunch by the Nile\n15:00 Hatshepsut Temple (outside view)\n16:00 drive back\n20:00 back at your hotel",
              included="Transport with air conditioning\nEgyptologist guide\nEntrance fees for listed sites\nLunch and water",
              excluded="Special tombs and photo permits\nTips",
              requirements="Passport copy required. Long day: not ideal for children under 6.",
              meeting_info="Pickup from your hotel lobby (Hurghada area included)."),
      ar=dict(title="رحلة يوم إلى الأقصر: المعابد والبر الغربي", summary="يوم طويل بالطريق إلى الأقصر مع مرشد أثري: الكرنك ووادي الملوك وغداء على النيل.",
              description="يوم كامل: حوالي أربع ساعات في كل اتجاه بميني باص مكيف. في الأقصر يرافقك مرشد أثري إلى معبد الكرنك، ثم تعبر النيل إلى وادي الملوك، وتتناول الغداء بإطلالة على النهر.\nرسوم الدخول مشمولة للمواقع المذكورة في البرنامج؛ المقابر الخاصة تُدفع في الموقع.",
              itinerary="05:00 الاستلام من الفندق\n09:00 معبد الكرنك\n11:30 وادي الملوك\n13:30 الغداء على النيل\n15:00 معبد حتشبسوت (من الخارج)\n16:00 طريق العودة\n20:00 الوصول إلى الفندق",
              included="مواصلات مكيفة\nمرشد أثري\nرسوم دخول المواقع المذكورة\nغداء ومياه",
              excluded="المقابر الخاصة وتصاريح التصوير\nالإكراميات",
              requirements="صورة جواز السفر مطلوبة. يوم طويل: غير مثالي للأطفال أقل من 6 سنوات.",
              meeting_info="الاستلام من استقبال الفندق (منطقة الغردقة مشمولة).")),
]
ALT = {"island": "Illustration: sandy island", "reef": "Illustration: coral reef", "sea-boat": "Illustration: day boat at sea",
       "quad": "Illustration: quad bike in the desert", "tent": "Illustration: Bedouin tent", "camel": "Illustration: camel in the dunes",
       "dolphins": "Illustration: dolphins", "diver": "Illustration: scuba diver", "glass-boat": "Illustration: glass-bottom boat",
       "marina": "Illustration: marina", "sunset": "Illustration: sailboat at sunset", "stars": "Illustration: desert camp at night",
       "sunrise": "Illustration: desert sunrise", "oldtown": "Illustration: old town", "market": "Illustration: market stalls",
       "temple": "Illustration: temple columns", "nile": "Illustration: felucca on the river"}

# Part 2: more operators, categories and trips, and real photos for every demo trip (scripts/demo_catalog.py)
import sys
sys.path.insert(0, os.path.dirname(__file__))
import demo_catalog as more
OPS += more.NEW_OPS
EXPS += more.NEW_EXPS
for e in EXPS:
    if e["slug"] in more.RECATEGORISE:
        e["cat"] = more.CAT[more.RECATEGORISE[e["slug"]]]
    e["photos"] = more.PHOTOS[e["slug"]]

# German, Russian and French versions of the demo trips (translated with AI, marked machine_translated)
TR = json.load(open(os.path.join(os.path.dirname(__file__), "demo_translations.json"), encoding="utf-8"))

out = []
w = out.append
w("-- GENERATED by scripts/make-demo-sql.py: [DEMO] content for development and test sites. Everything here is fake.")
w("-- Remove it all with supabase/demo/remove_demo.sql before launch. Safe to run more than once.")
w("begin;")
w("select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true); -- run the booking engine as the server would")
w("insert into organizations (id, type, status, name, slug) values")
w(",\n".join(f"  ({q(i)}, 'operator', 'active', {q(n)}, {q(s)})" for i, n, s, *_ in OPS) + ",")
w(",\n".join(f"  ({q(i)}, {q(t)}, 'active', {q(n)}, {q(s)})" for i, t, n, s, *_ in PARTNERS))
w("on conflict (id) do update set name = excluded.name, status = 'active';")
w("insert into org_private_details (org_id, contact_phone, contact_email, instapay_handle) values")
rows = [f"  ({q(i)}, {q(ph)}, {q(em)}, null)" for i, n, s, ph, em in OPS] + [f"  ({q(i)}, {q(ph)}, null, {q(ip)})" for i, t, n, s, c, ph, ip in PARTNERS]
w(",\n".join(rows))
w("on conflict (org_id) do update set contact_phone = excluded.contact_phone, contact_email = coalesce(excluded.contact_email, org_private_details.contact_email), instapay_handle = coalesce(excluded.instapay_handle, org_private_details.instapay_handle);")
w("insert into partner_codes (org_id, code) values " + ", ".join(f"({q(i)}, {q(c)})" for i, t, n, s, c, *_ in PARTNERS) + " on conflict do nothing;")
w("insert into hotels (id, zone_id, name) values " + ", ".join(f"({q(h)}, {q(Z[z])}, {q(n)})" for h, z, n in HOTELS) + " on conflict (id) do nothing;")
w("insert into coupons (code, percent_bps, active) values ('WELCOME10', 1000, true), ('NOVEMBER5', 500, true) on conflict (code) do nothing;")
w("insert into fx_rates (base, quote, rate, source) select 'EUR', x.q, x.r, 'manual' from (values ('USD', 1.08), ('RUB', 98.5), ('GBP', 0.85), ('EGP', 52.4)) x(q, r)")
w("  where not exists (select 1 from fx_rates f where f.base = 'EUR' and f.quote = x.q);")

for e in EXPS:
    op = OPS[e["op"]][0]
    pa, pm = (e["private"] or (None, None))
    w(f"insert into experiences (id, operator_id, category_id, slug, status, booking_mode, duration_minutes, collection_currency, cancellation_policy_id, private_available, private_max_group)")
    w(f"values ({q(e['id'])}, {q(op)}, {q(e['cat'])}, {q(e['slug'])}, 'published', {q(e['mode'])}, {e['minutes']}, 'EUR', {q(e['policy'])}, {'true' if e['private'] else 'false'}, {pm if pm else 'null'})")
    w("on conflict (id) do update set category_id = excluded.category_id, status = 'published', booking_mode = excluded.booking_mode, duration_minutes = excluded.duration_minutes,")
    w("  cancellation_policy_id = excluded.cancellation_policy_id, private_available = excluded.private_available, private_max_group = excluded.private_max_group;")
    if e["slug"] in more.LOCATIONS:  # meeting point on the map (see demo_catalog.LOCATIONS)
        lat, lng, place, exact = more.LOCATIONS[e["slug"]]
        w(f"update experiences set meeting_lat = {lat}, meeting_lng = {lng}, meeting_place = {q(place)}, meeting_exact_public = {'true' if exact else 'false'} where id = {q(e['id'])};")
    w(f"delete from experience_translations where experience_id = {q(e['id'])};")
    for loc in ("en", "ar"):
        t = e[loc]
        w(f"insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed) values ("
          f"{q(e['id'])}, '{loc}', {q(t['title'])}, {q(t['summary'])}, {q(t['description'])}, {q(t['itinerary'])}, {q(t['included'])}, {q(t['excluded'])}, {q(t['requirements'])}, {q(t['meeting_info'])}, false);")
    for loc in ("de", "ru", "fr"):
        t = TR["trips"][loc].get(e["slug"])
        if not t: continue
        g = lambda k: t.get(k)
        w(f"insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) values ("
          f"{q(e['id'])}, '{loc}', {q(g('title'))}, {q(g('summary'))}, {q(g('description'))}, {q(g('itinerary'))}, {q(g('included'))}, {q(g('excluded'))}, {q(g('requirements'))}, {q(g('meeting_info'))}, false, true);")
    for kind, (net, amin, amax) in e["prices"].items():
        w(f"insert into price_categories (experience_id, kind, net_minor, age_min, age_max) values ({q(e['id'])}, '{kind}', {net}, {amin if amin is not None else 'null'}, {amax if amax is not None else 'null'})"
          " on conflict (experience_id, kind) do update set net_minor = excluded.net_minor, age_min = excluded.age_min, age_max = excluded.age_max, active = true;")
    if e["private"]:
        w(f"insert into price_categories (experience_id, kind, net_minor, max_group) values ({q(e['id'])}, 'private_group', {pa}, {pm})"
          " on conflict (experience_id, kind) do update set net_minor = excluded.net_minor, max_group = excluded.max_group, active = true;")
    w(f"update extras set active = false where experience_id = {q(e['id'])};")
    for n, (net, per, en, ar) in enumerate(e["extras"], 1):
        xid = f"61{e['id'][2:-4]}{e['id'][-2:]}{n:02d}"
        w(f"insert into extras (id, experience_id, net_minor, per, sort) values ({q(xid)}, {q(e['id'])}, {net}, '{per}', {n}) on conflict (id) do update set net_minor = excluded.net_minor, per = excluded.per, active = true;")
        w(f"delete from extra_translations where extra_id = {q(xid)}; insert into extra_translations (extra_id, locale, name) values ({q(xid)}, 'en', {q(en)}), ({q(xid)}, 'ar', {q(ar)});")
        more_names = [(loc, TR["extras"][loc].get(xid)) for loc in ("de", "ru", "fr")]
        vals = ", ".join(f"({q(xid)}, '{loc}', {q(nm)})" for loc, nm in more_names if nm)
        if vals: w(f"insert into extra_translations (extra_id, locale, name) values {vals};")
    w(f"delete from transport_prices where experience_id = {q(e['id'])};")
    w("insert into transport_prices (experience_id, zone_id, net_minor, per, vehicle_capacity) values " + ", ".join(
        f"({q(e['id'])}, {q(Z[z])}, {net}, 'vehicle', {cap})" for z, net, cap in e["transport"]) + ";")
    w(f"delete from experience_media where experience_id = {q(e['id'])} and (storage_path like '/demo/%' or storage_path like '{more.U}%');")
    w("insert into experience_media (experience_id, storage_path, alt, sort, kind) values " + ", ".join(
        f"({q(e['id'])}, {q(more.U + pid)}, {q(alt)}, {i}, 'image')" for i, (pid, alt) in enumerate(e["photos"])) + ";")
    times = "array[" + ", ".join(f"time '{t}'" for t in e["times"]) + "]"
    w(f"insert into slots (experience_id, starts_at, capacity) select {q(e['id'])}, ((current_date + d) + tm) at time zone 'Africa/Cairo', {e['cap']}")
    w(f"  from generate_series(0, 60) d, unnest({times}) tm where ((current_date + d) + tm) at time zone 'Africa/Cairo' > now() + interval '2 hours'")
    w("on conflict (experience_id, starts_at) do nothing;")

# The history generator (plpgsql): runs once (skips if demo history already exists)
w(open(os.path.join(os.path.dirname(__file__), "demo-history.sql")).read())
w("commit;")
with open(os.path.join(os.path.dirname(__file__), "..", "supabase", "demo", "demo_content.sql"), "w") as f:
    f.write("\n".join(out) + "\n")
print("ok", len(out))
