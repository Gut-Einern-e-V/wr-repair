# Neuen Blog-Eintrag (Reparaturgeschichte) anlegen

Jede Geschichte ist **eine Markdown-Datei in diesem Ordner**. Es braucht keinen
Datenbank- oder Supabase-Zugang und keinen Login im Backend: Datei anlegen,
committen, deployen – fertig.

Die Geschichten erscheinen automatisch

- als Kachel im Mosaik auf der Startseite (Abschnitt „Reparaturgeschichten“),
- in der Übersicht unter `/stories`,
- als eigene Seite unter `/stories/<dateiname-ohne-md>`.

## 1. Datei anlegen

Dateiname = Adresse der Seite (Slug). Also **klein schreiben, Wörter mit
Bindestrich trennen, keine Umlaute und keine Leerzeichen**:

| Titel                       | Dateiname                          | Adresse                             |
| --------------------------- | ---------------------------------- | ----------------------------------- |
| Ein Stuhl mit zweitem Leben | `stuhl-mit-zweitem-leben.md`       | `/stories/stuhl-mit-zweitem-leben`  |
| Nähmaschine läuft wieder    | `naehmaschine-laeuft-wieder.md`    | `/stories/naehmaschine-laeuft-wieder` |

Der Dateiname darf sich später nicht mehr ändern, sonst laufen geteilte Links
ins Leere.

**Entwürfe:** Eine Datei mit führendem Unterstrich (`_entwurf-naehmaschine.md`)
wird übersprungen und erscheint nirgends. So kann ein Text im Repository liegen,
ohne veröffentlicht zu sein. Zum Veröffentlichen den Unterstrich entfernen.

## 2. Kopfdaten (Frontmatter)

Die Datei beginnt mit einem Block zwischen zwei `---`-Zeilen. **Alle fünf Felder
sind Pflicht** – fehlt eines, bricht der Build mit einer Fehlermeldung ab.

```md
---
title: Nähmaschine läuft wieder
summary: Ein gerissener Riemen, ein Nachmittag im Repair Café und ein Gerät, das seine Besitzerin behalten darf.
category: Anderes
date: 2026-10-14
readingTime: 3 min
image: naehmaschine-laeuft-wieder.jpg
imageAlt: Eine geöffnete Nähmaschine steht auf einem Werktisch, daneben liegt der gerissene Riemen.
imageCredit: Foto: Repair Café Wuppertal
---
```

| Feld          | Bedeutung                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------- |
| `title`       | Überschrift der Geschichte. Kurz halten, sie steht groß auf der Kachel.                        |
| `summary`     | Ein Satz als Anreißer. Erscheint auf der Kachel und über dem Artikel.                          |
| `category`    | Frei wählbar, am besten eine der Kategorien aus dem Einreichungsformular (siehe unten).        |
| `date`        | Veröffentlichungsdatum im Format `JJJJ-MM-TT`. Sortiert die Übersicht, neueste Geschichte oben.|
| `readingTime` | Geschätzte Lesedauer, z. B. `3 min`.                                                           |

Die drei Bildfelder sind **freiwillig** (siehe Abschnitt „Bilder“):

| Feld           | Bedeutung                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| `image`        | Aufmacherbild. Dateiname aus `public/stories/`.                                             |
| `imageAlt`     | Bildbeschreibung für Menschen, die das Bild nicht sehen können. Bei `image` bitte ausfüllen.|
| `imageCredit`  | Bildnachweis, z. B. `Foto: Repair Café Wuppertal`. Gilt für alle Bilder der Geschichte.     |

Umlaute und `ß` bitte direkt schreiben (`Nähmaschine`, nicht `Naehmaschine`).
Die Dateien sind UTF-8.

Kategorien aus dem Formular (`lib/repair-catalog.ts`): Anderes, Computer und
Zubehör/Handys, Fahrrad, Foto-/Video und Autogerät, Haushaltsgeräte, Möbel,
Schärfen/Schleifen, Schmuck/Brillen, Spielzeug, Textilien, Uhren, Werkzeug.

## 3. Text schreiben

Unter dem Frontmatter folgt der Text. Der Parser (`lib/stories.ts`) ist bewusst
schlicht und kennt genau drei Bausteine. **Absätze werden immer durch eine
Leerzeile getrennt.**

