# Projektplan: Reparatur‑Plattform

## Ziel & Überblick
Erstellung einer mobilen‑first Webseite, über die Nutzer*innen Reparaturen von Elektro‑, Haushalts‑, Computer‑ & Kommunikationsgeräten, Fahrrädern, Möbeln, Textilien, Werkzeugen, Spielzeug & Sonstigem hochladen können. Ein kurzer Fragekatalog erfasst die Geräte‑ und Reparaturkategorie. Die Seite zeigt einen großen Counter aller eingereichten Reparaturen und stellt statistische Daten per API bereit (z. B. für ESP‑32). Ziel ist, innerhalb eines Monats einen Weltrekord an Einreichungen aus NRW zu erreichen im Oktober. Das ist die Webseite für den Weltrekordversuch. Die Einreichungen werden moderiert, bevor sie veröffentlicht werden. Ein Blog‑Bereich informiert über den Wettbewerb und die Reparaturkultur und wird automatisch aus einem Git‑Repo gebaut. Die Plattform ist Open‑Source und kann von anderen Communities übernommen werden um eigene Rekordversuche zu starten. Der Rekord im Kontext von Fab-Region Bergisches Land veranstaltet wird. Die Plattform ist auf Deutsch, kann aber leicht internationalisiert werden. Sollte die Plattform in Zukunft internationalisiert werden, ist eine Übersetzungsdatei (z. B. JSON) vorgesehen. 

## Kern‑Features
- **Upload‑Formular (Smartphone)**
  - Bild‑Upload (max 5 MB) mit Vorschau
  - Dynamischer Fragekatalog je nach gewählter Kategorie
  - Zustimmung zur Veröffentlichung (Checkbox)
- **Großer Counter**
  - Gesamte Anzahl eingereichter Reparaturen (Live‑Update)
- **Backend‑Steuerung**
  - Zeitgesteuerter Selector → Einreichungen nur im definierten Zeitraum
  - Geo‑Filter (nur NRW via DNS‑ bzw. IP‑Lookup) kostenfrei, GDPR‑konform
  - Captcha (z. B. hCaptcha / reCAPTCHA) (kostenfrei, GDPR‑konform)
  - Moderations‑Dashboard: Bilder prüfen, ablehnen, freigeben
  - Bot-Schutz durch cloudflare oder ähnliche Dienste (kostenfrei, GDPR‑konform)
- **API‑Schnittstelle**
  - `/api/stats` liefert JSON mit Gesamt‑ und Kategoriezahlen (für ESP‑32)
- **Blog‑Bereich**
  - Markdown‑Posts inkl. Bilder, automatisch aus Git‑Repo gebaut
- **Optional:** Button für „Gescheiterte Reparatur“ (nur UI‑Element) + Hinweistext, dass die Reparatur nicht erfolgreich war, aber trotzdem eingereicht werden kann.

## Technologischer Stack
| Ebene | Entscheidung |
|---|---|
| Frontend | **React** (via Vite) – Mobile‑first, responsives Grid‑Layout, sehr modern |
| Styling | CSS Custom‑Properties (OKLCH) – an das **fab.labs** Design angelehnt, aber moderner und schicker | in einer design.md Datei werden die Farb‑ und Typografie‑Tokens definiert, die dann in der gesamten App/Coding‑Agents verwendet werden. |
| Backend | **Supabase** (PostgreSQL + Auth) |
| Hosting | **Vercel** (Server‑less Functions) – bevorzugt für Edge‑API & SSR |
| Bild‑Speicher | Supabase Storage |
| Captcha | hCaptcha (kostenlos, GDPR‑konform) |
| Geo‑Filter | Drittanbieter‑API (z. B. ipapi) + DNS‑Whitelist‑Check (kostenfrei, GDPR‑konform) |
| CI/CD | GitHub Actions → Vercel Deploy |
| Blog‑Generator | `next-mdx-remote` oder `vite-plugin-markdown` |
| API‑Server | Supabase Edge‑Functions oder Vercel Serverless Functions |

