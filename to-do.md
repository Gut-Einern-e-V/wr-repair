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
- [ ] DSGVO-konformen NRW-Geo-Check konzipieren und serverseitig umsetzen; Fallback und Hinweis fuer ungenaue IP-Ortung festlegen.
- [ ] Datenschutzfreundliches Captcha auswaehlen und serverseitig validieren.
- [ ] Cloudflare oder gleichwertigen Bot-Schutz vor der oeffentlichen Anwendung konfigurieren.
- [ ] Rate Limits fuer Upload- und Statistik-Endpunkte einrichten.
- [ ] Datenschutzkonzept fuer IP-Adressen, Bilder, Loeschanfragen und Aufbewahrungsfristen dokumentieren.

## Moderation

- [x] Geschuetzte Route `/moderator` mit Supabase-E-Mail/Passwort-Login anlegen.
- [x] Rollen und Berechtigungen fuer Moderator*innen, Admins und Superadmins umsetzen. Superadmins verwalten Benutzer und Rollen; Bootstrap: `docs/supabase-admin-bootstrap.md`.
- [x] Liste der Einreichungen mit Filtern fuer `pending`, `approved` und `rejected` bauen. Abgelehnte Bilder werden aus dem Storage entfernt; ein Fehler wird im Moderationsbereich angezeigt.
- [x] Detailansicht in der Warteschlange mit Bild, Kategorie, Beschreibung und ungefaehrer Standortinformation umsetzen.
- [x] Freigeben, Ablehnen und Moderationskommentar umsetzen.
- [ ] Bearbeiten von Metadaten umsetzen.
- [ ] Oeffentliche Galerie ausschliesslich aus freigegebenen Einreichungen speisen.
- [ ] CSV-Export fuer autorisierte Admins bereitstellen.
- [ ] Optional: Benachrichtigungen fuer neue Einreichungen und automatisierte Bildvorpruefung evaluieren.

## Statistik und Oeffentlichkeit

- [x] Route `/api/stats` implementieren: Gesamtzahl und Zahlen pro Kategorie als JSON.
- [x] Statistik ausschliesslich aus freigegebenen Einreichungen aggregieren.
- [x] Caching fuer den Statistik-Endpunkt mit maximal fuenf Minuten Laufzeit einrichten.
- [ ] Startseiten-Counter an die echte Statistik anbinden und Aktualisierung gestalten.
- [ ] Oeffentliche Galerie mit freigegebenen Bildern und Kategorien bauen.
- [ ] Statistikseite mit Kategorie- und Zeitverlauf erstellen.

## Inhalte und Seiten

- [ ] Markdown/MDX-Pipeline fuer Reparaturgeschichten aus dem Git-Repository einrichten.
- [ ] Blog-Uebersicht und einzelne Artikel-Seiten umsetzen.
- [ ] Seite "Ueber das Projekt" mit Open-Source-, Lizenz- und Mitwirkenden-Hinweisen erstellen. (link zu GithHub-Repo und Readme.md entsprechend anpassen wenn jemand die Seite kopieren möchte für ein eigenen Weltrekordversuch. Aber auf Englisch)
- [ ] Partnerschaftsseite mit Logos und Links erstellen. https://www.fab-bergisch.org/ lade hier die Logos herunter und verlinke auf die Partnerseiten. (z.B. Gut-Einern-e-V, CSCP, IAT und so weiter... in einem schönen Raster mit Hover-Effekt und Link auf die Partnerseite)
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
- [ ] Counter umgestalten, um die Anzahl freigegebener Einreichungen live anzuzeigen, und sicherstellen, dass er korrekt mit der Supabase-Datenbank synchronisiert ist. Der aktuelle Counter pollt `/api/stats` alle fuenf Minuten; Flip-Animation und Realtime fehlen noch.
- [x] Uploader komprimiert grosse JPEG-, PNG- und WebP-Bilder vor dem Upload auf unter 200 KiB und informiert ueber die reduzierte Dateigroesse. Grosse HEIC-Dateien erfordern wegen uneinheitlicher Browserunterstuetzung ein bereits komprimiertes Bild.

## Weitere Ideen
- [ ] Falls der Aufruf außerhalb der erlaubten Zeitfenster erfolgt, eine freundliche Seite mit Countdown wann der Weltrekord startet. Gerne mit kleinen Text zum Projekt und dem Link zu den Partnern. (z.B. Fab-Region Bergisches Land, NRW, Deutschland, EU) mit einfach an und ausschalten im Adminbereich. (z.B. `SUBMISSION_START_AT` und `SUBMISSION_END_AT` in der `.env.local` Datei) damit man testen kann, ob die Seite korrekt angezeigt wird. (z.B. Countdown bis zum Start des Weltrekords)
- [] Impressum nach https://www.fab-bergisch.org/impressum kopieren
- [ ] Datenschutz nach https://www.fab-bergisch.org/datenschutz kopieren und entsprechend anpassen mit den Daten die wir in Supabase speichern. (z.B. IP-Adresse, E-Mail-Adresse, Name, Bild, Standort) und kontakt adresse für löschanfragen.