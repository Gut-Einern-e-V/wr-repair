import type { Metadata } from "next";
import { getCampaignClosed } from "@/lib/campaign-closed";

/* Die Seite selbst ist eine Client-Komponente und kann keine Metadaten
   exportieren. Ohne dieses Layout trug `/stats` Titel und Beschreibung der
   Startseite - zwei Seiten mit demselben Titel im Index. Nach der Aktion ist
   sie das Ergebnis und heisst auch so (lib/campaign-closed.ts). */
export async function generateMetadata(): Promise<Metadata> {
  return await getCampaignClosed()
    ? {
        title: "Ergebnis",
        description: "Das Ergebnis des Reparaturrekords NRW: alle Zahlen und die Karte zum Aktionsmonat, in dem Nordrhein-Westfalen zwei Reparatur-Weltrekorde gebrochen hat.",
      }
    : {
        title: "Live-Stand",
        description: "Wie viele Reparaturen Nordrhein-Westfalen schon gezählt hat: Zählerstand und Karte des Reparatur-Weltrekords, nach dem Aktionsmonat der Rückblick mit allen Zahlen.",
      };
}

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
