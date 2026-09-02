# Öffentliche Schnittstellen

Alles, was der Live-Stand unter `/stats` anzeigt, ist über offene HTTP-Routen abrufbar — ohne API-Key, ohne Anmeldung, ohne Registrierung. Die Bühnenseite läuft im Browser: Was sie lesen kann, kann jede lesen. Deshalb steht hier, worauf man sich verlassen darf.

Gedacht ist das für gebaute Anzeigen: ein ESP32 mit LED-Matrix im Repair Café, ein Raspberry Pi am Fernseher im Foyer, ein Zähler auf einer eigenen Website. Diese Seite ist der Einstieg; die Feldtabellen stehen in den beiden ausführlichen Dokumenten:

- **[hardware-display-api.md](hardware-display-api.md)** — `/api/stats`, die Route für Displays. Nur Zahlen, Fünf-Minuten-Takt, mit Beispielcode für ESP32/Arduino und Raspberry Pi.
- **[dashboard-api.md](dashboard-api.md)** — `/api/dashboard`, die Route der Bühne. Zahlen **und** einzelne Reparaturen, Live-Takt.

Dieselbe Übersicht steht auch als Seite auf der Website unter `/api-doku`.

## Welche Route wofür

| Route | Inhalt | Takt | Grenze im Normalbetrieb |
| --- | --- | --- | --- |
| `GET /api/stats` | Alle Zahlen der Aktion: Stand, Ziel, Tageswerte, Kategorien, Kreise, Zeitachse des ganzen Zeitraums | 5 Minuten (`s-maxage=300`) | 120/min je IP |
| `GET /api/dashboard` | Zahlen **und** die jüngsten 24 Einzeleinträge, Herkunftszellen der Karte | 20 Sekunden | 240/min je IP |
| `GET /api/dashboard?since=<ISO>` | nur die seither freigegebenen Einträge | 5 Sekunden | 240/min je IP |
| `GET /api/campaign` | Zeitraum und Zielzahl — die einzige Route, die **vor** dem Start antwortet | ohne Cache | 240/min je IP |
| `GET /api/partners` | Logos und Links der unterstützenden Organisationen | 5 Minuten | 120/min je IP |
| `GET /api/gallery` | die sechs jüngsten freigegebenen Reparaturen mit Bild-URL | 1 Minute | 120/min je IP |

**Faustregel:** Soll eine Zahl auf ein Display, nimm `/api/stats`. Brauchst du wirklich die einzelnen Einträge — für ein Laufband, eine Karte, eine eigene Visualisierung —, nimm `/api/dashboard`. Die Antwort ist dort ein Vielfaches größer.

Alle Routen antworten mit `application/json` und ausschließlich auf `GET`. Neue Felder können jederzeit dazukommen: **Unbekannte Felder ignorieren, nicht als Fehler behandeln.**

## Zustände

Drei Arten von Zustand tauchen in den Antworten auf. Sie werden regelmäßig verwechselt.

### Phase der Aktion

`/api/campaign` liefert sie als `status`. Sie ergibt sich aus `startAt` und `endAt`, ein Gerät kann sie also auch selbst aus den beiden Zeitpunkten ausrechnen — und sollte das tun, wenn es lange läuft, sonst behauptet es nach dem Ende weiter, die Aktion sei offen.

| `status` | Bedeutung | Was die anderen Routen tun |
| --- | --- | --- |
| `before` | Der Zeitraum hat noch nicht begonnen. | `/api/stats` und `/api/dashboard` antworten `403`. |
| `open` | Einreichungen sind offen, es wird gezählt. | Alle Routen antworten. |
| `after` | Der Zeitraum ist beendet. | `/api/stats` antwortet weiter (der Endstand bleibt stehen), `/api/dashboard` antwortet `403`. |
| `invalid` | Es ist kein gültiger Zeitraum hinterlegt. | Wie `before`. |

### Zustand einer Einreichung

Jede Reparatur durchläuft eine Moderation. Die Zustände selbst sind nicht öffentlich abrufbar — was in den Antworten steht, ist immer schon freigegeben —, aber sie erklären, warum eine gerade eingereichte Reparatur nicht sofort auftaucht:

| Zustand | Bedeutung |
| --- | --- |
| `pending` | Eingereicht, wartet auf die Moderation. Steht in `/api/stats` als Zahl unter `pending`, sonst nirgends. |
| `approved` | Geprüft und freigegeben. Nur diese Einreichungen erscheinen in den Antworten. |
| `rejected` | Abgelehnt. Erscheint nirgends und zählt nirgends mit. |

**Wichtig:** Freigegeben heißt nicht automatisch „zählt für den Rekord". Eine zweite, unabhängige Angabe entscheidet darüber, ob die Reparatur *gelungen* ist:

- `total` — der Rekordstand: freigegeben **und** gelungen. Ein Versuch, der nicht geklappt hat, hat keinen Gegenstand im Alltag gehalten und zählt nicht mit.
- `attempted` — alle freigegebenen Einreichungen, gescheiterte Versuche eingeschlossen.
- `succeeded` — die gelungenen, also gleich `total`.

