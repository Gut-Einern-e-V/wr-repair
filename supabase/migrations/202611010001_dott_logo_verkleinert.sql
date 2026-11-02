-- Issue #174: Das DOTT-Logo war ein PNG mit 22.521 x 7.496 Pixeln. Der
-- Bildoptimierer lehnt diese Groesse ab und liefert das Original aus; iPhones
-- muessen es zum Anzeigen auf rund 675 MB entpacken, und der Tab stuerzt ab,
-- sobald die Partnerleiste im Footer laedt. Die Datei liegt jetzt auf
-- 1200 Pixel Breite verkleinert unter neuem Namen im Bucket `partner-logos`.
update public.partners
set logo_path = 'eb4f29d8-166f-4428-941b-a7391833266a.png'
where logo_path = 'a23d4e6d-7ed6-4c5d-b746-32f0c34a258a.png';
