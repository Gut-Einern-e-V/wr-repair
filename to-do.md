# Reparaturrekord NRW – To-do

Stand: 17. Juli 2026

## Abgeschlossen

- [x] Next.js-Projekt mit TypeScript, App Router und ESLint eingerichtet.
- [x] Produktions-Build und Lint-Check eingerichtet und erfolgreich ausgefuehrt.
- [x] Globales, mobiles Designsystem mit OKLCH-Farben, harten Kanten, sichtbaren Fokuszustanden und Reduced-Motion-Unterstuetzung umgesetzt.
- [x] Startseite gestaltet: Weltrekord-Hero, Zielzaehler, Kategorie-Uebersicht, Ablauf und Projektbereich.
- [x] Statische Vorschau fuer Reparaturgeschichten umgesetzt.
- [x] Einreichungsdialog als UI-Prototyp umgesetzt: Kategorie, Beschreibung, Bildauswahl und Zustimmung sind im Browser validiert.
- [x] App-Metadaten und App-Icon angelegt.

## Naechster Meilenstein: Echte Einreichungen

- [ ] Supabase-Umgebungsvariablen lokal und bei Vercel konfigurieren. Vorlage: `.env.example`; genaue Vercel-Schritte: `docs/vercel-deployment.md`.
- [x] Datenbankschema fuer `repairs` anlegen, inklusive Status, Kategorien, Moderationsdaten und Zeitstempeln.
- [x] Row Level Security (RLS) und Rollen fuer oeffentliche Einreichungen, Moderator*innen und Admins definieren.
- [x] Privaten Supabase-Storage-Bucket fuer Reparaturbilder definieren; serverseitige Upload-API und Zugriffsregeln folgen.
- [x] Upload-API implementieren: Dateityp und maximale Dateigroesse von 200 KiB serverseitig pruefen. Der Bucket wird per Migration auf denselben Wert begrenzt.
- [x] Bildvorschau, Upload-Fortschritt und Fehleranzeige im Formular ergaenzen.
- [x] Einreichung als `pending` in Supabase speichern statt nur den lokalen Erfolgszustand zu zeigen. Vor dem oeffentlichen Start fehlen noch Captcha, Zeitfenster und NRW-Check.
- [x] Dynamischen Fragekatalog je Kategorie definieren und Antworten als JSON in der Einreichung speichern.
- [x] UI-Option fuer nicht gelungene Reparaturen mit Hinweis umsetzen und als `repair_succeeded: false` speichern.
- [x] EXIF- und GPS-Informationen vor der Speicherung entfernen: Akzeptierte Bilder werden im Browser in ein neues JPEG gerendert, bevor sie hochgeladen werden. HEIC ist wegen uneinheitlicher Browserunterstuetzung ausgeschlossen.

## Schutz und Teilnahmebedingungen

- [x] Zeitfenster fuer Einreichungen serverseitig ueber `SUBMISSION_START_AT` und `SUBMISSION_END_AT` konfigurierbar machen und ausserhalb des Zeitfensters standardmaessig sperren.
- [x] NRW-Geo-Check serverseitig mit Vercels Laender- und Regionsheadern umsetzen. Es gibt keine externe Geo-IP-Anfrage und keine Speicherung der IP; bei Erfolg wird nur `Nordrhein-Westfalen` gespeichert. Unklare Zuordnungen werden sicher abgelehnt und geben einen VPN-/Proxy-Hinweis; lokal ist der Check nur mit `GEOIP_ALLOW_LOCAL=true` testbar.
- [x] hCaptcha im Einreichungsdialog integrieren und das Token serverseitig vor jedem Upload validieren. Vor dem oeffentlichen Start muessen `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` und `HCAPTCHA_SECRET` in Vercel gesetzt und die Domains bei hCaptcha freigegeben werden.
- [x] Rate Limits fuer Upload- und Statistik-Endpunkte einrichten: 3 Einreichungsversuche je IP / 15 Minuten und 120 Statistikabfragen je IP / Minute. Die Begrenzung ist pro Serverinstanz; vor dem oeffentlichen Start ist ergaenzend ein plattformweites Vercel- oder Cloudflare-WAF-Limit erforderlich.
- [x] Datenschutzkonzept fuer IP-Adressen, Bilder, Loeschanfragen und Aufbewahrungsfristen dokumentieren: `docs/data-protection-concept.md` beschreibt Datenfluss, aktuelle technische Grenzen und die vor dem Start noch verbindlich zu entscheidenden Fristen.