Die Erfolgsquote ist deshalb `succeeded / attempted`, nie `succeeded / total` — das wäre immer 100 Prozent. Alle abgeleiteten Größen (`today`, `bestDay`, `timeline`, `categories`, `kreise`, `minutesSaved`, `valueSavedEuros`) folgen der Auswahl von `total`.

### Tagesrekord

Drei Werte gehören zusammen, und sie beziehen sich auf einen **Ort**, nicht auf das ganze Land: Die Marke, an der sich die Aktion misst, lautet „268 Reparaturen an einem Tag *und Ort*" (Exeter 2019). Landesweit gezählt fällt sie an jedem gut besuchten Samstag, ohne dass irgendwo etwas Vergleichbares passiert wäre.

| Feld | Bedeutung |
| --- | --- |
| `todayKreise` | Heutiger Stand je Kreis bzw. kreisfreier Stadt. Der größte Wert darin ist der Ort, der heute vorn liegt. |
| `bestKreisDay` | Bester Tag eines einzelnen Ortes vor heute — der eigene Bestwert dieser Aktion, mit `date`, `kreis` und `total`. |
| `dayRecord` | Die hinterlegte Marke aus früheren Aktionen, ebenfalls „an einem Tag und Ort". `null`, wenn keine hinterlegt ist. |

Ein Display, das „Rekord geknackt" anzeigen will, rechnet also:

```text
heute   = max(todayKreise.values())
marke   = max(dayRecord ?? 0, bestKreisDay?.total ?? 0)
geknackt = marke > 0 && heute > marke
```

