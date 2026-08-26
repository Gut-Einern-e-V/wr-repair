# Design System: FAB Region Reparaturplattform

Status: v1 (MVP-ready)
Scope: Landing, Upload, Moderation, Blog, statische Seiten

## 1. Designziele
- Mobile-first, klare Lesbarkeit, hoher Kontrast.
- Brutalistisch modern: harte Kanten, klare Flaechen, starke Typografie.
- Dribbble-tauglich: visuell eigenstaendig, keine generische SaaS-Optik.
- Kein AI-Startup-Look: keine weichen Glassmorphism-Effekte, keine Schattenwolken.
- Barrierearm: sichtbare Fokuszustande, robuste Tastatur-Navigation, semantische Hierarchie.

## 2. Markenhaltung
- Tonalitaet: direkt, offen, gemeinschaftlich, aktivierend.
- Visuelle Sprache: plakativ, kontrastreich, kantig.
- Kernmotiv: Reparatur als kollektiver Fortschritt.

## 3. Designprinzipien
1. Kontrast vor Dekoration.
2. Raster vor Freiform.
3. Typografie als Primar-Identitaet.
4. Farbe mit klarer Funktion (Status, Navigation, Highlight).
5. Motion nur mit Zweck (Feedback, Orientierung, Fortschritt).
6. Detail verliebt und leicht verspielt, aber nie ablenkend.
7. Keine Emojis oder generische Icons als UI-Elemente. Nur funktionale Icons, die den Inhalt unterstuetzen.
8. Schöne Illustrationen in Fineline-Ästhetik, aber nie als Ersatz fuer UI-Elemente.
9. Keine Vollfarben als Hintergrund fuer grosse Flaechen. Nur subtile Gradients oder Texturen.
10. Farben sollen nicht vollfarben sein, sondern leicht entsaettigt, um die Augen zu schonen und den Fokus auf Inhalte zu lenken.

## 4. Farb-Tokens
Quelle: `Weltrekord_Styleguide/WR_Styleguide_v1` (Seite "Farbepalette"). Die kanonischen
HEX-Werte stehen im Styleguide, die entsaettigten Varianten stammen von der Swatch-Seite
und sind fuer grosse Flaechen gedacht (siehe Prinzip 10).

```css
:root {
  /* Hauptfarben */
  --ink: #101626;        /* Textfarbe, Rahmen, dunkle Flaechen */
  --bg: #efece5;         /* Papier, Grundflaeche der Seite */
  --paper: #f7f5f0;      /* angehobene Flaeche auf --bg */
  --yellow: #ffc432;     /* Primaerfarbe: CTA, Aufkleber, Infobereiche */
  --mint: #95d4bb;       /* Sekundaerfarbe: Aufkleber, Diagramme */
  --green: #00b072;      /* Akzent */

  /* Entsaettigte Varianten fuer grosse Flaechen */
  --yellow-soft: #f4bd4c;
  --mint-soft: #b4e0cc;
  --green-soft: #24b475;
  --red: #ec424c;        /* nur Fehler und Ablehnen */
  --red-deep: #c2202b;
  --blue: #465eab;       /* Links und Fokusring */

  /* Funktion */
  --muted: #5b6072;
  --line: 2px solid var(--ink);
  --hairline: 1px solid rgba(16, 22, 38, 0.22);
}
```

Regeln:
- Gelb ist die Primaerfarbe. Primaerbuttons und der Live-Zaehler-Block sind gelb mit Ink-Text.
- Rot ist reserviert fuer Fehlerzustaende und die Ablehnen-Aktion in der Moderation.
- Auf hellem Grund traegt Gelb keinen Text. Kicker und Labels stehen dort in `--ink`
  oder `--muted`, Gelb nur als Flaeche oder auf dunklem Grund.
- Kontrast geprueft: Ink auf Gelb 10.6:1, Ink auf Mint 10:1, Blau auf Papier 5.4:1.
  Rot auf Papier erreicht nur 3.3:1 und ist deshalb kein Fliesstext.