## Moderation

- [x] Geschuetzte Route `/moderator` mit Supabase-E-Mail/Passwort-Login anlegen.
- [x] Rollen und Berechtigungen fuer Moderator*innen, Admins und Superadmins umsetzen. Superadmins verwalten Benutzer und Rollen; Bootstrap: `docs/supabase-admin-bootstrap.md`.
- [x] Liste der Einreichungen mit Filtern fuer `pending`, `approved` und `rejected` bauen. Abgelehnte Bilder werden aus dem Storage entfernt; ein Fehler wird im Moderationsbereich angezeigt.
- [x] Detailansicht in der Warteschlange mit Bild, Kategorie, Beschreibung und ungefaehrer Standortinformation umsetzen.
- [x] Freigeben, Ablehnen und Moderationskommentar umsetzen.
- [x] Bearbeiten von Metadaten umsetzen: Moderator*innen koennen Kategorie, Produktname, Beschreibung, Bildbeschreibung und Tags mit serverseitigen Grenzen bearbeiten.
- [x] Oeffentliche Galerie ausschliesslich aus freigegebenen Einreichungen speisen. Die API fragt nur `approved` ab und liefert kurzlebige, signierte URLs aus dem privaten Bucket.
- [x] CSV-Export fuer autorisierte Admins bereitstellen. Der Export ist auf `admin` und `superadmin` beschraenkt, wird nicht gecacht und neutralisiert Tabellenkalkulationsformeln in Textfeldern.

## Statistik und Oeffentlichkeit

- [x] Route `/api/stats` implementieren: Gesamtzahl und Zahlen pro Kategorie als JSON.
- [x] Statistik ausschliesslich aus freigegebenen Einreichungen aggregieren.
- [x] Caching fuer den Statistik-Endpunkt mit maximal fuenf Minuten Laufzeit einrichten.
- [x] Startseiten-Counter an die echte Statistik anbinden und Aktualisierung gestalten. Der Platzhalter wurde entfernt; `/api/stats` liefert den Wert, der bei Aktualisierung animiert wird. Lade-, Fehler- und Zeitstempelzustand sind sichtbar.
- [x] Oeffentliche Galerie mit freigegebenen Bildern und Kategorien bauen.
- [x] Statistikseite mit Kategorie- und Zeitverlauf erstellen. `/stats` zeigt ausschliesslich freigegebene Einreichungen nach Kategorie sowie die Freigaben der letzten 30 Tage.
- [x] Oeffentliche Statistik nur innerhalb des konfigurierten Zeitfensters anzeigen: `/api/stats` sperrt ausserhalb von `SUBMISSION_START_AT` bis `SUBMISSION_END_AT` mit `403`; `/stats` zeigt dann einen klaren Hinweis statt Zahlen.

## Inhalte und Seiten

