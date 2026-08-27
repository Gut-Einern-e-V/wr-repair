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
---
```

| Feld          | Bedeutung                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------- |
| `title`       | Überschrift der Geschichte. Kurz halten, sie steht groß auf der Kachel.                        |
| `summary`     | Ein Satz als Anreißer. Erscheint auf der Kachel und über dem Artikel.                          |
| `category`    | Frei wählbar, am besten eine der Kategorien aus dem Einreichungsformular (siehe unten).        |
| `date`        | Veröffentlichungsdatum im Format `JJJJ-MM-TT`. Sortiert die Übersicht, neueste Geschichte oben.|
| `readingTime` | Geschätzte Lesedauer, z. B. `3 min`.                                                           |

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
tiefer, Fettung/Kursiv, Links, Bilder, Tabellen, Zitate, Code-Blöcke. Solche
Zeichen erscheinen als normaler Text. Wer mehr braucht, muss `parseBlocks()` in
`lib/stories.ts` erweitern.

## 4. Bilder

Geschichten bringen **keine eigenen Bilder** mit. Die Kacheln und Karten nutzen
automatisch die Motive aus der Markenbildwelt (`lib/brand-photos.ts`), reihum
nach Position in der Liste. Ein neues Motiv also dort ergänzen, nicht in der
Markdown-Datei.

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
