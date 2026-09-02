import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getAppSettings } from "@/lib/app-settings";
import { publicLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/share";
import { ApiExamples } from "./examples";

export const metadata = {
  title: "Schnittstellen für eigene Anzeigen",
  description:
    "Wie sich der Live-Stand des Reparaturrekords NRW abrufen lässt: offene HTTP-Routen ohne API-Key, mit Feldbedeutungen, Zuständen und Beispielcode für ESP32, Arduino und Raspberry Pi.",
};

/* Grenzen und Zeitraum sind im Backend einstellbar. Eine Doku, die sie nennt,
   muss deshalb mitlaufen - fuenf Minuten sind fuer eine Textseite reichlich
   (Issue #80). */
export const revalidate = 300;

const REPO = "https://github.com/Gut-Einern-e-V/wr-repair/blob/main/docs";

/**
 * Grenzen der oeffentlichen Leseroute im Normalbetrieb. Muss mit den
 * `*_LIMIT_PER_MINUTE`-Konstanten in den Routen zusammenpassen - sie stehen
 * dort, weil jede Route ihre eigene Begruendung hat, und hier, weil eine Doku
 * ohne Zahlen nichts nuetzt.
 */
const routes: { path: string; content: string; cache: string; limit: number }[] = [
  { path: "/api/stats", content: "Alle Zahlen der Aktion: Stand, Ziel, Tageswerte, Kategorien, Kreise, Zeitachse des ganzen Zeitraums.", cache: "5 Minuten", limit: 120 },
  { path: "/api/dashboard", content: "Zahlen und die jüngsten 24 Einzeleinträge samt anonymisierter Herkunft für eine Karte.", cache: "20 Sekunden", limit: 240 },
  { path: "/api/dashboard?since=…", content: "Nur die seit dem genannten Zeitstempel freigegebenen Einträge.", cache: "5 Sekunden", limit: 240 },
  { path: "/api/campaign", content: "Zeitraum und Zielzahl – die einzige Route, die auch vor dem Start antwortet.", cache: "ohne Cache", limit: 240 },
  { path: "/api/partners", content: "Logos und Links der unterstützenden Organisationen.", cache: "5 Minuten", limit: 120 },
  { path: "/api/gallery", content: "Die sechs jüngsten freigegebenen Reparaturen mit Bild-URL.", cache: "1 Minute", limit: 120 },
  { path: "/api/mosaic", content: "Die Bilderwand der Startseite: die 40 jüngsten freigegebenen Fotos samt Gesamtzahl.", cache: "10 Minuten", limit: 120 },
];

const phases: { status: string; meaning: string; effect: string }[] = [
  { status: "before", meaning: "Der Zeitraum hat noch nicht begonnen.", effect: "/api/stats und /api/dashboard antworten 403." },
  { status: "open", meaning: "Einreichungen sind offen, es wird gezählt.", effect: "Alle Routen antworten." },
  { status: "after", meaning: "Der Zeitraum ist beendet.", effect: "/api/stats antwortet weiter – der Endstand bleibt stehen. /api/dashboard antwortet 403." },
  { status: "invalid", meaning: "Es ist kein gültiger Zeitraum hinterlegt.", effect: "Wie before." },
];

const httpStates: { code: string; meaning: string; advice: string }[] = [
  { code: "200", meaning: "Antwort wie dokumentiert.", advice: "Anzeigen." },
  { code: "403", meaning: "Außerhalb des Zeitraums, mit code: \"outside-campaign-window\".", advice: "„Zählung startet bald“ anzeigen – nicht eine Null." },
  { code: "429", meaning: "Grenze je IP-Adresse erreicht. Der Header Retry-After nennt die Wartezeit in Sekunden.", advice: "So lange warten, dann erneut. Letzten Stand stehen lassen." },
  { code: "502", meaning: "Die Datenbank antwortet nicht.", advice: "Letzten Stand stehen lassen, später erneut versuchen." },
  { code: "503", meaning: "Der Dienst ist nicht konfiguriert.", advice: "Wie 502." },
];

/**
 * Oeffentliche Schnittstellen-Doku (Issue #80).
 *
 * Zielgruppe sind Menschen, die eine eigene Anzeige bauen - ein ESP32 mit
 * LED-Matrix im Repair-Cafe, ein Raspberry Pi am Fernseher im Foyer. Die
 * ausfuehrlichen Feldtabellen bleiben im Repository (docs/public-api.md und die
 * beiden Routendokumente); diese Seite ist der Einstieg, den man ohne GitHub
 * findet und weitergeben kann.
 *
 * Die Zahlen darin kommen aus derselben Quelle wie das Verhalten der Routen:
 * Zielzahl und Zeitraum aus den Einstellungen, die gedrosselte Grenze aus
 * `publicLimit()`. Eine Doku, die etwas anderes behauptet als die Route tut,
 * ist schlimmer als keine.
 */
export default async function ApiDocsPage() {
  const settings = await getAppSettings();
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const throttle = settings.publicThrottle;

  return <main className="page-shell content-page">
    <SiteHeader />
    <article className="legal-page api-doc">
      <p className="eyebrow">Für Entwickler*innen</p>
      <h1>Baue deine eigene Anzeige.</h1>

      <section>
        <h2>Worum es geht</h2>
        <p>Alles, was der <Link href="/stats">Live-Stand</Link> anzeigt, ist über offene HTTP-Routen abrufbar &ndash; ohne API-Key, ohne Anmeldung, ohne Registrierung. Die Bühnenseite läuft im Browser: Was sie lesen kann, kann jede lesen. Deshalb steht hier, worauf du dich verlassen darfst.</p>
        <p>Gedacht ist das für gebaute Anzeigen: ein ESP32 mit LED-Matrix im Repair Café, ein Raspberry Pi am Fernseher im Foyer, ein Zähler auf einer eigenen Website. Wenn du etwas damit gebaut hast, freuen wir uns über eine Nachricht an <a href="mailto:mail@gut-einern.org?subject=Anzeige%20mit%20der%20Reparaturrekord-Schnittstelle">mail@gut-einern.org</a>.</p>
        <p>Die vollständigen Feldtabellen stehen im Repository: <a href={`${REPO}/public-api.md`} target="_blank" rel="noreferrer">Übersicht</a>, <a href={`${REPO}/hardware-display-api.md`} target="_blank" rel="noreferrer">/api/stats für Displays</a> und <a href={`${REPO}/dashboard-api.md`} target="_blank" rel="noreferrer">/api/dashboard für eigene Visualisierungen</a>.</p>
      </section>

      <section>
        <h2>Welche Route wofür</h2>
        <div className="api-table-scroll">
          <table className="api-table">
            <thead><tr><th>Route</th><th>Inhalt</th><th>Takt</th><th>Grenze je IP</th></tr></thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.path}>
                  <td><code>GET {route.path}</code></td>
                  <td>{route.content}</td>
                  <td>{route.cache}</td>
                  <td>{publicLimit(throttle, route.limit).toLocaleString("de-DE")}/min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p><strong>Faustregel:</strong> Soll eine Zahl auf ein Display, nimm <code>/api/stats</code>. Brauchst du wirklich die einzelnen Einträge &ndash; für ein Laufband, eine Karte, eine eigene Visualisierung &ndash;, nimm <code>/api/dashboard</code>. Die Antwort ist dort ein Vielfaches größer.</p>
        <p>Alle Routen antworten mit <code>application/json</code> und ausschließlich auf <code>GET</code>. Neue Felder können jederzeit dazukommen: <strong>unbekannte Felder ignorieren, nicht als Fehler behandeln.</strong></p>
      </section>

      <section>
        <h2>Was zählt, und was nicht</h2>
        <p>Jede Reparatur durchläuft eine Moderation. Nur freigegebene Einreichungen erscheinen überhaupt in den Antworten &ndash; eine gerade eingereichte Reparatur taucht also nicht sofort auf. Wie viele gerade warten, sagt <code>pending</code> in <code>/api/stats</code>.</p>
        <p>Freigegeben heißt aber nicht automatisch „zählt für den Rekord“. Eine zweite Angabe entscheidet darüber, ob die Reparatur <em>gelungen</em> ist:</p>
        <ul>
          <li><code>total</code> &ndash; der Rekordstand: freigegeben <strong>und</strong> gelungen. Ein Versuch, der nicht geklappt hat, hat keinen Gegenstand im Alltag gehalten und zählt nicht mit.</li>
          <li><code>attempted</code> &ndash; alle freigegebenen Einreichungen, gescheiterte Versuche eingeschlossen.</li>
          <li><code>succeeded</code> &ndash; die gelungenen, also gleich <code>total</code>.</li>
        </ul>
        <p>Die Erfolgsquote ist deshalb <code>succeeded / attempted</code> und nie <code>succeeded / total</code> &ndash; das wäre immer 100 Prozent. Alle abgeleiteten Größen (<code>today</code>, <code>bestDay</code>, <code>timeline</code>, <code>categories</code>, <code>kreise</code>, <code>minutesSaved</code>, <code>valueSavedEuros</code>) folgen der Auswahl von <code>total</code>.</p>
        <p>Das aktuelle Ziel liegt bei <strong>{settings.recordGoal.toLocaleString("de-DE")}</strong> Reparaturen. Es ist im Backend änderbar &ndash; lies es aus <code>goal</code>, statt es in dein Gerät zu schreiben.</p>
      </section>

      <section>
        <h2>Phase der Aktion</h2>
        <p><code>/api/campaign</code> liefert sie als <code>status</code>. Sie ergibt sich aus <code>startAt</code> und <code>endAt</code>; ein Gerät, das lange läuft, sollte sie <strong>selbst</strong> aus den beiden Zeitpunkten ausrechnen &ndash; sonst behauptet es nach dem Ende weiter, die Aktion sei offen.</p>
        <div className="api-table-scroll">
          <table className="api-table">
            <thead><tr><th>status</th><th>Bedeutung</th><th>Was die anderen Routen tun</th></tr></thead>
            <tbody>
              {phases.map((phase) => (
                <tr key={phase.status}><td><code>{phase.status}</code></td><td>{phase.meaning}</td><td>{phase.effect}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Tagesrekord: immer je Ort</h2>
        <p>Die Marke, an der sich die Aktion misst, lautet „268 Reparaturen an einem Tag <em>und Ort</em>“ (Exeter 2019). Landesweit gezählt fällt sie an jedem gut besuchten Samstag, ohne dass irgendwo etwas Vergleichbares passiert wäre. Verglichen wird deshalb der Kreis bzw. die kreisfreie Stadt mit dem höchsten Tagesstand:</p>
        <ul>
          <li><code>todayKreise</code> &ndash; heutiger Stand je Ort. Der größte Wert darin ist der Ort, der heute vorn liegt.</li>
          <li><code>bestKreisDay</code> &ndash; bester Tag eines einzelnen Ortes vor heute, mit <code>date</code>, <code>kreis</code> und <code>total</code>.</li>
          <li><code>dayRecord</code> &ndash; die hinterlegte Marke aus früheren Aktionen, ebenfalls „an einem Tag und Ort“. <code>null</code>, wenn keine hinterlegt ist.</li>
        </ul>
        <p>Daneben stehen weiter <code>today</code> und <code>bestDay</code> &ndash; dieselben Größen <strong>landesweit</strong>. Sie sind eine eigene, richtige Aussage („wie viel kam heute in NRW zusammen“) und die Grundlage der Zeitachse, aber nicht der Vergleich mit der Marke.</p>
        <p>Gezählt wird immer der <strong>Einreichungstag</strong>, nicht der Tag der Freigabe: Ein Tag ist der Tag, an dem geschraubt wurde, sonst hinge der Rekord daran, wann die Moderation Zeit hatte. Alle Tagesgrenzen liegen in der Zeitzone Europa/Berlin.</p>
      </section>

      <section>
        <h2>Fehler und Zustände</h2>
        <div className="api-table-scroll">
          <table className="api-table">
            <thead><tr><th>Code</th><th>Bedeutung</th><th>Was ein Gerät tun sollte</th></tr></thead>
            <tbody>
              {httpStates.map((state) => (
                <tr key={state.code}><td><code>{state.code}</code></td><td>{state.meaning}</td><td>{state.advice}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Behandle <strong>jeden</strong> dieser Fälle und lass bei allem außer <code>200</code> den zuletzt bekannten Stand stehen. Eine Anzeige, die bei einer Störung auf <code>0</code> fällt, sieht auf einer Bühne schlimmer aus als eine, die eine Minute alt ist.</p>
      </section>

      <section>
        <h2>Grenzen je IP-Adresse</h2>
        <p>Zwei Dinge begrenzen die Abfragen, unabhängig voneinander. <strong>Der Cache:</strong> Jede Route trägt einen <code>Cache-Control</code>-Header (Spalte „Takt“ oben). Häufiger abzufragen liefert dieselbe Antwort &ndash; es kostet nur Strom. <strong>Die Grenze je IP-Adresse:</strong> Sie zählt Anfragen pro Minute und Absender und ist absichtlich großzügig, weil bei einer Veranstaltung alle Geräte hinter derselben Adresse stecken.</p>
        <p>Vercel und Supabase rechnen im kostenlosen Tarif nach Aufrufen, Rechenzeit und ausgeliefertem Datenvolumen. Wird ein Kontingent knapp, lässt sich im Backend ein <strong>Schonmodus</strong> einschalten: Dann gilt für alle oben genannten Routen dieselbe, engere Grenze &ndash; sofort und ohne Deployment.
          {throttle.enabled
            ? <> Aktuell ist er <strong>eingeschaltet</strong>: Es gelten {throttle.perMinute.toLocaleString("de-DE")} Anfragen pro Minute und IP-Adresse.</>
            : <> Aktuell ist er ausgeschaltet, es gelten die Werte in der Tabelle oben.</>}
        </p>
        <p>Für dein Gerät heißt das: <strong>auf <code>429</code> vorbereitet sein</strong>, auch wenn es monatelang nicht vorkommt. Wer im Fünf-Minuten-Takt fragt, merkt vom Schonmodus ohnehin nichts.</p>
        <p><strong>Feste Anzeigen können freigegeben werden.</strong> Ein Rechner am Beamer oder ein Display im Foyer, das dauerhaft läuft, soll nie anschlagen &ndash; solche Adressen lassen sich im Backend von jeder Grenze ausnehmen, einzeln (<code>203.0.113.4</code>) oder als Präfix des Anschlusses (<code>203.0.113.0/24</code>, <code>2001:db8::/32</code>). Wenn du so etwas aufbaust, schreib uns die Adresse an <a href="mailto:mail@gut-einern.org?subject=IP-Freigabe%20f%C3%BCr%20eine%20Anzeige">mail@gut-einern.org</a>. Die Freigabe gilt nur fürs Lesen; die Einreichung bleibt für alle gleich gedrosselt.</p>
        <div className="api-table-scroll">
          <table className="api-table">
            <thead><tr><th>Anzeige</th><th>Empfohlener Takt</th></tr></thead>
            <tbody>
              <tr><td>Zahl auf einem Display</td><td><code>/api/stats</code> alle 5 Minuten &ndash; der Cache erneuert sich nicht schneller.</td></tr>
              <tr><td>Laufband oder Karte</td><td>einmal <code>/api/dashboard</code>, dann <code>?since=&lt;cursor&gt;</code> alle 15 Sekunden, und alle 5 Minuten wieder einen vollen Snapshot.</td></tr>
              <tr><td>Countdown, Zielzahl</td><td><code>/api/campaign</code> einmal beim Start; Restzeit und Phase rechnet das Gerät selbst aus.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Bilder nur mit <code>images=1</code> anfordern und nur, wenn sie auch gezeigt werden: Die signierten URLs machen den größten Teil der Antwort aus und sind <strong>15 Minuten</strong> gültig.</p>
      </section>

      <ApiExamples siteUrl={siteUrl} />

      <section>
        <h2>Was in den Daten steckt und was nicht</h2>
        <p>Keine Namen, keine E-Mail-Adressen, keine IP-Adressen, keine genauen Standorte. Was zu einem Ort gehört, ist bereits vor dem Speichern vergröbert: Die Koordinate wird <strong>im Browser</strong> um eine zufällige Strecke von bis zu 1 km verschoben und auf rund 110 m gerundet, bevor sie gesendet wird. <code>kreis</code> ist die gröbste sinnvolle Ortsangabe und aus derselben Zelle abgeleitet. Fotos werden vor dem Upload im Browser neu gerendert; EXIF- und GPS-Metadaten fallen dabei weg. Details in der <Link href="/privacy">Datenschutzerklärung</Link>.</p>
        <p>Alles, was hier ausgeliefert wird, ist zur Veröffentlichung freigegeben und steht so auch auf der Bühne unter <Link href="/stats">/stats</Link>. Wer es weiterverwendet, sollte dieselbe Zurückhaltung walten lassen: Es sind Beiträge von Menschen, die eine Reparatur gezeigt haben, keine Datenbank zum Weiterverkaufen.</p>
      </section>

      <section>
        <h2>Und was nicht öffentlich ist</h2>
        <p>Die Routen unter <code>/api/admin/</code>, <code>/api/moderation/</code>, die Einreichung selbst (<code>/api/repairs</code>) und die Benachrichtigungen verlangen eine Anmeldung mit einer Team-Rolle oder nehmen nur <code>POST</code> an. Sie sind nicht Teil dieser Zusage und können sich jederzeit ändern.</p>
        <p><strong>Kopiere keine Zugangsdaten dieser Website und keinen Supabase-Schlüssel auf ein Gerät.</strong> Die öffentlichen Routen brauchen keine &ndash; und ein Schlüssel auf einem Mikrocontroller im Foyer ist ein Schlüssel für alle.</p>
        <p>Die hier beschriebenen Felder bleiben erhalten. Neue Felder können jederzeit dazukommen, und die Reihenfolge von Listen und Objekten ist nicht garantiert. Lies die Felder, die du brauchst, und ignoriere den Rest.</p>
      </section>
    </article>
    <SiteFooter />
  </main>;
}
