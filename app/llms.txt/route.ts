import { getAppSettings } from "@/lib/app-settings";
import { getStoryTeasers } from "@/lib/stories";
import { getSiteUrl } from "@/lib/share";
import { CONTACT_EMAIL, circularWeek, operator, operatorAddressLine } from "@/lib/organisation";

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
  if (status === "before") return `Einreichungen sind noch nicht geöffnet. Der Zeitraum läuft vom ${span}.`;
  if (status === "after") return `Der Einreichungszeitraum ist beendet. Er lief vom ${span}.`;
  return `Einreichungen sind aktuell geöffnet, noch bis ${dateFormat.format(endAt)} Uhr. Der Zeitraum läuft vom ${span}.`;
}

export async function GET() {
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const [settings, stories] = await Promise.all([getAppSettings(), getStoryTeasers()]);
  const campaign = settings.submissionWindow;

  const body = `# Reparaturrekord NRW

> Ein Weltrekordversuch der ${circularWeek.name}, organisiert vom ${operator.shortName}: Einen Monat lang zählt Nordrhein-Westfalen jede Reparatur, die einen Gegenstand im Alltag hält. Wer etwas repariert hat, trägt es mit Foto und ein paar Angaben ein; nach der Prüfung durch die Moderation zählt der Beitrag.

${campaignLine(campaign.status, campaign.startAt, campaign.endAt)} Das Ziel liegt bei ${settings.recordGoal.toLocaleString("de-DE")} gezählten Reparaturen.

Teilnehmen kann jede Person in Nordrhein-Westfalen, kostenlos und ohne Konto. Es zählt alles, was vorher kaputt oder nur eingeschränkt nutzbar war - geschraubt, genäht und geklebt wird in Repair Cafés, Fachbetrieben und Werkstätten, Schulen, Vereinen und am Küchentisch. Es geht nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen und als Alternative zum Neukauf zu stärken.

## Hauptseiten

- [Startseite](${siteUrl}/): Worum es geht, aktueller Zählerstand und Einstieg in die Eintragung.
- [Reparatur eintragen](${siteUrl}/mitmachen): Formular für die eigene Reparatur, auf das Smartphone ausgelegt.
- [Live-Stand](${siteUrl}/stats): Aktuelle Zahlen des Rekordversuchs, auch als Bühnenansicht für Veranstaltungen.
- [Repair Cafés in NRW](${siteUrl}/repair-cafes): Orte und Termine der Reparatur-Initiativen im Land.
- [Repair & Share Festival](${siteUrl}/festival): Der Abschlusstag des Rekordmonats am 31. Oktober 2026 in Utopiastadt und Wiesenwerken in Wuppertal, 11 bis 17 Uhr, Eintritt frei. Anreise unter ${siteUrl}/festival/anreise.
- [Für Reparaturbetriebe](${siteUrl}/reparaturbetriebe): Wie Fahrradläden, Handywerkstätten, Schuhmachereien und andere Fachbetriebe mitmachen - Aufsteller mit QR-Code an die Theke, eintragen tut die Kundschaft. Auch Reparaturen vom Fachbetrieb zählen.
- [Gewinnspiel](${siteUrl}/gewinnspiel): Verlosung unter allen Einreichungen, mit Teilnahmebedingungen.
- [Über das Projekt](${siteUrl}/about): Hintergrund, Ziel und die Regeln der Zählung.
- [Unterstützung](${siteUrl}/supporters): Die Organisationen, die den Rekordversuch tragen und fördern.
- [Schnittstellen](${siteUrl}/api-doku): Wie sich die Zahlen ohne API-Key abrufen lassen - für eigene Anzeigen auf ESP32, Arduino oder Raspberry Pi.

## Reparaturgeschichten

${stories.length ? stories.map((story) => `- [${story.title}](${siteUrl}/stories/${story.slug}): ${story.summary}`).join("\n") : "- Noch keine veröffentlichten Geschichten."}

## Rechtliches

- [Datenschutz](${siteUrl}/privacy): Welche Daten erhoben werden und wie mit Ortsangaben umgegangen wird.
- [Impressum](${siteUrl}/imprint): Verantwortlich ist das ${operator.shortName}, ${operator.legalName}, ${operatorAddressLine}. Kontakt: ${CONTACT_EMAIL}.
- [Barrierefreiheit](${siteUrl}/accessibility): Erklärung zur Barrierefreiheit der Seite.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