## Datenmodell (Beispiel)
```json
{
  "id": "uuid",
  "category": "Elektrogeräte | Haushaltsgeräte | Computer & Kommunikation | Fahrräder | Möbel | Textilien & Kleidung | Werkzeuge | Spielzeug & Freizeit | Sonstiges",
  "title": "Kurzbeschreibung", // optional und von moderator*in editierbar
  "description": "Freitext", // optional und von moderator*in editierbar
  "image_url": "https://…",
  "consent": true,
  "status": "pending | approved | rejected",
  "created_at": "timestamp",
  "location": "NRW"
}
```
Statistik‑Tabellen: Gesamte Zähler, Zähler pro Kategorie.

## Architektur‑Übersicht
- **Client** → Next.js
- **API‑Gateway** (Vercel Functions) → Auth, Captcha‑Validierung, Geo‑Check, Supabase‑CRUD
- **Supabase** → Datenbank + Storage
- **Moderations‑UI** (geschützt, Admin‑Login) → Listet *pending* Einträge, ermöglicht Freigabe/Ablehnung -> versteckt und nicht über interface zugänglich sondern nur über Admin‑Login /moderator
- **Statistik‑Endpoint** → `/api/stats` liefert aggregierte Zahlen (JSON)
- **Blog** → Markdown‑Repo → Build‑Step → statische Seiten einzuügen im backend auf der github‑repo, die dann auf der Webseite angezeigt werden.

## Ablauf (User‑Journey)
1. Besucher*in landet auf Startseite (großer Counter, Hinweis zum Wettbewerb)
2. Klick auf **"Reparatur einreichen"** → Upload‑Formular (Smartphone‑optimiert)
3. Bild auswählen, Kategorie wählen, Fragen beantworten, Zustimmung geben → Formular absenden
4. Backend prüft Captcha, Geo‑Location, Öffnungs‑Zeitfenster → Eintrag wird als *pending* gespeichert
5. Moderator*in prüft im Dashboard → Status `approved` oder `rejected`
6. Bei `approved` wird das Bild in die öffentliche Galerie aufgenommen und der Counter erhöht sich automatisch
7. Statistik‑API liefert aktuelle Zahlen; ESP‑32 kann sie per HTTP GET auslesen

## Sitetree
- **Startseite**: Counter, Hinweis zum Wettbewerb, Button „Reparatur einreichen“
- **Upload‑Formular**: Bild, Kategorie, Fragen, Zustimmung
- **Moderations‑Dashboard**: 1. Login, 2. Liste der Einreichungen, 3. Detailansicht von Einreichung mit editierfunktion
- **Reparaturgeschichten** Blog‑Bereich: Markdown‑Posts, automatisch aus Git‑Repo gebaut
- **Datenschutz** & **Impressum**: Statische Seiten, rechtlich notwendig (right to delete, right to access, etc. per GDPR und DSGVO und mail an uns)
- **Statistik‑API**: JSON‑Endpoint `/api/stats` für ESP‑32 oder Ähnliches, aggregierte Zahlen (Gesamt, pro Kategorie)
- **Über das Projekt**: Statische Seite mit Projektbeschreibung, Open‑Source‑Hinweis, Lizenz, Mitwirkende
- **Projektpartnerschaften**: Statische Seite mit Logos und Links zu Partnern, Sponsoren, Unterstützern
- **Barrierefreiheit**: Statische Seite mit Hinweis auf Barrierefreiheit, ggf. Kontaktformular für Feedback und erklärungen auf einfacher sprache


