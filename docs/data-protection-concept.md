# Datenschutzkonzept (technischer Stand)

Stand: 29. August 2026

Dieses Dokument beschreibt den aktuell implementierten technischen Datenfluss. Es ist keine Datenschutzerklaerung und keine Rechtsberatung. Vor dem oeffentlichen Start muessen die verantwortliche Stelle, Rechtsgrundlagen, Auftragsverarbeitungsvertraege, Kontaktwege und Fristen durch die verantwortliche Organisation rechtlich geprueft und in die oeffentliche Datenschutzerklaerung uebernommen werden.

## Zweck und Datenminimierung

Die Plattform erfasst Reparaturen fuer den Weltrekordversuch, moderiert sie und veroeffentlicht nur ausdruecklich freigegebene Beitraege. Das Uploadformular fragt weder Namen noch E-Mail-Adressen der einreichenden Person ab.

| Datenkategorie | Aktuell verarbeitet | Speicherung und Zugriff |
| --- | --- | --- |
| Reparaturangaben | Kategorie, Beschreibung, Antworten, Reparaturerfolg, optionale redaktionelle Metadaten und Moderationskommentar | Tabelle `repairs` in Supabase; nur Moderator*innen und hoeher sehen nicht freigegebene Beitraege. |
| Bild | Vom Browser neu gerendertes JPEG ohne EXIF- und GPS-Metadaten | Privater Supabase-Storage-Bucket `repair-images`; oeffentliche Galerie und Moderation erhalten nur kurzlebige signierte URLs. Das Entfernen der Metadaten geschieht derzeit allein im Browser; der Server prueft es nicht nach (siehe Vorab-Checkliste). |
| Grobe Region | Ausschliesslich der Wert `Nordrhein-Westfalen` nach erfolgreicher Vercel-Header-Pruefung | Spalte `location_region` in `repairs`; keine Stadt- oder Postleitzahldaten. |
| Anonymisierte Herkunft | Optional eine um bis zu 1 km zufaellig verschobene und auf ~110 m gerundete Koordinate, dazu der daraus abgeleitete Kreis | Spalten `location_lat`, `location_lon` und `kreis` in `repairs`. Die Verschiebung erfolgt im Browser; die genaue Koordinate wird nicht uebertragen. Der Server nimmt nur gerundete Werte an, kann die Verschiebung selbst aber nicht nachpruefen. |
| IP-Adresse | Kurzzeitig als Schlüssel des prozesslokalen Rate Limits | Nicht in `repairs` geschrieben. Der Zaehlereintrag wird nach dem jeweiligen Limitfenster verworfen: 15 Minuten fuer Einreichungen, 1 Minute fuer Statistikabfragen. |
| Friendly-Captcha-Loesung | Loesungswert aus dem Formular zur Bot-Pruefung | Nicht in der Datenbank gespeichert; wird serverseitig an Friendly Captcha `siteverify` gesendet. |
| Admin-Konten | Auth-E-Mail, optionaler Anzeigename und Anwendungrolle | Supabase Auth sowie die Tabellen `profiles` und `user_roles`; nur fuer den Moderationsbetrieb. |
| Moderationsvorgang | Wer eine Einreichung entschieden hat (`moderated_by`, `moderated_at`) und wer sie gerade prueft (`claimed_by`, `claimed_at`) | Spalten in `repairs`, nur mit dem Service-Role-Key lesbar. Der Anspruch verhindert doppelte Arbeit bei paralleler Moderation und faellt mit der Entscheidung oder nach fuenf Minuten weg; an den Browser geht nur, *ob* jemand prueft, nicht wer. |

Die Datenbankmigration enthaelt derzeit die Spalte `entry_ip`. Die aktuelle Upload-API setzt sie nicht. Sie darf nicht fuer neue Funktionen verwendet werden, bevor Notwendigkeit, Rechtsgrundlage und Aufbewahrungsfrist rechtlich festgelegt sind.

## Standort- und Bot-Pruefung

Der NRW-Check verwendet die von Vercel bereitgestellten Request-Header `x-vercel-ip-country` und `x-vercel-ip-country-region`. Akzeptiert wird nur `DE` und `NW`. Die Anwendung ruft keinen separaten Geo-IP-Anbieter auf und speichert keine Roh-IP. Bei nicht eindeutiger Zuordnung wird die Einreichung abgelehnt und die Person auf VPN oder Proxy hingewiesen.

Friendly Captcha muss vor dem Produktionsstart datenschutzrechtlich freigegeben werden. Insbesondere sind dessen Datenschutzinformationen, ein moeglicher Auftragsverarbeitungsvertrag, der vom Widget geladene CDN-Code und die Einbindung in die oeffentliche Datenschutzerklaerung zu pruefen.

## Anonymisierung der Herkunft

Fuer die Karte im Live-Dashboard wird je Reparatur hoechstens eine grob gerasterte Herkunft gespeichert. Der Ablauf ist so gebaut, dass genaue Koordinaten den Browser nie verlassen:

1. Der Browser liest die GPS-Koordinate aus den EXIF-Daten des gewaehlten Bildes, **bevor** das Bild neu gerendert und die Metadaten damit verworfen werden.
2. Der Browser verschiebt die Koordinate um eine zufaellige, gleichverteilte Strecke von bis zu 1 km, rundet auf drei Nachkommastellen (~110 m) und sendet ausschliesslich diesen Wert. Die Ausgangskoordinate wird nicht uebertragen. Der Zufall stammt aus `crypto.getRandomValues`, damit sich aus mehreren Einreichungen einer Sitzung nicht auf die Versaetze zurueckrechnen laesst.
3. Enthaelt das Bild keine Koordinate, wird ersatzweise die von Vercel aus der IP-Adresse abgeleitete Stadtkoordinate verwendet und identisch gerastert. Die IP-Adresse selbst wird dabei nicht gespeichert.
4. Der Server akzeptiert einen vom Browser gesendeten Wert nur, wenn er auf drei Nachkommastellen gerundet ist und innerhalb der konfigurierten Region liegt. Genauere Werte werden verworfen.
5. Eine im Formular manuell ausgewaehlte Kreisangabe laeuft nicht durch die Verschiebung: Sie nennt keinen Ort, sondern eine Kreisflaeche, und wird ueber diese gestreut.

