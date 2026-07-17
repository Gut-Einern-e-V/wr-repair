# Öffentliche Statistik auf einem Display anzeigen

Während des aktiven Kampagnenzeitraums kann ein Display die öffentliche Statistik direkt abrufen:

```text
GET https://DEINE-DOMAIN.example/api/stats
```

Die Schnittstelle benötigt keinen API-Key und liefert ausschließlich freigegebene, aggregierte Daten. Sie enthält keine Bilder, E-Mail-Adressen, IP-Adressen oder Standortdaten.

## Antwortformat

```json
{
  "total": 184,
  "categories": {
    "electronics": 72,
    "household": 45
  },
  "timeline": [
    { "date": "2026-10-01", "total": 8 }
  ]
}
```

`total` ist die Zahl aller freigegebenen Reparaturen. `categories` enthält Kategorienamen und ihre Gesamtzahl. `timeline` enthält die Freigaben der letzten 30 Tage in der Zeitzone Europa/Berlin.

Die Antwort wird für fünf Minuten am Edge-Cache gehalten. Geräte sollten deshalb höchstens alle fünf Minuten abrufen. Es gelten 120 Anfragen pro Minute pro IP-Adresse; bei `429` muss das Gerät die im Header `Retry-After` genannte Zeit warten.

Außerhalb des Kampagnenzeitraums antwortet die Route mit `403` und `code: "outside-campaign-window"`. Dann sollte das Display beispielsweise „Statistik startet bald“ statt eines Fehlerwerts anzeigen.

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
    JsonDocument document;
    deserializeJson(document, http.getString());
    const long total = document["total"] | 0;
    // Hier den Wert auf OLED, LCD oder LED-Matrix ausgeben.
    Serial.printf("Freigegebene Reparaturen: %ld\n", total);
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
        total = response.json().get("total", 0)
        print(f"Freigegebene Reparaturen: {total}")
        # display.show(total)  # Hier die verwendete Display-Bibliothek anbinden.
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