## Admin‑Dashboard (Moderation)
- **Login** (Admin‑Auth via Supabase)
- **Liste der Einreichungen** (Filter: *pending*, *approved*, *rejected*)
- **Detailansicht**: Bild, Kategorie, Beschreibung, Datum, Standort
- **Aktionen**: Freigeben, Ablehnen, optional Kommentar hinzufügen
- **Export**: CSV‑Export der Einreichungen für Analysezwecke
- **Automatischer Bild‑Scan**: KI‑gestützte Vorprüfung auf anstößige Inhalte (optional, abhängig von Budget und Datenschutz (custom OpenAI endpoint with API key, or use a free image moderation API))
- **Benachrichtigungen**: E-Mail an Moderator*innen bei neuen Einreichungen (optional, via Supabase Functions)
- **Statistik‑Dashboard**: Grafische Darstellung der Einreichungen nach Kategorie, Zeitverlauf, Geo‑Verteilung (optional, abhängig von Budget und Datenschutz)
- **Backup & Restore**: Regelmäßige Backups der Datenbank und des Storage (Supabase bietet automatische Backups, aber man kann auch eigene Backup‑Strategien implementieren)
- **Settings**: Konfiguration von Captcha‑Provider, Geo‑Lookup‑API, Zeitfenster für Einreichungen, etc.
- **Roles & Permissions**: Unterschiedliche Rollen für Moderator*innen, Admins und ggf. Superadmins, um Zugriff auf bestimmte Funktionen zu steuernn.

## Risiken & Mitigation
- **Geo‑Filtering‑Genauigkeit**: IP‑basiert kann unzuverlässig sein – Hinweis im UI, fallback‑Whitelist über DNS. Soft-> also ungefähre Gegend in Moderation anzeigen
- **Captcha‑Usability**: Mobile‑Friendly‑Lösung wählen, sonst Absprungrate erhöhen.
- **Statistik‑API‑Last**: Caching (5 min) implementieren, um ESP‑32‑Abfragen zu entlasten.
-

## Wichtig
- **Förderhinweise** EFRE schau auf Fab-Region Bergisches Land, NRW, Deutschland, EU
- **Open‑Source**: Lizenz (z. B. MIT) im Repo,
- **Datenschutz**: DSGVO‑konform, Datenschutzerklärung, Opt‑In

## Design
- Fonts: Hack Mono (monospace) für Code, Inter (sans-serif) für Fließtext
- Farbpalette: OKLCH‑basierte Custom Properties, angelehnt an fab.labs Design, aber moderner und schicker. In einer design.md Datei werden die Farb‑ und Typografie‑Tokens definiert, die dann in der gesamten App/Coding‑Agents verwendet werden.
- moderne Designelemente, die zu 2026 passen, dribbble‑tauglich, bold und stylish wie zum beispiel, verläufe mit grain, luminanz‑variationen, subtile Schatten, neumorphismus‑ähnliche Buttons, micro‑interactions, hover‑effekte, smooth transitions, responsive grid layouts, card designs für die Einreichungen, minimalistische Icons, klare typografie‑hierarchie, whitespace nutzen für bessere lesbarkeit. mikro animationen für button klicks, form validation feedback, loading spinners, progress bars, subtle hover effects on images and cards, responsive typography scaling, dark mode support, accessibility considerations (contrast ratios, keyboard navigation), and a consistent visual language throughout the platform. aber auch nette kleine details wie der counter kann animiert werden, wenn eine neue einreichung freigegeben wird, oder ein kleines confetti animation bei der freigabe einer einreichung. die blog posts können mit einem schönen grid layout angezeigt werden, mit hover effekten auf den bildern, und einem klaren typografie layout für die texte. die moderations dashboard kann eine klare tabellarische ansicht haben, mit filtermöglichkeiten und sortierfunktionen. die statistik seite kann schöne diagramme und charts haben, die die daten visualisieren. insgesamt sollte das design modern, clean und ansprechend sein, um die nutzer*innen zu motivieren, teilzunehmen und einreichungen zu machen. Mach es "brutalistisch modern" und "dribbble‑tauglich", aber auch funktional und benutzerfreundlich. Es sollte keinesfalls aussehen wie ein KI-Startup! Harte Kanten und keine Schatten!
