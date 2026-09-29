# Datenschutzkonzept (technischer Stand)

Stand: 29. September 2026 (Datenschutz-Audit, Issue #44)

Dieses Dokument beschreibt den aktuell implementierten technischen Datenfluss. Es ist keine Datenschutzerklaerung und keine Rechtsberatung. Vor dem oeffentlichen Start muessen die verantwortliche Stelle, Rechtsgrundlagen, Auftragsverarbeitungsvertraege, Kontaktwege und Fristen durch die verantwortliche Organisation rechtlich geprueft und in die oeffentliche Datenschutzerklaerung uebernommen werden.

## Zweck und Datenminimierung

Die Plattform erfasst Reparaturen fuer den Weltrekordversuch, moderiert sie und veroeffentlicht nur ausdruecklich freigegebene Beitraege. Das Uploadformular fragt weder Namen noch E-Mail-Adressen der einreichenden Person ab.

| Datenkategorie | Aktuell verarbeitet | Speicherung und Zugriff |
| --- | --- | --- |
| Reparaturangaben | Kategorie, Beschreibung, Antworten, Reparaturerfolg, optionale redaktionelle Metadaten und Moderationskommentar | Tabelle `repairs` in Supabase; nur Moderator*innen und hoeher sehen nicht freigegebene Beitraege. |
| Bild | Vom Browser neu gerendertes JPEG, auf dem Server zusaetzlich ohne EXIF- und GPS-Metadaten | Privater Supabase-Storage-Bucket `repair-images`; oeffentliche Galerie und Moderation erhalten nur kurzlebige signierte URLs. Die Metadaten verwirft schon der Browser beim Neurendern; seit Issue #44 schneidet sie zusaetzlich der Server heraus (`lib/strip-image-metadata.ts`), sodass auch eine am Formular vorbei gebaute Anfrage kein Bild mit Standort speichert. Erhalten bleibt allein die EXIF-Ausrichtung. |
| Grobe Region | Ausschliesslich der Wert `Nordrhein-Westfalen` nach erfolgreicher Vercel-Header-Pruefung | Spalte `location_region` in `repairs`; keine Stadt- oder Postleitzahldaten. |
| Anonymisierte Herkunft | Optional eine um bis zu 1 km zufaellig verschobene und auf ~110 m gerundete Koordinate, dazu der daraus abgeleitete Kreis | Spalten `location_lat`, `location_lon` und `kreis` in `repairs`. Die Verschiebung erfolgt im Browser; die genaue Koordinate wird nicht uebertragen. Der Server nimmt nur gerundete Werte an, kann die Verschiebung selbst aber nicht nachpruefen. |
| IP-Adresse | Fuer das Einreichungslimit nur als gesalzener Abdruck, fuer die oeffentlichen Leserouten als Schluessel eines prozesslokalen Zaehlers | Nie in `repairs` geschrieben. Einreichungen: Abdruck in `submission_throttle`, siehe "Standort- und Bot-Pruefung". Leserouten: Der Zaehlereintrag im Arbeitsspeicher wird nach einer Minute verworfen. |
| Friendly-Captcha-Loesung | Loesungswert aus dem Formular zur Bot-Pruefung | Nicht in der Datenbank gespeichert; wird serverseitig an Friendly Captcha `siteverify` gesendet. |
| Admin-Konten | Auth-E-Mail, optionaler Anzeigename und Anwendungrolle | Supabase Auth sowie die Tabellen `profiles` und `user_roles`; nur fuer den Moderationsbetrieb. |
| Moderationsvorgang | Wer eine Einreichung entschieden hat (`moderated_by`, `moderated_at`), der Moderationskommentar und wer sie gerade prueft (`claimed_by`, `claimed_at`) | Spalten in `repairs`, nur mit dem Service-Role-Key lesbar. Das gilt erst seit Migration `202609290002`: Vorher gaben die Spaltenrechte aus `202608260003` `moderated_by`, `moderated_at`, `moderator_comment` und `tags` freigegebener Reparaturen an die anonyme Rolle heraus (Issue #44). Der Anspruch verhindert doppelte Arbeit bei paralleler Moderation und faellt mit der Entscheidung oder nach fuenf Minuten weg; an den Browser geht nur, *ob* jemand prueft, nicht wer. |
| Gewinnspiel | Name und E-Mail-Adresse, aber nur bei ausdruecklicher Anmeldung ueber das Haekchen im Formular. Rechtsgrundlage ist Artikel 6 Absatz 1 Buchstabe b DSGVO (Issue #110). | Tabelle `lottery_entries`, getrennt von den Reparaturangaben und nur mit dem Service-Role-Key lesbar. Sie werden nie veroeffentlicht und erscheinen in keiner oeffentlichen Route. Dazu kommen der gewonnene Preis (`prize_id`), der Zeitpunkt der Ziehung und ein moeglicher Ausschluss (`excluded_at`). |
| Versandanschrift von Gewinnenden | Nur wo ein Gewinn verschickt wird, und ausschliesslich dafuer | Nicht in der Anwendung: Die Anschrift wird im Mailwechsel nach der Ziehung erhoben und dort nach dem Versand geloescht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Es gibt keine Spalte und keine Tabelle dafuer - wer eine anlegt, muss diesen Eintrag und die Datenschutzerklaerung mitaendern. |
| Abgebrochene Einreichung | Bei einer verlorenen Einreichung die bereits eingetragenen Reparaturangaben - Kategorie, Geraet, Dauer, Wert, Art der Reparatur, Freitext - sowie Kreis, grobe Gegend der Verbindung und Grund des Abbruchs (Issue #107) | Tabelle `abandoned_submissions`, nur mit dem Service-Role-Key lesbar und nur im Systemstatus des Admin-Backends sichtbar. Ausdruecklich **nicht** enthalten: das Foto, Name und E-Mail-Adresse der Gewinnspielteilnahme (nur das Kennzeichen `wants_lottery`) und die IP-Adresse. Die Zeilen loeschen sich nach 30 Tagen selbst; mehrere Sendeversuche desselben Vorgangs ergeben eine Zeile. |
| Ausschlussliste der Verlosung | E-Mail-Adressen und Domains, die nicht gewinnen koennen - das Projektteam und die Durchfuehrenden | Tabelle `lottery_exclusions`, nur Verwaltungskonten (Admin und Superadmin, siehe Issue #99). Sie enthaelt bewusst keine Namen und keinen Grund ueber die freiwillige Notiz hinaus. |

Die Teilnahmebedingungen des Gewinnspiels sind seit Issue #110 rechtlich geprueft. Aus dieser Pruefung folgt eine technische Zusage: Ab dem Start der Teilnahme laesst die Verwaltung keinen eingetragenen Preis mehr entfernen und keine Anzahl mehr verringern (siehe `lib/prize-list.ts`).

Die Datenbankmigration enthaelt derzeit die Spalte `entry_ip`. Die aktuelle Upload-API setzt sie nicht. Sie darf nicht fuer neue Funktionen verwendet werden, bevor Notwendigkeit, Rechtsgrundlage und Aufbewahrungsfrist rechtlich festgelegt sind.

## Standort- und Bot-Pruefung

Der NRW-Check verwendet die von Vercel bereitgestellten Request-Header `x-vercel-ip-country` und `x-vercel-ip-country-region`. Akzeptiert wird nur `DE` und `NW`. Die Anwendung ruft keinen separaten Geo-IP-Anbieter auf und speichert keine Roh-IP. Bei nicht eindeutiger Zuordnung wird die Einreichung abgelehnt und die Person auf VPN oder Proxy hingewiesen.

Das Einreichungslimit zaehlt je Internetverbindung, speichert dafuer aber keine Adresse: In `submission_throttle` steht ein mit einem Serverschluessel gesalzener SHA-256-Abdruck der IP-Adresse (`SUBMISSION_RATE_SALT`, siehe `lib/submission-gate.ts`). Der Abdruck erlaubt, zwei Anfragen derselben Verbindung zusammenzufuehren, und laesst sich ohne Kenntnis des Salzes nicht auf eine Adresse zurueckfuehren. Die Zeilen werden von der Zaehlfunktion selbst geloescht, sobald ihr Zeitfenster mehr als eine Stunde zurueckliegt.

Faellt beim Einreichen etwas aus, wird der Grund in `submission_failures` notiert - Stufe, Kurzgrund, Meldung des Dienstes, Zeitpunkt und dieselbe grobe Gegend wie in `blocked_submissions`. Kein Inhalt, keine Adresse, keine Mail. Der Eintrag verweist hoechstens auf die Reparatur-ID, damit sich eine unvollstaendig angekommene Einreichung zuordnen laesst. Seit Issue #107 zaehlt eine Zeile die Wiederholungen desselben Grundes (`hits`, `last_at`), statt dass jede Serverinstanz nur ihren ersten Vorfall aufschreibt - drei Zeilen konnten vorher fuer drei Faelle stehen oder fuer dreihundert.

Was dabei verlorenging, haelt seit Issue #107 `abandoned_submissions` fest: die bis zum Abbruch eingetragenen Reparaturangaben, damit eine Reparatur nicht deshalb ungezaehlt bleibt, weil der Spam-Schutz dazwischenkam. Die Abwaegung dahinter: Es sind dieselben Angaben, die bei einer gelungenen Einreichung ohnehin in `repairs` stehen und die die einreichende Person zur Veroeffentlichung freigegeben hat; hinzu kommt nichts. Ausgenommen bleiben das Foto, Name und Mail-Adresse der Gewinnspielteilnahme und die IP-Adresse. Die Zeilen loeschen sich nach 30 Tagen selbst - danach ist der Rekordversuch gezaehlt und die Nacherfassung gegenstandslos.

Eine Absage *von ausserhalb des Gebiets* fuellt diese Tabelle bewusst nicht. Das ist keine Stoerung, sondern eine Entscheidung, und `blocked_submissions` zaehlt diese Faelle seit jeher ohne Inhalte: Wir wollen sagen koennen, wie viele Menschen von ausserhalb mitmachen wollten, ohne die Daten von Menschen zu speichern, denen wir gerade abgesagt haben.

Friendly Captcha muss vor dem Produktionsstart datenschutzrechtlich freigegeben werden. Insbesondere sind dessen Datenschutzinformationen, ein moeglicher Auftragsverarbeitungsvertrag, der vom Widget geladene CDN-Code und die Einbindung in die oeffentliche Datenschutzerklaerung zu pruefen.

## Anonymisierung der Herkunft

Fuer die Karte im Live-Dashboard wird je Reparatur hoechstens eine grob gerasterte Herkunft gespeichert. Der Ablauf ist so gebaut, dass genaue Koordinaten den Browser nie verlassen:

1. Der Browser liest die GPS-Koordinate aus den EXIF-Daten des gewaehlten Bildes, **bevor** das Bild neu gerendert und die Metadaten damit verworfen werden.
2. Der Browser verschiebt die Koordinate um eine zufaellige, gleichverteilte Strecke von bis zu 1 km, rundet auf drei Nachkommastellen (~110 m) und sendet ausschliesslich diesen Wert. Die Ausgangskoordinate wird nicht uebertragen. Der Zufall stammt aus `crypto.getRandomValues`, damit sich aus mehreren Einreichungen einer Sitzung nicht auf die Versaetze zurueckrechnen laesst.
3. Enthaelt das Bild keine Koordinate, wird ersatzweise die von Vercel aus der IP-Adresse abgeleitete Stadtkoordinate verwendet und identisch gerastert. Die IP-Adresse selbst wird dabei nicht gespeichert.
4. Der Server akzeptiert einen vom Browser gesendeten Wert nur, wenn er auf drei Nachkommastellen gerundet ist und innerhalb der konfigurierten Region liegt. Genauere Werte werden verworfen.
5. Eine im Formular manuell ausgewaehlte Kreisangabe laeuft nicht durch die Verschiebung: Sie nennt keinen Ort, sondern eine Kreisflaeche, und wird ueber diese gestreut.

Zwei Eigenschaften des Verfahrens sind bewusst in Kauf genommen und sollten bei der rechtlichen Bewertung bekannt sein:

- **Der Server kann die Anonymisierung nicht nachpruefen.** Bis August 2026 wurde auf ein 5-km-Raster geschnappt; ein Rasterwert ist reproduzierbar, und der Server verwarf alles, was nicht exakt darauf lag. Ein Zufallsversatz ist nicht reproduzierbar - jede Koordinate ist ein plausibles Ergebnis. Geprueft wird deshalb nur noch die Genauigkeit: Eine selbst gebaute Anfrage koennte eine auf ~110 m genaue Koordinate einschleusen, vorbei am Formular. Seit der Server die Bild-Metadaten selbst entfernt (Issue #44), ist das der einzige Punkt, an dem die Zusage an der Mitarbeit des Clients haengt.
- **Wiederholte Einreichungen vom selben Ort mitteln sich aus.** Im Raster bekamen sie alle denselben Wert. Beim Zufallsversatz naehert sich der Mittelwert von n Punkten dem echten Ort mit rund 1 km/Wurzel(n). Bei einem oeffentlichen Repair-Cafe mit vielen Eintraegen ist das unproblematisch, bei wenigen Eintraegen eines Haushalts bleibt der Fehler in der Groessenordnung eines Kilometers.

Der Tausch war eine bewusste Entscheidung zugunsten einer Karte, die zeigt, wo repariert wurde, statt nur, in welchem Kreis.

Rasterung und Versatz sind der Schutz - eine zusaetzliche Mindestzahl je Zelle gibt es nicht mehr. Bis August 2026 gab die Aggregatfunktion eine Zelle erst ab fuenf zugeordneten Reparaturen aus, und ein einzelner Eintrag bekam seinen Kreis erst ab fuenf Reparaturen dort angeschrieben. Beide Schwellen sind entfallen (Migration `202608270003` und `DashboardHighlight.kreis`). Begruendet wurde das damals mit dem 5-km-Raster: Eine solche Zelle und ein Kreis mit sechsstelliger Einwohnerzahl fuehren nicht auf einen Haushalt zurueck, auch nicht bei einem einzelnen Eintrag.

**Diese Begruendung traegt seit dem Wechsel zum Zufallsversatz nur noch fuer den Kreis.** Das Audit in Issue #44 hat festgehalten: `/api/dashboard` liefert ohne Anmeldung je gezaehlter Reparatur einen Punkt auf ~110 m gerundet und hoechstens 1 km verschoben, und ueber `since` laesst sich die ganze Liste abrufen. Ueber die Reparatur-ID gehoert zu jedem Punkt eine oeffentliche Geschichte und gegebenenfalls ein Foto unter `/reparatur/<id>`. Ob ein Punkt mit rund 1 km Unschaerfe ohne Mindestzahl vertretbar ist, gehoert in die rechtliche Pruefung; technisch liesse sich die Schwelle wieder einfuehren oder der Versatz vergroessern.

Ein direkter Tabellenzugriff mit dem oeffentlichen Schluessel kann die Herkunft nicht zeilenweise auslesen: Seit Migration `202609290002` hat die anonyme Datenbankrolle auf `repairs` gar keine Rechte mehr (siehe "Direkter Datenbankzugriff"). Oeffentlich erreichbar ist die Herkunft nur ueber die beiden dokumentierten Routen.

## Zugriff und Veroeffentlichung

- Der Bucket fuer Reparaturbilder ist privat.
- `pending` und `rejected` Reparaturen sind nicht oeffentlich lesbar.
- Nur `approved` Reparaturen mit Veroeffentlichungszustimmung erscheinen in Galerie und Statistik.
- Moderator*innen erhalten zeitlich begrenzte Bild-URLs. Admins und Superadmins koennen einen nicht gecachten CSV-Export erstellen.
- Die Verlosung ist zwischen Admins und Superadmins geteilt (Issue #99): Preise, Ausschlussliste, der Stand der Ziehung und der CSV-Export der gezogenen Personen (`/api/admin/lottery/export`) stehen Verwaltungskonten offen, weil die Gewinnbenachrichtigungen von Hand geschrieben werden und nicht von der Person, die zieht. Die Ziehung selbst - ziehen, neu ziehen, zuruecknehmen und die Buehnenziehung unter `/tombola` - bleibt bei den Superadmins. Der Export enthaelt Namen und E-Mail-Adressen und ist damit die sensibelste Datei des Projekts; er wird nicht zwischengespeichert (`Cache-Control: no-store`).
- Die Buehnenziehung unter `/tombola` zeigt Name, Kreis, Gegenstand und Reparaturgeschichte der gezogenen Person, aber ausdruecklich **nicht** ihre E-Mail-Adresse: Die Seite laeuft auf einer Leinwand vor Publikum. Angezeigt wird sie nicht, im Browser des Buehnenrechners liegt sie aber: Die Seite laedt denselben Stand wie die Verwaltung (`GET /api/admin/lottery`), und der enthaelt die Mail-Adressen aller bisher Gezogenen und die Ausschlussliste. Wer an diesem Rechner die Entwicklerwerkzeuge oeffnet, sieht sie (Issue #44, bewusst noch nicht geaendert). Die Liste aller Teilnehmenden verlaesst den Server auch fuer die Animation nicht - was dort durchlaeuft, sind die bereits gezogenen Namen.
- Der CSV-Export enthaelt keine Bild-URLs oder Roh-IP-Adressen, aber Reparatur- und Moderationsdaten. Er darf nur in einem geschuetzten Arbeitsumfeld verarbeitet werden. Beide Exporte stellen Feldern, die eine Tabellenkalkulation als Formel lesen wuerde, ein Hochkomma voran (`lib/csv.ts`); die Einreichung begrenzt Name, Mail, Marke und Geschichte auf die Laengen des Formulars.
- Signierte Bild-URLs gelten zwischen 5 und 15 Minuten: Galerie und Statusseite 300 Sekunden, Moderation, Dashboard und Bilderwand 900 Sekunden. Eine Loeschung oder Ablehnung entfernt die Datei, dann endet auch jede ausgegebene URL sofort. Anders beim Zuruecksetzen einer Freigabe: Dort bleibt die Datei, und eine bereits ausgegebene URL funktioniert bis zu ihrem Ablauf weiter. Das Teilen-Bild mit Foto liegt hoechstens sechs Minuten im Zwischenspeicher.
- Antworten unter `/api/admin`, `/api/moderation`, `/api/notifications` und `/api/auth` tragen `Cache-Control: private, no-store` (`next.config.ts`).
- Zwei oeffentliche Routen geben freigegebene Daten heraus, beide ohne API-Key, weil die Buehnenseite im Browser laeuft:
  - `/api/stats` ausschliesslich Aggregate: Zahlen, Kategorien, Kreis-Summen, Zeitachse (siehe `docs/hardware-display-api.md`).
  - `/api/dashboard` zusaetzlich die juengsten freigegebenen Einzelbeitraege mit Kategorie, Marke/Modell, Zeitstempel, Kreis, Herkunftszelle und - nur auf Anforderung mit `images=1` - einer kurzlebigen Bild-URL, dazu die Rasterzellen der Karte (siehe `docs/dashboard-api.md`). Die Zelle je Eintrag ist dieselbe Angabe, die in der Summe ohnehin ausgeliefert wird; sie ist um bis zu 1 km zufaellig verschoben. Es ist derselbe Inhalt, der auf der Buehne unter `/stats` zu sehen ist - maschinenlesbar statt nur projiziert.
- Die Karte zeigt ausschliesslich verschobene Koordinaten. Der echte Ort einer einzelnen Einreichung liegt gleichverteilt in einer Flaeche von rund 3 km^2 um den gezeigten Punkt.

## Direkter Datenbankzugriff

Der oeffentliche Supabase-Schluessel steht im Code jeder Seite. Was die Datenbankrollen `anon` und `authenticated` duerfen, kann deshalb jede Person ueber `/rest/v1` abfragen, an allen Routen der Anwendung vorbei. Die Anwendung selbst braucht diese Rechte nicht: Jede Route liest und schreibt mit dem Service-Role-Key, und die Sitzung angemeldeter Personen fragt nur die eigene Rolle in `user_roles` ab (`lib/admin-auth.ts`). Die Module mit dem Service-Role-Key sind mit `server-only` markiert, damit sie nicht versehentlich in eine Client-Komponente geraten.

Stand nach Migration `202609290002` (Issue #44):

| Tabelle | Zugriff mit dem oeffentlichen Schluessel |
| --- | --- |
| `repairs`, `campaign_settings`, `lottery_entries`, `lottery_exclusions`, `lottery_prizes` | Keine Rechte, auch nicht fuer angemeldete Konten. Vorher waren `campaign_settings` (mit der IP-Freigabeliste der Anzeigegeraete) und `lottery_prizes` (auch noch nicht angekuendigte Preise) vollstaendig lesbar, von `repairs` die Moderationsspalten freigegebener Zeilen. `lottery_entries` war schon vorher nur durch RLS geschuetzt und nicht lesbar; jetzt ist zusaetzlich jedes Recht entzogen. |
| `abandoned_submissions`, `submission_failures`, `submission_throttle`, `blocked_submissions` | Keine Rechte, RLS ohne Policy. |
| `push_subscriptions`, `profiles`, `user_roles` | Keine Rechte fuer `anon`; angemeldete Konten sehen die eigene Zeile, Moderation und Verwaltung nach ihrer Rolle. |
| `partners` | Oeffentlich lesbar, gewollt. |
| Datenbankfunktionen | Alle Funktionen mit `security definer` sind nur fuer den Service-Role-Key ausfuehrbar (Migration `202609170001` und folgende). |

Storage: `repair-images` ist privat und hat keine Policy. `partner-logos`, `site-assets`, `prize-logos` und `prize-photos` sind oeffentlich lesbar, damit Bilder ueber ihre Adresse erreichbar sind, lassen sich aber nicht auflisten; schreiben koennen nur Verwaltungskonten.

Der Stand ist aus den Migrationen abgeleitet. Ob die Produktionsdatenbank ihm entspricht, zeigt eine Abfrage im SQL-Editor, zum Beispiel `select has_table_privilege('anon', 'public.lottery_entries', 'select');` (muss `false` sein) und `select * from pg_policies;`.

## Aufbewahrung und Loeschung

Folgende technischen Tatsachen gelten bereits:

- Bei einer Ablehnung wird das zugehoerige Bild sofort aus dem Storage geloescht. Die Reparaturzeile bleibt derzeit fuer die Moderationsnachvollziehbarkeit erhalten.
- Unabhaengig davon kann die Moderation das Bild einer Einreichung jederzeit einzeln loeschen (`DELETE /api/moderation/repairs/<id>/image`, Issue #49). Das ist der Weg fuer eine Loeschanfrage zu einer erkennbaren Person. Fuer den zweiten Fall - die Reparatur stimmt, das Foto soll nicht oeffentlich werden - gibt es die Freigabe ohne Foto als eigene Entscheidung (`PATCH .../<id>` mit `status: "approved"` und `deleteImage: true`). Sie loescht das Bild vor der Freigabe, damit es nicht zwischen zwei Aufrufen sichtbar wird. Die Datei verschwindet aus dem Bucket, `image_path` wird geleert und `image_deleted_at` gesetzt; die Reparatur zaehlt weiter fuer den Rekord. Der Anlass der Loeschung wird bewusst nicht gespeichert - er waere selbst eine Angabe ueber die Person, die sich gemeldet hat.
- Die Reparaturzeile entsteht vor dem Bild-Upload; der Upload laeuft hinter der Antwort. `image_path` wird erst nach dem erfolgreichen Upload nachgetragen, damit kein Verweis auf eine nicht vorhandene Datei entsteht. Laesst sich die Datei umgekehrt nicht mit der Zeile verknuepfen, wird sie sofort wieder aus dem Storage entfernt - eine Datei ohne Verweis kaeme weder zur Moderation noch zur Loeschung.
- Zeilen in `submission_throttle` raeumt die Zaehlfunktion selbst weg. Fuer `submission_failures` gibt es noch keine Frist; die Tabelle enthaelt keine personenbezogenen Daten, sollte aber in die untenstehende Fristenentscheidung aufgenommen werden.
- Zeilen in `abandoned_submissions` raeumt die schreibende Funktion selbst weg, sobald sie aelter als 30 Tage sind (`record_abandoned_submission`, Migration 202609170002). Anders als `submission_failures` enthaelt diese Tabelle Freitext, deshalb hat sie von Anfang an eine Frist.
- Freigegebene Bilder bleiben derzeit bis zu einer manuellen Loeschung im privaten Bucket und sind ueber die Galerie sichtbar.
- Personen auf den Bildern werden nicht unkenntlich gemacht; der Rekordversuch soll die Menschen hinter den Reparaturen zeigen. Getragen wird das allein von der Einwilligung: Das Formular fragt die Veroeffentlichung des Fotos ausdruecklich ab, sobald eines ausgewaehlt ist, und laesst bestaetigen, dass erkennbare Personen einverstanden sind. Die Statusseite einer freigegebenen Reparatur nennt den Kontaktweg fuer eine spaetere Loeschung des Fotos.
- Es gibt noch keinen automatischen Loeschjob und kein Self-Service-Formular fuer Loeschanfragen.
- Fuer `lottery_entries` und `lottery_exclusions` gibt es ebenfalls noch keine Frist. Die oeffentlichen Teilnahmebedingungen sagen zu, dass die Angaben nach Abschluss der Verlosung geloescht werden; das geschieht derzeit von Hand und gehoert in dieselbe Fristenentscheidung.

Vor dem oeffentlichen Start muss die verantwortliche Organisation verbindlich entscheiden und technisch umsetzen:

1. Frist fuer nicht freigegebene Reparaturzeilen, Moderationskommentare und Eintraege in `submission_failures`. Fuer `abandoned_submissions` ist sie mit 30 Tagen bereits gesetzt und implementiert (siehe Migration 202609170002); die Entscheidung sollte pruefen, ob sie so bleibt.
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

- [x] Verantwortliche Stelle und Kontaktweg festgelegt (Issue #78): Collaborating Centre on Sustainable
      Consumption and Production gGmbH (CSCP), Hagenauer Str. 30, 42107 Wuppertal, reparatur@cscp.org.
      Offen bleibt, ob ein eigener Datenschutzkontakt benannt wird.
- [ ] Oeffentliche Seiten fuer Datenschutz, Impressum und Barrierefreiheit rechtlich freigeben.
- [ ] Aufbewahrungsfristen beschliessen und einen automatischen Loeschprozess implementieren.
- [ ] AVV, Regionen und Sicherheitsdokumentation von Vercel, Supabase und Friendly Captcha pruefen.
- [ ] Vercel-Produktionsvariablen sowie Friendly-Captcha-Domains konfigurieren.
- [ ] Globales WAF- oder Redis-basiertes Rate Limit zusaetzlich zum prozesslokalen Limit aktivieren.
- [ ] Einwilligungstexte im Banner und auf der Datenschutzseite rechtlich freigeben und die Kategorien gegen die dann tatsaechlich eingebundenen Dienste pruefen.
- [x] EXIF- und GPS-Metadaten serverseitig aus dem hochgeladenen Bild entfernen (Issue #44, `lib/strip-image-metadata.ts`). Bilder, die vor dieser Aenderung hochgeladen wurden, sind davon nicht erfasst: Ueber das Formular kamen sie ohne Metadaten, eine selbst gebaute Anfrage koennte aber eines mit Standort hinterlassen haben.
- [ ] Im Supabase-Dashboard pruefen, dass die Selbstregistrierung abgeschaltet ist. Ein selbst angelegtes Konto bekommt zwar keine zusaetzlichen Rechte, braucht es aber auch nicht.
- [ ] Eine vollstaendige Content-Security-Policy einfuehren. Bisher steht nur `frame-ancestors 'self'`, weil Friendly Captcha und Vercel Analytics Skripte von eigenen Hosts laden.
