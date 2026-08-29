# Live-Daten der Bühne abrufen

`/api/stats` liefert die Oberdaten der Aktion — Zahlen, Kategorien, Kreise, Zeitachse (siehe [hardware-display-api.md](hardware-display-api.md)). Wer eine eigene Visualisierung baut und dafür **einzelne Reparaturen** braucht, nimmt die Route, aus der auch die Bühne unter `/stats` ihre Daten zieht:

```text
GET https://DEINE-DOMAIN.example/api/stats        # nur Zahlen, Fünf-Minuten-Takt
GET https://DEINE-DOMAIN.example/api/dashboard    # Zahlen und Einzeleinträge, Live-Takt
```

Auch diese Route braucht keinen API-Key. Sie ist für die Bühnenseite gebaut, die im Browser läuft — was diese Seite lesen kann, kann jede lesen, und deshalb steht hier, worauf man sich verlassen darf.

Nimm `/api/stats`, wenn eine Zahl auf ein Display soll. Nimm `/api/dashboard` nur, wenn du wirklich die einzelnen Einträge brauchst: Die Antwort ist ein Vielfaches groß und der Takt ist deutlich schneller.

## Zwei Betriebsarten

Die Route hat einen vollständigen und einen schlanken Modus. Eine dauerhaft laufende Anzeige benutzt beide:

| Aufruf | Inhalt | Cache |
| --- | --- | --- |
| `GET /api/dashboard` | vollständiger Snapshot | 20 Sekunden |
| `GET /api/dashboard?since=<ISO-Zeitstempel>` | nur die seither freigegebenen Einträge | 5 Sekunden |

Dazu kommt ein Schalter: **`&images=1` liefert Bild-URLs mit, ohne ihn bleibt `imageUrl` überall `null`.** Standardmäßig ohne, weil die signierten URLs den größten Teil der Antwort ausmachen und einen zusätzlichen Aufruf beim Speicher kosten — die Bühne selbst hängt ihn nur an, solange sie Einzelbilder zeigt. Wer keine Fotos anzeigt, lässt ihn weg.

Der Ablauf: einmal den Snapshot holen, dessen `cursor` merken, danach im Takt mit `?since=<cursor>` nachfragen und den Cursor aus jeder Antwort übernehmen. Alle paar Minuten einen frischen Snapshot holen, damit ein verpasstes Delta nicht dauerhaft fehlt. Die Bühnenseite fragt alle 15 Sekunden ein Delta und alle 5 Minuten einen Snapshot ab — schneller als der Cache erlaubt lohnt sich nicht.

## Snapshot

```json
{
  "total": 184,
  "goal": 3177,
  "succeeded": 171,
  "withStory": 63,
  "minutesSaved": 9240,
  "valueSavedEuros": 21450,
  "today": 23,
  "bestDay": { "date": "2026-10-17", "total": 41 },
  "dayRecord": 412,
  "categories": { "textiles": 12, "toys": 9 },
  "performedBy": { "alone": 88, "with_support": 71, "by_someone": 25 },
  "kreise": { "Wuppertal": 31, "Kreis Steinfurt": 12 },
  "cells": [{ "lat": 51.256, "lon": 7.148, "count": 1 }],
  "timeline": [{ "date": "2026-10-01", "total": 8 }],
  "highlights": [
    {
      "id": "0f1c…",
      "category": "textiles",
      "brandModel": "Nähmaschine Pfaff 260",
      "imageUrl": "https://…/repair-images/…?token=…",
      "imageAltText": "Nähmaschine mit geöffnetem Gehäuse",
      "submittedAt": "2026-10-17T09:12:00.000Z",
      "approvedAt": "2026-10-17T09:40:00.000Z",
      "kreis": "Wuppertal",
      "lat": 51.266,
      "lon": 7.161
    }
  ],
  "campaign": { "startAt": "2026-10-01T06:00:00.000Z", "endAt": "2026-10-31T20:00:00.000Z" },
  "cursor": "2026-10-17T09:40:00.000Z",
  "generatedAt": "2026-10-17T09:41:12.004Z"
}
```

