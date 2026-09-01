# Motive der Reparaturkategorien

> **Zurzeit stehen hier Platzhalter.** Sie zeigen dasselbe Strichzeichen wie
> die Oberfläche selbst und sind mit `node scripts/build-category-motifs.mjs`
> erzeugt. Sie sind da, damit die Bildstrecke vollständig steht — ersetzt
> werden sie durch die gerenderten Motive, siehe unten.

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

## Einen Platzhalter ersetzen

Die neue Datei über die alte legen, gleicher Name. Mehr ist nicht zu tun: Alle
zwölf Kategorien stehen bereits in `categoriesWithMotif` in
`lib/category-motifs.ts`, und die Rahmen in der Oberfläche haben schon ihre
endgültige Größe.

`npm test` prüft beide Richtungen: dass jede eingetragene Kategorie eine Datei
hat und dass keine Datei ohne Eintrag herumliegt.

## Eine Kategorie ohne Datei

Fehlt eine Datei und steht ihr Wert nicht in `categoriesWithMotif`, zeigt die
Oberfläche im selben Rahmen die Strichzeichnung aus
`components/category-pictogram.tsx`. Es darf also auch nur ein Teil der Motive
vorliegen — der Grund für die Liste steht dort im Kommentar: Die Motive werden
in Client-Komponenten gebraucht, die zur Laufzeit nicht in diesen Ordner sehen
können.

## Platzhalter neu erzeugen

```bash
node scripts/build-category-motifs.mjs
```

Das Skript überschreibt **alle** zwölf Dateien mit dem Strichzeichen. Nach dem
Einsetzen echter Motive also nicht mehr aufrufen, sonst sind sie wieder weg.