Zwei Eigenschaften des Verfahrens sind bewusst in Kauf genommen und sollten bei der rechtlichen Bewertung bekannt sein:

- **Der Server kann die Anonymisierung nicht nachpruefen.** Bis August 2026 wurde auf ein 5-km-Raster geschnappt; ein Rasterwert ist reproduzierbar, und der Server verwarf alles, was nicht exakt darauf lag. Ein Zufallsversatz ist nicht reproduzierbar - jede Koordinate ist ein plausibles Ergebnis. Geprueft wird deshalb nur noch die Genauigkeit: Eine selbst gebaute Anfrage koennte eine auf ~110 m genaue Koordinate einschleusen, vorbei am Formular. Zusammen mit dem noch offenen serverseitigen Entfernen der Bild-Metadaten ist das der zweite Punkt, an dem die Zusage an der Mitarbeit des Clients haengt.
- **Wiederholte Einreichungen vom selben Ort mitteln sich aus.** Im Raster bekamen sie alle denselben Wert. Beim Zufallsversatz naehert sich der Mittelwert von n Punkten dem echten Ort mit rund 1 km/Wurzel(n). Bei einem oeffentlichen Repair-Cafe mit vielen Eintraegen ist das unproblematisch, bei wenigen Eintraegen eines Haushalts bleibt der Fehler in der Groessenordnung eines Kilometers.

Der Tausch war eine bewusste Entscheidung zugunsten einer Karte, die zeigt, wo repariert wurde, statt nur, in welchem Kreis.

Rasterung und Versatz sind der Schutz - eine zusaetzliche Mindestzahl je Zelle gibt es nicht mehr. Bis August 2026 gab die Aggregatfunktion eine Zelle erst ab fuenf zugeordneten Reparaturen aus, und ein einzelner Eintrag bekam seinen Kreis erst ab fuenf Reparaturen dort angeschrieben. Beide Schwellen sind entfallen (Migration `202608270003` und `DashboardHighlight.kreis`): Eine Zelle von 5 km Kantenlaenge und ein Kreis mit sechsstelliger Einwohnerzahl fuehren nicht auf einen Haushalt zurueck, auch nicht bei einem einzelnen Eintrag. Das war eine bewusste Entscheidung und keine Folge einer Umstellung.

Die Spalten `location_lat` und `location_lon` sind per Spalten-GRANT fuer die anonyme Datenbankrolle gesperrt. Ein direkter Tabellenzugriff mit dem oeffentlichen Schluessel kann die Herkunft damit auch nicht zeilenweise auslesen; oeffentlich erreichbar ist sie nur ueber die beiden dokumentierten Routen.

## Zugriff und Veroeffentlichung

- Der Bucket fuer Reparaturbilder ist privat.
- `pending` und `rejected` Reparaturen sind nicht oeffentlich lesbar.
- Nur `approved` Reparaturen mit Veroeffentlichungszustimmung erscheinen in Galerie und Statistik.
- Moderator*innen erhalten zeitlich begrenzte Bild-URLs. Admins und Superadmins koennen einen nicht gecachten CSV-Export erstellen.
- Der CSV-Export enthaelt keine Bild-URLs oder Roh-IP-Adressen, aber Reparatur- und Moderationsdaten. Er darf nur in einem geschuetzten Arbeitsumfeld verarbeitet werden.
- Zwei oeffentliche Routen geben freigegebene Daten heraus, beide ohne API-Key, weil die Buehnenseite im Browser laeuft:
  - `/api/stats` ausschliesslich Aggregate: Zahlen, Kategorien, Kreis-Summen, Zeitachse (siehe `docs/hardware-display-api.md`).
  - `/api/dashboard` zusaetzlich die juengsten freigegebenen Einzelbeitraege mit Kategorie, Marke/Modell, Zeitstempel, Kreis, Herkunftszelle und - nur auf Anforderung mit `images=1` - einer kurzlebigen Bild-URL, dazu die Rasterzellen der Karte (siehe `docs/dashboard-api.md`). Die Zelle je Eintrag ist dieselbe Angabe, die in der Summe ohnehin ausgeliefert wird; sie ist um bis zu 1 km zufaellig verschoben. Es ist derselbe Inhalt, der auf der Buehne unter `/stats` zu sehen ist - maschinenlesbar statt nur projiziert.
- Die Karte zeigt ausschliesslich verschobene Koordinaten. Der echte Ort einer einzelnen Einreichung liegt gleichverteilt in einer Flaeche von rund 3 km^2 um den gezeigten Punkt.

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
- [ ] EXIF- und GPS-Metadaten serverseitig aus dem hochgeladenen Bild entfernen. Derzeit erledigt das allein der Browser, indem er das Bild ueber ein Canvas neu rendert. Eine direkt zusammengebaute Anfrage kann ein Bild mit Standortdaten hochladen; nach der Freigabe ist es ueber eine signierte URL erreichbar. Die Zusage auf der Datenschutzseite haengt damit an der Mitarbeit des Clients.
