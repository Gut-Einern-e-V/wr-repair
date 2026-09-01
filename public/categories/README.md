# Motive der Reparaturkategorien

Hier liegt je Kategorie ein freigestelltes Bild. Es erscheint auf den
Kategorie-Kacheln der Startseite, im Danke-Bildschirm nach dem Eintragen, auf
der Statusseite einer Reparatur ohne Foto, in der Moderation und auf der
Bühne unter `/stats`.

## Dateiname

Der Dateiname ist der **Kategoriewert** aus `lib/repair-catalog.ts`, nicht die
Beschriftung:

| Kategorie                   | Datei                          |
| --------------------------- | ------------------------------ |
| Anderes                     | `other.png`                    |
| Computer und Zubehör/Handys | `computers_and_phones.png`     |
| Fahrrad                     | `bicycle.png`                  |
| Foto-/Video und Autogerät   | `photo_video_car.png`          |
| Haushaltsgeräte             | `household_appliances.png`     |
| Möbel                       | `furniture.png`                |
| Schärfen/Schleifen          | `sharpening.png`               |
| Schmuck/Brillen             | `jewelry_glasses.png`          |
| Spielzeug                   | `toys.png`                     |
| Textilien                   | `textiles.png`                 |
| Uhren                       | `watches.png`                  |
| Werkzeug                    | `tools.png`                    |

## Anforderungen an die Datei

- **PNG mit Transparenz.** Kein weißer Kasten – das Motiv sitzt auf einer
  hellen Platte, die die Seite selbst zeichnet, und ein mitgelieferter weißer
  Hintergrund würde darüber hinausragen.
- **Quadratisch, 512 × 512 Pixel.** Alle Motive gleich groß, damit dieselbe
  Datei überall in denselben Rahmen passt. Die Zahl steht als
  `MOTIF_SOURCE_SIZE` in `lib/category-motifs.ts`.
- **Motiv mittig, mit etwas Luft am Rand.** Es wird auf 84 % der Plattenbreite
  gezeigt.
- **Unter 150 KB.** Die Startseite lädt zwölf davon, und die Moderation läuft
  am Handy im Repair Café.

## Eintragen

Eine Datei allein reicht nicht – ihr Kategoriewert muss zusätzlich in
`categoriesWithMotif` in `lib/category-motifs.ts` stehen. Der Grund steht dort
im Kommentar: Die Motive werden in Client-Komponenten gebraucht, die zur
Laufzeit nicht in diesen Ordner sehen können.

Eine Kategorie ohne Eintrag fällt automatisch auf die Strichzeichnung aus
`components/category-pictogram.tsx` zurück, im selben Rahmen. Es darf also
erst ein Teil der Motive vorliegen.

`npm test` prüft beide Richtungen: dass jede eingetragene Kategorie eine Datei
hat und dass keine Datei ohne Eintrag herumliegt.
