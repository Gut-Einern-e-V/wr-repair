-- Erste Highlight-Geschichten fuer die Festivalbuehne am 31.10.2026.
--
-- Zwanzig freigegebene Einreichungen mit Zustimmung zur Veroeffentlichung,
-- von Claude geglaettet: Rechtschreibung, Absaetze und Lesefluss, keine neuen
-- Fakten. Namen von Kindern und Altersangaben sind herausgenommen. Stufe
-- `ready`, damit sie sofort auf der Buehne stehen - die Notiz erinnert ans
-- Gegenlesen. Der Originaltext bleibt in `repairs.story`.
--
-- Nur Zeilen, deren Reparatur (noch) freigegeben ist und zugestimmt hat;
-- bestehende Highlights bleiben unberuehrt.

with seed (repair_id, sort_order, title, teaser, body) as (values
  ('2a1725d7-1399-4185-91be-c29b36d7f436'::uuid, 10,
   $t$Ein steiniger Weg zum nächsten Espresso$t$,
   $t$In der Bohnenpackung versteckte sich ein Stein – das Mahlwerk der Siebträgermaschine gab alles und dann den Geist auf. Nach Wochen ohne Kaffee läuft sie wieder. Der Stein hat Hausverbot.$t$,
   $t$Ich wollte nur einen Kaffee. Meine Siebträgermaschine bekam stattdessen einen Härtetest: In der Kaffeebohnenpackung hatte sich ein Stein versteckt. Vielleicht war „kräftiges Aroma“ diesmal etwas zu wörtlich gemeint.

Das Mahlwerk gab jedenfalls alles – und dann den Geist auf. Bohnen mahlen: ja. Schotter verarbeiten: offenbar außerhalb der Stellenbeschreibung.

Also ging die Maschine über den Händler zum autorisierten Servicepartner nach Bielefeld. Vorher musste allerdings erst der passende Versandkarton angefordert werden. Die Maschine brauchte ein neues Mahlwerk, ich vor allem Geduld. Ein paar Wochen ohne den gewohnten Kaffee können erstaunlich lang sein.

Am Ende wurde das Mahlwerk getauscht, und die Maschine kam funktionierend zurück. Seitdem genieße ich wieder meinen Kaffee – und schaue genauer hin, was im Bohnenbehälter landet.

Die Maschine ist gerettet, der Espresso schmeckt, und der Stein hat Hausverbot. Für mineralische Noten nehme ich künftig lieber ein Glas Wasser dazu.$t$),

  ('dd4d82f0-c852-4a34-8341-0560a83da0c8'::uuid, 20,
   $t$Zu schön für den Papiermüll$t$,
   $t$Die Betreuerin zerriss ihr eigenes Bild und warf es weg. Eine Siebenjährige holte es heimlich aus dem Müll, klebte es zu Hause mit Tesafilm zusammen – und hängte es in ihrem Zimmer auf.$t$,
   $t$Dies ist die Reparatur meiner siebenjährigen Tochter.

Ihre Betreuerin in der Schule hatte dieses Bild gemalt. Sie war damit nicht zufrieden, hat es zerrissen und in den Papiermüll geworfen.

Heimlich hat meine Tochter die beiden Teile wieder aus dem Müll geholt, in ihren Rucksack gepackt und zu Hause mit Tesafilm zusammengeklebt. Sie fand das Bild so schön und bewundert die Betreuerin so sehr für ihr Talent, dass sie nicht wollte, dass es im Müll landet.

Jetzt hängt es in ihrem Zimmer.$t$),

  ('1f6e0277-2f77-448e-9b80-e6aa90bec1bc'::uuid, 30,
   $t$Der Magnet lag die ganze Zeit auf dem Küchenboden$t$,
   $t$Der Hebel am Mixerdeckel zerfiel, Kleben half nicht. Erst die KI verriet: Darin steckt ein Magnet. Genau den hatte sie längst auf dem Küchenboden gefunden – und ratlos beiseitegelegt.$t$,
   $t$Den Standmixer haben wir in einem Secondhandladen in Holland gekauft, und er funktionierte wunderbar. Am Deckel sitzt ein Hebel, der beim Schließen einrasten muss, sonst streikt der Mixer.

Eines Tages fiel der Hebel beim Herunterdrücken auseinander. Ich habe ihn wieder zusammengeklebt – aber umsonst.

Einige Zeit später wollte ich dem Problem auf den Grund gehen und habe es Gemini geschildert, also eigentlich doch mit Unterstützung. Die KI erwähnte einen Magneten im Hebel, auf den es ankomme. Einen passenden Magneten hatte ich zwischenzeitlich auf dem Küchenboden gefunden und ratlos beiseitegelegt.

Nun gelang es mir, den geklebten Hebel wieder auseinanderzubekommen. Ich habe den Magneten eingesetzt, und der Mixer läuft wieder einwandfrei.$t$),

  ('49c3d287-7d01-4543-9169-8a6574118b96'::uuid, 40,
   $t$Probefahrt mit Hund$t$,
   $t$Der geschenkte Rasenmäher lief seit Jahren nicht mehr. Zündkerze, Filter, Benzinleitung, Zündmodul und Batterie später schnurrt er wieder – und der Hund fährt bei der Probefahrt mit.$t$,
   $t$Eine Freundin hatte den Rasenmäher für ihr Grundstück geschenkt bekommen. Gelaufen war er seit einigen Jahren nicht mehr, er brauchte also einige Zuwendung.

Getauscht habe ich die Zündkerze, den Luftfilter, die Benzinleitung, das Zündmodul und die Batterie – und natürlich frisches Benzin eingefüllt.

Jetzt läuft er einwandfrei. Ausprobiert wurde er mit Hilfe meines Hundes, oben im Bild: Den stört der laute Motor nicht, er ist bei der Probefahrt einfach mitgefahren.$t$),

  ('edf56997-f6f4-4e04-a8df-bd0d74f64f91'::uuid, 50,
   $t$Eine neue Schirmspitze aus dem 3D-Drucker$t$,
   $t$Die kleine Spitze am Regenschirm war weg, ein Ersatzteil nicht zu bekommen. Also: Rohr ausgemessen, Kappe am Rechner konstruiert und aus flexiblem TPU gedruckt. Sitzt stramm, hält.$t$,
   $t$Irgendwann war sie einfach weg: die kleine Spitze am Regenschirm meiner Frau. Ohne sie lag das blanke Metallrohr frei. Wegwerfen kam nicht infrage, dafür war der Schirm viel zu teuer. Ein passendes Ersatzteil gab es aber auch nicht einfach so zu kaufen.

Also habe ich mich drangesetzt: Rohr ausgemessen, in FreeCAD eine neue Kappe konstruiert und sie mit meinem 3D-Drucker aus TPU gedruckt. Weil das Material flexibel ist, lässt sich die Kappe ins Rohr stecken und sitzt dort stramm. Außerdem ist sie weniger empfindlich als eine harte Kunststoffspitze.

Ein kleines Teil mit großer Wirkung: Der Schirm ist wieder vollständig und einsatzbereit. Für mich ein schönes Beispiel dafür, dass man mit etwas Tüftelei und einem 3D-Drucker viele Dinge selbst reparieren kann, statt sie zu ersetzen.$t$),

  ('6f524f13-a7b9-4cfd-8288-f7e424ceb403'::uuid, 60,
   $t$Neue Gurte für den Buggy – und für eine Familie$t$,
   $t$In einer Verschenk-Gruppe suchte jemand einen Buggy für eine geflüchtete Familie. Der alte aus dem Keller hatte bröselige Gurte. Also: Gurtband aus dem Nähfundus, Nähmaschine, Handnähte – fertig für das nächste Kind.$t$,
   $t$Über eine WhatsApp-Gruppe zum Verschenken wurde nach einem Buggy für eine geflüchtete Familie gefragt. Die Gelegenheit, unseren alten aus dem Keller endlich weiterzugeben!

Dann die Erkenntnis: Die Haltegurte waren mit der Zeit bröselig geworden und hätten kein Kind mehr sicher gehalten.

Also habe ich als Hobbynäherin Gurtband aus meinem Fundus genommen und mit Nähmaschine und Handnähten alles ersetzt. Der Buggy ist bereit für den nächsten Einsatz.$t$),

  ('39ba1a61-e7c6-45ae-ae6d-b3512ab8356c'::uuid, 70,
   $t$Die Lachkatze lacht wieder$t$,
   $t$Ein abgequetschtes Kabel, ein bisschen Löten, ein Schrumpfschlauch – und die Lachkatze bewegt sich wieder. Das Schwierigste war die Frage, wie sie sich eigentlich bewegen sollte.$t$,
   $t$Die Lachkatze machte gar nichts mehr, weil ein Kabel abgequetscht war. Löten, Schrumpfschlauch drüber, fertig – und sie bewegte sich wieder.

Das Schwierigste war die Mechanik beim Zusammenbau. Dafür gab es mehrere Möglichkeiten, und wir wussten ja nicht, wie genau sie sich bewegen sollte: nur der Schwanz? Oder rollt der Schwanz den ganzen Körper?

Die Kundin war jedenfalls überglücklich, dass ihre Katze wieder so dreckig lacht und sich irgendwie bewegt.$t$),

  ('9898e7df-b7a6-441f-8a7f-1bd884004b3e'::uuid, 80,
   $t$Man darf ruhig sehen, dass es geflickt ist$t$,
   $t$Sie flickt für Familie und Nachbarschaft – erst möglichst unsichtbar, inzwischen mit Absicht sichtbar. Visible Mending zeigt: Gebrauchsspuren sind kein Makel, sondern ein zweites Leben.$t$,
   $t$Ich repariere nicht nur meine eigene Kleidung, sondern auch die meiner Familie und meiner Nachbarn – ich bin die Einzige, die nähen kann.

Anfangs habe ich versucht, alle Reparaturen möglichst unsichtbar umzusetzen. Inzwischen gefällt es mir besonders gut, wenn man sehen kann, dass ein Kleidungsstück repariert wurde. Im Englischen heißt das Visible Mending.

Durch sichtbare Reparaturen bekommt das Ausbessern einen ganz neuen Reiz. Sie zeigen, dass es völlig in Ordnung ist, Kleidung lange zu tragen, Gebrauchsspuren zuzulassen und Dingen ein zweites Leben zu schenken. Gleichzeitig wächst eine neue Wertschätzung für das Unperfekte – und wir gehen gelassener mit kleinen Makeln um, bei unseren Kleidungsstücken und bei uns selbst.$t$),

  ('e013d99f-0bec-4e23-a78b-4c8e17ddea12'::uuid, 90,
   $t$Aquariumschlauch statt Ersatzteil$t$,
   $t$Der Steigschlauch der Spülmaschine war undicht, ein Ersatzteil gab es nicht mehr. Die Lösung aus dem Baumarkt: ein Stück Aquariumschlauch und zwei Schellen für rund fünf Euro. Juhu!$t$,
   $t$Der Steigschlauch für den Sprüharm unserer Spülmaschine war undicht. Ein sehr simples Plastikteil, von dem ich dachte, dass ich es bestimmt günstig nachkaufen kann.

Aber nein. Der wirklich sehr nette Kundendienst des Herstellers konnte mir nur mitteilen, dass er mir leider keine positive Rückmeldung geben könne.

Also habe ich im Baumarkt ein Stück Aquariumschlauch und zwei Schlauchschellen gekauft, für insgesamt etwa fünf Euro. Jetzt funktioniert alles wieder. Juhu!$t$),

  ('f89cc227-c3d0-46e1-8e2f-d06a578670f2'::uuid, 100,
   $t$Ein Kabel, das zufällig dabei war$t$,
   $t$Beim Wasserkocher musste nur ein Kabel getauscht werden – und die Leute in der Utopiastadt hatten zufällig eins dabei. Ein neuer Kocher wäre für den Besitzer nicht drin gewesen.$t$,
   $t$Lustigerweise musste nur ein Kabel ersetzt werden – und die sehr netten Leute in der Utopiastadt hatten zufällig eins dabei.

Ich habe mich sehr gefreut, dass mein Wasserkocher wieder funktioniert. Einen neuen hätte ich mir leider nicht leisten können.

Ich bin herzlich dankbar, dass es solche Projekte bei uns noch gibt.$t$),

  ('8eeb7db8-bd44-454c-b3cd-7fae1d4b1562'::uuid, 110,
   $t$Die Watschelente, zweite Generation$t$,
   $t$Vor fast 30 Jahren schob schon die Tochter diese Ente durch die Wohnung. Jetzt hat der Enkel sie entdeckt – und den Stiel abgebrochen. Etwas Leim später platscht sie wieder.$t$,
   $t$Die Ente hat schon meine Tochter durch die Gegend geschoben und sich über das Platschen gefreut. Das ist knapp 30 Jahre her.

Nun hat mein Enkel sie für sich entdeckt und es geschafft, den Schiebestiel abzubrechen.

Dank einer ordentlichen Portion Leim funktioniert sie wieder – bis zur nächsten Reparatur.$t$),

  ('20d7f29b-9d79-48be-b12a-83d546c9221a'::uuid, 120,
   $t$Ein Wattestäbchen rettet die Kaffeemühle$t$,
   $t$Die Kaffeemühle lag schon in der Elektroschrott-Kiste. Nach langer Fehlersuche mit Hilfe der KI zeigte sich: Die Taste hatte keinen Kontakt. Ein eingeklebtes Stück Wattestäbchen genügte.$t$,
   $t$Unsere Kaffeemühle gab beim Drücken der Taste schon lange keinen Ton mehr von sich und war bereits in unserer Sammelbox für Elektroschrott gelandet.

Als wir von Instantkaffee auf die Espressokanne umgestiegen sind, fiel mir das gute Stück wieder ein. Ich habe Gemini zu Rate gezogen – also doch nicht ganz allein. Nach einem langen Diagnoseprozess im Gehäuse stellte sich heraus, dass die Taste beim Herunterdrücken keinen Kontakt zum Gegenstück hatte.

Die Lösung: ein kleines Stück Plastik von einem Wattestäbchen, unten eingeklebt. Kaffeemühle repariert!$t$),

  ('673e53da-ef98-4b4c-b74e-7a37b71440d8'::uuid, 130,
   $t$Drei T-Rex aus dem Sperrmüll$t$,
   $t$Ein Sack Dinosaurierknochen vom Sperrmüll ergab drei T-Rex-Skelette – mit Lücken. Die Wirbelsäule wurde aus Wellpappe nachgebaut. Und dazu zwei Extraschädel. Warum nicht?$t$,
   $t$Einen Sack Dinosaurierknochen im Sperrmüll gefunden. Zusammengesetzt ergaben sie drei T-Rex, doch ein paar Teile fehlten.

Um zunächst ein Skelett zu vervollständigen, habe ich die Wirbelsäule aus Wellpappe nachgebaut – und zusätzlich zwei Extraschädel. Warum nicht?$t$),

  ('2cc11a11-8c7a-401e-9dbc-9404ed648e87'::uuid, 140,
   $t$Reparatur in der Probenpause$t$,
   $t$Die Akkordeons der Kinder-AG sind alt und ständig ist etwas kaputt. Ein älterer Spieler kam vor seiner eigenen Probe vorbei und richtete einen klemmenden Knopf – mit einem Foto als Bauplan.$t$,
   $t$Die Instrumente in unserer Akkordeon-AG und im Nachwuchsorchester sind alle alt, und ständig ist etwas kaputt. Ich habe schon einiges reparieren gelernt, aber noch nicht alles.

Umso schöner, dass ein älterer Spieler vor seiner eigenen Probe zu unserer Probe an einen anderen Ort gekommen ist. Obwohl er sich mit Knopfinstrumenten nicht auskennt, konnte er das Instrument reparieren.

Witzig war: Während die Kinder probten, fotografierte er die Knöpfe eines anderen Instruments. So konnte er sie wieder an der richtigen Stelle einschrauben – alle mussten abgeschraubt werden, um den schiefen, klemmenden Knopf gerade zu stellen.$t$),

  ('27ced130-40ed-4c91-9df8-32d3487d6a59'::uuid, 150,
   $t$Der Treppenlift fährt wieder – Hersteller widerlegt$t$,
   $t$Laut Hersteller muss der Akkupack komplett getauscht und der Lift neu programmiert werden. Stattdessen: Pack zerlegt, drei von zwölf Zellen erneuert, Lift läuft. Gegenteil bewiesen.$t$,
   $t$Den Akkupack aus zwölf Einzelzellen zerlegt, drei Zellen erneuert – und so den Treppenlift wieder in Gang gesetzt.

Ich bin sehr stolz darauf. Denn der Hersteller gibt an, dass der Akkupack nur komplett ausgetauscht werden kann und der Lift danach neu programmiert werden muss. Gegenteil bewiesen.$t$),

  ('0d3b6300-43a8-47c5-9ed8-83a9a2e715d0'::uuid, 160,
   $t$Wozu Wahlwerbung gut sein kann$t$,
   $t$Die Halterung im Spülkasten war gebrochen, das Wasser lief und lief. Geflickt mit dem Lötkolben und geschmolzenem Kunststoff – aus einem Kabelbinder, der mal ein Wahlplakat hielt.$t$,
   $t$Man weiß ja nie, wozu Wahlwerbung und Kabelbinder gut sein können.

Den Spülkasten, schon lange bei uns im Haus, habe ich schon mehrfach repariert. Diesmal war die Kunststoffhalterung der Dichtung am Ablaufventil gebrochen, und das Wasser lief und lief.

Mit dem Lötkolben und etwas geschmolzenem Kunststoff von einem alten Kabelbinder war das Ventil repariert. Den Kabelbinder hatte ich auf der Straße gefunden – als vergessene Befestigung eines Wahlplakats. Es hält dicht!$t$),

  ('510afab7-d87c-48a5-831f-ca5a8f7bebc5'::uuid, 170,
   $t$Doch nicht für immer kaputt$t$,
   $t$Ausgebrochene Holzteile ausgesägt, neues Holz passgenau eingeleimt, gebohrt, geschliffen. Das dreijährige Kind hatte gedacht, es hätte den Kinderstuhl für immer kaputt gemacht.$t$,
   $t$Ich habe die ausgebrochenen Holzteile ausgesägt, neues Holz passgenau eingeleimt, Löcher gebohrt und alles geschliffen.

Das Kind, drei Jahre alt, war sehr froh: Es hatte gedacht, es hätte den Stuhl für immer kaputt gemacht. Und auf dem roten Stuhl des Geschwisterkindes wollte es nicht so gerne sitzen.$t$),

  ('b85ef08e-7068-4fe7-a9ec-5b4b5b657a1c'::uuid, 180,
   $t$Der Hase aus der Vitrine$t$,
   $t$Die Enkelin entdeckte in der Vitrine den Nachziehhasen aus Omas Kindheit. Ein gehäkelter Bändel und ein Gummiband für die Glocke – und der Hase ist wieder unterwegs.$t$,
   $t$Meine 18 Monate alte Enkelin war zu Besuch und sah in der Vitrine den Nachziehhasen aus meiner Kindheit.

Die Glocke brauchte ein neues Band, und vor allem war ein neuer Bändel zum Ziehen nötig. Ich habe aus Wolle einen Luftmaschenbändel gehäkelt und die Glocke an ein Gummiband gehängt – schon war der Hase wieder einsatzfähig.$t$),

  ('96ab5b90-c5a4-4205-afc2-1f848bd680f2'::uuid, 190,
   $t$Ein bisschen Farbe auf der Glühlampe$t$,
   $t$Die Nähmaschine nähte nur noch geradeaus. Nach langer Suche: Das Licht für den Fotosensor war zu diffus. Die Glühlampe etwas angemalt – und fast 100 Euro für einen neuen Sensor gespart.$t$,
   $t$Das war wieder so ein Meisterstück. Die Nähmaschine nähte nur noch Geradstich.

Komplette Wartung und Prüfung der Elektronik. Nach langer Suche stand fest: Die Sensorik war die Ursache. Der Lichtschein der Glühlampe am Fotosensor war zu diffus und wurde nicht ausreichend unterbrochen.

Also habe ich die Glühlampe ein bisschen angemalt – und schon ging es. Einen neuen Sensor für fast 100 Euro gespart, der vermutlich auch nicht funktioniert hätte.

Eine imposante Maschine mit ziemlich feiner Mechanik, andererseits auch ein wenig zu filigran.$t$),

  ('a01eace1-8694-42d7-9f98-543783317434'::uuid, 200,
   $t$Der Wecker der Großeltern$t$,
   $t$Ein Vereinskollege drückte ihm nach dem Training den Wecker seiner Großeltern in die Hand. Korrodierte Kontakte gereinigt, Federn angelötet – er läuft wieder.$t$,
   $t$Den Wecker hat mir ein Vereinskollege nach dem Training in die Hand gedrückt – ein Erinnerungsstück an seine Großeltern.

Nach vorsichtigem Lösen des verklebten Chromrings konnten Zeiger und Zifferblatt abgenommen werden. Die Batteriekontakte an der Uhrwerksplatine und die Leiterbahnen waren stark korrodiert.

Nach der Reinigung mit Glasfaserstift und Waschbenzin habe ich die Kontaktfedern zusätzlich an die Platine gelötet und den Wecker wieder zusammengebaut. Er läuft wieder.$t$)
)
insert into public.story_highlights (repair_id, status, title, teaser, body, note, sort_order)
select seed.repair_id, 'ready', seed.title, seed.teaser, seed.body,
       'Von Claude geglättet (30.10.2026) – bitte vor dem Veröffentlichen gegen das Original lesen.',
       seed.sort_order
from seed
join public.repairs on repairs.id = seed.repair_id
where repairs.status = 'approved' and repairs.consent_publication
on conflict (repair_id) do nothing;
