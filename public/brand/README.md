# Markenassets

Quelle: `Weltrekord_Styleguide/WR_Styleguide_v1` (PDF und PPTX) mit den Ordnern
`WR_Assets` und `WR_Photos`.

## Was hier liegt

| Datei | Herkunft | Verwendung |
| --- | --- | --- |
| `qr-reparatur.svg` | aus `WR_Asset2.svg` extrahiert | QR-Block im Poster-Hero, verweist auf `reparatur.fab-bergisch.org` |
| `festival-lettering.svg` | `WR_Asset6.svg` | Quelldatei, nicht im Web eingebunden |
| `weltrekord-lettering.svg` | `WR_Asset8.svg` | Quelldatei, nicht im Web eingebunden |
| `festival-poster.svg` | `WR_Asset1.svg` | Quelldatei fuer Print |
| `weltrekord-poster.svg` | `WR_Asset2.svg` | Quelldatei fuer Print |

## Warum die Lettering-SVGs nicht eingebunden sind

Die vier Original-SVGs enthalten **lebenden Text** in `Nunito-Black` statt in Pfade
konvertierter Buchstaben. Ein `<img src="...svg">` laedt keine Webfonts, deshalb wuerde
der Schriftzug im Browser mit einer Fallback-Serif rendern und falsch aussehen.

Die Aufkleber-Headlines sind daher in HTML und CSS nachgebaut (`.sticker-head` in
`app/globals.css`, siehe `design.md` Abschnitt 7.1). Das ist responsiv, als echter Text
vorlesbar und nutzt Nunito 900 aus Google Fonts — genau die Schrift, die auch die
Plakatvorlage im Styleguide verwendet.

Wenn die SVGs als Bild gebraucht werden: im Grafikprogramm Text in Pfade umwandeln
und die Datei danach hier ersetzen.

## Schriften

- **Nunito** ist die offizielle Projektschrift, frei nutzbar, kommt aus Google Fonts.
- **FreightDisp Pro** ist die Display-Serif des Styleguides und liegt bei Adobe Fonts.
  Der Font-Stack in `app/globals.css` lautet
  `"FreightDisp Pro", "Playfair Display", Georgia, serif`. Solange kein Adobe-Kit
  eingebunden ist, greift Playfair Display. Sobald das Kit im `<head>` liegt, wirkt
  FreightDisp Pro automatisch, ohne Codeaenderung.

## Bildwelt

Die Fotos liegen web-optimiert in `public/photos/` und werden zentral in
`lib/brand-photos.ts` mit Alt-Text und Credit gefuehrt. Laut Styleguide steht der
Urheberhinweis im Dateinamen; das ist beim Umbenennen erhalten geblieben.

| Datei | Credit |
| --- | --- |
| `werkstatt-pexels-cottonbro-4482005.jpg` | Foto: cottonbro studio / Pexels |
| `fahrrad-pexels-cottonbro-10505928.jpg` | Foto: cottonbro studio / Pexels |
| `weiterverwenden-pexels-wolrider-33087361.jpg` | Foto: Wolrider / Pexels |
| `zweites-leben-ki-generiert.jpg` | Bild: KI-generiert |
| `gemeinsam-feiern-ki-generiert.jpg` | Bild: KI-generiert |
