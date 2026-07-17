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

## 4. Farb-Tokens (OKLCH)
Basis aus brand-spec, erweitert fuer States und Flows.

```css
:root {
  /* Core */
  --color-bg: oklch(96% 0.01 0.3);
  --color-surface: oklch(95% 0.0100 0.2);
  --color-fg: oklch(10% 0.01 0.1);

  /* Brand accents */
  --color-accent-red: oklch(60% 0.25 30);
  --color-accent-green: oklch(70% 0.18 140);
  --color-accent-blue: oklch(55% 0.15 260);

  /* Utility */
  --color-border-strong: oklch(20% 0 0);
  --color-border-soft: oklch(78% 0 0);
  --color-muted: oklch(55% 0 0);

  /* Semantic */
  --color-success: oklch(72% 0.19 145);
  --color-warning: oklch(78% 0.18 92);
  --color-error: oklch(62% 0.24 28);
  --color-info: oklch(62% 0.16 252);

  /* Interaction */
  --color-focus-ring: oklch(67% 0.22 260);
  --color-link: oklch(50% 0.19 257);
  --color-link-hover: oklch(43% 0.19 257);
}

[data-theme="dark"] {
  --color-bg: oklch(15% 0.01 260);
  --color-surface: oklch(21% 0.01 260);
  --color-fg: oklch(94% 0.01 260);

  --color-border-strong: oklch(85% 0.01 260);
  --color-border-soft: oklch(36% 0.01 260);
  --color-muted: oklch(73% 0.01 260);

  --color-link: oklch(74% 0.15 257);
  --color-link-hover: oklch(81% 0.15 257);
}
```

## 5. Typografie-Tokens
Vorgabe: Hack Mono und Inter.

```css
:root {
  --font-display: "Hack Mono", monospace;
  --font-body: "Inter", sans-serif;
  --font-code: "Hack Mono", monospace;

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
- Headlines: Display-Font, all caps nur in Labels und Counter-Kicker.
- Fliesstext: Body-Font mit --lh-body.
- Zahlen (Counter, Stats): tabellarische Ziffern aktivieren.
- arbeite mit h1 bis h6, aber nutze nur h1 bis h3 fuer sichtbare Headlines. h4 bis h6 nur fuer semantische Struktur.
- Nutze CSS-Variablen fuer Schriftgroessen, Zeilenhoehen und Buchstabenabstand, um responsive Anpassungen zu erleichtern.

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

## 7. Oberflaechen und Hintergruende
- Grundlayout: heller Hintergrund mit subtilen, koernigen Gradients.
- Hero-Bereich: harte Farb-Bloecke statt weicher Glow-Effekte. 
- Grain optional ueber pseudo-element mit sehr niedriger Opacity (0.04 bis 0.07).

Beispiel:
```css
.hero-bg {
  background:
    linear-gradient(135deg, oklch(96% 0.02 30) 0%, oklch(94% 0.02 260) 55%, oklch(96% 0.02 140) 100%),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 2px,
      color-mix(in oklch, var(--color-fg) 5%, transparent) 2px,
      color-mix(in oklch, var(--color-fg) 5%, transparent) 3px
    );
}
```

## 8. Komponentenstil

### 8.1 Buttons
- Form: kantig, border-strong, kein Schatten.
- Primary: Hintergrund accent-red, Text hell, aktiver Press-Offset ueber transform.
- Secondary: surface + border-strong.
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
- Elektrogeraete: accent-blue
- Haushaltsgeraete: accent-green
- Computer und Kommunikation: info
- Fahrraeder: accent-red
- Moebel: warning
- Textilien und Kleidung: link
- Werkzeuge: fg auf surface
- Spielzeug und Freizeit: success
- Sonstiges: muted

Hinweis: Kategorien-Farben nur als Zusatzsignal nutzen, nie als einziges Signal.

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
