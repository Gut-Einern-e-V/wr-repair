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

- [ ] Supabase-Umgebungsvariablen lokal und bei Vercel konfigurieren.
- [ ] Datenbankschema fuer `repairs` anlegen, inklusive Status, Kategorien, Moderationsdaten und Zeitstempeln.
- [ ] Row Level Security (RLS) und Rollen fuer oeffentliche Einreichungen, Moderator*innen und Admins definieren.
- [ ] Supabase-Storage-Bucket fuer Reparaturbilder anlegen und Zugriffsregeln setzen.
- [ ] Upload-API implementieren: Dateityp und maximale Dateigroesse von 5 MB serverseitig pruefen.
- [ ] Bildvorschau, Upload-Fortschritt und Fehleranzeige im Formular ergaenzen.
- [ ] Einreichung als `pending` in Supabase speichern statt nur den lokalen Erfolgszustand zu zeigen.
- [ ] Dynamischen Fragekatalog je Kategorie definieren und speichern.
- [ ] UI-Option fuer gescheiterte Reparaturen mit Hinweis umsetzen.
- [ ] EXIF-Daten und GPS-Informationen vor der Speicherung sicher entfernen oder die Verarbeitung datenschutzrechtlich festlegen.

## Schutz und Teilnahmebedingungen

- [ ] Zeitfenster fuer Einreichungen serverseitig konfigurierbar machen und ausserhalb des Zeitfensters sperren.
- [ ] DSGVO-konformen NRW-Geo-Check konzipieren und serverseitig umsetzen; Fallback und Hinweis fuer ungenaue IP-Ortung festlegen.
- [ ] Datenschutzfreundliches Captcha auswaehlen und serverseitig validieren.
- [ ] Cloudflare oder gleichwertigen Bot-Schutz vor der oeffentlichen Anwendung konfigurieren.
- [ ] Rate Limits fuer Upload- und Statistik-Endpunkte einrichten.
- [ ] Datenschutzkonzept fuer IP-Adressen, Bilder, Loeschanfragen und Aufbewahrungsfristen dokumentieren.

## Moderation

- [ ] Geschuetzte Route `/moderator` mit Supabase-Login anlegen.
- [ ] Rollen und Berechtigungen fuer Moderator*innen, Admins und Superadmins umsetzen.
- [ ] Liste der Einreichungen mit Filtern fuer `pending`, `approved` und `rejected` bauen.
- [ ] Detailansicht mit Bild, Kategorie, Beschreibung, Datum und ungefaehrer Standortinformation umsetzen.
- [ ] Freigeben, Ablehnen, Moderationskommentar und Bearbeiten von Metadaten umsetzen.
- [ ] Oeffentliche Galerie ausschliesslich aus freigegebenen Einreichungen speisen.
- [ ] CSV-Export fuer autorisierte Admins bereitstellen.
- [ ] Optional: Benachrichtigungen fuer neue Einreichungen und automatisierte Bildvorpruefung evaluieren.

## Statistik und Oeffentlichkeit

- [ ] Route `/api/stats` implementieren: Gesamtzahl und Zahlen pro Kategorie als JSON.
- [ ] Statistik ausschliesslich aus freigegebenen Einreichungen aggregieren.
- [ ] Caching fuer den Statistik-Endpunkt mit maximal fuenf Minuten Laufzeit einrichten.
- [ ] Startseiten-Counter an die echte Statistik anbinden und Aktualisierung gestalten.
- [ ] Oeffentliche Galerie mit freigegebenen Bildern und Kategorien bauen.
- [ ] Statistikseite mit Kategorie- und Zeitverlauf erstellen.

## Inhalte und Seiten

- [ ] Markdown/MDX-Pipeline fuer Reparaturgeschichten aus dem Git-Repository einrichten.
- [ ] Blog-Uebersicht und einzelne Artikel-Seiten umsetzen.
- [ ] Seite "Ueber das Projekt" mit Open-Source-, Lizenz- und Mitwirkenden-Hinweisen erstellen.
- [ ] Partnerschaftsseite mit Logos und Links erstellen.
- [ ] Datenschutz, Impressum und Barrierefreiheit als echte, verlinkte Seiten erstellen.
- [ ] Texte in eine Uebersetzungsdatei auslagern und Internationalisierung vorbereiten.
- [ ] Foerderhinweise fuer EFRE, NRW, Deutschland und EU rechtlich abgestimmt einpflegen.

## Qualitaet, Betrieb und Release

- [ ] Teststrategie erstellen: Formular, Upload-Validierung, API, Moderation und Berechtigungen.
- [ ] Automatisierte Tests fuer kritische Serverpfade und Komponenten schreiben.
- [ ] Mobile, Tablet- und Desktop-Ansichten mit 360 px, 768 px und 1280 px pruefen. (Burger-Menu, Fokuszustand, Scrollen, Bildgroesse, Ladezeiten)
- [ ] Barrierefreiheit pruefen: Tastaturbedienung, Screenreader, Kontrast und Fehlermeldungen.
- [ ] GitHub Actions fuer Lint, Tests und Production-Build konfigurieren.
- [ ] Vercel-Projekt, Produktionsumgebungsvariablen und Deployment einrichten.
- [ ] Supabase-Backup, Wiederherstellung und Monitoring festlegen.
- [ ] Sicherheits- und Datenschutzpruefung vor dem oeffentlichen Start durchfuehren.
- [ ] Counter umgestalten, um die Anzahl der Einreichungen in Echtzeit anzuzeigen, und sicherstellen, dass er korrekt mit der Supabase-Datenbank synchronisiert ist. (Flip-Counter)
