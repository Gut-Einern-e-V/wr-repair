import { SharepicStudio } from "@/components/sharepics/sharepic-studio";
import { getCampaignClosed } from "@/lib/campaign-closed";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";

export const metadata = {
  title: "Sharepics zum Teilen",
  description: "Bilder mit den Zahlen des Reparaturrekords NRW für Story und Feed – Motiv und Format wählen, herunterladen, teilen.",
};

/**
 * Sharepics fuer alle (siehe lib/sharepics.ts).
 *
 * Dasselbe Studio wie in der Moderation, aber ohne eigene Ueberschrift,
 * Beispielzahlen und freie Meilensteine - die oeffentliche Bildroute zeichnet
 * nur feste Motive mit echten Zahlen. Nach dem Ende bietet es nur noch die
 * Motive zum Rueckblick an (siehe `visibleSharepicMotifs`).
 */
export default async function PublicSharepicsPage() {
  const kreise = nrwKreiseList.map((kreis) => kreis.name).sort((a, b) => a.localeCompare(b, "de"));
  return <SharepicStudio kreise={kreise} variant="public" closed={await getCampaignClosed()} />;
}
