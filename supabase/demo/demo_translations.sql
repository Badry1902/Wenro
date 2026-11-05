-- [DEMO] trips in German, Russian and French (AI translation, marked machine_translated). Safe to run again.
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Spa-Tagespass mit Pool und Massage', 'Ein ganzer Tag voller Ruhe: Pools, Dampfbad, eine 30-minütige Massage und ein leichtes Mittagessen.', 'Verbringen Sie den Tag in einem ruhigen Spa in Sahl Hasheesh. Nutzen Sie Innen- und Außenpools, Sauna und Dampfbad ganz nach Belieben, genießen Sie zu einer Uhrzeit Ihrer Wahl eine 30-minütige Entspannungsmassage und essen Sie am Pool ein leichtes Mittagessen.', '10:00 Begrüßungsgetränk
Pools, Sauna und Dampfbad
30-minütige Massage
Leichtes Mittagessen
16:00 Ende des Tages', 'Spa-Zugang für den ganzen Tag
30-minütige Massage
Leichtes Mittagessen und Wasser
Handtücher, Bademantel und Hausschuhe', 'Hoteltransfer (optional zubuchbar)
Zusätzliche Anwendungen', 'Mindestalter 16 Jahre.', 'Spa-Rezeption, Altstadt von Sahl Hasheesh. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-spa-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Flyboard-Session über dem Meer', 'Schweben Sie auf Wasserdüsen über dem Meer, während ein Instruktor Sie per Funk anleitet. 15 Minuten Flugzeit.', 'Nach einer kurzen Einweisung an Land ziehen Sie Schuhe, Helm und Weste an. Der Instruktor steuert die Leistung des Jetskis und spricht über das Helmfunkgerät mit Ihnen, sodass die meisten schon nach wenigen Minuten fliegen.', 'Sicherheitseinweisung am Strand
Ausrüstung anlegen
15 Minuten auf dem Flyboard
Zurück zum Strand', 'Flyboard-Session mit Instruktor
Helm, Weste und Neoprenanzug', 'Hoteltransfer (optional zubuchbar)
Video', 'Mindestalter 14 Jahre und Gewicht 45–110 kg.
Sie müssen schwimmen können.', 'Wassersporthütte am öffentlichen Strand, Sheraton Road.', false, true from experiences where slug = 'demo-flyboard' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Stand-up-Paddling bei Sonnenaufgang oder Sonnenuntergang', 'Eine geführte Paddeltour entlang der Küste in den ruhigen Stunden, mit kurzem Badestopp.', 'Frühmorgens und vor Sonnenuntergang ist das Meer am ruhigsten. Nach ein paar Minuten Übung im Sand führt Ihr Guide Sie gemächlich paddelnd die Küste entlang, mit einem Stopp zum Schwimmen und zum Betrachten des flachen Riffs.', 'Board-Anpassung und Übung am Strand
Geführte Paddeltour entlang der Küste
Badestopp
Zurück zum Strand', 'Board, Paddel und Leash
Guide
Wasser', 'Hoteltransfer (optional zubuchbar)
Wasserdichte Handyhülle', 'Sie müssen schwimmen können. Mindestalter 10 Jahre.', 'Wassersporthütte am öffentlichen Strand, Sheraton Road.', false, true from experiences where slug = 'demo-sup-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Aquapark-Tag mit Rutschen und Pools', 'Ein ganzer Tag mit Rutschen, Wellenbad und Lazy River, inklusive Mittagessen und Softdrinks.', 'Ein Tag für die ganze Familie: große Rutschen für Teenager und Erwachsene, ein Planschbereich für kleine Kinder, ein Lazy River und Liegen im Schatten. Mittagessen und Softdrinks sind inklusive.', '10:00 Einlass
Freie Zeit an Rutschen und Pools
13:00 Mittagessen
17:00 Der Park schließt', 'Tagesticket
Mittagessen und Softdrinks
Liegen und Sonnenschirme', 'Hoteltransfer (optional zubuchbar)
Schließfächer und Handtücher', 'Kinder unter 120 cm nutzen den Kinderbereich.
Für einige Rutschen gelten Größen- und Gewichtsgrenzen.', 'Haupteingang des Aquaparks, Straße Hurghada–Safaga. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-aqua-park' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Kairo und die Pyramiden an einem Tag', 'Früher Start im klimatisierten Reisebus zu den Pyramiden von Gizeh, der Sphinx und dem Ägyptischen Museum, mit Mittagessen.', 'Ein langer, aber lohnender Tag. Der Bus verlässt Hurghada vor Sonnenaufgang und erreicht Gizeh am späten Vormittag. Ihr Ägyptologe führt Sie zu den Pyramiden und der Sphinx und nach dem Mittagessen ins Ägyptische Museum.
Der Anbieter bestätigt jede Anfrage einzeln, da Busplätze und Museumstickets im Voraus gebucht werden.', '03:00 Abholung vom Hotel
09:30 Pyramiden von Gizeh und Sphinx
12:30 Mittagessen
14:00 Ägyptisches Museum
16:30 Rückfahrt
23:00 Zurück in Ihrem Hotel', 'Reisebus mit Abholung vom Hotel
Ägyptologe als Guide
Eintrittskarten
Mittagessen und Wasser', 'Eintritt ins Innere der Großen Pyramide
Trinkgelder', 'Bitte Reisepass mitbringen. Bequeme Schuhe und eine Kopfbedeckung.
Insgesamt etwa 12 Stunden Fahrt.', 'Abholung an Ihrer Hotelrezeption; die Uhrzeit wird am Vortag bestätigt.', false, true from experiences where slug = 'demo-cairo-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Stadtrundfahrt Hurghada: Moschee, Kirche und Marina', 'Vier Stunden mit einem einheimischen Guide zu den Sehenswürdigkeiten, den alten Gassen und der Marina.', 'Entdecken Sie das Hurghada, das die meisten Besucher verpassen. Ihr Guide zeigt Ihnen die große Moschee von El Dahar, die koptische Kirche, den Fischmarkt und die belebten Straßen der Altstadt; zum Abschluss spazieren Sie an der Marina entlang.
Für den Besuch der Moschee ist angemessene Kleidung nötig; Tücher werden gestellt.', 'Abholung oder Treffpunkt
El-Dahar-Moschee
Koptische Kirche
Fischmarkt und alte Gassen
Spaziergang an der Marina und freie Zeit', 'Einheimischer Guide
Klimatisierter Minibus
Wasser', 'Hoteltransfer (optional zubuchbar)
Einkäufe
Trinkgelder', 'Schultern und Knie müssen für die Moschee bedeckt sein.', 'Hauptplatz von El Dahar, vor dem alten Postamt.', false, true from experiences where slug = 'demo-city-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Tagesausflug nach El Gouna: Lagunen, Marina und Bootsfahrt', 'Ein Tag in der Lagunenstadt nördlich von Hurghada mit Bootsfahrt durch die Kanäle und freier Zeit an der Abu Tig Marina.', 'El Gouna ist auf Lagunen und Kanälen erbaut. Nach der Fahrt in den Norden bringt Sie ein kleines Boot durch die Wasserwege vorbei an bunten Häusern. Danach spazieren Sie durch die Innenstadt und verbringen den Nachmittag an der Marina – zum Mittagessen, Shoppen oder für einen Kaffee bei den Yachten.', '09:30 Abholung oder Treffpunkt
10:15 Ankunft in El Gouna
10:30 Bootsfahrt durch die Lagune
11:30 Spaziergang durch die Innenstadt
12:30 Freie Zeit an der Marina
16:00 Rückfahrt nach Hurghada', 'Guide und klimatisierter Minibus
Bootsfahrt durch die Lagune
Wasser', 'Mittagessen
Hoteltransfer (optional zubuchbar)', 'Tragen Sie bequeme Schuhe.', 'Hauptplatz von El Dahar, vor dem alten Postamt.', false, true from experiences where slug = 'demo-gouna-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Tagesausflug nach Luxor: Tempel und Westbank', 'Ein langer Tag auf der Straße nach Luxor mit einem Ägyptologen: Karnak, das Tal der Könige und Mittagessen am Nil.', 'Ein ganzer Tag: etwa vier Stunden pro Strecke im klimatisierten Minibus. In Luxor führt Sie ein Ägyptologe zum Karnak-Tempel, über den Nil ins Tal der Könige und zum Mittagessen mit Blick auf den Fluss.
Die Eintrittsgelder für die Stätten im Programm sind inklusive; besondere Gräber kosten vor Ort extra.', '05:00 Abholung vom Hotel
09:00 Karnak-Tempel
11:30 Tal der Könige
13:30 Mittagessen am Nil
15:00 Hatschepsut-Tempel (Außenansicht)
16:00 Rückfahrt
20:00 Zurück in Ihrem Hotel', 'Klimatisierter Transport
Ägyptologe als Guide
Eintrittsgelder für die genannten Stätten
Mittagessen und Wasser', 'Besondere Gräber und Fotogenehmigungen
Trinkgelder', 'Kopie des Reisepasses erforderlich. Langer Tag: für Kinder unter 6 Jahren nicht ideal.', 'Abholung in Ihrer Hotellobby (Raum Hurghada inklusive).', false, true from experiences where slug = 'demo-luxor-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'U-Boot-Fahrt zum Korallenriff', 'Tauchen Sie in einem echten Touristen-U-Boot etwa 20 Meter tief und beobachten Sie das Riff durch große Fenster, ohne nass zu werden.', 'Perfekt für Familien und Nichtschwimmer. Ein Zubringerboot bringt Sie zum U-Boot, das dann langsam am Riff entlang abtaucht. Jeder Platz hat ein eigenes Fenster, und ein Guide erklärt Ihnen die Fische und Korallen, die Sie sehen.', 'Zubringerboot zum U-Boot
Etwa 45 Minuten unter Wasser
Zubringer zurück zur Marina', 'Zubringerboot und U-Boot-Tauchgang
Guide an Bord
Wasser', 'Hoteltransfer (optional zubuchbar)
Fotos', 'Nicht geeignet für Personen mit starker Platzangst.', 'Hurghada New Marina, U-Boot-Anleger, 30 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-submarine' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Strand-Yoga bei Sonnenaufgang oder Sonnenuntergang', 'Eine 75-minütige sanfte Yogastunde im Sand für alle Niveaus, danach frischer Saft.', 'Eine ruhige Stunde mit einer zertifizierten Lehrkraft an einem stillen Strand in Sahl Hasheesh. Atemübungen, sanfter Flow und eine lange Entspannung zum Rauschen des Meeres. Matten werden gestellt.', 'Begrüßung und Atemübungen
Sanfter Flow
Entspannung
Frischer Saft', 'Yogastunde mit zertifizierter Lehrkraft
Matte und Handtuch
Frischer Saft', 'Hoteltransfer (optional zubuchbar)', 'Alle Niveaus willkommen. Informieren Sie die Lehrkraft über Verletzungen.', 'Strandterrasse des Spas, Sahl Hasheesh. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-beach-yoga' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Glasbodenboot: Riffe sehen, ohne nass zu werden', 'Zwei Stunden Korallen und Fische durch den Glasboden des Bootes beobachten.', 'Die einfachste Art, die Riffe des Roten Meeres zu sehen: Setzen Sie sich aufs Unterdeck und beobachten Sie Korallen und Fische durch große Glasfenster. Ideal für kleine Kinder, Großeltern und alle, die lieber trocken bleiben.', 'Abfahrt von der Marina
Langsame Fahrt über zwei Riffe
Kurzer Stopp – nichts füttern, nichts berühren: einfach zuschauen
Rückkehr zur Marina', 'Bootsfahrt
Wasser', 'Hoteltransfer (optional zubuchbar)', 'Für alle Altersgruppen geeignet.', 'Hurghada New Marina, Tor 1, 15 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-glass-boat' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Hammam- und Massageritual', 'Dampfbad, Peeling mit schwarzer Seife, Schaumwäsche und eine 45-minütige Ölmassage, danach Minztee.', 'Zwei Stunden zum Entschleunigen. Sie beginnen im Dampfbad, dann werden Sie auf dem warmen Marmor gepeelt und mit Schaum gewaschen, gefolgt von einer 45-minütigen Massage mit Arganöl. Zum Abschluss gibt es Minztee im Ruheraum.', 'Dampfbad
Peeling mit schwarzer Seife und Schaumwäsche
45-minütige Ölmassage
Ruhepause mit Minztee', 'Hammam und Massage
Handtücher, Bademantel und Hausschuhe
Minztee', 'Hoteltransfer (optional zubuchbar)', 'Mindestalter 16 Jahre. Bitte informieren Sie uns über eine Schwangerschaft oder gesundheitliche Beschwerden.', 'Spa-Rezeption, Altstadt von Sahl Hasheesh. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-hammam-spa' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Ausritt am Strand und in der Wüste', 'Zwei Stunden zu Pferd vom Wüstenrand bis ans Meer, für Anfänger und geübte Reiter.', 'Reiten Sie vom Stall über den Wüstenrand hinunter zu einem ruhigen Strand, wo die Pferde durch das flache Wasser gehen. Ruhige Pferde für Anfänger, lebhaftere für erfahrene Reiter.', 'Kennenlernen der Pferde und kurze Einweisung
Ritt am Wüstenrand
Strand und Ritt durchs Meer
Zurück zum Stall, Tee', 'Pferd und Guide
Helm
Tee', 'Hoteltransfer (optional zubuchbar)', 'Mindestalter 8 Jahre. Höchstgewicht 100 kg.
Lange Hosen empfohlen.', 'Reitstall, hinter der Makadi Bay. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-horse-ride' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Nachttauchgang am Hausriff', 'Ein geführter Tauchgang nach Sonnenuntergang mit Lampen, wenn das nächtliche Leben am Riff erwacht.', 'Nachts verwandelt sich das Riff völlig: Oktopusse und Muränen gehen auf Jagd, Papageifische schlafen in ihren Schleimkokons und das Plankton leuchtet. Sie tauchen mit einem erfahrenen Guide und einer Lampe in einem ruhigen, flachen Bereich.
Das Tauchzentrum prüft vor der Bestätigung Ihre Erfahrung.', '17:30 Check-in und Briefing
18:15 Ausrüstung und Einstieg
18:30 Nachttauchgang (etwa 45 Minuten)
19:30 Heißgetränk und Logbuch', 'Geführter Nachttauchgang
Lampe, Flasche, Blei und komplette Ausrüstung
Heißgetränk', 'Hoteltransfer (optional zubuchbar)', 'Open-Water-Brevet und mindestens 10 geloggte Tauchgänge.
Mindestalter 15 Jahre.', 'Tauchzentrum an der Sheraton Road. Genauer Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-night-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Strandtag in der Orange Bay', 'Ein langer Strandaufenthalt in einer Bucht mit weißem Sand, ein Schnorchelstopp und Mittagessen.', 'Ein entspannter Tag rund um den Strand. Die meiste Zeit verbringen Sie in einer Bucht mit weißem Sand und flachem, türkisfarbenem Wasser – gut für Familien und Nichtschwimmer. Auf dem Rückweg gibt es einen Schnorchelstopp.', '09:00 Das Boot verlässt die Marina
10:30 Ankunft in der Bucht: freie Zeit am Strand
13:00 Mittagessen
14:30 Schnorchelstopp
16:30 Zurück an der Marina', 'Bootsfahrt
Strandeintritt
Mittagessen und Softdrinks
Schnorchelausrüstung', 'Hoteltransfer (optional zubuchbar)
Liegen (optional gegen Aufpreis)', 'Bringen Sie ein Handtuch und riffschonende Sonnencreme mit.', 'Hurghada New Marina, Tor 2, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-orange-bay' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Wracktauchen: ein gesunkenes Schiff bei Hurghada', 'Betauchen Sie mit einem erfahrenen Guide ein mit Korallen bewachsenes Wrack; der zweite Tauchgang führt an ein Riff.', 'Ein Wracktauchgang für zertifizierte Taucher mit etwas Erfahrung. Nach einem ausführlichen Briefing steigen Sie an der Leine ab und erkunden das Schiff von außen, das heute Korallen und Fischen ein Zuhause bietet. Ein Eindringen ins Wrack ist nicht Teil dieses Ausflugs.
Das Tauchzentrum prüft vor der Bestätigung Ihr Logbuch, daher wird dieser Ausflug auf Anfrage gebucht.', '07:00 Check-in und Briefing
08:00 Abfahrt des Bootes
09:30 Wracktauchgang
11:00 Mittagessen an Bord
12:30 Rifftauchgang
14:30 Zurück an der Marina', 'Zwei geführte Tauchgänge (Wrack und Riff)
Komplette Ausrüstung
Mittagessen und Getränke', 'Hoteltransfer (optional zubuchbar)
Meeresparkgebühr', 'Advanced-Brevet oder 20 geloggte Tauchgänge.
Mindestalter 15 Jahre.', 'Tauchzentrum, Sheraton Road. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-wreck-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Parasailing über der Bucht', 'Etwa 10 Minuten in der Luft über dem Meer, allein oder im Tandem, mit dem Strand unter Ihnen.', 'Sie starten vom Heck des Bootes und steigen langsam über die Bucht auf. Der Flug ist ruhig und leise; Sie landen trocken wieder auf dem Boot. Tandemflüge für zwei Personen sind bis zum gemeinsamen Gewichtslimit möglich.', 'Kurze Sicherheitseinweisung am Strand
Bootsfahrt zum Fluggebiet
Etwa 10 Minuten in der Luft
Zurück zum Strand', 'Flug mit Gurtzeug und Schwimmweste
Bootsfahrt', 'Hoteltransfer (optional zubuchbar)
Fotos und Videos', 'Mindestalter 8 Jahre (Kinder fliegen im Tandem mit einem Erwachsenen).
Bei starkem Wind abgesagt: Sie erhalten einen anderen Termin oder den vollen Betrag zurück.', 'Wassersporthütte am öffentlichen Strand, Sheraton Road.', false, true from experiences where slug = 'demo-parasailing' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Quadtour zu einem Beduinendorf', 'Eine Stunde auf Ihrem eigenen Quad durch die Wüste, Tee in einem Beduinendorf.', 'Nach einer kurzen Sicherheitseinweisung fahren Sie Ihr eigenes Quad in einer geführten Kolonne über offene Wüstenpisten. Auf halber Strecke halten Sie in einem Beduinendorf für Tee und über dem Feuer gebackenes Brot sowie einen kurzen Kamelritt.
Der Anbieter bestätigt Ihre Anfrage innerhalb von 12 Stunden, da Fahrer und Helme im Voraus zugeteilt werden.', 'Sicherheitseinweisung und Anpassen des Helms
1 Stunde Quadfahrt mit Guide vorne und hinten
Beduinendorf: Tee, Brot, kurzer Kamelritt
Rückfahrt zum Camp', 'Quad und Treibstoff
Helm, Brille und Tuch
Guide
Beduinentee und Brot', 'Hoteltransfer (optional zubuchbar)
Im Camp verkaufte Fotos', 'Mindestalter 16 Jahre zum Selbstfahren. Geschlossene Schuhe empfohlen.
Nicht geeignet während der Schwangerschaft oder bei Rückenproblemen.', 'Wüstencamp an der Straße Hurghada–Safaga. Der genaue Standort-Pin kommt mit Ihrem Voucher.', false, true from experiences where slug = 'demo-quad-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Segeltörn bei Sonnenuntergang', 'Zweieinhalb Stunden unter Segeln, während die Sonne untergeht, mit Tee und Snacks.', 'Ein kleines Segelboot verlässt am späten Nachmittag die Marina und segelt die Küste entlang, während die Sonne hinter den Bergen untergeht. Ruhig, gemächlich und schön für Paare.', '16:00 Einschiffen
16:15 Segeln entlang der Küste
Sonnenuntergang an Deck mit Tee und Snacks
18:30 Zurück an der Marina', 'Segeltörn mit Skipper
Tee, Softdrinks und Snacks', 'Hoteltransfer (optional zubuchbar)', 'Bringen Sie eine leichte Jacke mit: Nach Sonnenuntergang wird es auf dem Wasser kühler.', 'Hurghada Marina Boulevard, Steg C.', false, true from experiences where slug = 'demo-sunset-sail' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Sterne beobachten in der Wüste mit Grill-Abendessen', 'Sonnenuntergang in den Dünen, Abendessen in einem Beduinencamp und der Nachthimmel durchs Teleskop.', 'Am späten Nachmittag fahren Sie aus der Stadt hinaus und erreichen vor Sonnenuntergang ein ruhiges Wüstencamp. Nach einem Grill-Abendessen am Feuer gehen die Lichter aus, und ein Guide zeigt Ihnen Sterne und Planeten durch ein Teleskop.', '17:00 Abholung und Fahrt zum Camp
Sonnenuntergang von einer Düne
Grill-Abendessen und Tee
Sterne beobachten mit Teleskop
22:00 Zurück in Ihrem Hotel', 'Transport vom Treffpunkt zum Camp
Abendessen, Tee und Wasser
Teleskop-Session mit Guide', 'Hoteltransfer (optional zubuchbar)', 'Bringen Sie eine warme Schicht mit: Von November bis März sind die Wüstennächte kalt.', 'Treffpunkt: Safari-Büro, El Nasr Road.', false, true from experiences where slug = 'demo-desert-stars' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Angelmorgen im Roten Meer', 'Grundangeln von einem kleinen Boot aus, mit Ruten, Köder und einem Mittagessen mit gegrilltem Fisch.', 'Fahren Sie mit einem einheimischen Kapitän zu den Fanggründen nördlich von Hurghada. Ruten, Schnüre und Köder liegen an Bord bereit, und die Crew zeigt Anfängern, wie man die Leine auswirft und einholt.
Ihr Fang wird an Bord ausgenommen und zum Mittagessen gegrillt.', '07:30 Das Boot verlässt die Marina
08:30 Erster Angelplatz
10:30 Zweiter Angelplatz
12:00 Gegrillter Fang zum Mittagessen
12:30 Zurück zur Marina', 'Boot, Kapitän und Crew
Ruten, Schnüre und Köder
Mittagessen mit Ihrem Fang
Wasser und Tee', 'Hoteltransfer (optional zubuchbar)
Trinkgelder', 'Ausflug bei ruhiger See; bringen Sie bei Bedarf trotzdem Tabletten gegen Reiseübelkeit mit.', 'Hurghada New Marina, Tor 2, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-fishing-trip' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Inselstrandtag bei Giftun', 'Ein Tag an einem feinsandigen Inselstrand: Liege und Sonnenschirm, Schnorcheln vom Ufer aus und Mittagessen.', 'Ein Schnellboot bringt Sie zu einem geschützten Inselstrand im Gebiet von Giftun. Verbringen Sie den Tag auf einer Liege unter dem Sonnenschirm, schnorcheln Sie direkt vom Strand aus über dem flachen Riff und genießen Sie ein Mittagsbuffet.', '08:30 Das Boot verlässt die Marina
09:15 Ankunft auf der Insel
Freie Zeit am Strand
12:30 Mittagsbuffet
16:00 Zurück an der Marina', 'Transfer im Schnellboot
Liege und Sonnenschirm
Mittagsbuffet und Wasser', 'Leihgebühr für Schnorchelausrüstung
Meeresparkgebühr
Hoteltransfer (optional zubuchbar)', 'Verwenden Sie riffschonende Sonnencreme. Korallen dürfen nicht berührt werden.', 'Hurghada New Marina, Tor 4, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-island-beach' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Super-Safari: Jeep, Quad, Kamel und Abendessen', 'Ein halber Tag in der Wüste: Jeepfahrt, Quad, Kamel, ein Beduinendorf und Abendessen.', 'Alles an einem Nachmittag. Ein Jeep bringt Sie tief in die Wüste, Sie fahren Quad und reiten auf einem Kamel, besuchen ein Beduinendorf und lassen den Tag mit Abendessen und einer Show unter den Sternen ausklingen.', '13:00 Jeepfahrt in die Wüste
Quadfahrt (30 Minuten)
Kamelritt und Beduinendorf
Sonnenuntergang und Abendessen
19:00 Zurück in der Stadt', 'Jeep-, Quad- und Kamelritt
Guide
Abendessen und Getränke', 'Hoteltransfer (optional zubuchbar)', 'Kinder fahren auf dem Quad als Beifahrer mit einem Erwachsenen mit.', 'Safari-Büro, El Nasr Road.', false, true from experiences where slug = 'demo-super-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Ägyptischer Kochkurs bei einer einheimischen Familie', 'Einkaufen auf dem Markt, vier klassische Gerichte bei einer Gastfamilie kochen und anschließend gemeinsam essen.', 'Sie beginnen auf dem örtlichen Markt und wählen Gemüse und Gewürze aus, dann wird in einer Familienküche gekocht: gefüllte Weinblätter, Koshari, Baladi-Brot und ein Dessert. Was Sie gekocht haben, essen Sie am Familientisch, und die Rezepte nehmen Sie mit nach Hause.
Kleine Gruppe; die Familie bestätigt Ihren Termin auf Anfrage.', 'Treffen mit Ihren Gastgebern auf dem Markt
Einkauf der Zutaten
Gemeinsames Kochen von vier Gerichten
Gemeinsames Essen und Rezepte', 'Zutaten und Kochkurs
Essen und Getränke
Rezeptkarte', 'Hoteltransfer (optional zubuchbar)', 'Bitte teilen Sie uns bei der Buchung Allergien oder vegetarische Wünsche mit.', 'Gemüsemarkt El Dahar, Haupteingang. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-cooking-class' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Dinner-Kreuzfahrt mit Musik', 'Drei Stunden auf dem abendlichen Meer: Sonnenuntergang, Abendbuffet und orientalische Livemusik an Deck.', 'Gehen Sie bei Sonnenuntergang an Bord und fahren Sie langsam die Küste entlang, während die Lichter von Hurghada angehen. Zum Abendessen gibt es ein Buffet mit Gegrilltem, Salaten und ägyptischen Gerichten; auf dem Oberdeck spielt eine Band.', '18:30 Einschiffen
19:00 Ablegen bei Sonnenuntergang
19:30 Abendbuffet
20:30 Livemusik an Deck
21:30 Zurück an der Marina', 'Kreuzfahrt
Abendbuffet
Wasser und Softdrinks
Livemusik', 'Hoteltransfer (optional zubuchbar)
Alkoholische Getränke', 'Smart-Casual-Kleidung. Bringen Sie eine leichte Jacke mit: Auf dem Meer ist es windig.', 'Hurghada New Marina, Tor 1, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-dinner-cruise' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Dolphin House mit dem Schnellboot', 'Mit einem schnellen Boot zum Riff, an dem Spinnerdelfine oft rasten, mit zwei Schnorchelstopps.', 'Dolphin House ist ein hufeisenförmiges Riff, an dem wilde Spinnerdelfine oft zum Ausruhen kommen. Die Crew hält respektvollen Abstand und befolgt die örtlichen Verhaltensregeln: nicht verfolgen, nicht füttern, nicht berühren.
Delfine sind Wildtiere, daher sind Sichtungen wahrscheinlich, aber nie garantiert. Der zweite Stopp ist ein Korallengarten zum Schnorcheln.', '08:00 Das Boot verlässt die Marina
09:15 Dolphin House: rücksichtsvoll beobachten und schnorcheln
11:30 Schnorchelstopp am Korallengarten
12:30 Mittagessen an Bord
14:00 Zurück an der Marina', 'Schnellboot mit Crew
Schnorchelausrüstung
Mittagessen, Wasser und Softdrinks', 'Hoteltransfer (optional zubuchbar)
Trinkgelder', 'Das Meer kann unruhig sein; sagen Sie der Crew Bescheid, wenn Sie seekrank werden.
Kinder müssen im Wasser eine Weste tragen.', 'Hurghada New Marina, Tor 2, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-dolphin-house' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Schnorcheltag auf der Insel Giftun', 'Zwei Riffstopps, ein Strand auf der Insel Giftun und Mittagessen an Bord.', 'Ein entspannter ganzer Tag auf dem Wasser. Das Boot verlässt morgens die Marina von Hurghada und ankert an zwei Riffen im Schutzgebiet Giftun, wo die Crew Ihnen die besten Stellen für Korallen und Fische zeigt. Zwischen den Schnorchelstopps verbringen Sie Zeit am weißen Strand der Insel Giftun.
Schnorchelausrüstung und eine Auftriebsweste werden gestellt; die Crew bleibt bei Anfängern im Wasser.', '08:30 Abholung vom Hotel (falls gebucht)
09:30 Das Boot verlässt die Marina
10:30 Erster Riffstopp: Schnorcheln
12:00 Strandzeit auf der Insel Giftun
13:30 Mittagessen an Bord
14:30 Zweiter Riffstopp
16:00 Zurück an der Marina', 'Bootsfahrt mit Crew
Schnorchelmaske, Flossen und Weste
Mittagessen an Bord, Wasser und Softdrinks
Gebühr für das Schutzgebiet', 'Hoteltransfer (optional zubuchbar)
Handtücher
Trinkgelder', 'Bringen Sie riffschonende Sonnencreme, ein Handtuch und eine Kopfbedeckung mit.
Nicht empfohlen für Personen, die gar nicht schwimmen können; Westen sind vorhanden.', 'Hurghada New Marina, Tor 2. Halten Sie 20 Minuten vor Abfahrt am Anleger nach dem WENRO-Schild Ausschau.', false, true from experiences where slug = 'demo-giftun-island' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Heißluftballon bei Sonnenaufgang in Luxor und die Westbank', 'Schweben Sie im Morgengrauen über das Tal der Könige und besuchen Sie danach die Gräber und den Tempel der Hatschepsut.', 'Sie verlassen Hurghada in der Nacht, um Luxor vor Sonnenaufgang zu erreichen. Während die Sonne aufgeht, gleitet Ihr Ballon über den Nil, die Felder und die Tempel der Westbank. Nach der Landung führt Sie Ihr Guide ins Tal der Könige und zum Tempel der Hatschepsut, mit Mittagessen am Nil.
Ballonfahrten sind windabhängig und werden vom Anbieter bestätigt.', '01:00 Abholung vom Hotel
05:30 Start des Ballons (etwa 45 Minuten)
08:00 Tal der Könige
10:30 Tempel der Hatschepsut
12:30 Mittagessen
13:30 Rückfahrt
18:30 Zurück in Ihrem Hotel', 'Reisebus mit Abholung vom Hotel
Ballonfahrt
Guide und Eintrittskarten
Mittagessen', 'Besondere Gräber (Extraticket)
Trinkgelder', 'Mindestalter 7 Jahre.
Falls der Ballon nicht starten kann, wird Ihnen der Ballonanteil erstattet.', 'Abholung an Ihrer Hotelrezeption; die Uhrzeit wird am Vortag bestätigt.', false, true from experiences where slug = 'demo-luxor-balloon' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Rundgang durch die Altstadt El Dahar und den Markt', 'Erkunden Sie das alte Viertel mit einem einheimischen Guide: die Moschee, den Fischmarkt und einen Gewürzladen.', 'Ein Rundgang durch El Dahar, den ältesten Teil von Hurghada. Ihr Guide erzählt, wie aus dem Fischerort eine Urlaubsstadt wurde, führt Sie durch die Marktgassen und hält für einen Tee in einem familiengeführten Gewürzladen.', 'Treffen am Platz der El-Mina-Moschee
Gassen des alten Viertels
Fischmarkt und Obstmarkt
Tee in einem Gewürzladen
Ende nahe der Hurghada Marina', 'Einheimischer Guide
Tee im Gewürzladen', 'Hoteltransfer (optional zubuchbar)
Einkäufe', 'Schultern und Knie müssen für den Moscheebesuch bedeckt sein.', 'Platz der El-Mina-Moschee, am Haupttor.', false, true from experiences where slug = 'demo-old-town-walk' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Privater Yachttag für Ihre Gruppe', 'Ihre eigene Yacht mit Kapitän und Crew für sechs Stunden: Wählen Sie die Riffe und Strände, die Ihnen gefallen.', 'Ideal für Familien und Freunde. Der Kapitän plant den Tag gemeinsam mit Ihnen: Schnorcheln an Riffen, ein ruhiger Strand oder einfach Sonne und Baden. Das Mittagessen wird an Bord gekocht.
Buchen Sie pro Person oder die ganze Yacht als privaten Ausflug für Ihre Gruppe.', '09:00 Einschiffen an der Marina
Ihr eigenes Programm mit dem Kapitän
Mittagessen an Bord
15:00 Zurück an der Marina', 'Private Yacht mit Kapitän und Crew
Schnorchelausrüstung
Mittagessen, Wasser und Softdrinks', 'Hoteltransfer (optional zubuchbar)
Meeresparkgebühr
Trinkgelder', 'Die endgültige Route hängt von Wind und Seegang ab.', 'Hurghada New Marina, Yachtsteg B.', false, true from experiences where slug = 'demo-private-yacht' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Kamelritt bei Sonnenaufgang', 'Ein gemächlicher Kamelritt in die Berge im Morgengrauen, danach Frühstück im Camp.', 'Ein früher Start, belohnt mit der Wüste in ihrer stillsten Stunde. Sie reiten auf einem Kamel, geführt von einem Beduinen, zu einem Aussichtspunkt für den Sonnenaufgang und teilen danach ein einfaches Frühstück im Camp.', '05:30 Abholung
06:00 Kamelritt zum Aussichtspunkt
Sonnenaufgang
07:30 Frühstück im Camp
08:30 Zurück in die Stadt', 'Kamelritt mit Guide
Frühstück und Tee', 'Hoteltransfer (optional zubuchbar)', 'Mindestalter 6 Jahre. Lange Hosen empfohlen.', 'Wüstencamp, Straße Hurghada–Safaga.', false, true from experiences where slug = 'demo-sunrise-camel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Zwei Rifftauchgänge für zertifizierte Taucher', 'Zwei geführte Tauchgänge an den schönsten Riffen Hurghadas, mit kompletter Ausrüstung und Mittagessen an Bord.', 'Für Taucher, die bereits ein Brevet haben. Der Tauchguide wählt zwei Riffe, die zu den Bedingungen des Tages und Ihrem Niveau passen, mit Oberflächenpause und Mittagessen zwischen den Tauchgängen.
Bringen Sie Ihre Brevetkarte und Ihr Logbuch mit.', '08:00 Check-in im Tauchzentrum
09:00 Abfahrt des Bootes
10:00 Erster Tauchgang (etwa 50 Minuten)
11:00 Oberflächenpause und Mittagessen
12:30 Zweiter Tauchgang
14:00 Zurück an der Marina', 'Zwei geführte Tauchgänge
Flasche, Blei und komplette Ausrüstung
Mittagessen, Wasser und Tee', 'Hoteltransfer (optional zubuchbar)
Nitrox (bitte im Tauchzentrum erfragen)
Meeresparkgebühr', 'Open-Water-Brevet oder gleichwertige Qualifikation erforderlich.
Kein Fliegen innerhalb von 24 Stunden nach dem Tauchen.', 'Tauchzentrum, Sheraton Road. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-two-tank-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Beduinen-Abendessen und Sterne beobachten', 'Fahren Sie bei Sonnenuntergang in die Wüste – mit über dem Feuer gebackenem Brot, einem Beduinen-Abendessen und den Sternen.', 'Ein 4x4 bringt Sie zu einem ruhigen Camp in den Wüstenhügeln. Sie beobachten den Sonnenuntergang, erfahren, wie Beduinenbrot auf heißem Sand und Steinen gebacken wird, und essen dann gemeinsam am Feuer zu Abend. Nach dem Essen werden die Lichter für die Sterne gedimmt.', '16:30 Abholung oder Treffpunkt
17:15 Sonnenuntergang in der Wüste
18:00 Brotbacken und Tee
19:00 Abendessen am Feuer
20:00 Sterne beobachten
20:45 Rückfahrt nach Hurghada', '4x4-Transfer zum Camp
Abendessen, Tee und Wasser
Sterne beobachten mit Guide', 'Hoteltransfer (optional zubuchbar)
Softdrinks im Camp', 'Bringen Sie eine warme Schicht mit: Von November bis März sind die Wüstennächte kühl.', 'Safari-Basis, Straße Hurghada–Safaga. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-bedouin-dinner' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Schnuppertauchen: Ihr erster Tauchgang', 'Keine Erfahrung nötig: Übungen im flachen Wasser, danach ein geführter Tauchgang auf 6–12 m.', 'Ein erster Eindruck vom Tauchen mit einem lizenzierten Instruktor – ein Instruktor für je zwei Gäste. Zuerst lernen Sie die Grundlagen im flachen Wasser; erst wenn Sie sich bereit fühlen, geht es hinab an ein ruhiges Riff.
Vor dem Ausflug füllen Sie einen kurzen medizinischen Fragebogen aus.', '08:30 Treffen im Tauchzentrum
09:00 Briefing und Anpassen der Ausrüstung
10:30 Übungen im flachen Wasser
11:30 Geführter Tauchgang (etwa 30 Minuten)
13:00 Zurück an Land', 'Komplette Tauchausrüstung
Instruktor (1 für 2 Gäste)
Bootsfahrt, Wasser und Snacks', 'Hoteltransfer (optional zubuchbar)
Tauchfotos', 'Mindestalter 10 Jahre. Medizinischer Fragebogen erforderlich.
Kein Fliegen innerhalb von 24 Stunden nach dem Tauchen.', 'Tauchzentrum, Sheraton Road. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-discover-scuba' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Orientalische Nacht: Abendessen und Tanoura-Show', 'Ägyptisches Abendessen, ein Tanoura-Tänzer, Folkloremusik und ein Bummel durch einen laternenbeleuchteten Basar.', 'Ein Abend mit ägyptischer Musik und Küche. Nach einem Spaziergang durch einen kleinen Basar voller Laternen und Gewürze wird das Abendessen serviert, während sich ein Tanoura-Tänzer in seinen bunten Röcken dreht und eine Folkloreband spielt.', '19:00 Ankunft und Bummel durch den Basar
19:45 Abendessen
20:30 Tanoura-Show und Folkloremusik
22:00 Ende des Abends', 'Abendessen und Softdrinks
Show
Tee und Kaffee', 'Hoteltransfer (optional zubuchbar)
Einkäufe im Basar', 'Für alle Altersgruppen geeignet.', 'Veranstaltungsort, El Dahar. Standort-Pin auf Ihrem Voucher.', false, true from experiences where slug = 'demo-oriental-night' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Kitesurf-Schnupperstunde in El Gouna', 'Drei Stunden mit einem zertifizierten Instruktor: Kitekontrolle an Land, dann Bodydragging im flachen Wasser.', 'Die flachen, ruhigen Lagunen von El Gouna gehören zu den besten Orten zum Lernen. Ihr Instruktor beginnt mit der Kitekontrolle am Strand und nimmt Sie dann mit ins knietiefe Wasser, damit Sie den Zug des Kites spüren. Bei gutem Wind stehen manche Schüler am Ende schon auf dem Board.
Der Unterricht ist windabhängig, daher bestätigt die Schule Ihre Uhrzeit auf Anfrage.', 'Treffen mit dem Instruktor und Sicherheitseinweisung
Kitekontrolle an Land
Wassereinheit in der flachen Lagune
Nachbesprechung und nächste Schritte', 'Zertifizierter Instruktor (1 für 2 Schüler)
Kite, Board, Trapez, Helm, Neoprenanzug', 'Hoteltransfer (optional zubuchbar)', 'Sie müssen schwimmen können.
Mindestalter 12 Jahre, Mindestgewicht 40 kg.', 'Kitestation, Mangroovy Beach, El Gouna.', false, true from experiences where slug = 'demo-kitesurf-lesson' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Schnorcheltag an zwei Korallenriffen', 'Ein entspannter Bootstag mit zwei Schnorchelstopps, einer Strandpause und Mittagessen an Bord.', 'Fahren Sie mit einer kleinen Crew hinaus zu den Riffen vor Hurghada. An jedem Stopp führt der Guide eine Gruppe im Wasser, während die anderen an Deck entspannen. Zwischen den Riffen ankert das Boot vor einem weißen Sandstrand zum Baden und Mittagessen.
Ideal für alle, die zum ersten Mal schnorcheln: Westen und Masken in allen Größen sind an Bord.', '08:30 Das Boot verlässt die Marina
10:00 Erstes Riff
12:00 Strandstopp und Mittagessen
14:00 Zweites Riff
16:00 Zurück an der Marina', 'Boot, Crew und Guide
Maske, Schnorchel, Flossen und Weste
Mittagessen, Wasser und Softdrinks', 'Hoteltransfer (optional zubuchbar)
Meeresparkgebühr
Trinkgelder', 'Kinder müssen im Wasser eine Weste tragen.
Verwenden Sie riffschonende Sonnencreme.', 'Hurghada New Marina, Tor 2, 20 Minuten vor Abfahrt.', false, true from experiences where slug = 'demo-paradise-snorkel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'de', 'Wassersport-Paket: Jetski, Banane und Tube', '15 Minuten auf dem Jetski mit Instruktor, danach eine Fahrt auf der Banane und dem Tube.', 'Drei Fahrten mit einer Buchung. Zuerst geht es 15 Minuten auf den Jetski (Sie fahren selbst, der Instruktor ist mit an Bord), dann heißt es auf der Banane und dem Tube gut festhalten, gezogen von einem Schnellboot.', 'Sicherheitseinweisung und Schwimmwesten
15 Minuten Jetski
Fahrt auf der Banane
Fahrt auf dem Tube', 'Jetski (15 Min.) mit Instruktor
Fahrten auf Banane und Tube
Schwimmwesten', 'Hoteltransfer (optional zubuchbar)', 'Kinder von 8–11 Jahren fahren nur Banane und Tube, mit einem Erwachsenen.
Nicht geeignet während der Schwangerschaft.', 'Wassersporthütte am öffentlichen Strand, Sheraton Road.', false, true from experiences where slug = 'demo-watersports-pack' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Спа-день с бассейном и массажем', 'Целый день спокойствия: бассейны, парная, 30-минутный массаж и лёгкий обед.', 'Проведите день в тихом спа в Сахл-Хашише. Пользуйтесь крытым и открытым бассейнами, сауной и парной сколько захотите, насладитесь 30-минутным расслабляющим массажем в удобное для вас время и пообедайте у бассейна лёгкими блюдами.', '10:00 приветственный напиток
Бассейны, сауна и парная
30-минутный массаж
Лёгкий обед
16:00 окончание дня', 'Доступ в спа на весь день
30-минутный массаж
Лёгкий обед и вода
Полотенца, халат и тапочки', 'Трансфер из отеля (дополнительная опция)
Дополнительные процедуры', 'Минимальный возраст — 16 лет.', 'Ресепшен спа, старый город Сахл-Хашиша. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-spa-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Полёт на флайборде над морем', 'Поднимитесь над водой на реактивных струях, пока инструктор подсказывает вам по радио. 15 минут полёта.', 'После короткого инструктажа на берегу вы надеваете ботинки, шлем и жилет. Инструктор управляет мощностью гидроцикла и говорит с вами через радио в шлеме, поэтому большинство людей взлетают уже через несколько минут.', 'Инструктаж по безопасности на пляже
Экипировка
15 минут на флайборде
Возвращение на пляж', 'Полёт на флайборде с инструктором
Шлем, жилет и гидрокостюм', 'Трансфер из отеля (дополнительная опция)
Видео', 'Минимальный возраст — 14 лет, вес — 45–110 кг.
Необходимо уметь плавать.', 'Пункт водных видов спорта на городском пляже, улица Шератон.', false, true from experiences where slug = 'demo-flyboard' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Сапбординг на рассвете или на закате', 'Прогулка на сапах с гидом вдоль побережья в спокойные часы, с короткой остановкой для купания.', 'Рано утром и перед закатом море самое спокойное. После нескольких минут тренировки на песке гид ведёт вас в неспешную прогулку вдоль побережья с остановкой, чтобы искупаться и посмотреть на мелководный риф.', 'Подбор доски и тренировка на пляже
Прогулка с гидом вдоль побережья
Остановка для купания
Возвращение на пляж', 'Доска, весло и лиш
Гид
Вода', 'Трансфер из отеля (дополнительная опция)
Водонепроницаемый чехол для телефона', 'Необходимо уметь плавать. Минимальный возраст — 10 лет.', 'Пункт водных видов спорта на городском пляже, улица Шератон.', false, true from experiences where slug = 'demo-sup-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'День в аквапарке с горками и бассейнами', 'Целый день горок, бассейна с волнами и ленивой реки, с обедом и безалкогольными напитками.', 'День для всей семьи: большие горки для подростков и взрослых, игровая водная зона для малышей, ленивая река и лежаки в тени. Обед и безалкогольные напитки включены.', '10:00 вход
Свободное время на горках и в бассейнах
13:00 обед
17:00 закрытие парка', 'Входной билет на день
Обед и безалкогольные напитки
Лежаки и зонтики', 'Трансфер из отеля (дополнительная опция)
Шкафчики и полотенца', 'Дети ростом до 120 см пользуются детской зоной.
На некоторых горках есть ограничения по росту и весу.', 'Главный вход в аквапарк, трасса Хургада — Сафага. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-aqua-park' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Каир и пирамиды за один день', 'Ранний выезд на автобусе с кондиционером к пирамидам Гизы, Сфинксу и Египетскому музею, с обедом.', 'Долгий, но насыщенный день. Автобус выезжает из Хургады до рассвета и к концу утра прибывает в Гизу. Гид-египтолог проведёт вас к пирамидам и Сфинксу, а после обеда — в Египетский музей.
Оператор подтверждает каждую заявку, потому что места в автобусе и билеты в музей бронируются заранее.', '03:00 выезд из отеля
09:30 пирамиды Гизы и Сфинкс
12:30 обед
14:00 Египетский музей
16:30 обратная дорога
23:00 возвращение в отель', 'Автобус с трансфером из отеля
Гид-египтолог
Входные билеты
Обед и вода', 'Вход внутрь пирамиды Хеопса
Чаевые', 'Возьмите с собой паспорт. Удобная обувь и головной убор.
Всего около 12 часов в дороге.', 'Трансфер от ресепшена вашего отеля; время подтверждается накануне.', false, true from experiences where slug = 'demo-cairo-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Обзорная экскурсия по Хургаде: мечеть, церковь и марина', 'Четыре часа с местным гидом по достопримечательностям города, старым улочкам и марине.', 'Увидьте Хургаду, которую пропускает большинство туристов. Гид покажет вам большую мечеть Эль-Дахара, коптскую церковь, рыбный рынок и оживлённые улицы старого города, а в конце вас ждёт прогулка по марине.
Для входа в мечеть нужна закрытая одежда; платки выдаются.', 'Трансфер или место встречи
Мечеть Эль-Дахар
Коптская церковь
Рыбный рынок и старые улочки
Прогулка по марине и свободное время', 'Местный гид
Микроавтобус с кондиционером
Вода', 'Трансфер из отеля (дополнительная опция)
Покупки
Чаевые', 'Для посещения мечети плечи и колени должны быть закрыты.', 'Главная площадь Эль-Дахара, напротив старого почтового отделения.', false, true from experiences where slug = 'demo-city-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Поездка в Эль-Гуну: лагуны, марина и прогулка на лодке', 'День в городе на лагунах к северу от Хургады: прогулка на лодке по каналам и свободное время в марине Абу-Тиг.', 'Эль-Гуна построена на лагунах и каналах. После поездки на север небольшая лодка провезёт вас по каналам мимо разноцветных домов, затем вы прогуляетесь по центру и проведёте вторую половину дня в марине — за обедом, покупками или чашкой кофе рядом с яхтами.', '09:30 трансфер или место встречи
10:15 прибытие в Эль-Гуну
10:30 прогулка на лодке по лагуне
11:30 прогулка по центру
12:30 свободное время в марине
16:00 возвращение в Хургаду', 'Гид и микроавтобус с кондиционером
Прогулка на лодке по лагуне
Вода', 'Обед
Трансфер из отеля (дополнительная опция)', 'Наденьте удобную обувь.', 'Главная площадь Эль-Дахара, напротив старого почтового отделения.', false, true from experiences where slug = 'demo-gouna-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Поездка в Луксор: храмы и Западный берег', 'Долгий день в дороге до Луксора с гидом-египтологом: Карнак, Долина царей и обед на берегу Нила.', 'Целый день: около четырёх часов в одну сторону на микроавтобусе с кондиционером. В Луксоре гид-египтолог проведёт вас по Карнакскому храму, переправит через Нил в Долину царей и на обед с видом на реку.
Входные билеты на объекты из программы включены; особые гробницы оплачиваются дополнительно на месте.', '05:00 выезд из отеля
09:00 Карнакский храм
11:30 Долина царей
13:30 обед на берегу Нила
15:00 храм Хатшепсут (осмотр снаружи)
16:00 обратная дорога
20:00 возвращение в отель', 'Транспорт с кондиционером
Гид-египтолог
Входные билеты на указанные объекты
Обед и вода', 'Особые гробницы и разрешения на фотосъёмку
Чаевые', 'Нужна копия паспорта. Долгий день: не лучший вариант для детей до 6 лет.', 'Трансфер из лобби вашего отеля (включая районы Хургады).', false, true from experiences where slug = 'demo-luxor-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Прогулка на подводной лодке к коралловому рифу', 'Опуститесь примерно на 20 метров на настоящей туристической подводной лодке и смотрите на риф через большие иллюминаторы, не намокнув.', 'Идеально для семей и тех, кто не умеет плавать. Катер доставит вас к подводной лодке, которая медленно погружается вдоль рифа. У каждого места свой иллюминатор, а гид рассказывает о рыбах и кораллах, которых вы видите.', 'Катер до подводной лодки
Около 45 минут под водой
Катер обратно в марину', 'Катер-трансфер и погружение на подводной лодке
Гид на борту
Вода', 'Трансфер из отеля (дополнительная опция)
Фотографии', 'Не подходит людям с сильной боязнью замкнутых пространств.', 'Новая марина Хургады, причал подводной лодки, за 30 минут до отправления.', false, true from experiences where slug = 'demo-submarine' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Йога на пляже на рассвете или на закате', '75-минутное мягкое занятие йогой на песке для любого уровня, а после — свежевыжатый сок.', 'Спокойное занятие с сертифицированным преподавателем на тихом пляже в Сахл-Хашише. Дыхательные упражнения, мягкая практика и долгое расслабление под шум моря. Коврики предоставляются.', 'Знакомство и дыхательные упражнения
Мягкая практика
Расслабление
Свежевыжатый сок', 'Занятие йогой с сертифицированным преподавателем
Коврик и полотенце
Свежевыжатый сок', 'Трансфер из отеля (дополнительная опция)', 'Подходит для любого уровня. Расскажите преподавателю о травмах.', 'Пляжная площадка спа, Сахл-Хашиш. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-beach-yoga' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Лодка со стеклянным дном: рифы, не намокнув', 'Два часа наблюдения за кораллами и рыбами через стеклянное дно лодки.', 'Самый простой способ увидеть рифы Красного моря: садитесь на нижней палубе и наблюдайте за кораллами и рыбами через большие стеклянные окна. Подходит для маленьких детей, бабушек и дедушек и всех, кто предпочитает оставаться сухим.', 'Отправление из марины
Неспешная прогулка над двумя рифами
Короткая остановка: ничего не кормим и ничего не трогаем — просто смотрим
Возвращение в марину', 'Морская прогулка
Вода', 'Трансфер из отеля (дополнительная опция)', 'Подходит для любого возраста.', 'Новая марина Хургады, ворота 1, за 15 минут до отправления.', false, true from experiences where slug = 'demo-glass-boat' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Ритуал хаммама и массажа', 'Парная, пилинг с чёрным мылом, пенное мытьё и 45-минутный массаж с маслом, а затем мятный чай.', 'Два часа неспешного отдыха. Вы начинаете в парной, затем мастер делает вам пилинг и пенное мытьё на тёплом мраморе, после чего следует 45-минутный массаж с аргановым маслом. В завершение — мятный чай в комнате отдыха.', 'Парная
Пилинг с чёрным мылом и пенное мытьё
45-минутный массаж с маслом
Отдых с мятным чаем', 'Хаммам и массаж
Полотенца, халат и тапочки
Мятный чай', 'Трансфер из отеля (дополнительная опция)', 'Минимальный возраст — 16 лет. Сообщите нам о беременности или проблемах со здоровьем.', 'Ресепшен спа, старый город Сахл-Хашиша. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-hammam-spa' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Конная прогулка по пляжу и пустыне', 'Два часа в седле от края пустыни до моря — для новичков и опытных наездников.', 'Отправляйтесь из конюшни по краю пустыни к тихому пляжу, где лошади идут по мелководью. Спокойные лошади для новичков и более резвые — для опытных наездников.', 'Знакомство с лошадьми и короткий урок
Прогулка по краю пустыни
Пляж и прогулка по воде
Возвращение в конюшню, чай', 'Лошадь и гид
Шлем
Чай', 'Трансфер из отеля (дополнительная опция)', 'Минимальный возраст — 8 лет. Максимальный вес — 100 кг.
Рекомендуются длинные брюки.', 'Конюшня за Макади-Бей. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-horse-ride' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Ночное погружение на домашнем рифе', 'Погружение с гидом после заката, с фонарями, когда на рифе начинается ночная жизнь.', 'Ночью риф полностью меняется: осьминоги и мурены выходят на охоту, рыбы-попугаи спят в своих коконах, а планктон светится. Вы погружаетесь с опытным гидом и фонарём в спокойном мелководном месте.
Перед подтверждением центр проверяет ваш опыт.', '17:30 регистрация и брифинг
18:15 снаряжение и вход в воду
18:30 ночное погружение (около 45 минут)
19:30 горячий напиток и запись в логбук', 'Ночное погружение с гидом
Фонарь, баллон, грузы и полное снаряжение
Горячий напиток', 'Трансфер из отеля (дополнительная опция)', 'Сертификат Open Water и не менее 10 записанных в логбук погружений.
Минимальный возраст — 15 лет.', 'Дайвинг-центр на улице Шератон. Точная точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-night-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Пляжный день в Orange Bay', 'Долгая остановка на пляже в бухте с белым песком, одна остановка для снорклинга и обед.', 'Неспешный день, построенный вокруг пляжа. Большую часть времени вы проводите в бухте с белым песком и мелкой бирюзовой водой — отлично подходит для семей и тех, кто не умеет плавать. На обратном пути — одна остановка для снорклинга.', '09:00 отправление лодки из марины
10:30 прибытие в бухту: свободное время на пляже
13:00 обед
14:30 остановка для снорклинга
16:30 возвращение в марину', 'Морская прогулка
Вход на пляж
Обед и безалкогольные напитки
Снаряжение для снорклинга', 'Трансфер из отеля (дополнительная опция)
Лежаки (за доплату)', 'Возьмите полотенце и солнцезащитный крем, безопасный для рифов.', 'Новая марина Хургады, ворота 2, за 20 минут до отправления.', false, true from experiences where slug = 'demo-orange-bay' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Дайвинг на затонувшем корабле у Хургады', 'Погружение на затонувший корабль, покрытый кораллами, с опытным гидом; второе погружение — на рифе.', 'Погружение на затонувший корабль для сертифицированных дайверов с некоторым опытом. После подробного брифинга вы спускаетесь по линю и осматриваете корабль снаружи — теперь это дом для кораллов и рыб. Проникновение внутрь в программу не входит.
Перед подтверждением центр проверяет ваш логбук, поэтому эта поездка бронируется по запросу.', '07:00 регистрация и брифинг
08:00 отправление лодки
09:30 погружение на затонувший корабль
11:00 обед на борту
12:30 погружение на рифе
14:30 возвращение в марину', 'Два погружения с гидом (затонувший корабль и риф)
Полное снаряжение
Обед и напитки', 'Трансфер из отеля (дополнительная опция)
Сбор морского парка', 'Сертификат Advanced или 20 записанных в логбук погружений.
Минимальный возраст — 15 лет.', 'Дайвинг-центр, улица Шератон. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-wreck-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Парасейлинг над бухтой', 'Около 10 минут в воздухе над морем, в одиночку или вдвоём, а под вами — пляж.', 'Взлетите с кормы катера и медленно поднимитесь над бухтой. Полёт спокойный и тихий, а приземляетесь вы обратно на катер сухими. Возможен полёт вдвоём, если общий вес не превышает лимит.', 'Короткий инструктаж по безопасности на пляже
Поездка на катере к месту полёта
Около 10 минут в воздухе
Возвращение на пляж', 'Полёт с подвесной системой и спасательным жилетом
Прогулка на катере', 'Трансфер из отеля (дополнительная опция)
Фото и видео', 'Минимальный возраст — 8 лет (дети летают в паре со взрослым).
При сильном ветре полёт отменяется: вам предложат другое время или полностью вернут деньги.', 'Пункт водных видов спорта на городском пляже, улица Шератон.', false, true from experiences where slug = 'demo-parasailing' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Поездка на квадроцикле в бедуинскую деревню', 'Час на собственном квадроцикле по пустыне и чай в бедуинской деревне.', 'После короткого инструктажа по безопасности вы едете на собственном квадроцикле в колонне за гидом по открытым пустынным трассам. На полпути — остановка в бедуинской деревне: чай, лепёшки, испечённые на огне, и короткая прогулка на верблюде.
Оператор подтверждает вашу заявку в течение 12 часов, потому что квадроциклы и шлемы распределяются заранее.', 'Инструктаж по безопасности и подбор шлема
1 час на квадроцикле с гидом впереди и позади колонны
Бедуинская деревня: чай, лепёшки, короткая прогулка на верблюде
Возвращение в лагерь', 'Квадроцикл и топливо
Шлем, очки и платок
Гид
Бедуинский чай и лепёшки', 'Трансфер из отеля (дополнительная опция)
Фотографии, которые продаются в лагере', 'Управлять квадроциклом можно с 16 лет. Рекомендуется закрытая обувь.
Не подходит при беременности и проблемах со спиной.', 'Лагерь в пустыне на трассе Хургада — Сафага. Точная точка на карте придёт вместе с ваучером.', false, true from experiences where slug = 'demo-quad-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Парусная прогулка на закате', 'Два с половиной часа под парусом, пока садится солнце, с чаем и закусками.', 'Небольшая парусная лодка выходит из марины ближе к вечеру и идёт вдоль побережья, пока солнце садится за горы. Тихо, неспешно и отлично подходит для пар.', '16:00 посадка
16:15 прогулка под парусом вдоль побережья
Закат на палубе с чаем и закусками
18:30 возвращение в марину', 'Парусная прогулка со шкипером
Чай, безалкогольные напитки и закуски', 'Трансфер из отеля (дополнительная опция)', 'Возьмите лёгкую куртку: после заката на воде становится прохладнее.', 'Бульвар марины Хургады, причал C.', false, true from experiences where slug = 'demo-sunset-sail' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Звёзды в пустыне и ужин-барбекю', 'Закат в дюнах, ужин в бедуинском лагере и ночное небо в телескоп.', 'Ближе к вечеру вы выезжаете из города, чтобы до заката добраться до тихого лагеря в пустыне. После ужина-барбекю у костра свет гасят, и гид показывает вам звёзды и планеты в телескоп.', '17:00 выезд и дорога в лагерь
Закат на дюне
Ужин-барбекю и чай
Наблюдение за звёздами в телескоп
22:00 возвращение в отель', 'Трансфер от места встречи до лагеря
Ужин, чай и вода
Наблюдение в телескоп с гидом', 'Трансфер из отеля (дополнительная опция)', 'Возьмите тёплую одежду: с ноября по март ночи в пустыне холодные.', 'Место встречи: офис сафари, улица Эль-Наср.', false, true from experiences where slug = 'demo-desert-stars' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Утренняя рыбалка в Красном море', 'Донная рыбалка с небольшой лодки: удочки, наживка и обед из рыбы на гриле.', 'Отправляйтесь с местным капитаном к рыбным местам к северу от Хургады. Удочки, лески и наживка уже ждут на борту, а команда покажет новичкам, как забрасывать и вытаскивать снасть.
Ваш улов почистят и приготовят на гриле прямо на борту к обеду.', '07:30 отправление лодки из марины
08:30 первое место для рыбалки
10:30 второе место
12:00 обед из улова на гриле
12:30 возвращение в марину', 'Лодка, капитан и команда
Удочки, лески и наживка
Обед из вашего улова
Вода и чай', 'Трансфер из отеля (дополнительная опция)
Чаевые', 'Прогулка проходит при спокойном море, но если нужно, всё же возьмите таблетки от укачивания.', 'Новая марина Хургады, ворота 2, за 20 минут до отправления.', false, true from experiences where slug = 'demo-fishing-trip' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Пляжный день на острове у Гифтуна', 'День на острове с мягким песчаным пляжем: лежак и зонтик, снорклинг прямо с берега и обед.', 'Скоростной катер доставит вас на охраняемый островной пляж в районе Гифтуна. Проведите день на лежаке под зонтиком, плавайте с маской прямо с пляжа над мелководным рифом и наслаждайтесь обедом «шведский стол».', '08:30 отправление лодки из марины
09:15 прибытие на остров
Свободное время на пляже
12:30 обед «шведский стол»
16:00 возвращение в марину', 'Трансфер на скоростном катере
Лежак и зонтик
Обед «шведский стол» и вода', 'Аренда снаряжения для снорклинга
Сбор морского парка
Трансфер из отеля (дополнительная опция)', 'Используйте солнцезащитный крем, безопасный для рифов. Трогать кораллы нельзя.', 'Новая марина Хургады, ворота 4, за 20 минут до отправления.', false, true from experiences where slug = 'demo-island-beach' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Супер-сафари: джип, квадроцикл, верблюд и ужин', 'Полдня в пустыне: поездка на джипе, квадроцикл, верблюд, бедуинская деревня и ужин.', 'Всё за один день. Джип увезёт вас вглубь пустыни, вы прокатитесь на квадроцикле и верблюде, побываете в бедуинской деревне, а завершите день ужином и шоу под звёздами.', '13:00 поездка на джипе в пустыню
Квадроцикл (30 минут)
Прогулка на верблюде и бедуинская деревня
Закат и ужин
19:00 возвращение в город', 'Поездки на джипе, квадроцикле и верблюде
Гид
Ужин и напитки', 'Трансфер из отеля (дополнительная опция)', 'Дети едут на квадроцикле пассажирами вместе со взрослым.', 'Офис сафари, улица Эль-Наср.', false, true from experiences where slug = 'demo-super-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Урок египетской кухни в местной семье', 'Закупитесь на рынке, приготовьте четыре классических блюда дома с принимающей семьёй, а затем поешьте вместе.', 'Начните с местного рынка, где вы выберете овощи и специи, а затем готовьте на семейной кухне: фаршированные виноградные листья, кошари, хлеб балади и десерт. Вы съедите приготовленное за семейным столом и заберёте рецепты домой.
Маленькая группа; семья подтверждает вашу дату по запросу.', 'Встреча с хозяевами на рынке
Покупка продуктов
Совместное приготовление четырёх блюд
Общая трапеза и рецепты', 'Продукты и кулинарный урок
Еда и напитки
Карточка с рецептами', 'Трансфер из отеля (дополнительная опция)', 'При бронировании сообщите нам об аллергиях или вегетарианском питании.', 'Овощной рынок Эль-Дахара, главный вход. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-cooking-class' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Круиз с ужином и музыкой', 'Три часа на вечернем море: закат, ужин «шведский стол» и живая восточная музыка на палубе.', 'Поднимитесь на борт на закате и неспешно плывите вдоль побережья, пока зажигаются огни Хургады. На ужин — «шведский стол» с блюдами на гриле, салатами и египетской кухней; на верхней палубе играет группа.', '18:30 посадка
19:00 отплытие на закате
19:30 ужин «шведский стол»
20:30 живая музыка на палубе
21:30 возвращение в марину', 'Круиз
Ужин «шведский стол»
Вода и безалкогольные напитки
Живая музыка', 'Трансфер из отеля (дополнительная опция)
Алкогольные напитки', 'Дресс-код: смарт-кэжуал. Возьмите лёгкую куртку: в море ветрено.', 'Новая марина Хургады, ворота 1, за 20 минут до отправления.', false, true from experiences where slug = 'demo-dinner-cruise' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Дом дельфинов на скоростном катере', 'Быстрый катер к рифу, где часто отдыхают дельфины-вертуны, и две остановки для снорклинга.', 'Дом дельфинов — риф в форме подковы, куда дикие дельфины-вертуны часто приплывают отдохнуть. Команда держит уважительную дистанцию и соблюдает местные правила поведения: не преследовать, не кормить, не трогать.
Дельфины — дикие животные, поэтому встретить их вероятно, но никогда не гарантировано. Вторая остановка — коралловый сад для снорклинга.', '08:00 отправление лодки из марины
09:15 Дом дельфинов: наблюдение и бережный снорклинг
11:30 остановка для снорклинга в коралловом саду
12:30 обед на борту
14:00 возвращение в марину', 'Скоростной катер с командой
Снаряжение для снорклинга
Обед, вода и безалкогольные напитки', 'Трансфер из отеля (дополнительная опция)
Чаевые', 'Море может быть неспокойным; сообщите команде, если вас укачивает.
Дети должны быть в воде в жилете.', 'Новая марина Хургады, ворота 2, за 20 минут до отправления.', false, true from experiences where slug = 'demo-dolphin-house' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Снорклинг на острове Гифтун', 'Две остановки на рифах, пляж на острове Гифтун и обед на борту.', 'Расслабленный день на воде. Утром лодка выходит из марины Хургады и встаёт на якорь у двух рифов в заповедной зоне Гифтун, где команда покажет вам лучшие места с кораллами и рыбами. Между остановками для снорклинга вы отдыхаете на белом пляже острова Гифтун.
Снаряжение для снорклинга и жилет предоставляются; команда остаётся в воде рядом с новичками.', '08:30 трансфер из отеля (если забронирован)
09:30 отправление лодки из марины
10:30 первая остановка на рифе: снорклинг
12:00 время на пляже острова Гифтун
13:30 обед на борту
14:30 вторая остановка на рифе
16:00 возвращение в марину', 'Морская прогулка с командой
Маска, ласты и жилет для снорклинга
Обед на борту, вода и безалкогольные напитки
Сбор за посещение заповедной зоны', 'Трансфер из отеля (дополнительная опция)
Полотенца
Чаевые', 'Возьмите солнцезащитный крем, безопасный для рифов, полотенце и головной убор.
Не рекомендуется тем, кто совсем не умеет плавать; есть жилеты.', 'Новая марина Хургады, ворота 2. Ищите табличку WENRO на причале за 20 минут до отправления.', false, true from experiences where slug = 'demo-giftun-island' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Луксор: воздушный шар на рассвете и Западный берег', 'Пролетите над Долиной царей на рассвете, а затем посетите гробницы и храм Хатшепсут.', 'Вы выезжаете из Хургады ночью, чтобы добраться до Луксора до рассвета. С восходом солнца ваш шар плывёт над Нилом, полями и храмами Западного берега. После приземления гид проведёт вас по Долине царей и храму Хатшепсут, а обед будет на берегу Нила.
Полёты на шаре зависят от ветра и подтверждаются оператором.', '01:00 выезд из отеля
05:30 взлёт воздушного шара (около 45 минут)
08:00 Долина царей
10:30 храм Хатшепсут
12:30 обед
13:30 обратная дорога
18:30 возвращение в отель', 'Автобус с трансфером из отеля
Полёт на воздушном шаре
Гид и входные билеты
Обед', 'Особые гробницы (отдельный билет)
Чаевые', 'Минимальный возраст — 7 лет.
Если шар не сможет взлететь, стоимость полёта вам вернут.', 'Трансфер от ресепшена вашего отеля; время подтверждается накануне.', false, true from experiences where slug = 'demo-luxor-balloon' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Прогулка по старому городу Эль-Дахар и рынку', 'Прогуляйтесь по старому кварталу с местным гидом: мечеть, рыбный рынок и лавка специй.', 'Пешая экскурсия по Эль-Дахару, самой старой части Хургады. Гид расскажет, как рыбацкий посёлок превратился в курортный город, проведёт вас по рыночным улочкам и сделает остановку на чай в семейной лавке специй.', 'Встреча на площади у мечети Эль-Мина
Улочки старого квартала
Рыбный и фруктовый рынки
Чай в лавке специй
Окончание рядом с мариной Хургады', 'Местный гид
Чай в лавке специй', 'Трансфер из отеля (дополнительная опция)
Покупки', 'Для посещения мечети плечи и колени должны быть закрыты.', 'Площадь у мечети Эль-Мина, у главных ворот.', false, true from experiences where slug = 'demo-old-town-walk' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'День на частной яхте для вашей компании', 'Собственная яхта, капитан и команда на шесть часов: выбирайте рифы и пляжи, которые вам нравятся.', 'Идеально для семей и друзей. Капитан спланирует день вместе с вами: рифы для снорклинга, тихий пляж или просто солнце и купание. Обед готовят прямо на борту.
Бронируйте по количеству человек или всю яхту для вашей компании как частную поездку.', '09:00 посадка в марине
Ваша собственная программа вместе с капитаном
Обед на борту
15:00 возвращение в марину', 'Частная яхта с капитаном и командой
Снаряжение для снорклинга
Обед, вода и безалкогольные напитки', 'Трансфер из отеля (дополнительная опция)
Сбор морского парка
Чаевые', 'Окончательный маршрут зависит от ветра и состояния моря.', 'Новая марина Хургады, яхтенный причал B.', false, true from experiences where slug = 'demo-private-yacht' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Прогулка на верблюде на рассвете', 'Неспешная прогулка на верблюде в горы на рассвете, а затем завтрак в лагере.', 'Ранний подъём, за который вас вознаградит пустыня в самый тихий час. Бедуин-проводник ведёт вашего верблюда к смотровой площадке, где вы встретите рассвет, а затем вас ждёт простой завтрак в лагере.', '05:30 выезд
06:00 прогулка на верблюде к смотровой площадке
Рассвет
07:30 завтрак в лагере
08:30 возвращение в город', 'Прогулка на верблюде с гидом
Завтрак и чай', 'Трансфер из отеля (дополнительная опция)', 'Минимальный возраст — 6 лет. Рекомендуются длинные брюки.', 'Лагерь в пустыне, трасса Хургада — Сафага.', false, true from experiences where slug = 'demo-sunrise-camel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Два погружения на рифах для сертифицированных дайверов', 'Два погружения с гидом на лучших рифах Хургады, с полным снаряжением и обедом на борту.', 'Для дайверов, у которых уже есть сертификат. Гид выбирает два рифа с учётом условий дня и вашего уровня, а между погружениями — поверхностный интервал и обед.
Возьмите с собой сертификат и логбук.', '08:00 регистрация в дайвинг-центре
09:00 отправление лодки
10:00 первое погружение (около 50 минут)
11:00 поверхностный интервал и обед
12:30 второе погружение
14:00 возвращение в марину', 'Два погружения с гидом
Баллон, грузы и полное снаряжение
Обед, вода и чай', 'Трансфер из отеля (дополнительная опция)
Нитрокс (уточняйте в центре)
Сбор морского парка', 'Требуется сертификат Open Water или аналогичный.
Нельзя летать в течение 24 часов после погружения.', 'Дайвинг-центр, улица Шератон. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-two-tank-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Бедуинский ужин и звёздное небо', 'Поездка в пустыню на закате: хлеб, испечённый на огне, бедуинский ужин и звёзды.', 'Внедорожник 4x4 отвезёт вас в тихий лагерь среди пустынных холмов. Вы полюбуетесь закатом, узнаете, как бедуины пекут хлеб на горячем песке и камнях, а затем поужинаете у костра. После ужина свет приглушают, чтобы смотреть на звёзды.', '16:30 трансфер или место встречи
17:15 закат в пустыне
18:00 выпечка хлеба и чай
19:00 ужин у костра
20:00 наблюдение за звёздами
20:45 возвращение в Хургаду', 'Трансфер в лагерь на внедорожнике 4x4
Ужин, чай и вода
Наблюдение за звёздами с гидом', 'Трансфер из отеля (дополнительная опция)
Безалкогольные напитки в лагере', 'Возьмите тёплую одежду: с ноября по март ночи в пустыне прохладные.', 'База сафари, трасса Хургада — Сафага. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-bedouin-dinner' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Пробный дайвинг: ваше первое погружение', 'Опыт не нужен: тренировка на мелководье, а затем погружение с гидом на 6–12 м.', 'Первое знакомство с дайвингом с лицензированным инструктором — один инструктор на каждых двух гостей. Сначала вы осваиваете основы на мелководье и только когда почувствуете себя готовыми, опускаетесь к спокойному рифу.
Перед поездкой вы заполняете короткую медицинскую анкету.', '08:30 встреча в дайвинг-центре
09:00 брифинг и подбор снаряжения
10:30 тренировка на мелководье
11:30 погружение с гидом (около 30 минут)
13:00 возвращение на берег', 'Всё снаряжение для дайвинга
Инструктор (1 на 2 гостей)
Морская прогулка, вода и закуски', 'Трансфер из отеля (дополнительная опция)
Фотографии с погружения', 'Минимальный возраст — 10 лет. Обязательна медицинская анкета.
Нельзя летать в течение 24 часов после погружения.', 'Дайвинг-центр, улица Шератон. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-discover-scuba' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Восточная ночь: ужин и шоу танура', 'Египетский ужин, танцор танура, народная музыка и прогулка по базару, освещённому фонарями.', 'Вечер египетской музыки и кухни. После прогулки по небольшому базару с фонарями и специями подают ужин, а танцор танура кружится в своих разноцветных юбках под игру народного ансамбля.', '19:00 прибытие и прогулка по базару
19:45 ужин
20:30 шоу танура и народная музыка
22:00 окончание вечера', 'Ужин и безалкогольные напитки
Шоу
Чай и кофе', 'Трансфер из отеля (дополнительная опция)
Покупки на базаре', 'Подходит для любого возраста.', 'Площадка мероприятия, Эль-Дахар. Точка на карте — в вашем ваучере.', false, true from experiences where slug = 'demo-oriental-night' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Пробный урок кайтсёрфинга в Эль-Гуне', 'Три часа с сертифицированным инструктором: управление кайтом на суше, затем боди-драг на мелководье.', 'Ровные мелкие лагуны Эль-Гуны — одно из лучших мест для обучения. Инструктор начинает с управления кайтом на пляже, а затем заводит вас в воду по колено, чтобы вы почувствовали тягу кайта. При хорошем ветре некоторые ученики к концу занятия уже встают на доску.
Занятия зависят от ветра, поэтому школа подтверждает время по запросу.', 'Встреча с инструктором и инструктаж по безопасности
Управление кайтом на суше
Занятие на воде в мелкой лагуне
Разбор занятия и дальнейшие шаги', 'Сертифицированный инструктор (1 на 2 учеников)
Кайт, доска, трапеция, шлем, гидрокостюм', 'Трансфер из отеля (дополнительная опция)', 'Необходимо уметь плавать.
Минимальный возраст — 12 лет, минимальный вес — 40 кг.', 'Кайт-станция, пляж Mangroovy, Эль-Гуна.', false, true from experiences where slug = 'demo-kitesurf-lesson' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Снорклинг на двух коралловых рифах', 'Расслабленный день на лодке: две остановки для снорклинга, отдых на пляже и обед на борту.', 'Отправляйтесь к рифам у берегов Хургады с небольшой командой. На каждой остановке гид ведёт группу в воде, а остальные отдыхают на палубе. Между рифами лодка встаёт на якорь у пляжа с белым песком, где можно искупаться и пообедать.
Подходит для тех, кто впервые пробует снорклинг: на борту есть жилеты и маски всех размеров.', '08:30 отправление лодки из марины
10:00 первый риф
12:00 остановка на пляже и обед
14:00 второй риф
16:00 возвращение в марину', 'Лодка, команда и гид
Маска, трубка, ласты и жилет
Обед, вода и безалкогольные напитки', 'Трансфер из отеля (дополнительная опция)
Сбор морского парка
Чаевые', 'Дети должны быть в воде в жилете.
Используйте солнцезащитный крем, безопасный для рифов.', 'Новая марина Хургады, ворота 2, за 20 минут до отправления.', false, true from experiences where slug = 'demo-paradise-snorkel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'ru', 'Пакет водных развлечений: гидроцикл, банан и плюшка', '15 минут на гидроцикле с инструктором, а затем катание на банане и на плюшке.', 'Три развлечения в одном бронировании. Сначала 15 минут на гидроцикле (вы за рулём, инструктор на борту), а затем держитесь крепче на банане и плюшке, которые тянет скоростной катер.', 'Инструктаж по безопасности и спасательные жилеты
15 минут на гидроцикле
Катание на банане
Катание на плюшке', 'Гидроцикл (15 мин) с инструктором
Катание на банане и плюшке
Спасательные жилеты', 'Трансфер из отеля (дополнительная опция)', 'Дети 8–11 лет катаются только на банане и плюшке, вместе со взрослым.
Не подходит при беременности.', 'Пункт водных видов спорта на городском пляже, улица Шератон.', false, true from experiences where slug = 'demo-watersports-pack' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée spa avec piscine et massage', 'Une journée entière de calme : piscines, hammam, un massage de 30 minutes et un déjeuner léger.', 'Passez la journée dans un spa paisible de Sahl Hasheesh. Profitez à votre guise des piscines intérieure et extérieure, du sauna et du hammam, savourez un massage relaxant de 30 minutes à l’heure de votre choix et prenez un déjeuner léger au bord de la piscine.', '10:00 boisson de bienvenue
Piscines, sauna et hammam
Massage de 30 minutes
Déjeuner léger
16:00 fin de la journée', 'Accès au spa pour la journée
Massage de 30 minutes
Déjeuner léger et eau
Serviettes, peignoir et chaussons', 'Transfert depuis l’hôtel (option)
Soins supplémentaires', 'Âge minimum : 16 ans.', 'Accueil du spa, vieille ville de Sahl Hasheesh. Localisation sur votre bon.', false, true from experiences where slug = 'demo-spa-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Séance de flyboard au-dessus de la mer', 'Élevez-vous au-dessus de l’eau grâce à des jets, guidé par un moniteur par radio. 15 minutes de vol.', 'Après un court briefing à terre, vous enfilez les chaussures, le casque et le gilet. Le moniteur contrôle la puissance du jet-ski et vous parle via la radio du casque : la plupart des gens volent en quelques minutes.', 'Briefing sécurité sur la plage
Équipement
15 minutes de flyboard
Retour à la plage', 'Séance de flyboard avec moniteur
Casque, gilet et combinaison', 'Transfert depuis l’hôtel (option)
Vidéo', 'Âge minimum : 14 ans, poids entre 45 et 110 kg.
Savoir nager.', 'Cabane des sports nautiques sur la plage publique, Sheraton Road.', false, true from experiences where slug = 'demo-flyboard' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Stand-up paddle au lever ou au coucher du soleil', 'Une sortie guidée en paddle le long de la côte aux heures calmes, avec une courte pause baignade.', 'La mer est la plus plate tôt le matin et avant le coucher du soleil. Après quelques minutes d’entraînement sur le sable, votre guide vous emmène pour une balade tranquille le long de la côte, avec une pause pour nager et observer le récif peu profond.', 'Réglage de la planche et entraînement sur la plage
Paddle guidé le long de la côte
Pause baignade
Retour à la plage', 'Planche, pagaie et leash
Guide
Eau', 'Transfert depuis l’hôtel (option)
Pochette étanche pour téléphone', 'Savoir nager. Âge minimum : 10 ans.', 'Cabane des sports nautiques sur la plage publique, Sheraton Road.', false, true from experiences where slug = 'demo-sup-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée au parc aquatique : toboggans et piscines', 'Une journée entière de toboggans, piscine à vagues et rivière lente, avec déjeuner et boissons sans alcool.', 'Une journée pour toute la famille : grands toboggans pour les ados et les adultes, espace jeux d’eau pour les petits, rivière lente et transats à l’ombre. Le déjeuner et les boissons sans alcool sont inclus.', '10:00 entrée
Temps libre sur les toboggans et dans les piscines
13:00 déjeuner
17:00 fermeture du parc', 'Billet pour la journée
Déjeuner et boissons sans alcool
Transats et parasols', 'Transfert depuis l’hôtel (option)
Casiers et serviettes', 'Les enfants de moins de 120 cm utilisent l’espace enfants.
Certains toboggans ont des limites de taille et de poids.', 'Entrée principale du parc aquatique, route Hurghada–Safaga. Localisation sur votre bon.', false, true from experiences where slug = 'demo-aqua-park' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Le Caire et les Pyramides en une journée', 'Départ matinal en car climatisé vers les Pyramides de Gizeh, le Sphinx et le Musée égyptien, avec déjeuner.', 'Une longue journée, mais qui en vaut la peine. Le car quitte Hurghada avant l’aube et arrive à Gizeh en fin de matinée. Votre guide égyptologue vous fait découvrir les Pyramides et le Sphinx, puis le Musée égyptien après le déjeuner.
Le prestataire confirme chaque demande, car les places dans le car et les billets du musée sont réservés à l’avance.', '03:00 prise en charge à l’hôtel
09:30 Pyramides de Gizeh et Sphinx
12:30 déjeuner
14:00 Musée égyptien
16:30 trajet retour
23:00 retour à votre hôtel', 'Car avec prise en charge à l’hôtel
Guide égyptologue
Billets d’entrée
Déjeuner et eau', 'Entrée à l’intérieur de la Grande Pyramide
Pourboires', 'Apportez votre passeport. Chaussures confortables et chapeau.
Environ 12 heures de route au total.', 'Prise en charge à la réception de votre hôtel ; l’heure est confirmée la veille.', false, true from experiences where slug = 'demo-cairo-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Visite de Hurghada : mosquée, église et marina', 'Quatre heures avec un guide local à travers les monuments de la ville, ses vieilles rues et la marina.', 'Découvrez le Hurghada que la plupart des visiteurs ne voient pas. Votre guide vous montre la grande mosquée d’El Dahar, l’église copte, le marché aux poissons et les rues animées de la vieille ville, puis termine par une promenade le long de la marina.
Une tenue correcte est exigée pour entrer dans la mosquée ; des foulards sont fournis.', 'Prise en charge ou point de rendez-vous
Mosquée d’El Dahar
Église copte
Marché aux poissons et vieilles rues
Promenade sur la marina et temps libre', 'Guide local
Minibus climatisé
Eau', 'Transfert depuis l’hôtel (option)
Achats
Pourboires', 'Épaules et genoux couverts pour la mosquée.', 'Place principale d’El Dahar, devant l’ancienne poste.', false, true from experiences where slug = 'demo-city-tour' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée à El Gouna : lagunes, marina et balade en bateau', 'Une journée dans la ville des lagunes au nord de Hurghada, avec une balade en bateau sur les canaux et du temps libre à la marina d’Abu Tig.', 'El Gouna est construite sur des lagunes et des canaux. Après la route vers le nord, un petit bateau vous emmène sur les voies d’eau le long de maisons colorées, puis vous vous promenez dans le centre et passez l’après-midi à la marina pour déjeuner, faire du shopping ou prendre un café près des yachts.', '09:30 prise en charge ou point de rendez-vous
10:15 arrivée à El Gouna
10:30 balade en bateau sur la lagune
11:30 promenade dans le centre
12:30 temps libre à la marina
16:00 retour à Hurghada', 'Guide et minibus climatisé
Balade en bateau sur la lagune
Eau', 'Déjeuner
Transfert depuis l’hôtel (option)', 'Portez des chaussures confortables.', 'Place principale d’El Dahar, devant l’ancienne poste.', false, true from experiences where slug = 'demo-gouna-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée à Louxor : temples et rive ouest', 'Une longue journée sur la route de Louxor avec un guide égyptologue : Karnak, la Vallée des Rois et déjeuner au bord du Nil.', 'Une journée complète : environ quatre heures de trajet dans chaque sens en minibus climatisé. À Louxor, un guide égyptologue vous emmène au temple de Karnak, de l’autre côté du Nil à la Vallée des Rois, puis déjeuner avec vue sur le fleuve.
Les droits d’entrée sont inclus pour les sites du programme ; les tombes spéciales sont payantes sur place.', '05:00 prise en charge à votre hôtel
09:00 temple de Karnak
11:30 Vallée des Rois
13:30 déjeuner au bord du Nil
15:00 temple d’Hatchepsout (vue extérieure)
16:00 trajet retour
20:00 retour à votre hôtel', 'Transport climatisé
Guide égyptologue
Droits d’entrée des sites mentionnés
Déjeuner et eau', 'Tombes spéciales et permis photo
Pourboires', 'Copie du passeport obligatoire. Longue journée : peu adaptée aux enfants de moins de 6 ans.', 'Prise en charge dans le hall de votre hôtel (secteur de Hurghada inclus).', false, true from experiences where slug = 'demo-luxor-day' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Sortie en sous-marin jusqu’au récif corallien', 'Descendez à environ 20 mètres dans un vrai sous-marin touristique et observez le récif par de grands hublots, sans vous mouiller.', 'Idéal pour les familles et les personnes qui ne nagent pas. Un bateau navette vous conduit au sous-marin, qui plonge ensuite lentement le long du récif. Chaque siège a son propre hublot, et un guide vous présente les poissons et les coraux que vous voyez.', 'Bateau navette jusqu’au sous-marin
Environ 45 minutes sous l’eau
Navette retour vers la marina', 'Bateau navette et plongée en sous-marin
Guide à bord
Eau', 'Transfert depuis l’hôtel (option)
Photos', 'Déconseillé aux personnes très claustrophobes.', 'Hurghada New Marina, ponton du sous-marin, 30 minutes avant le départ.', false, true from experiences where slug = 'demo-submarine' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Yoga sur la plage au lever ou au coucher du soleil', 'Un cours de yoga doux de 75 minutes sur le sable, pour tous les niveaux, suivi d’un jus frais.', 'Un cours tranquille animé par un professeur certifié sur une plage paisible de Sahl Hasheesh. Respiration, enchaînement doux et longue relaxation au son de la mer. Les tapis sont fournis.', 'Accueil et respiration
Enchaînement doux
Relaxation
Jus frais', 'Cours de yoga avec professeur certifié
Tapis et serviette
Jus frais', 'Transfert depuis l’hôtel (option)', 'Tous niveaux bienvenus. Signalez vos blessures au professeur.', 'Terrasse de plage du spa, Sahl Hasheesh. Localisation sur votre bon.', false, true from experiences where slug = 'demo-beach-yoga' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Bateau à fond de verre : les récifs sans se mouiller', 'Deux heures à observer coraux et poissons à travers le fond vitré du bateau.', 'La façon la plus simple de voir les récifs de la mer Rouge : installez-vous sur le pont inférieur et observez coraux et poissons à travers de grandes vitres. Idéal pour les jeunes enfants, les grands-parents et tous ceux qui préfèrent rester au sec.', 'Départ de la marina
Croisière lente au-dessus de deux récifs
Court arrêt sans nourrir ni toucher quoi que ce soit : juste regarder
Retour à la marina', 'Sortie en bateau
Eau', 'Transfert depuis l’hôtel (option)', 'Convient à tous les âges.', 'Hurghada New Marina, porte 1, 15 minutes avant le départ.', false, true from experiences where slug = 'demo-glass-boat' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Rituel hammam et massage', 'Bain de vapeur, gommage au savon noir, lavage à la mousse et massage à l’huile de 45 minutes, puis thé à la menthe.', 'Deux heures pour prendre son temps. Vous commencez par le bain de vapeur, puis un praticien vous gomme et vous lave à la mousse sur le marbre chaud, avant un massage de 45 minutes à l’huile d’argan. Pour finir, un thé à la menthe dans la salle de repos.', 'Bain de vapeur
Gommage au savon noir et lavage à la mousse
Massage à l’huile de 45 minutes
Détente avec un thé à la menthe', 'Hammam et massage
Serviettes, peignoir et chaussons
Thé à la menthe', 'Transfert depuis l’hôtel (option)', 'Âge minimum : 16 ans. Informez-nous en cas de grossesse ou de problème de santé.', 'Accueil du spa, vieille ville de Sahl Hasheesh. Localisation sur votre bon.', false, true from experiences where slug = 'demo-hammam-spa' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Balade à cheval sur la plage et dans le désert', 'Deux heures à cheval de la lisière du désert jusqu’à la mer, pour débutants et cavaliers.', 'Partez des écuries, traversez la lisière du désert et descendez jusqu’à une plage tranquille, où les chevaux marchent dans l’eau peu profonde. Des chevaux calmes pour les débutants, d’autres plus vifs pour les cavaliers confirmés.', 'Rencontre avec les chevaux et courte leçon
Balade à la lisière du désert
Plage et marche dans la mer
Retour aux écuries, thé', 'Cheval et guide
Casque
Thé', 'Transfert depuis l’hôtel (option)', 'Âge minimum : 8 ans. Poids maximum : 100 kg.
Pantalon long recommandé.', 'Écuries, derrière Makadi Bay. Localisation sur votre bon.', false, true from experiences where slug = 'demo-horse-ride' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Plongée de nuit sur le récif de l’hôtel', 'Une plongée guidée après le coucher du soleil, à la lampe, quand la vie nocturne du récif se réveille.', 'La nuit, le récif change complètement : poulpes et murènes chassent, les poissons-perroquets dorment dans leur bulle et le plancton brille. Vous plongez avec un guide expérimenté et une lampe, dans une zone calme et peu profonde.
Le centre vérifie votre expérience avant de confirmer.', '17:30 accueil et briefing
18:15 équipement et mise à l’eau
18:30 plongée de nuit (environ 45 minutes)
19:30 boisson chaude et carnet de plongée', 'Plongée de nuit guidée
Lampe, bouteille, plombs et équipement complet
Boisson chaude', 'Transfert depuis l’hôtel (option)', 'Niveau Open Water et au moins 10 plongées enregistrées.
Âge minimum : 15 ans.', 'Centre de plongée sur Sheraton Road. Localisation exacte sur votre bon.', false, true from experiences where slug = 'demo-night-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée plage à Orange Bay', 'Une longue pause sur une baie de sable blanc, un arrêt snorkeling et le déjeuner.', 'Une journée tranquille centrée sur la plage. Vous passez l’essentiel du temps dans une baie de sable blanc aux eaux turquoise peu profondes, idéale pour les familles et les personnes qui ne nagent pas. Un arrêt snorkeling sur le chemin du retour.', '09:00 départ du bateau depuis la marina
10:30 arrivée dans la baie : temps libre à la plage
13:00 déjeuner
14:30 arrêt snorkeling
16:30 retour à la marina', 'Sortie en bateau
Entrée à la plage
Déjeuner et boissons sans alcool
Équipement de snorkeling', 'Transfert depuis l’hôtel (option)
Transats (en supplément)', 'Apportez une serviette et une crème solaire sans danger pour les récifs.', 'Hurghada New Marina, porte 2, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-orange-bay' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Plongée sur épave : un navire coulé près de Hurghada', 'Plongez sur une épave couverte de coraux avec un guide expérimenté ; deuxième plongée sur un récif.', 'Une plongée sur épave pour plongeurs certifiés ayant un peu d’expérience. Après un briefing détaillé, vous descendez le long du bout et explorez l’extérieur du navire, aujourd’hui habité par les coraux et les poissons. La pénétration ne fait pas partie de cette sortie.
Le centre vérifie votre carnet de plongée avant de confirmer : cette sortie est donc réservée sur demande.', '07:00 accueil et briefing
08:00 départ du bateau
09:30 plongée sur l’épave
11:00 déjeuner à bord
12:30 plongée sur le récif
14:30 retour à la marina', 'Deux plongées guidées (épave et récif)
Équipement complet
Déjeuner et boissons', 'Transfert depuis l’hôtel (option)
Taxe du parc marin', 'Niveau Advanced ou 20 plongées enregistrées.
Âge minimum : 15 ans.', 'Centre de plongée, Sheraton Road. Localisation sur votre bon.', false, true from experiences where slug = 'demo-wreck-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Parachute ascensionnel au-dessus de la baie', 'Environ 10 minutes dans les airs au-dessus de la mer, seul ou en tandem, avec la plage en contrebas.', 'Décollez depuis l’arrière du bateau et élevez-vous doucement au-dessus de la baie. Le vol est calme et silencieux ; vous atterrissez au sec sur le bateau. Les vols en tandem sont possibles à deux, dans la limite du poids total autorisé.', 'Court briefing sécurité sur la plage
Trajet en bateau jusqu’à la zone de vol
Environ 10 minutes dans les airs
Retour à la plage', 'Vol avec harnais et gilet de sauvetage
Sortie en bateau', 'Transfert depuis l’hôtel (option)
Photos et vidéos', 'Âge minimum : 8 ans (les enfants volent en tandem avec un adulte).
Annulé en cas de vent fort : vous obtenez un autre créneau ou un remboursement intégral.', 'Cabane des sports nautiques sur la plage publique, Sheraton Road.', false, true from experiences where slug = 'demo-parasailing' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Quad jusqu’à un village bédouin', 'Une heure sur votre propre quad à travers le désert, thé dans un village bédouin.', 'Après un court briefing sécurité, vous conduisez votre propre quad en file guidée sur des pistes ouvertes du désert. À mi-parcours, vous faites halte dans un village bédouin pour un thé, du pain cuit au feu de bois et une courte balade à dos de chameau.
Le prestataire confirme votre demande sous 12 heures, car les pilotes et les casques sont attribués à l’avance.', 'Briefing sécurité et réglage du casque
1 heure de quad avec un guide devant et un derrière
Village bédouin : thé, pain, courte balade à dos de chameau
Retour au camp', 'Quad et carburant
Casque, lunettes et foulard
Guide
Thé et pain bédouins', 'Transfert depuis l’hôtel (option)
Photos vendues au camp', 'Âge minimum pour conduire : 16 ans. Chaussures fermées recommandées.
Déconseillé pendant la grossesse ou en cas de problèmes de dos.', 'Camp dans le désert sur la route Hurghada–Safaga. La localisation exacte est envoyée avec votre bon.', false, true from experiences where slug = 'demo-quad-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Croisière à la voile au coucher du soleil', 'Deux heures et demie sous voiles pendant que le soleil se couche, avec thé et en-cas.', 'Un petit voilier quitte la marina en fin d’après-midi et longe la côte pendant que le soleil se couche derrière les montagnes. Calme, paisible et parfait pour les couples.', '16:00 embarquement
16:15 navigation le long de la côte
Coucher de soleil sur le pont avec thé et en-cas
18:30 retour à la marina', 'Sortie à la voile avec skipper
Thé, boissons sans alcool et en-cas', 'Transfert depuis l’hôtel (option)', 'Prévoyez une veste légère : il fait plus frais sur l’eau après le coucher du soleil.', 'Boulevard de la marina de Hurghada, ponton C.', false, true from experiences where slug = 'demo-sunset-sail' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Observation des étoiles et dîner barbecue dans le désert', 'Coucher de soleil dans les dunes, dîner dans un camp bédouin et ciel nocturne au télescope.', 'Vous quittez la ville en fin d’après-midi pour rejoindre un camp paisible dans le désert avant le coucher du soleil. Après un dîner barbecue autour du feu, les lumières s’éteignent et un guide vous montre les étoiles et les planètes au télescope.', '17:00 prise en charge et route vers le camp
Coucher de soleil depuis une dune
Dîner barbecue et thé
Observation des étoiles au télescope
22:00 retour à votre hôtel', 'Transport du point de rendez-vous au camp
Dîner, thé et eau
Observation au télescope avec un guide', 'Transfert depuis l’hôtel (option)', 'Prévoyez une couche chaude : les nuits dans le désert sont froides de novembre à mars.', 'Point de rendez-vous : bureau Safari, El Nasr Road.', false, true from experiences where slug = 'demo-desert-stars' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Matinée de pêche en mer Rouge', 'Pêche au fond depuis un petit bateau, avec cannes, appâts et déjeuner de poisson grillé.', 'Partez avec un capitaine local vers les zones de pêche au nord de Hurghada. Cannes, lignes et appâts vous attendent à bord, et l’équipage montre aux débutants comment descendre la ligne et remonter le poisson.
Votre pêche est nettoyée et grillée à bord pour le déjeuner.', '07:30 départ du bateau depuis la marina
08:30 premier coin de pêche
10:30 deuxième coin
12:00 votre pêche grillée au déjeuner
12:30 retour à la marina', 'Bateau, capitaine et équipage
Cannes, lignes et appâts
Déjeuner avec votre pêche
Eau et thé', 'Transfert depuis l’hôtel (option)
Pourboires', 'Sortie par mer calme ; prenez tout de même des comprimés contre le mal de mer si besoin.', 'Hurghada New Marina, porte 2, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-fishing-trip' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée plage sur une île près de Giftun', 'Une journée sur une plage de sable fin : transat et parasol, snorkeling depuis la plage et déjeuner.', 'Un bateau rapide vous emmène sur la plage protégée d’une île du secteur de Giftun. Passez la journée sur un transat sous un parasol, faites du snorkeling directement depuis la plage au-dessus du récif peu profond et profitez d’un déjeuner buffet.', '08:30 départ du bateau depuis la marina
09:15 arrivée sur l’île
Temps libre à la plage
12:30 déjeuner buffet
16:00 retour à la marina', 'Transfert en bateau rapide
Transat et parasol
Déjeuner buffet et eau', 'Location d’équipement de snorkeling
Taxe du parc marin
Transfert depuis l’hôtel (option)', 'Utilisez une crème solaire sans danger pour les récifs. Il est interdit de toucher les coraux.', 'Hurghada New Marina, porte 4, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-island-beach' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Super safari : jeep, quad, chameau et dîner', 'Une demi-journée dans le désert : jeep, quad, chameau, un village bédouin et le dîner.', 'Tout en un après-midi. Une jeep vous emmène au cœur du désert, vous faites du quad et du chameau, visitez un village bédouin et terminez par un dîner et un spectacle sous les étoiles.', '13:00 jeep vers le désert
Quad (30 minutes)
Balade à dos de chameau et village bédouin
Coucher de soleil et dîner
19:00 retour en ville', 'Balades en jeep, en quad et à dos de chameau
Guide
Dîner et boissons', 'Transfert depuis l’hôtel (option)', 'Les enfants montent en passagers avec un adulte sur le quad.', 'Bureau Safari, El Nasr Road.', false, true from experiences where slug = 'demo-super-safari' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Cours de cuisine égyptienne chez une famille locale', 'Faites le marché, cuisinez quatre plats classiques chez une famille d’accueil, puis mangez ensemble.', 'Commencez au marché local pour choisir légumes et épices, puis cuisinez dans une cuisine familiale : feuilles de vigne farcies, koshari, pain baladi et un dessert. Vous dégustez ce que vous avez préparé autour de la table familiale et repartez avec les recettes.
Petit groupe ; la famille confirme votre date sur demande.', 'Rencontre avec votre hôte au marché
Achat des ingrédients
Préparation de quatre plats ensemble
Repas partagé et recettes', 'Ingrédients et cours de cuisine
Repas et boissons
Fiche recette', 'Transfert depuis l’hôtel (option)', 'Signalez vos allergies ou besoins végétariens lors de la réservation.', 'Marché aux légumes d’El Dahar, entrée principale. Localisation sur votre bon.', false, true from experiences where slug = 'demo-cooking-class' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Croisière dîner en musique', 'Trois heures en mer le soir : coucher de soleil, dîner buffet et musique orientale live sur le pont.', 'Embarquez au coucher du soleil et naviguez lentement le long de la côte pendant que les lumières de Hurghada s’allument. Le dîner est un buffet de grillades, salades et plats égyptiens ; un groupe joue sur le pont supérieur.', '18:30 embarquement
19:00 départ au coucher du soleil
19:30 dîner buffet
20:30 musique live sur le pont
21:30 retour à la marina', 'Croisière
Dîner buffet
Eau et boissons sans alcool
Musique live', 'Transfert depuis l’hôtel (option)
Boissons alcoolisées', 'Tenue décontractée chic. Prévoyez une veste légère : il y a du vent en mer.', 'Hurghada New Marina, porte 1, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-dinner-cruise' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Dolphin House en bateau rapide', 'Un bateau rapide jusqu’au récif où les dauphins à long bec viennent souvent se reposer, avec deux arrêts snorkeling.', 'Dolphin House est un récif en fer à cheval où des dauphins à long bec sauvages viennent souvent se reposer. L’équipage garde une distance respectueuse et suit le code de conduite local : pas de poursuite, pas de nourriture, pas de contact.
Les dauphins sont des animaux sauvages : les observations sont probables mais jamais garanties. Le deuxième arrêt est un jardin de corail pour le snorkeling.', '08:00 départ du bateau depuis la marina
09:15 Dolphin House : observation et snorkeling dans le respect des animaux
11:30 arrêt snorkeling au jardin de corail
12:30 déjeuner à bord
14:00 retour à la marina', 'Bateau rapide avec équipage
Équipement de snorkeling
Déjeuner, eau et boissons sans alcool', 'Transfert depuis l’hôtel (option)
Pourboires', 'La mer peut être agitée ; prévenez l’équipage si vous avez le mal de mer.
Les enfants doivent porter un gilet dans l’eau.', 'Hurghada New Marina, porte 2, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-dolphin-house' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée snorkeling à l’île de Giftun', 'Deux arrêts sur des récifs, une plage sur l’île de Giftun et le déjeuner à bord.', 'Une journée complète et détendue sur l’eau. Le bateau quitte la marina de Hurghada le matin et jette l’ancre sur deux récifs de la zone protégée de Giftun, où l’équipage vous montre les meilleurs spots pour les coraux et les poissons. Entre les arrêts snorkeling, vous profitez de la plage blanche de l’île de Giftun.
L’équipement de snorkeling et un gilet de flottabilité sont fournis ; l’équipage reste avec les débutants dans l’eau.', '08:30 prise en charge à votre hôtel (si réservée)
09:30 départ du bateau depuis la marina
10:30 premier arrêt sur un récif : snorkeling
12:00 temps libre sur la plage de l’île de Giftun
13:30 déjeuner à bord
14:30 deuxième arrêt sur un récif
16:00 retour à la marina', 'Sortie en bateau avec équipage
Masque, palmes et gilet de snorkeling
Déjeuner à bord, eau et boissons sans alcool
Droit d’accès à la zone protégée', 'Transfert depuis l’hôtel (option)
Serviettes
Pourboires', 'Apportez une crème solaire sans danger pour les récifs, une serviette et un chapeau.
Déconseillé aux personnes qui ne savent pas du tout nager ; des gilets sont disponibles.', 'Hurghada New Marina, porte 2. Repérez le panneau WENRO sur le ponton 20 minutes avant le départ.', false, true from experiences where slug = 'demo-giftun-island' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Montgolfière au lever du soleil à Louxor et rive ouest', 'Survolez la Vallée des Rois à l’aube, puis visitez les tombes et le temple d’Hatchepsout.', 'Quittez Hurghada dans la nuit pour arriver à Louxor avant l’aube. Au lever du soleil, votre montgolfière dérive au-dessus du Nil, des champs et des temples de la rive ouest. Après l’atterrissage, votre guide vous emmène à la Vallée des Rois et au temple d’Hatchepsout, avec déjeuner au bord du Nil.
Les vols en montgolfière dépendent du vent et sont confirmés par le prestataire.', '01:00 prise en charge à l’hôtel
05:30 décollage de la montgolfière (environ 45 minutes)
08:00 Vallée des Rois
10:30 temple d’Hatchepsout
12:30 déjeuner
13:30 trajet retour
18:30 retour à votre hôtel', 'Car avec prise en charge à l’hôtel
Vol en montgolfière
Guide et billets d’entrée
Déjeuner', 'Tombes spéciales (billet en supplément)
Pourboires', 'Âge minimum : 7 ans.
Si la montgolfière ne peut pas voler, la partie vol vous est remboursée.', 'Prise en charge à la réception de votre hôtel ; l’heure est confirmée la veille.', false, true from experiences where slug = 'demo-luxor-balloon' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Balade dans la vieille ville et le marché d’El Dahar', 'Parcourez le vieux quartier avec un guide local : la mosquée, le marché aux poissons et une boutique d’épices.', 'Une visite à pied d’El Dahar, le plus ancien quartier de Hurghada. Votre guide vous explique comment le village de pêcheurs est devenu une ville balnéaire, vous emmène dans les ruelles du marché et fait une halte dans une boutique d’épices familiale pour un thé.', 'Rendez-vous place de la mosquée El Mina
Ruelles du vieux quartier
Marché aux poissons et marché aux fruits
Thé dans une boutique d’épices
Fin près de la marina de Hurghada', 'Guide local
Thé à la boutique d’épices', 'Transfert depuis l’hôtel (option)
Achats', 'Épaules et genoux couverts pour la visite de la mosquée.', 'Place de la mosquée El Mina, près de l’entrée principale.', false, true from experiences where slug = 'demo-old-town-walk' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée en yacht privé pour votre groupe', 'Votre propre yacht, avec capitaine et équipage, pendant six heures : choisissez les récifs et les plages qui vous plaisent.', 'Idéal pour les familles et les amis. Le capitaine organise la journée avec vous : récifs pour le snorkeling, plage tranquille ou simplement soleil et baignade. Le déjeuner est préparé à bord.
Réservez par personne, ou le yacht entier pour votre groupe en sortie privée.', '09:00 embarquement à la marina
Votre propre programme avec le capitaine
Déjeuner à bord
15:00 retour à la marina', 'Yacht privé avec capitaine et équipage
Équipement de snorkeling
Déjeuner, eau et boissons sans alcool', 'Transfert depuis l’hôtel (option)
Taxe du parc marin
Pourboires', 'L’itinéraire final dépend du vent et de la mer.', 'Hurghada New Marina, ponton des yachts B.', false, true from experiences where slug = 'demo-private-yacht' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Balade à dos de chameau au lever du soleil', 'Une balade tranquille à dos de chameau vers les montagnes à l’aube, puis petit-déjeuner au camp.', 'Un départ matinal, récompensé par le désert à son moment le plus paisible. Vous montez un chameau mené par un guide bédouin jusqu’à un point de vue pour le lever du soleil, puis partagez un petit-déjeuner simple au camp.', '05:30 prise en charge
06:00 balade à dos de chameau jusqu’au point de vue
Lever du soleil
07:30 petit-déjeuner au camp
08:30 retour en ville', 'Balade à dos de chameau avec guide
Petit-déjeuner et thé', 'Transfert depuis l’hôtel (option)', 'Âge minimum : 6 ans. Pantalon long recommandé.', 'Camp dans le désert, route Hurghada–Safaga.', false, true from experiences where slug = 'demo-sunrise-camel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Deux plongées sur récif pour plongeurs certifiés', 'Deux plongées guidées sur les plus beaux récifs de Hurghada, avec équipement complet et déjeuner à bord.', 'Pour les plongeurs déjà certifiés. Le guide de plongée choisit deux récifs adaptés aux conditions du jour et à votre niveau, avec un intervalle de surface et le déjeuner entre les plongées.
Apportez votre carte de certification et votre carnet de plongée.', '08:00 accueil au centre de plongée
09:00 départ du bateau
10:00 première plongée (environ 50 minutes)
11:00 intervalle de surface et déjeuner
12:30 deuxième plongée
14:00 retour à la marina', 'Deux plongées guidées
Bouteille, plombs et équipement complet
Déjeuner, eau et thé', 'Transfert depuis l’hôtel (option)
Nitrox (renseignez-vous auprès du centre)
Taxe du parc marin', 'Niveau Open Water ou équivalent obligatoire.
Pas de vol en avion dans les 24 heures suivant la plongée.', 'Centre de plongée, Sheraton Road. Localisation sur votre bon.', false, true from experiences where slug = 'demo-two-tank-dive' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Dîner bédouin et observation des étoiles', 'Partez dans le désert au coucher du soleil pour du pain cuit au feu de bois, un dîner bédouin et les étoiles.', 'Un 4x4 vous emmène dans un camp paisible au milieu des collines du désert. Vous admirez le coucher du soleil, découvrez comment le pain bédouin est cuit sur le sable et les pierres brûlants, puis partagez un dîner autour du feu. Après le dîner, les lumières baissent pour laisser place aux étoiles.', '16:30 prise en charge ou point de rendez-vous
17:15 coucher de soleil dans le désert
18:00 cuisson du pain et thé
19:00 dîner autour du feu
20:00 observation des étoiles
20:45 retour à Hurghada', 'Transfert en 4x4 jusqu’au camp
Dîner, thé et eau
Observation des étoiles avec un guide', 'Transfert depuis l’hôtel (option)
Boissons sans alcool au camp', 'Prévoyez une couche chaude : les nuits dans le désert sont fraîches de novembre à mars.', 'Base safari, route Hurghada–Safaga. Localisation sur votre bon.', false, true from experiences where slug = 'demo-bedouin-dinner' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Baptême de plongée : votre première plongée', 'Aucune expérience requise : entraînement en eau peu profonde, puis plongée guidée entre 6 et 12 m.', 'Un premier aperçu de la plongée avec un moniteur diplômé, un moniteur pour deux participants. Vous apprenez d’abord les bases en eau peu profonde ; ce n’est que lorsque vous vous sentez prêt que vous descendez sur un récif calme.
Vous remplissez un court questionnaire médical avant la sortie.', '08:30 rendez-vous au centre de plongée
09:00 briefing et réglage de l’équipement
10:30 exercices en eau peu profonde
11:30 plongée guidée (environ 30 minutes)
13:00 retour à terre', 'Tout l’équipement de plongée
Moniteur (1 pour 2 participants)
Sortie en bateau, eau et en-cas', 'Transfert depuis l’hôtel (option)
Photos de plongée', 'Âge minimum : 10 ans. Questionnaire médical obligatoire.
Pas de vol en avion dans les 24 heures suivant la plongée.', 'Centre de plongée, Sheraton Road. Localisation sur votre bon.', false, true from experiences where slug = 'demo-discover-scuba' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Soirée orientale : dîner et spectacle de tanoura', 'Dîner égyptien, danseur de tanoura, musique folklorique et flânerie dans un bazar éclairé de lanternes.', 'Une soirée de musique et de cuisine égyptiennes. Après une promenade dans un petit bazar de lanternes et d’épices, le dîner est servi pendant qu’un danseur de tanoura tourbillonne dans ses jupes colorées et qu’un groupe folklorique joue.', '19:00 arrivée et flânerie dans le bazar
19:45 dîner
20:30 spectacle de tanoura et musique folklorique
22:00 fin de la soirée', 'Dîner et boissons sans alcool
Spectacle
Thé et café', 'Transfert depuis l’hôtel (option)
Achats au bazar', 'Convient à tous les âges.', 'Lieu de la soirée, El Dahar. Localisation sur votre bon.', false, true from experiences where slug = 'demo-oriental-night' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Cours d’initiation au kitesurf à El Gouna', 'Trois heures avec un moniteur certifié : maîtrise de l’aile à terre, puis body-drag en eau peu profonde.', 'Les lagunes plates et peu profondes d’El Gouna comptent parmi les meilleurs endroits pour apprendre. Votre moniteur commence par la maîtrise de l’aile sur la plage, puis vous emmène dans l’eau jusqu’aux genoux pour sentir la traction de l’aile. Avec un bon vent, certains élèves tiennent debout sur la planche en fin de cours.
Les cours dépendent du vent : l’école confirme donc votre horaire sur demande.', 'Rencontre avec le moniteur et consignes de sécurité
Maîtrise de l’aile à terre
Séance dans l’eau peu profonde de la lagune
Bilan et prochaines étapes', 'Moniteur certifié (1 pour 2 élèves)
Aile, planche, harnais, casque, combinaison', 'Transfert depuis l’hôtel (option)', 'Savoir nager.
Âge minimum : 12 ans, poids minimum : 40 kg.', 'Station de kite, plage Mangroovy, El Gouna.', false, true from experiences where slug = 'demo-kitesurf-lesson' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Journée snorkeling sur deux récifs coralliens', 'Une journée détendue en bateau avec deux arrêts snorkeling, une pause plage et le déjeuner à bord.', 'Partez vers les récifs au large de Hurghada avec un petit équipage. À chaque arrêt, le guide accompagne un groupe dans l’eau pendant que d’autres se détendent sur le pont. Entre les récifs, le bateau jette l’ancre près d’une plage de sable blanc pour la baignade et le déjeuner.
Idéal pour un premier snorkeling : gilets et masques de toutes tailles à bord.', '08:30 départ du bateau depuis la marina
10:00 premier récif
12:00 pause plage et déjeuner
14:00 deuxième récif
16:00 retour à la marina', 'Bateau, équipage et guide
Masque, tuba, palmes et gilet
Déjeuner, eau et boissons sans alcool', 'Transfert depuis l’hôtel (option)
Taxe du parc marin
Pourboires', 'Les enfants doivent porter un gilet dans l’eau.
Utilisez une crème solaire sans danger pour les récifs.', 'Hurghada New Marina, porte 2, 20 minutes avant le départ.', false, true from experiences where slug = 'demo-paradise-snorkel' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into experience_translations (experience_id, locale, title, summary, description, itinerary, included, excluded, requirements, meeting_info, reviewed, machine_translated) select id, 'fr', 'Pack sports nautiques : jet-ski, bouée banane et bouée tractée', '15 minutes de jet-ski avec un moniteur, puis un tour de bouée banane et de bouée tractée.', 'Trois activités en une seule réservation. Vous commencez par 15 minutes de jet-ski (vous pilotez, le moniteur à bord), puis vous vous accrochez bien sur la bouée banane et la bouée tractée par un bateau rapide.', 'Briefing sécurité et gilets de sauvetage
15 minutes de jet-ski
Tour de bouée banane
Tour de bouée tractée', 'Jet-ski (15 min) avec moniteur
Tours de bouée banane et de bouée tractée
Gilets de sauvetage', 'Transfert depuis l’hôtel (option)', 'Les enfants de 8 à 11 ans font uniquement la bouée banane et la bouée tractée, avec un adulte.
Déconseillé pendant la grossesse.', 'Cabane des sports nautiques sur la plage publique, Sheraton Road.', false, true from experiences where slug = 'demo-watersports-pack' on conflict (experience_id, locale) do update set title = excluded.title, summary = excluded.summary, description = excluded.description, itinerary = excluded.itinerary, included = excluded.included, excluded = excluded.excluded, requirements = excluded.requirements, meeting_info = excluded.meeting_info, machine_translated = true;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000101', 'de', 'Schnuppertauchgang (15 Min., mit Instruktor)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000101') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000102', 'de', 'Upgrade zum Mittagessen: gegrillter Fisch' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000102') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000201', 'de', 'Zweite Person auf demselben Quad' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000201') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000401', 'de', 'Sonnenliege und Sonnenschirm am Strand' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000401') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000501', 'de', 'Zweiter geführter Tauchgang' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000501') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000001201', 'de', 'Heißluftballon bei Sonnenaufgang (wetterabhängig)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000001201') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000101', 'ru', 'Пробное погружение (15 мин, с инструктором)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000101') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000102', 'ru', 'Улучшенный обед: рыба на гриле' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000102') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000201', 'ru', 'Второй человек на том же квадроцикле' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000201') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000401', 'ru', 'Лежак и зонтик на пляже' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000401') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000501', 'ru', 'Второе погружение с гидом' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000501') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000001201', 'ru', 'Полёт на воздушном шаре на рассвете (зависит от погоды)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000001201') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000101', 'fr', 'Baptême de plongée (15 min, avec moniteur)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000101') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000102', 'fr', 'Déjeuner amélioré : poisson grillé' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000102') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000201', 'fr', 'Deuxième passager sur le même quad' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000201') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000401', 'fr', 'Transat et parasol sur la plage' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000401') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000000501', 'fr', 'Deuxième plongée guidée' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000000501') on conflict (extra_id, locale) do update set name = excluded.name;
insert into extra_translations (extra_id, locale, name) select '61000000-0000-0000-0000-000000001201', 'fr', 'Montgolfière au lever du soleil (selon la météo)' where exists (select 1 from extras where id = '61000000-0000-0000-0000-000000001201') on conflict (extra_id, locale) do update set name = excluded.name;
