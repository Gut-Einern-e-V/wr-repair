import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";
import { getStoryTeasers } from "@/lib/stories";
import { getSiteUrl } from "@/lib/share";

/**
 * /llms.txt (Issue #67).
 *
 * Eine kurze, maschinenlesbare Zusammenfassung des Projekts fuer Assistenten,
 * die eine Frage wie "Wo kann ich in NRW etwas reparieren lassen?" beantworten
 * sollen. Nach der Konvention von llmstxt.org: Markdown, eine Ueberschrift, ein
 * Absatz zur Einordnung, danach Links mit je einem Satz.
 *
 * Warum ueberhaupt: Ein Modell, das die Startseite laedt, bekommt vor allem
 * Layout. Hier steht in dreissig Zeilen, worum es geht, wann der Zeitraum
 * laeuft und wo die Details stehen - das ist die verlaesslichere Quelle als
 * geratenes aus dem HTML.
 */

// Der Zeitraum kann im Admin-Backend geaendert werden, deshalb nicht fuer immer
// eingefroren. Einmal pro Stunde neu ist fuer eine Textdatei reichlich.
export const revalidate = 3600;

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

function campaignLine(status: string, startAt: Date | null, endAt: Date | null) {
  if (!startAt || !endAt) return "Der Einreichungszeitraum steht noch nicht fest.";

  const span = `${dateFormat.format(startAt)} Uhr bis ${dateFormat.format(endAt)} Uhr`;
  if (status === "before") return `Einreichungen sind noch nicht geoeffnet. Der Zeitraum laeuft vom ${span}.`;
  if (status === "after") return `Der Einreichungszeitraum ist beendet. Er lief vom ${span}.`;
  return `Einreichungen sind aktuell geoeffnet, noch bis ${dateFormat.format(endAt)} Uhr. Der Zeitraum laeuft vom ${span}.`;
}

export async function GET() {
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const [campaign, stories] = await Promise.all([getConfiguredSubmissionWindow(), getStoryTeasers()]);

  const body = `# Reparaturrekord NRW

> Ein Weltrekordversuch der FAB Region Bergisches Land: Einen Monat lang zaehlt Nordrhein-Westfalen jede Reparatur, die einen Gegenstand im Alltag haelt. Wer etwas repariert hat, traegt es mit Foto und ein paar Angaben ein; nach der Pruefung durch die Moderation zaehlt der Beitrag.

${campaignLine(campaign.status, campaign.startAt, campaign.endAt)}

Teilnehmen kann jede Person in Nordrhein-Westfalen, kostenlos und ohne Konto. Es zaehlt alles, was vorher kaputt oder nur eingeschraenkt nutzbar war - geschraubt, genaeht und geklebt wird in Repair Cafes, Werkstaetten, Schulen, Vereinen und am Kuechentisch. Es geht nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als Alternative zum Neukauf zu staerken.

## Hauptseiten

- [Startseite](${siteUrl}/): Worum es geht, aktueller Zaehlerstand und Einstieg in die Eintragung.
- [Reparatur eintragen](${siteUrl}/mitmachen): Formular fuer die eigene Reparatur, auf das Smartphone ausgelegt.
- [Live-Stand](${siteUrl}/stats): Aktuelle Zahlen des Rekordversuchs, auch als Buehnenansicht fuer Veranstaltungen.
- [Repair Cafes in NRW](${siteUrl}/repair-cafes): Orte und Termine der Reparatur-Initiativen im Land.
- [Ueber das Projekt](${siteUrl}/about): Hintergrund, Ziel und die Regeln der Zaehlung.
- [Unterstuetzer](${siteUrl}/supporters): Partner und Foerderer des Rekordversuchs.

## Reparaturgeschichten

${stories.length ? stories.map((story) => `- [${story.title}](${siteUrl}/stories/${story.slug}): ${story.summary}`).join("\n") : "- Noch keine veroeffentlichten Geschichten."}

## Rechtliches

- [Datenschutz](${siteUrl}/privacy): Welche Daten erhoben werden und wie mit Ortsangaben umgegangen wird.
- [Impressum](${siteUrl}/imprint): Verantwortlich ist die FAB Region Bergisches Land.
- [Barrierefreiheit](${siteUrl}/accessibility): Erklaerung zur Barrierefreiheit der Seite.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