- [x] Markdown-Pipeline fuer Reparaturgeschichten aus dem Git-Repository eingerichtet: `content/stories/` wird durch `lib/stories.ts` eingelesen und statisch nach `/stories/[slug]` gebaut; die Startseite verlinkt auf die Uebersicht.
- [x] Reparaturgeschichten-Uebersicht und einzelne Artikel-Seiten umgesetzt: `/stories` und `/stories/[slug]` zeigen drei versionierte Beispielgeschichten.
- [x] Englische Seite "About the project" mit Open-Source-, Lizenz- und Mitwirkenden-Hinweisen erstellt; README fuer Wiederverwendung eines eigenen Weltrekordversuchs aktualisiert.
- [x] Unterstuetzerseite `/supporters` mit lokal gespeicherten, offiziellen Partnerlogos, Hover-Raster und Partnerlinks erstellt; von der Startseite aus erreichbar.
- [x] Datenschutz, Impressum und Barrierefreiheit als echte, verlinkte Seiten erstellt. Die Impressums- und Datenschutzangaben muessen vor Launch rechtlich freigegeben werden.
- [x] Texte in `lib/i18n.ts` zentralisiert und deutsche/englische Nachrichtenbasis fuer die weitere Internationalisierung angelegt.
- [ ] Foerderhinweise fuer EFRE, NRW, Deutschland und EU rechtlich abgestimmt einpflegen. Die offiziellen FAB-/EU-/NRW-Logos sind lokal unter `public/funding/` eingebunden; verbindlicher Wortlaut und Platzierung warten auf Freigabe.
- [] checke den assets ordner für die logos und binde es schick ein mit den richtigen links pro logo

## Qualitaet, Betrieb und Release

- [ ] Teststrategie erstellen: Formular, Upload-Validierung, API, Moderation und Berechtigungen.
- [ ] Automatisierte Tests fuer kritische Serverpfade und Komponenten schreiben.
- [ ] Mobile, Tablet- und Desktop-Ansichten mit 360 px, 768 px und 1280 px pruefen. (Burger-Menu, Fokuszustand, Scrollen, Bildgroesse, Ladezeiten)
- [ ] Barrierefreiheit pruefen: Tastaturbedienung, Screenreader, Kontrast und Fehlermeldungen.
- [ ] Supabase-Backup, Wiederherstellung und Monitoring festlegen.
- [ ] Sicherheits- und Datenschutzpruefung vor dem oeffentlichen Start durchfuehren.
- [x] Counter umgestalten, um die Anzahl freigegebener Einreichungen aus der Supabase-Statistik anzuzeigen. Der aktuelle Counter pollt `/api/stats` alle fuenf Minuten, zeigt den letzten erfolgreichen Abruf und animiert Aktualisierungen; Supabase Realtime bleibt optional fuer einen spaeteren Ausbau.
- [x] Uploader komprimiert grosse JPEG-, PNG- und WebP-Bilder vor dem Upload auf unter 200 KiB und informiert ueber die reduzierte Dateigroesse. Grosse HEIC-Dateien erfordern wegen uneinheitlicher Browserunterstuetzung ein bereits komprimiertes Bild.

## Weitere Ideen
- [ ] Falls der Aufruf außerhalb der erlaubten Zeitfenster erfolgt, eine freundliche Seite mit Countdown wann der Weltrekord startet. Gerne mit kleinen Text zum Projekt und dem Link zu den Partnern. (z.B. Fab-Region Bergisches Land, NRW, Deutschland, EU) mit einfach an und ausschalten im Adminbereich. (z.B. `SUBMISSION_START_AT` und `SUBMISSION_END_AT` in der `.env.local` Datei) damit man testen kann, ob die Seite korrekt angezeigt wird. (z.B. Countdown bis zum Start des Weltrekords)
- [] Impressum nach https://www.fab-bergisch.org/impressum kopieren
- [ ] Datenschutz nach https://www.fab-bergisch.org/datenschutz kopieren und entsprechend anpassen mit den Daten die wir in Supabase speichern. (z.B. IP-Adresse, E-Mail-Adresse, Name, Bild, Standort) und kontakt adresse für löschanfragen.
- [] Startseite mit mehr Stats also vlt einen verlauf der Einreichungen pro Tag oder Woche, oder eine Karte mit den Standorten der Einreichungen. (z.B. Google Maps oder OpenStreetMap) auch pro kategorie wie viel eingereicht wurde. also einmal auf der startseite mehr daten und dann eine zusätzliche seite als eine Auswertungsseite mit Statistiken und Diagrammen. (z.B. Balkendiagramm, Liniendiagramm, Kreisdiagramm) und eine Karte mit den Standorten der Einreichungen. (z.B. Google Maps oder OpenStreetMap) (datenschutzseite anpassen in data-protocction-concept.md eintragen)