```md
Der erste Absatz steht direkt unter dem Frontmatter und ist der Einstieg in die
Geschichte.

## Zwischenüberschrift

Weiterer Absatz. Einzelne Zeilenumbrüche innerhalb eines Absatzes werden zu
Leerzeichen zusammengezogen – der Absatz fließt also.

- Erster Listenpunkt
- Zweiter Listenpunkt
- Dritter Listenpunkt
```

Was **nicht** unterstützt wird: `#` (die H1 kommt aus `title`), `###` und
tiefer, Fettung/Kursiv, Links, Tabellen, Zitate, Code-Blöcke. Solche Zeichen
erscheinen als normaler Text. Wer mehr braucht, muss `parseBlocks()` in
`lib/stories.ts` erweitern.

## 4. Bilder

Bilder liegen **im Repository**, im Ordner `public/stories/`. Es braucht also
weder ein Admin-Panel noch einen Bilderdienst: Bild in den Ordner legen,
Dateinamen eintragen, zusammen mit dem Text committen. Ein extra Deploy
entsteht dadurch nicht – die Geschichte selbst braucht ohnehin einen.

Bilder von außerhalb (z. B. an ein GitHub-Issue angehängte Dateien) gehen
bewusst nicht: Sie können verschwinden, während der Text stehen bleibt, und
lägen außerhalb der Versionsverwaltung.

### Aufmacherbild

Steht im Frontmatter und erscheint auf der Kachel, in der Übersicht, oben im
Artikel und als Vorschaubild beim Teilen:

```md
image: naehmaschine-laeuft-wieder.jpg
imageAlt: Eine geöffnete Nähmaschine steht auf einem Werktisch.
imageCredit: Foto: Repair Café Wuppertal
```

Ohne `image` greift wie bisher die Markenbildwelt (`lib/brand-photos.ts`),
reihum nach Position in der Liste. Ein Motiv von dort lässt sich auch direkt
angeben, dann mit führendem Schrägstrich: `image: /photos/dateiname.jpg`.

### Bilder im Text

Ein Bild mitten im Text steht **allein in seinem Absatz**, in der üblichen
Markdown-Schreibweise. Die Bildunterschrift ist freiwillig und steht in
Anführungszeichen dahinter:

```md
![Der gerissene Riemen liegt neben der Maschine.](naehmaschine-riemen.jpg)

![Nahaufnahme des neuen Riemens.](naehmaschine-neu.jpg "Der neue Riemen sitzt.")
```

Der Bildnachweis aus `imageCredit` erscheint auch unter diesen Bildern.

### Worauf zu achten ist

- **Beschreibung nicht vergessen.** Der Text in den eckigen Klammern bzw. in
  `imageAlt` wird vorgelesen, wenn das Bild nicht sichtbar ist.
- **Rechte klären.** Nur Bilder verwenden, die veröffentlicht werden dürfen.
  Sind Personen erkennbar, braucht es deren Einverständnis.
- **Datei klein halten.** Höchstens rund 1600 Pixel an der langen Kante, unter
  500 KB. Details stehen in `public/stories/README.md`.
- **Tippfehler brechen den Build ab.** Fehlt die Datei, meldet `npm run build`
  genau, welches Bild in welcher Geschichte nicht gefunden wurde.

## 5. Prüfen und veröffentlichen

```bash
npm run dev
```

Dann `http://localhost:3000/stories` und die eigene Seite aufrufen. Vor dem
Commit zusätzlich:

```bash
npm run build
```

Der Build meldet fehlende Frontmatter-Felder und legt die neue Route an.

Danach committen und pushen. Der Deploy auf Vercel baut die Seiten neu – die
Startseite ist statisch vorgerendert, die neue Kachel ist also ab dem
abgeschlossenen Deploy da, ohne zusätzliche Anfragen im Browser.

## Mosaik auf der Startseite

Das Mosaik zeigt sechs Kacheln. Solange es weniger Geschichten gibt, bleiben
freie Kacheln mit „Hier entsteht das nächste Kapitel“ stehen – die Übersicht
füllt sich also über den Aktionszeitraum. Ab sieben Geschichten wiederholt sich
das Raster; die Zahl der Kacheln steht als `MOSAIC_SLOTS` in
`components/story-mosaic.tsx`.