| Feld | Bedeutung |
| --- | --- |
| `total`, `goal` | Freigegebene Reparaturen und Ziel des Weltrekordversuchs. |
| `succeeded` | Davon erfolgreich repariert. |
| `withStory` | Davon mit erzählter Geschichte. |
| `minutesSaved` | Summe der angegebenen Reparaturzeiten in Minuten. |
| `valueSavedEuros` | Summe der geschätzten Warenwerte. |
| `today` | Stand des laufenden Tages (Berliner Kalendertag, gezählt nach Einreichung). |
| `bestDay` | Bester Tag vor heute, oder `null`, solange es keinen gibt. |
| `dayRecord` | Tagesrekord aus früheren Aktionen, oder `null`. |
| `categories` | Kategorieschlüssel und Anzahl, siehe Tabelle unten. |
| `performedBy` | `alone`, `with_support` oder `by_someone` und Anzahl. |
| `kreise` | Alle Kreise und kreisfreien Städte mit mindestens einer Reparatur. |
| `cells` | Herkunftsangaben der Karte: anonymisierte Koordinate und Anzahl der Reparaturen darauf. Meist `count: 1` — die Liste wächst also ungefähr mit der Zahl der Reparaturen, bei einem vollen Weltrekordversuch auf einige tausend Einträge. Wer nur Zahlen braucht, nimmt `/api/stats`. |
| `timeline` | Die letzten 30 Tage, gezählt nach Einreichungstag. Wer die ganze Aktion braucht, nimmt `/api/stats`. |
| `highlights` | Die jüngsten 24 freigegebenen Reparaturen, neueste zuerst. |
| `campaign` | Anfang und Ende des Einreichungszeitraums. |
| `cursor` | Zeitstempel der jüngsten berücksichtigten Freigabe — der Wert für `?since=`. |
| `generatedAt` | Zeitpunkt, zu dem diese Antwort entstanden ist. |

Kategorieschlüssel: `bicycle`, `computers_and_phones`, `furniture`, `household_appliances`, `jewelry_glasses`, `other`, `photo_video_car`, `sharpening`, `textiles`, `tools`, `toys`, `watches`.

### Einzelne Reparatur

| Feld | Bedeutung |
| --- | --- |
| `id` | UUID der Reparatur, stabil. |
| `category` | Kategorieschlüssel wie oben. |
| `brandModel` | Freitext der einreichenden Person, oder `null`. |
| `imageUrl` | Signierte URL des Fotos, **15 Minuten gültig**. Ohne `images=1` immer `null`. |
| `imageAltText` | Bildbeschreibung, oder `null`. |
| `submittedAt` | Zeitpunkt der Einreichung — die Angabe, die zählt. |
| `approvedAt` | Zeitpunkt der Freigabe. Daran hängt die Reihenfolge der Deltas. |
| `kreis` | Kreis oder kreisfreie Stadt, oder `null`, wenn keiner bestimmt werden konnte. |
| `lat`, `lon` | Anonymisierte Herkunft dieser Reparatur — derselbe Wert, der in `cells` steht, nur dieser Zeile zugeordnet. `null`, wenn keine Herkunft ermittelt wurde. |

`imageUrl` ist kein dauerhafter Link. Wer Bilder anzeigt, hängt `images=1` an, lädt sie zeitnah und holt sich mit dem nächsten Snapshot eine frische URL. Eine abgelaufene URL liefert kein Bild mehr.

`lat` und `lon` sind nicht der Ort der Reparatur, sondern ein im Browser zufällig um bis zu 1 km verschobener Punkt, gerundet auf rund 110 m. Zwei Reparaturen vom selben Ort bekommen dadurch verschiedene Werte; gelegentlich fallen zwei auf denselben gerundeten Punkt, dann steht er in `cells` mit `count: 2`.

## Delta

```json
{
  "total": 186,
  "today": 25,
  "added": [ { "id": "…", "category": "toys", "…": "wie oben" } ],
  "categories": { "toys": 2 },
  "cursor": "2026-10-17T09:44:10.000Z",
  "generatedAt": "2026-10-17T09:44:12.771Z"
}
```

`added` enthält höchstens 50 Einträge, neueste zuerst, und nur Freigaben **nach** dem gesendeten Zeitstempel. `categories` zählt nur diese Einträge, nicht die ganze Aktion — die Gesamtzahlen kommen aus `total` und dem nächsten Snapshot. `today` kann `null` sein, wenn der Tagesstand gerade nicht zu ermitteln war; dann den bisherigen Wert stehen lassen.

