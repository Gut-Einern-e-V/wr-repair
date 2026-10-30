-- Kurz-Highlights fuer die Festivalbuehne am 31.10.2026.
--
-- Kurze Einreichungen mit Pointe. Die neun mit Foto stehen als `ready` auf
-- der Buehne, hinter den langen Geschichten (Reihenfolge ab 210). Die fuenf
-- ohne Foto bleiben `candidate` im Eimer: Ohne Foto zeigt die Buehne nichts.
--
-- Wie in 202610300002 nur fuer freigegebene Reparaturen mit Zustimmung, und
-- ohne bestehende Highlights anzufassen.

with seed (repair_id, status, sort_order, title, teaser, body) as (values
  ('5b20f280-a8c7-4c45-b05b-29105a818598'::uuid, 'ready', 210,
   $t$Ratte gegen Hochdruckreiniger$t$,
   $t$Eine Ratte hat die Leitung zum Druckschalter durchgefressen. Leitung getauscht – der Kärcher läuft wieder.$t$,
   $t$Die Leitung zum Druckschalter des Hochdruckreinigers hatte eine Ratte durchgefressen. Ich habe sie ausgetauscht, und das Gerät läuft wieder.$t$),
  ('9283ee21-2001-4648-8499-787fd265574d'::uuid, 'ready', 220,
   $t$Die Säge wollte keiner testen$t$,
   $t$Die Kettensäge ist repariert. Nur an unseren Möbeln wollte sie niemand ausprobieren.$t$,
   $t$Die Kettensäge ist repariert. An unseren Möbeln wollte allerdings keiner die Säge testen …$t$),
  ('dce95dd6-aa01-4f3d-bf71-88238fa32818'::uuid, 'ready', 230,
   $t$Das gefährliche Stoffmonster$t$,
   $t$Offene Nähte zugenäht. Das Monster hat nicht angegriffen.$t$,
   $t$Beim Repair Café wurden die offenen Nähte des Stoffmonsters genäht. Es hat nicht angegriffen.$t$),
  ('1ebaddcf-befb-4d23-9be4-284032f7a357'::uuid, 'ready', 240,
   $t$Der Knopf aus der nächsten Wäsche$t$,
   $t$Der Schlafanzugknopf war weg – und tauchte erst in der folgenden Waschmaschinenladung wieder auf. Jetzt sitzt er wieder.$t$,
   $t$Den Knopf meines Schlafanzugs habe ich erst in der folgenden Waschmaschinenladung wiedergefunden. Jetzt ist er wieder angenäht.$t$),
  ('0b66d43f-a522-40e9-a4dc-728b33adef09'::uuid, 'ready', 250,
   $t$Eine Straßenbahn in 1:87, jetzt mit Licht$t$,
   $t$Das Modell eines Düsseldorfer Vierachser-Triebwagens bekam bei der Reparatur gleich Scheinwerfer, Innenbeleuchtung und Rücklicht dazu.$t$,
   $t$Fummelige Arbeit am Modell eines Düsseldorfer Vierachser-Triebwagens im Maßstab 1:87. Dabei habe ich zusätzlich Scheinwerfer, Innenbeleuchtung und Rücklicht eingebaut.$t$),
  ('f7d47e21-0678-4060-89b8-193ba131d85a'::uuid, 'ready', 260,
   $t$LEGO-Fernbedienungen im Essigbad$t$,
   $t$Zwei Fernbedienungen für LEGO Power Functions mit oxidierten Kontakten: mehrere Stunden in Essig eingeweicht, gereinigt, funktionieren wieder.$t$,
   $t$Die Kontakte von zwei LEGO-Power-Functions-Fernbedienungen waren oxidiert. Ich habe sie mehrere Stunden in Essig eingeweicht und gereinigt.$t$),
  ('58d8ee7c-eaef-4376-aedc-4a1c8b424971'::uuid, 'ready', 270,
   $t$Der Radiowecker des Vaters$t$,
   $t$Ein alter Grundig Sonoclock mit kalter Lötstelle. Nachgelötet – er weckt wieder.$t$,
   $t$Der alte Radiowecker des Vaters hatte eine kalte Lötstelle. Nachgelötet, er funktioniert wieder.$t$),
  ('63a671f7-d37e-47df-891d-ad5426447d05'::uuid, 'ready', 280,
   $t$Kompressor, Baujahr 1974$t$,
   $t$Der über 50 Jahre alte Kompressor zog extrem viel Strom. Neuer Motorkondensator, und er arbeitet wieder.$t$,
   $t$Der Kompressor von 1974 hatte einen extremen Stromverbrauch. Der Motorkondensator wurde ersetzt.$t$),
  ('3a017f24-4b82-4749-95e6-521984642608'::uuid, 'ready', 290,
   $t$Hält noch mal 20 Jahre$t$,
   $t$Der Kinderhochstuhl wackelte. Unten neu verleimt – und bereit für die nächste Generation.$t$,
   $t$Den Kinderhochstuhl unten neu verleimt. Hält noch mal 20 Jahre.$t$),

  ('d8e4af69-dde6-4888-8dff-ec209c6a463b'::uuid, 'candidate', 300,
   $t$Der Welpe und das Fernsehkabel$t$,
   $t$Der Welpe hat auf dem Kabel des Fernsehers gekaut. Kabel erneuert, der Fernseher läuft wieder.$t$,
   $t$Das Kabel vom Fernseher habe ich erneuert, weil der Welpe darauf gekaut hat.$t$),
  ('a744ead0-847e-4f7e-81fb-3b2ae37c88fe'::uuid, 'candidate', 310,
   $t$Begegnung mit der Brombeerhecke$t$,
   $t$Ein Winkelriss im Ärmel der Daunenjacke, Andenken an eine Brombeerhecke. Jetzt ist er zu.$t$,
   $t$Den Winkelriss im Ärmel meiner Daunenjacke – Andenken an eine Begegnung mit einer Brombeerhecke – habe ich verschlossen.$t$),
  ('7e917caa-a829-46db-8abb-be6772de116e'::uuid, 'candidate', 320,
   $t$Die Vögel zwitschern wieder$t$,
   $t$Bei der Schwarzwalduhr wurden Uhrwerk und zwitschernde Vögel eingestellt und geklebt.$t$,
   $t$Uhrwerk und zwitschernde Vögel der Schwarzwalduhr eingestellt und geklebt.$t$),
  ('c5861fbe-838b-4e0c-a21a-9fb00b11c36e'::uuid, 'candidate', 330,
   $t$Aus zwei mach eins$t$,
   $t$Aus zwei alten Heißluftfritteusen wurde eine, die funktioniert.$t$,
   $t$Ich habe aus zwei älteren Heißluftfritteusen eine funktionierende Maschine zusammengesetzt.$t$),
  ('48fb9b54-f59e-4bb9-8ddd-b141ee5535c4'::uuid, 'candidate', 340,
   $t$Die Kornmühle, 40 Jahre alt$t$,
   $t$Eine 40 Jahre alte Kornmühle wurde gereinigt und bekam einen neuen Kondensator.$t$,
   $t$Eine 40 Jahre alte Kornmühle wurde gereinigt und der Kondensator erneuert.$t$)
)
insert into public.story_highlights (repair_id, status, title, teaser, body, note, sort_order)
select seed.repair_id, seed.status, seed.title, seed.teaser, seed.body,
       case when seed.status = 'ready'
         then 'Kurz-Highlight, von Claude geglättet (30.10.2026) – bitte gegenlesen.'
         else 'Kurz-Highlight ohne Foto – nicht für die Bühne. Von Claude geglättet (30.10.2026).'
       end,
       seed.sort_order
from seed
join public.repairs on repairs.id = seed.repair_id
where repairs.status = 'approved' and repairs.consent_publication
on conflict (repair_id) do nothing;
