# Öffentliche Statistik auf einem Display anzeigen

Ab dem Start des Kampagnenzeitraums kann ein Display die öffentliche Statistik direkt abrufen — auch nach dessen Ende, damit ein Gerät das Ergebnis stehen lassen kann:

```text
GET https://DEINE-DOMAIN.example/api/stats
```

Die Schnittstelle benötigt keinen API-Key und liefert ausschließlich freigegebene, aggregierte Daten. Sie enthält keine Bilder, E-Mail-Adressen, IP-Adressen und keine Einzeleinträge. Ortsangaben gibt es nur als Summe je Kreis, nie als Koordinate.

Wer einzelne Reparaturen braucht statt nur der Zahlen — für eine eigene Visualisierung, ein Laufband, eine Karte —, nimmt stattdessen [die Live-Daten der Bühne](dashboard-api.md). Eine Übersicht über alle öffentlichen Routen, ihre Zustände und die Grenzen je IP-Adresse steht in [public-api.md](public-api.md).

## Antwortformat

```json
{
  "total": 184,
  "goal": 3177,
  "pending": 12,
  "today": 23,
  "bestDay": { "date": "2026-10-17", "total": 41 },
  "dayRecord": 268,
  "todayKreise": { "Wuppertal": 14, "Remscheid": 6 },
  "bestKreisDay": { "date": "2026-10-17", "kreis": "Wuppertal", "total": 31 },
  "attempted": 198,
  "succeeded": 184,
  "withStory": 46,
  "minutesSaved": 8832,
  "valueSavedEuros": 18768,
  "performedBy": {
    "alone": 74,
    "with_support": 88,
    "by_someone": 22
  },
  "categories": {
    "electronics": 72,
    "household": 45
  },
  "categoryMinutes": {
    "electronics": 3456,
    "household": 2700
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
| `total` | Der Rekordstand: freigegebene Reparaturen, die **gelungen** sind. Ein Versuch, der nicht geglückt ist, zählt nicht mit. |
| `goal` | Aktuelles Ziel des Weltrekordversuchs. |
| `pending` | Einreichungen, die gerade auf die Moderation warten. Sie zählen noch nicht zu `total` — und ob sie es je tun, entscheidet sich erst mit der Prüfung. |
| `today` | Stand des laufenden Tages, **landesweit**. |
| `bestDay` | Bester Tag dieser Aktion vor heute, landesweit, oder `null`, solange es keinen gibt. |
| `dayRecord` | Bisheriger Tagesrekord aus früheren Aktionen, **an einem Tag und Ort**, oder `null`, wenn keiner hinterlegt ist. |
| `todayKreise` | Heutiger Stand je Kreis bzw. kreisfreier Stadt. Der größte Wert darin ist der Ort, der heute vorn liegt. |
| `bestKreisDay` | Bester Tag eines einzelnen Ortes vor heute, mit `date`, `kreis` und `total`, oder `null`. |
| `attempted` | Alle freigegebenen Einreichungen, gescheiterte Versuche eingeschlossen. Bezugsgröße der Erfolgsquote (`succeeded / attempted`), nie der Rekordstand. |
| `succeeded` | Reparaturen, die geglückt sind — gleich `total`. |
| `withStory` | Einreichungen, zu denen eine Geschichte erzählt wurde. |
| `minutesSaved` | Summe der angegebenen Reparaturzeit in Minuten. Nicht jede Einreichung macht eine Angabe. |
| `valueSavedEuros` | Summe des angegebenen Gegenstandswerts in Euro. Ebenfalls freiwillig. |
| `performedBy` | Wer repariert hat: `alone`, `with_support`, `by_someone`. |
| `categories` | Kategoriename und Gesamtzahl. |
| `categoryMinutes` | Reparaturzeit je Kategorie in Minuten. |
| `kreise` | Alle Kreise und kreisfreien Städte mit mindestens einer Reparatur, nicht nur die vordersten. |
| `timeline` | Ein Eintrag je Tag, Tage ohne Reparatur als `0`. |
| `campaign` | Anfang und Ende des Einreichungszeitraums als ISO-Zeitstempel. |

### Was für den Rekord zählt

Für den Rekordstand zählen nur **gelungene** Reparaturen. Wer einen Versuch einträgt, der nicht geklappt hat, bleibt in der Aktion und in der Verlosung, taucht aber nicht in `total` auf — ein Gegenstand, der weiterhin kaputt ist, wurde nicht im Alltag gehalten. Alle abgeleiteten Zahlen folgen derselben Auswahl: `today`, `bestDay`, `timeline`, `categories`, `kreise`, `minutesSaved` und `valueSavedEuros`. Wer die Erfolgsquote anzeigen möchte, rechnet `succeeded / attempted`.

### Der Tagesrekord zählt je Ort

Die Marke, an der sich die Aktion misst, lautet „268 Reparaturen an einem Tag **und Ort**“ (Exeter 2019). Landesweit gezählt fällt sie an jedem gut besuchten Samstag, ohne dass irgendwo etwas Vergleichbares passiert wäre. Verglichen wird deshalb der Kreis bzw. die kreisfreie Stadt mit dem höchsten Tagesstand:

```text
heute    = max(todayKreise.values())
marke    = max(dayRecord ?? 0, bestKreisDay?.total ?? 0)
geknackt = marke > 0 && heute > marke
```

`today` und `bestDay` bleiben daneben stehen: Sie sagen, wie viel landesweit zusammenkam, und tragen die Zeitachse — sie sind aber nicht der Vergleich mit der Marke.

### Welchen Zeitraum die Zeitachse abdeckt

`timeline` folgt dem Einreichungszeitraum: Sie beginnt an dessen erstem Tag und endet am heutigen Tag, längstens aber am letzten Tag des Zeitraums. Der Zeitraum ist im Backend einstellbar, die Zahl der Einträge also nicht fest: Ein Gerät sollte über die Liste laufen und sich nicht auf 30 Einträge verlassen. Bei einem Zeitraum von mehr als 366 Tagen werden nur dessen letzte 366 Tage geliefert.

Gezählt wird der Tag der Einreichung, nicht der Tag der Freigabe: Ein Tag ist der Tag, an dem repariert wurde, sonst hinge die Zeitachse daran, wann die Moderation Zeit hatte. Alle Tagesgrenzen liegen in der Zeitzone Europa/Berlin. Alle anderen Zahlen (`total`, `categories`, `kreise`) sind Gesamtwerte der Aktion; da Einreichungen nur innerhalb des Zeitraums möglich sind, decken sie genau ihn ab.

### Grenzen je IP-Adresse

Im Normalbetrieb 120 Anfragen pro Minute und IP-Adresse; die Antwort liegt fünf Minuten im Cache, häufiger zu fragen liefert also dieselben Zahlen. Wird ein Free-Tier-Kontingent bei Vercel oder Supabase knapp, lässt sich im Backend eine engere Grenze einschalten (siehe [public-api.md](public-api.md#schonmodus)). Ein Gerät sollte `429` deshalb behandeln und die im Header `Retry-After` genannte Zeit abwarten, auch wenn es monatelang nicht vorkommt.

Für ein Display, das dauerhaft im Foyer oder am Beamer läuft, lässt sich die Adresse im Backend von der Grenze ausnehmen — siehe [Freigegebene Adressen](public-api.md#freigegebene-adressen). Frag dafür beim Team nach; die Adresse des Anschlusses genügt.

### Wann die Route antwortet

Vor dem Start des Zeitraums antwortet sie mit `403` — es gibt nichts zu zählen, und eine Null wäre eine falsche Auskunft. Ab dem Start und **auch nach dem Ende** liefert sie Zahlen: Nach dem Zeitraum ist `today` in aller Regel `0`, `total` steht still, und ein Display kann das Ergebnis stehen lassen. Genau diese Zahlen zeigt auch der Rückblick unter `/stats`.

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
    filter["todayKreise"] = true;
    filter["bestKreisDay"]["total"] = true;

    JsonDocument document;
    deserializeJson(document, http.getStream(), DeserializationOption::Filter(filter));
    const long total = document["total"] | 0;
    const long goal = document["goal"] | 0;
    // Tagesrekord je Ort: der staerkste Kreis von heute gegen die Marke.
    long bestToday = 0;
    for (JsonPair entry : document["todayKreise"].as<JsonObject>()) {
      const long amount = entry.value().as<long>();
      if (amount > bestToday) bestToday = amount;
    }
    // Groessere der beiden Bestmarken - fruehere Aktionen oder diese hier.
    const long record = max(document["dayRecord"] | 0L, document["bestKreisDay"]["total"] | 0L);
    // Hier die Werte auf OLED, LCD oder LED-Matrix ausgeben.
    Serial.printf("Reparaturen: %ld von %ld, bester Ort heute %ld (Rekord %ld)\n", total, goal, bestToday, record);
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
        # Tagesrekord je Ort: staerkster Kreis von heute gegen die Marke.
        today_kreise = stats.get("todayKreise") or {}
        best_kreis, best_today = max(today_kreise.items(), key=lambda item: item[1], default=("-", 0))
        record = max(stats.get("dayRecord") or 0, (stats.get("bestKreisDay") or {}).get("total", 0))
        print(f"Freigegebene Reparaturen: {stats['total']} von {stats['goal']}")
        print(f"Heute vorn: {best_kreis} mit {best_today} (Tagesrekord {record}), in Moderation: {stats['pending']}")
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