# App-Icons

Alles hier kommt aus `scripts/build-icons.mjs`. Grundform ist das geometrische R
aus dem `.brand-mark` im Header - gelbe Flaeche (`--yellow`), Ink-R (`--ink`),
leicht nach links gekippt.

## Drei installierbare Apps

Die Seite ist dreimal installierbar (siehe `lib/app-manifests.ts`). Jede App
braucht ein eigenes Icon, sonst liegen auf dem Startbildschirm mehrere
ununterscheidbare Verknuepfungen.

| App | Icon | Motiv |
| --- | --- | --- |
| Hauptseite | `../../app/icon.svg`, `icon-*.png` | R auf `--yellow` |
| Eintragung | `eintragen-icon*` | Plus auf `--mint` |
| Moderation | `moderator-icon*` | R auf `--ink`, in Millimeterpapier, in die Flaeche gepraegt |

Je App gibt es `-192`/`-512` fuer `purpose: "any"` und `-maskable-192`/`-512`
fuer `purpose: "maskable"`, dazu ein `apple-icon.png` in der jeweiligen Route.

| Datei | Zweck |
| --- | --- |
| `../../app/icon.svg` | Browser-Tab, Lesezeichen (auf allen Seiten) |
| `../../app/apple-icon.png` | iOS-Pin der Hauptseite (180x180; Next akzeptiert hier kein SVG) |
| `../../app/<route>/apple-icon.png` | iOS-Pin dieser Route |
| `shortcut-*.svg`, `shortcut-*-192.png` | Symbole der Manifest-Shortcuts |

## Der Inlay-Schatten des Moderations-R

Der Buchstabe wird mehrfach uebereinander gelegt, jede Lage etwas weiter nach
unten rechts und heller, alle ausser der untersten auf die Silhouette geklippt.
Uebrig bleibt ein Schattensaum an der oberen linken Innenkante - Schatten dort,
wo das Licht herkommt, heisst: die Form liegt tiefer.

Der Saum ist **abgestuft**, nicht einfarbig. Ein einfarbiges Band gleicher Breite
liest sich als Seitenwand, und der Buchstabe wirkt dann herausgestellt statt
eingelegt; das war der erste Versuch und sah nach 3D-Block aus. Bewusst
`clipPath` statt `feOffset`/`feGaussianBlur`: SVG-Filter rendern je Renderer
unterschiedlich.

## Warum zwei Varianten je App

Android legt ueber installierte App-Icons eine adaptive Maske - je nach Launcher
Kreis, Squircle oder Rundrechteck. Garantiert sichtbar ist nur die **Safe Zone**:
ein zentrierter Kreis mit 80% des Kantenmasses. Die maskable-Variante haelt das R
komplett darin (halbe Diagonale 24,4 von 25,6 bei 64er-Raster), die
`any`-Variante darf groesser sein, weil Tab und iOS die ganze Flaeche zeigen.

Beide Varianten sind randlos gelb. Vorher hatte `app/icon.svg` eine dunkle
Flaeche mit einem gelben Aufkleber darauf und ein Ink-R, das unten aus dem
Aufkleber herausragte - auf dunklem Grund also unsichtbar. Im Launcher sah das
nach schwarzem Hintergrund mit abgeschnittenem R aus (Issue #43).

## Shortcut-Icons

Die Shortcuts in `app/manifest.ts` haben absichtlich eigene Symbole statt des R:
Android nimmt sonst das App-Icon, und dann sehen alle angepinnten
Verknuepfungen auf dem Startbildschirm gleich aus.

| Symbol | Farbe | Ziel |
| --- | --- | --- |
| Plus | `--mint` | `/mitmachen` |
| Balken | `--red` | `/stats` |
| Kartennadel | `--blue` | `/repair-cafes` |

Shortcut-Icons maskiert Android immer rund - anders als beim App-Icon gibt es
hier keine `any`-Variante. Alle drei Symbole bleiben daher innerhalb der Safe
Zone (Abstand vom Mittelpunkt hoechstens 25,6 im 64er-Raster).

## Neu rechnen

Beim Aendern von Form oder Farbe die PNGs neu erzeugen, damit sie nicht vom SVG
abweichen:

    node scripts/build-icons.mjs
