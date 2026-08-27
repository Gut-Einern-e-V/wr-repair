# Datenschutzkonzept (technischer Stand)

Stand: 17. Juli 2026

Dieses Dokument beschreibt den aktuell implementierten technischen Datenfluss. Es ist keine Datenschutzerklaerung und keine Rechtsberatung. Vor dem oeffentlichen Start muessen die verantwortliche Stelle, Rechtsgrundlagen, Auftragsverarbeitungsvertraege, Kontaktwege und Fristen durch die verantwortliche Organisation rechtlich geprueft und in die oeffentliche Datenschutzerklaerung uebernommen werden.

## Zweck und Datenminimierung

Die Plattform erfasst Reparaturen fuer den Weltrekordversuch, moderiert sie und veroeffentlicht nur ausdruecklich freigegebene Beitraege. Das Uploadformular fragt weder Namen noch E-Mail-Adressen der einreichenden Person ab.

| Datenkategorie | Aktuell verarbeitet | Speicherung und Zugriff |
| --- | --- | --- |
| Reparaturangaben | Kategorie, Beschreibung, Antworten, Reparaturerfolg, optionale redaktionelle Metadaten und Moderationskommentar | Tabelle `repairs` in Supabase; nur Moderator*innen und hoeher sehen nicht freigegebene Beitraege. |
| Bild | Vom Browser neu gerendertes JPEG ohne EXIF- und GPS-Metadaten | Privater Supabase-Storage-Bucket `repair-images`; oeffentliche Galerie und Moderation erhalten nur kurzlebige signierte URLs. |
| Grobe Region | Ausschliesslich der Wert `Nordrhein-Westfalen` nach erfolgreicher Vercel-Header-Pruefung | Spalte `location_region` in `repairs`; keine Stadt- oder Postleitzahldaten. |
| Anonymisierte Herkunft | Optional der Mittelpunkt einer festen Rasterzelle von rund 5 km Kantenlaenge | Spalten `location_lat` und `location_lon` in `repairs`. Die Zuordnung erfolgt im Browser; die zugrunde liegende genaue Koordinate wird nicht uebertragen. Oeffentlich sichtbar nur aggregiert und erst ab fuenf Reparaturen je Zelle. |
| IP-Adresse | Kurzzeitig als Schlüssel des prozesslokalen Rate Limits | Nicht in `repairs` geschrieben. Der Zaehlereintrag wird nach dem jeweiligen Limitfenster verworfen: 15 Minuten fuer Einreichungen, 1 Minute fuer Statistikabfragen. |
| Friendly-Captcha-Loesung | Loesungswert aus dem Formular zur Bot-Pruefung | Nicht in der Datenbank gespeichert; wird serverseitig an Friendly Captcha `siteverify` gesendet. |
| Admin-Konten | Auth-E-Mail, optionaler Anzeigename und Anwendungrolle | Supabase Auth sowie die Tabellen `profiles` und `user_roles`; nur fuer den Moderationsbetrieb. |

Die Datenbankmigration enthaelt derzeit die Spalte `entry_ip`. Die aktuelle Upload-API setzt sie nicht. Sie darf nicht fuer neue Funktionen verwendet werden, bevor Notwendigkeit, Rechtsgrundlage und Aufbewahrungsfrist rechtlich festgelegt sind.

## Standort- und Bot-Pruefung

Der NRW-Check verwendet die von Vercel bereitgestellten Request-Header `x-vercel-ip-country` und `x-vercel-ip-country-region`. Akzeptiert wird nur `DE` und `NW`. Die Anwendung ruft keinen separaten Geo-IP-Anbieter auf und speichert keine Roh-IP. Bei nicht eindeutiger Zuordnung wird die Einreichung abgelehnt und die Person auf VPN oder Proxy hingewiesen.

Friendly Captcha muss vor dem Produktionsstart datenschutzrechtlich freigegeben werden. Insbesondere sind dessen Datenschutzinformationen, ein moeglicher Auftragsverarbeitungsvertrag, der vom Widget geladene CDN-Code und die Einbindung in die oeffentliche Datenschutzerklaerung zu pruefen.

## Anonymisierung der Herkunft

Fuer die Karte im Live-Dashboard wird je Reparatur hoechstens eine grob gerasterte Herkunft gespeichert. Der Ablauf ist so gebaut, dass genaue Koordinaten den Browser nie verlassen:

