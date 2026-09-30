import { SharepicStudio } from "@/components/sharepics/sharepic-studio";
import { nrwKreiseList } from "@/lib/nrw-kreise-list";

export const metadata = {
  title: "Sharepics zum Teilen",
  description: "Bilder mit dem Live-Stand des Reparaturrekords NRW für Story und Feed – Motiv und Format wählen, herunterladen, teilen.",
};

/**
 * Sharepics fuer alle (siehe lib/sharepics.ts).
 *
 * Dasselbe Studio wie in der Moderation, aber ohne eigene Ueberschrift,
 * Beispielzahlen und freie Meilensteine - die oeffentliche Bildroute zeichnet
 * nur feste Motive mit echten Zahlen.
 */
export default function PublicSharepicsPage() {
  const kreise = nrwKreiseList.map((kreis) => kreis.name).sort((a, b) => a.localeCompare(b, "de"));
  return <SharepicStudio kreise={kreise} variant="public" />;
}