## 5. Typografie-Tokens
Vorgabe aus dem Styleguide: **Nunito** ist die offizielle Projektschrift und frei
verwendbar. **FreightDisp Pro** ist die Display-Serif und liegt bei Adobe Fonts.
Solange kein Adobe-Kit eingebunden ist, greift Playfair Display als Ersatz; der
Font-Stack ist so gebaut, dass ein spaeter ergaenztes Kit ohne Codeaenderung wirkt.

```css
:root {
  --sans: "Nunito", "Segoe UI", system-ui, sans-serif;
  --display: "FreightDisp Pro", "Playfair Display", Georgia, serif;

  --text-xs: clamp(0.75rem, 0.72rem + 0.12vw, 0.82rem);
  --text-sm: clamp(0.88rem, 0.84rem + 0.14vw, 0.95rem);
  --text-md: clamp(1rem, 0.96rem + 0.20vw, 1.1rem);
  --text-lg: clamp(1.25rem, 1.14rem + 0.40vw, 1.5rem);
  --text-xl: clamp(1.6rem, 1.4rem + 0.9vw, 2.2rem);
  --text-2xl: clamp(2.1rem, 1.7rem + 1.8vw, 3.4rem);

  --lh-tight: 1.12;
  --lh-body: 1.5;
  --lh-loose: 1.7;

  --ls-tight: -0.03em;
  --ls-normal: 0;
  --ls-wide: 0.04em;
}
```

Typo-Regeln:
- h1 und h2 sind Nunito 900 in Versalien. Das ist die Plakatstimme der Marke.
- h3 bis h6 bleiben gemischt gesetzt, damit laengere Titel lesbar bleiben.
- Fliesstext ist Nunito 400 mit `--lh-body`.
- Die Display-Serif ist Statements vorbehalten (Bannerzeilen, Artikel-Lead).
  Sie ersetzt nie UI-Text und nie eine Headline im Aufkleber.
- Labels, Buttons und Navigation: Nunito 800, Versalien, `letter-spacing` .07em bis .09em.
- Zahlen (Counter, Stats, Countdown): Nunito 900 mit `font-variant-numeric: tabular-nums`
  und `letter-spacing: -.04em`.
- Nutze h1 bis h6 semantisch, aber nur h1 bis h3 fuer sichtbare Headlines.

## 6. Layout- und Spacing-Tokens
```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;

  --radius-none: 0;
  --radius-sm: 2px;
  --radius-md: 4px;

  --border-thin: 1px solid var(--color-border-soft);
  --border-strong: 2px solid var(--color-border-strong);

  --container-max: 1120px;
  --grid-gap: clamp(0.75rem, 0.6rem + 0.8vw, 1.5rem);
}
```

Regeln:
- Standard: radius-none auf grossen Flaechen.
- Inputs/Buttons: max radius-sm oder radius-md.
- Keine Shadows.