Kommen mehr als 50 Freigaben zwischen zwei Abfragen zusammen, liefert die Antwort die ältesten 50 und einen entsprechend älteren Cursor. Die nächste Abfrage holt den Rest — es geht nichts verloren, es dauert nur ein paar Runden.

## Grenzen und Fehler

- **Cache:** Snapshot 20 Sekunden, Delta 5 Sekunden (`stale-while-revalidate` zusätzlich 120 bzw. 30 Sekunden). Häufiger abfragen liefert dieselbe Antwort. Mit und ohne `images=1` werden getrennt zwischengespeichert.
- **Rate Limit:** 240 Anfragen pro Minute pro IP-Adresse. Bei `429` die im Header `Retry-After` genannte Zeit warten.
- **Außerhalb des Einreichungszeitraums:** `403` mit `code: "outside-campaign-window"`. Dann etwas wie „Statistik startet bald“ anzeigen statt eines Fehlerwerts.
- **Störung:** `502`, wenn die Datenbank nicht antwortet, `503`, wenn der Dienst nicht konfiguriert ist. In beiden Fällen den letzten bekannten Stand stehen lassen und es später erneut versuchen.

Die Route ist ohne Ankündigung änderbar, solange die hier beschriebenen Felder erhalten bleiben. Neue Felder können jederzeit dazukommen — unbekannte Felder also ignorieren, nicht als Fehler behandeln.

## Was in den Daten steckt und was nicht

Die Antwort enthält keine Namen, keine E-Mail-Adressen, keine IP-Adressen und keine genauen Standorte. Was zu einem Ort gehört, ist bereits vor dem Speichern vergröbert:

- Die Koordinate wird **im Browser** um eine zufällige Strecke von bis zu 1 km verschoben und auf rund 110 m gerundet, bevor sie überhaupt gesendet wird. Der echte Ort liegt gleichverteilt irgendwo in einer Fläche von rund 3 km² um den veröffentlichten Punkt. Der Server nimmt nur gerundete Werte an — eine rohe GPS-Koordinate wird verworfen.
- Eine manuell ausgewählte Kreisangabe wird stattdessen über den Kreis gestreut; sie war nie ein Ort.
- `kreis` ist die gröbste sinnvolle Ortsangabe und aus derselben Zelle abgeleitet.
- Fotos werden vor dem Upload im Browser neu gerendert; EXIF- und GPS-Metadaten fallen dabei weg.

Alles, was hier ausgeliefert wird, ist zur Veröffentlichung freigegeben und steht so auch auf der Bühne unter `/stats`. Wer es weiterverwendet, sollte dieselbe Zurückhaltung walten lassen: Es sind Beiträge von Menschen, die eine Reparatur gezeigt haben, keine Datenbank zum Weiterverkaufen.

## Beispiel: Snapshot und Deltas in Python

```python
import time
import requests

BASE = "https://DEINE-DOMAIN.example/api/dashboard"

def run():
    snapshot = requests.get(BASE, timeout=10).json()
    cursor = snapshot["cursor"]
    print(f"{snapshot['total']} von {snapshot['goal']} Reparaturen")
    last_snapshot = time.monotonic()

    while True:
        time.sleep(15)

        # Alle fünf Minuten den ganzen Stand nachziehen, damit ein verpasstes
        # Delta nicht dauerhaft fehlt.
        if time.monotonic() - last_snapshot > 300:
            snapshot = requests.get(BASE, timeout=10).json()
            cursor = snapshot["cursor"]
            last_snapshot = time.monotonic()
            continue

        response = requests.get(BASE, params={"since": cursor}, timeout=10)
        if response.status_code == 429:
            time.sleep(int(response.headers.get("Retry-After", "60")))
            continue
        if response.status_code != 200:
            continue

        delta = response.json()
        cursor = delta["cursor"] or cursor
        for entry in delta["added"]:
            ort = f" aus {entry['kreis']}" if entry["kreis"] else ""
            print(f"neu: {entry['category']}{ort}")
```

Installieren: `python -m pip install requests`.
