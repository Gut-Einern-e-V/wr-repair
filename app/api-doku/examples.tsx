/**
 * Beispielcode der Schnittstellen-Doku (Issue #80).
 *
 * Ausgelagert, weil die Quelltexte als Vorlagen lang sind und die Seite selbst
 * sonst nicht mehr zu lesen waere. Die Adresse kommt als Eigenschaft herein,
 * damit in den Beispielen die echte Domain steht und niemand einen Platzhalter
 * kopiert, der dann nicht antwortet.
 *
 * Bewusst zwei Sprachen: Ein ESP32 ist das, was in einer Werkstatt am
 * naechsten liegt, und ein Raspberry Pi das, was am Fernseher im Foyer haengt.
 * Beide Beispiele holen absichtlich nur die Felder, die eine Anzeige braucht -
 * die Kreisliste und die Zeitachse zusammen sind fuer den Arbeitsspeicher
 * eines Mikrocontrollers viel.
 */

function arduinoExample(siteUrl: string) {
  return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* wifiSsid     = "WLAN-NAME";
const char* wifiPassword = "WLAN-PASSWORT";
const char* statsUrl     = "${siteUrl}/api/stats";

void refreshRepairCount() {
  HTTPClient http;
  http.begin(statsUrl);
  const int status = http.GET();

  if (status == 200) {
    // Nur die Felder lesen, die das Display braucht: Kreisliste und Zeitachse
    // zusammen sind fuer den Arbeitsspeicher eines ESP32 viel.
    JsonDocument filter;
    filter["total"]       = true;
    filter["goal"]        = true;
    filter["today"]       = true;
    filter["dayRecord"]   = true;
    filter["todayKreise"] = true;
    filter["bestKreisDay"]["total"] = true;

    JsonDocument document;
    deserializeJson(document, http.getStream(), DeserializationOption::Filter(filter));

    const long total = document["total"] | 0;
    const long goal  = document["goal"]  | 0;

    // Tagesrekord je Ort: der stärkste Kreis von heute gegen die Marke
    // "an einem Tag und Ort" (Issue #75).
    long bestToday = 0;
    const char* bestKreis = "-";
    for (JsonPair entry : document["todayKreise"].as<JsonObject>()) {
      const long amount = entry.value().as<long>();
      if (amount > bestToday) { bestToday = amount; bestKreis = entry.key().c_str(); }
    }
    const long mark = max(document["dayRecord"] | 0L, document["bestKreisDay"]["total"] | 0L);

    // Hier die Werte auf OLED, LCD oder LED-Matrix ausgeben.
    Serial.printf("Reparaturen: %ld von %ld\\n", total, goal);
    Serial.printf("Heute vorn: %s mit %ld (Marke %ld)%s\\n",
                  bestKreis, bestToday, mark,
                  (mark > 0 && bestToday > mark) ? " - REKORD!" : "");
  } else if (status == 403) {
    Serial.println("Kampagne ist gerade nicht aktiv.");
  } else if (status == 429) {
    // Grenze erreicht. Retry-After nennt die Wartezeit in Sekunden.
    Serial.printf("Gedrosselt, warte %s s\\n", http.header("Retry-After").c_str());
  } else {
    Serial.printf("Statistik nicht verfuegbar: HTTP %d\\n", status);
  }

  http.end();
}`;
}

function pythonExample(siteUrl: string) {
  return `import time
import requests

STATS_URL = "${siteUrl}/api/stats"
INTERVAL = 300  # Fuenf Minuten - schneller erneuert sich der Cache nicht.

while True:
    try:
        response = requests.get(STATS_URL, timeout=10)
    except requests.RequestException:
        # Netz weg: letzten Stand stehen lassen und spaeter erneut versuchen.
        time.sleep(INTERVAL)
        continue

    if response.status_code == 200:
        stats = response.json()

        # Tagesrekord je Ort: staerkster Kreis von heute gegen die Marke.
        today_kreise = stats.get("todayKreise") or {}
        best_kreis, best_today = max(today_kreise.items(), key=lambda item: item[1], default=("-", 0))
        best_own = (stats.get("bestKreisDay") or {}).get("total", 0)
        mark = max(stats.get("dayRecord") or 0, best_own)

        print(f"{stats['total']} von {stats['goal']} Reparaturen")
        print(f"Heute vorn: {best_kreis} mit {best_today} (Marke {mark})")
        if mark and best_today > mark:
            print("Neuer Tagesrekord an einem Ort!")
        # display.show(stats["total"])  # Hier die Display-Bibliothek anbinden.

    elif response.status_code == 403:
        print("Kampagne ist gerade nicht aktiv.")
    elif response.status_code == 429:
        # Gedrosselt: genau so lange warten, wie der Header sagt.
        time.sleep(int(response.headers.get("Retry-After", str(INTERVAL))))
        continue
    else:
        print(f"Statistik nicht verfuegbar: HTTP {response.status_code}")

    time.sleep(INTERVAL)`;
}

export function ApiExamples({ siteUrl }: { siteUrl: string }) {
  return <>
    <section>
      <h2>ESP32 oder Arduino mit WLAN</h2>
      <p>Benötigt werden <code>WiFi.h</code>, <code>HTTPClient.h</code> und <code>ArduinoJson</code> &ndash; letzteres über den Library Manager. Nach der WLAN-Verbindung <code>refreshRepairCount()</code> im <code>setup()</code> aufrufen und über <code>millis()</code> nur im Fünf-Minuten-Takt wiederholen.</p>
      <div className="api-code"><pre><code>{arduinoExample(siteUrl)}</code></pre></div>
    </section>

    <section>
      <h2>Raspberry Pi mit Python</h2>
      <p>Installieren mit <code>python -m pip install requests</code>. Für ein dauerhaftes Infodisplay empfiehlt sich ein systemd-Service mit einem eigenen, eingeschränkten Benutzer. Das Gerät darf ausschließlich die öffentlichen Routen lesen.</p>
      <div className="api-code"><pre><code>{pythonExample(siteUrl)}</code></pre></div>
    </section>
  </>;
}