## 7. Oberflaechen, Hintergruende und Aufkleber-Stil
- Grundflaeche: `--bg` (#efece5) mit sehr feinem Papierraster, Opacity um 0.05.
  Kein technisches Gitter, keine animierten Diagonalen.
- Hero und Statement-Baender: Foto aus der Bildwelt mit hartem Ink-Scrim,
  darauf Aufkleber-Headlines. Keine Glows, keine Blur-Flaechen.
- Der gelbe Infobereich ist ein eigenes Bauteil: harte Kante, `--line`, `--yellow`,
  Ink-Text. Er traegt die wichtigsten Zahlen (Live-Zaehler, Foerderhinweis).

### 7.1 Aufkleber-Headlines
Kernbauteil der Marke. Der Styleguide beschreibt es als "Grafikbloecke im Aufkleber-Stil:
fettgedruckter, versetzt angeordneter Blocktext".

```css
.sticker-head { display: flex; flex-direction: column; align-items: flex-start; gap: .12em; }
.sticker-head .sticker {
  display: inline-block; padding: .05em .28em .1em;
  background: var(--yellow); color: var(--ink);
  box-decoration-break: clone;
}
.sticker-head .sticker:nth-child(1) { transform: rotate(-1.5deg); }
.sticker-head .sticker:nth-child(2) { margin-left: .5em; transform: rotate(1deg); }
.sticker-head .sticker:nth-child(3) { transform: rotate(-.6deg); }
.sticker-head.is-mint .sticker { background: var(--mint); }
```

Regeln:
- Eine Zeile pro `span.sticker`. Die Rotation bleibt unter 2 Grad.
- Gelb auf dunklem Grund, Mint auf hellem Grund oder umgekehrt, nie beides gemischt.
- Maximal vier Zeilen. Laengere Titel bekommen eine kleinere `font-size`, keinen Umbruch
  im Aufkleber: `max-width: 100%` verhindert den Ueberlauf aus der Rasterspalte.
- Ein einzelnes Highlight-Wort in laufenden Headlines nutzt dieselbe Flaeche ohne Rotation.

### 7.2 Bildwelt
Quelle: `Weltrekord_Styleguide/WR_Photos`, zentral gefuehrt in `lib/brand-photos.ts`.
- Haltung: gemeinschaftsorientiert, praxisnah, bodenstaendig, generationsuebergreifend.
- Jedes Bild traegt Alt-Text und Credit im Modul. Der Urheberhinweis steht laut Styleguide
  im Dateinamen und bleibt dort erhalten.
- Fotos liegen unter Aufklebern und Text immer mit Ink-Scrim, damit der Kontrast haelt.
- Kleine Bildflaechen bekommen ein gelbes Aufkleber-Label in der unteren linken Ecke.

## 8. Komponentenstil

### 8.1 Buttons
- Form: kantig, border-strong, kein Schatten.
- Primary: Hintergrund `--yellow`, Ink-Text, aktiver Press-Offset ueber transform.
- Secondary: `--paper` + `--line`.
- Ghost: transparent mit Unterstreichung bei Hover.

```css
.btn {
  border: var(--border-strong);
  border-radius: var(--radius-sm);
  font-family: var(--font-display);
  letter-spacing: var(--ls-wide);
  text-transform: uppercase;
  transition: transform 120ms ease, background-color 120ms ease, color 120ms ease;
}
.btn:active { transform: translateY(2px); }
.btn:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

### 8.2 Karten
- Border-strong, keine Schatten.
- Header-Balken in Accent-Farbe je Kategorie.
- Hover: nur leichte Translation nach oben (max -2px) und Border-Farbwechsel.

### 8.3 Formulare
- Inputs mit klarer 2px Border.
- Fehlerstatus ueber Farbe + Icon + Text, nie nur Farbe.
- Upload-Zone als gestrichelter Block mit klarer CTA-Zeile.

### 8.4 Counter
- Sehr grosse tabellarische Zahlen.
- Animiert bei Aenderung mit kurzer Tick-Transition (200 bis 300ms). Wie ein mechanischer Zaehler, nicht wie ein Scroll-Flip. Wie am flughafen so ein zähler flippen.
- Bei Moderationsfreigabe: Confetti (max 900ms), reduzierbar fuer reduced-motion. Bei runden Zahlen: keine Animation, nur Fade-in (einstellbar in settings zum beispiel bei 4000er Zahl).

### 8.5 Tabellen (Moderation)
- Dense, gut scannbar, sticky Header.
- Statuschips: pending/warn, approved/success, rejected/error.
- Actions klar getrennt (Approve links, Reject rechts, gefaerbte Danger-Area).

## 9. Motion-Tokens
```css
:root {
  --dur-fast: 120ms;
  --dur-med: 220ms;
  --dur-slow: 360ms;

  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Motion-Regeln:
- Nur fuer Feedback und Orientierung.
- Endlose Loops bei hintergründen oder bei buttons verwenden. Aber nur sehr subtil, keine Ablenkung.
- Page enter animieren (stagger 20 bis 40ms pro Element), aber kurz halten.

## 10. Responsive Breakpoints
```css
:root {
  --bp-xs: 360px;
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

Layout-Logik:
- Mobile: single column, sticky bottom CTA auf Upload.
- Tablet: 2-Spalten fuer Karten/Blog.
- Desktop: 12-Spalten Grid, Moderation mit Sidepanel.

## 11. Accessibility-Baseline
- Min. Kontrast: 4.5:1 fuer Fliesstext, 3:1 fuer grosse Textgroessen.
- Fokus immer sichtbar (keine outline: none).
- Interaktive Ziele min. 44x44px.
- Form-Fehler immer mit Textbeschreibung und aria-live fuer dynamische Hinweise.
- Tastaturpfad fuer Upload, Filter, Moderationsaktionen vollstaendig testbar.

## 12. Kategorien als visuelle Codes
Alle Werte sind Tints der Markenpalette, damit die Kategoriekarten als eine Flaeche lesen.

| Kategorie | Klasse | Farbe |
| --- | --- | --- |
| Elektrogeraete | `.category-1` | `--mint` |
| Haushaltsgeraete | `.category-2` | `--mint-soft` |
| Computer und Kommunikation | `.category-3` | `#c6cde4` (Blau-Tint) |
| Fahrraeder | `.category-4` | `--yellow` |
| Moebel | `.category-5` | `--yellow-soft` |
| Textilien und Kleidung | `.category-6` | `#d3d6de` |
| Werkzeuge | `.category-7` | `#dfdacd` |
| Spielzeug und Freizeit | `.category-8` | `#7fd0a8` |
| Sonstiges | `.category-9` | `--paper` |

Hinweis: Kategorien-Farben nur als Zusatzsignal nutzen, nie als einziges Signal.
Der Kategoriename steht immer als Text in der Karte.

## 13. Seiten-spezifische Hinweise

### Startseite
- Hero mit Counter als visuelle Hauptachse.
- CTA Reparatur einreichen immer ueber Fold sichtbar.
- Wettbewerbshinweis klar und knapp.
- Kleine Galerie mit Highlight-Bildern, die auf Uploads und fertig moderierte Einträge zeigen.

### Upload
- Step-Logik klar nummeriert.
- Live-Bildvorschau mit Dateigroesse und Validierungsstatus.
- Optionaler Toggle Gescheiterte Reparatur deutlich beschriftet.

### Moderation
- Fokus auf Geschwindigkeit: Filter, Bulk-Scans, schnelles Approve/Reject. Tinder-Style Swipe nur optional fuer mobile.
- Bild-Detailpanel mit Metadaten und Kommentar.

### Blog
- Kartenraster mit grossen Vorschaubildern.
- Titel typografisch stark, Meta-Infos reduziert.

## 14. Do and Don't
Do:
- Harte Kanten, klare Linien, starke Typo.
- Kontrastreiche Farbentscheidungen mit funktionaler Bedeutung.
- Kurze, praezise Microinteractions.

Don't:
- Keine Schatten, kein Glassmorphism, kein Blur als Hauptstil.
- Keine zu runden Pills als Standard.
- Keine generische Startup-UI mit austauschbaren Komponenten.

## 15. Implementierungsreihenfolge
1. Globale CSS-Variablen aus diesem Dokument in ein zentrales Token-Stylesheet uebernehmen.
2. Typo-Scale und Grid im Layout verankern.
3. Buttons, Inputs, Cards, Statuschips als Basiskomponenten bauen.
4. Counter-Komponente mit tabellarischen Ziffern und Aenderungsanimation bauen.
5. Moderations-Tabelle und Upload-Flow gegen A11y-Checkliste pruefen.

## 16. Definition of Done (Design)
- Alle Kernscreens nutzen ausschliesslich definierte Tokens.
- Kein Kernscreen verwendet Schatten.
- Fokuszustande und Kontrast bestehen manuelle Schnellpruefung.
- Mobile (360px), Tablet (768px), Desktop (1280px) sind visuell konsistent.
- Design wirkt klar als FAB Region Identitaet und nicht wie Standard-SaaS.