1. Der Browser liest die GPS-Koordinate aus den EXIF-Daten des gewaehlten Bildes, **bevor** das Bild neu gerendert und die Metadaten damit verworfen werden.
2. Der Browser schnappt die Koordinate auf den Mittelpunkt einer festen Rasterzelle von rund 5 km Kantenlaenge und sendet ausschliesslich diesen Zellwert. Die Ausgangskoordinate wird nicht uebertragen.
3. Enthaelt das Bild keine Koordinate, wird ersatzweise die von Vercel aus der IP-Adresse abgeleitete Stadtkoordinate verwendet und identisch gerastert. Die IP-Adresse selbst wird dabei nicht gespeichert.
4. Der Server akzeptiert einen vom Browser gesendeten Wert nur, wenn er exakt einem Zellmittelpunkt entspricht und innerhalb der konfigurierten Region liegt. Genauere Werte werden verworfen.

Das Raster ist idempotent: Derselbe Ort ergibt immer dieselbe Zelle. Ein rein zufaelliger Versatz waere schwaecher, weil sich der Mittelwert mehrerer Einreichungen vom selben Ort dem echten Punkt annaehern wuerde.

Die oeffentliche Aggregatfunktion gibt eine Zelle erst aus, wenn ihr mindestens fuenf freigegebene Reparaturen zugeordnet sind. Die Spalten `location_lat` und `location_lon` sind ausserdem per Spalten-GRANT fuer die anonyme Datenbankrolle gesperrt, damit diese Schwelle nicht ueber einen direkten Tabellenzugriff umgangen werden kann.

## Zugriff und Veroeffentlichung

- Der Bucket fuer Reparaturbilder ist privat.
- `pending` und `rejected` Reparaturen sind nicht oeffentlich lesbar.
- Nur `approved` Reparaturen mit Veroeffentlichungszustimmung erscheinen in Galerie und Statistik.
- Moderator*innen erhalten zeitlich begrenzte Bild-URLs. Admins und Superadmins koennen einen nicht gecachten CSV-Export erstellen.
- Der CSV-Export enthaelt keine Bild-URLs oder Roh-IP-Adressen, aber Reparatur- und Moderationsdaten. Er darf nur in einem geschuetzten Arbeitsumfeld verarbeitet werden.
- Die oeffentliche Statistik verarbeitet nur aggregierte Zahlen freigegebener Reparaturen. Die Karte im Live-Dashboard zeigt ausschliesslich Rasterzellen von rund 5 km Kantenlaenge, und auch diese erst ab fuenf Reparaturen je Zelle. Einzelne Einreichungen sind darueber nicht identifizierbar.

## Aufbewahrung und Loeschung

Folgende technischen Tatsachen gelten bereits:

- Bei einer Ablehnung wird das zugehoerige Bild sofort aus dem Storage geloescht. Die Reparaturzeile bleibt derzeit fuer die Moderationsnachvollziehbarkeit erhalten.
- Bei einem fehlgeschlagenen Datenbankinsert wird das zuvor hochgeladene Bild wieder entfernt.
- Freigegebene Bilder bleiben derzeit bis zu einer manuellen Loeschung im privaten Bucket und sind ueber die Galerie sichtbar.
- Es gibt noch keinen automatischen Loeschjob und kein Self-Service-Formular fuer Loeschanfragen.

Vor dem oeffentlichen Start muss die verantwortliche Organisation verbindlich entscheiden und technisch umsetzen:

1. Frist fuer nicht freigegebene Reparaturzeilen und Moderationskommentare.
2. Frist oder Ereignis fuer die Loeschung freigegebener Beitraege nach Ende des Weltrekordversuchs.
3. Kontaktadresse und Prozess fuer Auskunft, Berichtigung, Widerspruch und Loeschung.
4. Berechtigte Empfaenger*innen und sichere Ablage eines CSV-Exports.
5. Backup-Fristen und Wiederherstellungsprozess bei Supabase und Vercel.

Bis diese Entscheidungen als automatisierbare Regeln vorliegen, muss eine autorisierte Person Loeschanfragen im Moderationsbereich und im Supabase-Storage nachvollziehbar manuell bearbeiten.

## Cookies, Browserspeicher und Einwilligung

