# Öffentliche Statistik auf einem Display anzeigen

Während des aktiven Kampagnenzeitraums kann ein Display die öffentliche Statistik direkt abrufen:

```text
GET https://DEINE-DOMAIN.example/api/stats
```

Die Schnittstelle benötigt keinen API-Key und liefert ausschließlich freigegebene, aggregierte Daten. Sie enthält keine Bilder, E-Mail-Adressen, IP-Adressen und keine Einzeleinträge. Ortsangaben gibt es nur als Summe je Kreis, nie als Koordinate.

Wer einzelne Reparaturen braucht statt nur der Zahlen — für eine eigene Visualisierung, ein Laufband, eine Karte —, nimmt stattdessen [die Live-Daten der Bühne](dashboard-api.md).

## Antwortformat

```json
{
  "total": 184,
  "goal": 3177,
  "pending": 12,
  "today": 23,
  "bestDay": { "date": "2026-10-17", "total": 41 },
  "dayRecord": 412,
  "categories": {
    "electronics": 72,
    "household": 45
  },
  "kreise": {
    "Wuppertal": 31,
    "Kreis Steinfurt": 12
  },
  "timeline": [
    { "date": "2026-10-01", "total": 8 }
  ],
  "campaign": {
    "startAt": "2026-10-01T06:00:00.000Z",
    "endAt": "2026-10-31T20:00:00.000Z"
  }
}
```

| Feld | Bedeutung |
| --- | --- |
| `total` | Alle freigegebenen Reparaturen. |
| `goal` | Aktuelles Ziel des Weltrekordversuchs. |
| `pending` | Einreichungen, die gerade auf die Moderation warten. Sie zählen noch nicht zu `total`. |
| `today` | Stand des laufenden Tages. |
| `bestDay` | Bester Tag dieser Aktion vor heute, oder `null`, solange es keinen gibt. |
| `dayRecord` | Bisheriger Tagesrekord aus früheren Aktionen, oder `null`, wenn keiner hinterlegt ist. |
| `categories` | Kategoriename und Gesamtzahl. |
| `kreise` | Alle Kreise und kreisfreien Städte mit mindestens einer Reparatur, nicht nur die vordersten. |
| `timeline` | Ein Eintrag je Tag, Tage ohne Reparatur als `0`. |
| `campaign` | Anfang und Ende des Einreichungszeitraums als ISO-Zeitstempel. |

Ein Tagesrekord besteht aus drei Werten: `today` ist der laufende Tag, `bestDay` der beste Tag dieser Aktion, `dayRecord` die Bestmarke aus früheren Jahren. Ein Display, das „Rekord geknackt“ anzeigen will, vergleicht `today` mit dem größeren der beiden anderen Werte.

### Welchen Zeitraum die Zeitachse abdeckt

`timeline` folgt dem Einreichungszeitraum: Sie beginnt an dessen erstem Tag und endet am heutigen Tag — die Route antwortet ohnehin nur innerhalb des Zeitraums. Der Zeitraum ist im Backend einstellbar, die Zahl der Einträge also nicht fest: Ein Gerät sollte über die Liste laufen und sich nicht auf 30 Einträge verlassen. Bei einem Zeitraum von mehr als 366 Tagen werden nur dessen letzte 366 Tage geliefert.

Gezählt wird der Tag der Einreichung, nicht der Tag der Freigabe: Ein Tag ist der Tag, an dem repariert wurde, sonst hinge die Zeitachse daran, wann die Moderation Zeit hatte. Alle Tagesgrenzen liegen in der Zeitzone Europa/Berlin. Alle anderen Zahlen (`total`, `categories`, `kreise`) sind Gesamtwerte der Aktion; da Einreichungen nur innerhalb des Zeitraums möglich sind, decken sie genau ihn ab.

## ESP32 oder Arduino mit WLAN

Benötigt werden `WiFi.h`, `HTTPClient.h` und `ArduinoJson`. Die Bibliothek ArduinoJson kann über den Library Manager installiert werden.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* wifiSsid = "WLAN-NAME";
const char* wifiPassword = "WLAN-PASSWORT";
const char* statsUrl = "https://DEINE-DOMAIN.example/api/stats";

void refreshRepairCount() {
  HTTPClient http;
  http.begin(statsUrl);
  const int status = http.GET();

  if (status == 200) {
    // Nur die Felder lesen, die das Display braucht: Kreisliste und
    // Zeitachse zusammen sind fuer den Arbeitsspeicher eines ESP32 viel.
    JsonDocument filter;
    filter["total"] = true;
    filter["goal"] = true;
    filter["today"] = true;
    filter["pending"] = true;
    filter["dayRecord"] = true;
    filter["bestDay"]["total"] = true;

    JsonDocument document;
    deserializeJson(document, http.getStream(), DeserializationOption::Filter(filter));
    const long total = document["total"] | 0;
    const long goal = document["goal"] | 0;
    const long today = document["today"] | 0;
    // Groessere der beiden Bestmarken - fruehere Aktionen oder diese hier.
    const long record = max(document["dayRecord"] | 0L, document["bestDay"]["total"] | 0L);
    // Hier die Werte auf OLED, LCD oder LED-Matrix ausgeben.
    Serial.printf("Reparaturen: %ld von %ld, heute %ld (Rekord %ld)\n", total, goal, today, record);
  } else if (status == 403) {
    Serial.println("Kampagne ist gerade nicht aktiv.");
  } else {
    Serial.printf("Statistik nicht verfügbar: HTTP %d\n", status);
  }

  http.end();
}
```

Nach der WLAN-Verbindung `refreshRepairCount()` im `setup()` aufrufen und über `millis()` nur im Fünf-Minuten-Takt wiederholen. Keine Zugangsdaten dieser Website oder Supabase-Schlüssel auf das Gerät kopieren.

## Raspberry Pi mit Python

```python
import time
import requests

STATS_URL = "https://DEINE-DOMAIN.example/api/stats"

while True:
    response = requests.get(STATS_URL, timeout=10)
    if response.status_code == 200:
        stats = response.json()
        best_day = (stats.get("bestDay") or {}).get("total", 0)
        record = max(stats.get("dayRecord") or 0, best_day)
        print(f"Freigegebene Reparaturen: {stats['total']} von {stats['goal']}")
        print(f"Heute: {stats['today']} (Tagesrekord {record}), in Moderation: {stats['pending']}")
        for kreis, amount in sorted(stats["kreise"].items(), key=lambda item: -item[1]):
            print(f"  {kreis}: {amount}")
        # display.show(stats["total"])  # Hier die verwendete Display-Bibliothek anbinden.
    elif response.status_code == 403:
        print("Kampagne ist gerade nicht aktiv.")
    elif response.status_code == 429:
        time.sleep(int(response.headers.get("Retry-After", "300")))
        continue
    else:
        print(f"Statistik nicht verfügbar: HTTP {response.status_code}")

    time.sleep(300)
```

Installieren: `python -m pip install requests`. Für ein dauerhaftes Infodisplay empfiehlt sich ein systemd-Service mit einem eigenen, eingeschränkten Benutzer. Das Gerät darf ausschließlich die öffentliche Statistikroute lesen.