Daneben stehen weiter `today` und `bestDay` — dieselben Größen **landesweit**. Sie sind eine eigene, richtige Aussage („wie viel kam heute in NRW zusammen") und die Grundlage der Zeitachse, aber nicht der Vergleich mit der Marke.

Gezählt wird immer der **Einreichungstag**, nicht der Tag der Freigabe: Ein Tag ist der Tag, an dem geschraubt wurde, sonst hinge der Rekord daran, wann die Moderation Zeit hatte. Alle Tagesgrenzen liegen in der Zeitzone Europa/Berlin.

### HTTP-Status

| Code | Bedeutung | Was ein Gerät tun sollte |
| --- | --- | --- |
| `200` | Antwort wie dokumentiert. | Anzeigen. |
| `403` | Außerhalb des Zeitraums, mit `code: "outside-campaign-window"`. | „Zählung startet bald" anzeigen, **nicht** eine Null. |
| `429` | Grenze erreicht. Header `Retry-After` nennt die Wartezeit in Sekunden. | So lange warten, dann erneut. Letzten Stand stehen lassen. |
| `502` | Die Datenbank antwortet nicht. | Letzten Stand stehen lassen, später erneut versuchen. |
| `503` | Der Dienst ist nicht konfiguriert. | Wie `502`. |

Ein Gerät sollte **jeden** dieser Fälle behandeln und bei allem außer `200` den zuletzt bekannten Stand stehen lassen. Eine Anzeige, die bei einer Störung auf `0` fällt, sieht auf einer Bühne schlimmer aus als eine, die eine Minute alt ist.

## Grenzen je IP-Adresse

Zwei Dinge begrenzen die Abfragen, und sie greifen unabhängig voneinander.

**Der Cache.** Jede Route trägt einen `Cache-Control`-Header (Spalte „Takt" oben). Häufiger abzufragen liefert dieselbe Antwort — es kostet nur Strom. Bei `/api/dashboard` werden die Varianten mit und ohne `images=1` getrennt zwischengespeichert.

**Die Grenze je IP-Adresse.** Sie zählt Anfragen pro Minute und Absender. Im Normalbetrieb gelten die Werte aus der Tabelle oben; sie sind absichtlich großzügig, weil bei einer Veranstaltung alle Geräte hinter derselben Adresse stecken.

### Schonmodus

Vercel und Supabase rechnen im kostenlosen Tarif nach Aufrufen, Rechenzeit und ausgeliefertem Datenvolumen. Für den Fall, dass eines dieser Kontingente knapp wird, gibt es im Admin-Backend einen Schalter: **Einstellungen → Öffentliche Schnittstellen.** Eingeschaltet gilt für alle oben genannten Routen dieselbe, engere Grenze je IP-Adresse (Standardvorschlag 60 pro Minute). Die Umstellung wirkt sofort, ohne Deployment.

Was das für eine gebaute Anzeige heißt: **Auf `429` vorbereitet sein, auch wenn es monatelang nicht vorkommt.** `Retry-After` auswerten und in dieser Zeit nichts senden. Wer im Fünf-Minuten-Takt fragt, merkt vom Schonmodus ohnehin nichts.

Die Grenze wird je Serverinstanz gezählt und ist damit eine Bremse gegen zu schnelles Abfragen, keine harte Obergrenze — für die Einreichung selbst gibt es ein Limit, das in der Datenbank zählt.

### Freigegebene Adressen

Eine feste Anzeige soll nie anschlagen: der Rechner am Beamer, der die Bühne stundenlang offen hält und dabei vier Deltas pro Minute abfragt, oder das Infodisplay im Foyer. Deren Adressen lassen sich im Admin-Backend unter derselben Karte freigeben — **Einstellungen → Öffentliche Schnittstellen → Immer freigegebene Adressen**. Wer dort steht, fragt ohne Grenze ab, auch im Schonmodus und auch über die Vorgabe der Route hinaus.

Die Karte zeigt die Adresse, mit der das Backend gerade aufgerufen wird, und trägt sie auf Knopfdruck ein — wer am Bühnenrechner sitzt, muss sie nirgends nachschlagen. Gespeichert wird sie nur, wenn man sie einträgt.

Zwei Schreibweisen sind erlaubt:

| Form | Beispiel | Wann |
| --- | --- | --- |
| einzelne Adresse | `203.0.113.4`, `2001:db8::1` | Feste Adresse, etwa ein gemieteter Server. |
| Präfix (CIDR) | `203.0.113.0/24`, `2001:db8::/32` | Der Normalfall bei einem Veranstaltungsanschluss: Viele Provider vergeben täglich eine neue Adresse aus demselben Netz, und bei IPv6 wechselt der hintere Teil, während das delegierte Präfix stehen bleibt. |

Verglichen wird auf Bitebene, nicht als Text — `2001:db8::1` und `2001:0db8:0000:0000:0000:0000:0000:0001` sind dieselbe Adresse, und eine IPv4-mapped IPv6 (`::ffff:203.0.113.4`) trifft eine IPv4-Freigabe. Ein IPv4-Präfix gibt keine IPv6-Verbindung frei, auch wenn sie vom selben Anschluss kommt: Bei einem Dual-Stack-Anschluss gehören beide Adressen auf die Liste.

**Die Freigabe gilt nur für die Leseroute.** Die Einreichung bleibt gedrosselt: Ihr Limit ist die einzige Bremse gegen ein Skript, das ohne Captcha auf die Route eindrischt, und es ist mit 40 Einreichungen pro Minute ohnehin auf ein volles Repair Café hinter einer IP-Adresse ausgelegt.

Auf der Liste stehen nur von Hand eingetragene Adressen von *Anzeigegeräten*. Die Adressen einreichender Menschen werden weiterhin nirgends gespeichert; das Einreichungslimit zählt auf einem gesalzenen Abdruck.

### Ein guter Takt

| Anzeige | Empfehlung |
| --- | --- |
| Zahl auf einem Display | `/api/stats` alle 5 Minuten — der Cache erneuert sich nicht schneller. |
| Laufband oder Karte | einmal `/api/dashboard`, dann `?since=<cursor>` alle 15 Sekunden, und alle 5 Minuten wieder einen vollen Snapshot. |
| Countdown, Zielzahl | `/api/campaign` einmal beim Start; Restzeit und Phase rechnet das Gerät selbst aus. |

Bilder nur mit `images=1` anfordern und nur, wenn sie auch gezeigt werden: Die signierten URLs machen den größten Teil der Antwort aus und sind **15 Minuten** gültig.

## Was in den Daten steckt und was nicht

Keine Namen, keine E-Mail-Adressen, keine IP-Adressen, keine genauen Standorte. Was zu einem Ort gehört, ist bereits vor dem Speichern vergröbert:

- Die Koordinate wird **im Browser** um eine zufällige Strecke von bis zu 1 km verschoben und auf rund 110 m gerundet, bevor sie gesendet wird. Der Server nimmt nur gerundete Werte an.
- `kreis` ist die gröbste sinnvolle Ortsangabe und aus derselben Zelle abgeleitet.
- Fotos werden vor dem Upload im Browser neu gerendert; EXIF- und GPS-Metadaten fallen dabei weg.

Details stehen in [data-protection-concept.md](data-protection-concept.md).

Alles, was hier ausgeliefert wird, ist zur Veröffentlichung freigegeben und steht so auch auf der Bühne unter `/stats`. Wer es weiterverwendet, sollte dieselbe Zurückhaltung walten lassen: Es sind Beiträge von Menschen, die eine Reparatur gezeigt haben, keine Datenbank zum Weiterverkaufen.

## Und was nicht öffentlich ist

`/api/admin/*`, `/api/moderation/*`, `/api/repairs` (die Einreichung selbst) und `/api/notifications/*` verlangen eine Anmeldung mit einer Team-Rolle oder nehmen nur `POST` an. Sie sind nicht Teil dieser Zusage und können sich jederzeit ändern. Keine Zugangsdaten dieser Website und keinen Supabase-Schlüssel auf ein Gerät kopieren — die öffentlichen Routen brauchen keine.

## Stabilität

Die hier beschriebenen Felder bleiben erhalten. Neue Felder können jederzeit dazukommen, und die Reihenfolge von Listen und Objekten ist nicht garantiert. Wer eine Anzeige baut, liest die Felder, die er braucht, und ignoriert den Rest.