Eine Bestandsaufnahme am 27.08.2026 hat ergeben: Die oeffentlichen Seiten laden genau
einen nicht notwendigen Drittanbieter, `va.vercel-scripts.com` fuer Vercel Web
Analytics. Werbe- oder Trackingdienste gibt es nicht, ebenso keine Einbettungen von
Social-Media-Anbietern.

| Zweck | Was gespeichert bzw. geladen wird | Einwilligung |
| --- | --- | --- |
| Anmeldung Moderation/Verwaltung | Supabase-Sitzungscookies, nur nach Login | Nicht erforderlich (technisch notwendig) |
| Spam-Schutz des Formulars | Friendly-Captcha-Widget, nur auf den Formularseiten | Nicht erforderlich (technisch notwendig) |
| Einwilligungsentscheidung | `reparaturrekord.consent` im localStorage der Besucherin | Nicht erforderlich (speichert die Entscheidung selbst) |
| Reichweitenmessung | Vercel Web Analytics, cookiefrei | **Opt-in ueber den Einwilligungsbanner** |

Umsetzung: `lib/consent.ts` haelt das Modell, `lib/consent-store.ts` den Zugriff auf den
Browserspeicher, `components/consent-banner.tsx` den Hinweis. Ohne Entscheidung gilt
Ablehnung - `components/consent-analytics.tsx` rendert `<Analytics />` dann gar nicht,
sodass das Skript des Anbieters nicht geladen und keine Verbindung dorthin aufgebaut
wird. Ein `beforeSend`-Filter waere dafuer zu spaet.

Der Banner blockiert die Seite nicht, hat kein Schliesskreuz und zeigt Annehmen und
Ablehnen mit identischer Optik. Die Entscheidung ist ueber "Cookie-Einstellungen" im
Fussbereich jeder Seite aenderbar und widerrufbar. Kommt eine Kategorie dazu, muss
`CONSENT_VERSION` steigen; dann gilt eine alte Entscheidung nicht mehr und es wird
erneut gefragt.

Die Schriften Nunito und Playfair Display liegen ueber `next/font` auf der eigenen
Domain. Zuvor stand in `app/globals.css` ein `@import` von `fonts.googleapis.com` - der
wurde vom Bundler still verworfen, sodass weder eine Schrift ausgeliefert noch eine
Anfrage an Google gestellt wurde. Mit der Selbsthostung bleibt es dabei, dass keine
Daten an ein Schriftennetzwerk gehen.

## Beteiligte Dienste

| Dienst | Technische Rolle | Vor dem Start pruefen |
| --- | --- | --- |
| Vercel | Hosting, serverseitige Routen, Regionenheader | Vertragliche Grundlage, Regionen, Logs, Deployment Protection und WAF/Rate Limits. |
| Supabase | Authentifizierung, Postgres-Datenbank, privater Storage | Projektregion, AVV, Backups, RLS und Zugriff auf Service-Role-Secret. |
| Friendly Captcha | Bot-Erkennung beim Upload | Rechtsgrundlage, Anbieterinformationen, erlaubte Domains, CDN-Code und Datenschutztext. |
| Vercel Web Analytics | Cookiefreie Reichweitenmessung, nur nach Einwilligung | Auftragsverarbeitung, Aufbewahrung der Messdaten und Wortlaut im Datenschutztext. |

## Verbindliche Vorab-Checkliste

- [ ] Verantwortliche Stelle, Datenschutzkontakt und Kontaktweg fuer Loeschanfragen festlegen.
- [ ] Oeffentliche Seiten fuer Datenschutz, Impressum und Barrierefreiheit rechtlich freigeben.
- [ ] Aufbewahrungsfristen beschliessen und einen automatischen Loeschprozess implementieren.
- [ ] AVV, Regionen und Sicherheitsdokumentation von Vercel, Supabase und Friendly Captcha pruefen.
- [ ] Vercel-Produktionsvariablen sowie Friendly-Captcha-Domains konfigurieren.
- [ ] Globales WAF- oder Redis-basiertes Rate Limit zusaetzlich zum prozesslokalen Limit aktivieren.
- [ ] Einwilligungstexte im Banner und auf der Datenschutzseite rechtlich freigeben und die Kategorien gegen die dann tatsaechlich eingebundenen Dienste pruefen.
