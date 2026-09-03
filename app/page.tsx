import { HomeView } from "./home-view";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SiteStructuredData } from "@/components/structured-data";
import { getStoryTeasers } from "@/lib/stories";

/* Die Startseite wird statisch vorgerendert: Die Blog-Uebersicht kommt aus den
   Markdown-Dateien in content/stories/ und wird beim Build eingelesen. Neue
   Beitraege erscheinen mit dem naechsten Deploy, ein Seitenaufruf loest dafuer
   keine zusaetzliche Anfrage aus. */
export default async function Home() {
  return <>
    <SiteStructuredData />
    {/* Kopf und Fuss kommen als Elemente herein, nicht aus HomeView selbst:
        HomeView ist wegen des Zaehlers und des Formulars eine Client-Komponente
        und kann `SiteHeader` deshalb nicht aufrufen - die Komponente laedt das
        Logo aus Supabase und laeuft nur auf dem Server. Vorher hatte die
        Startseite darum eine eigene Kopie von Kopf und Fuss, und die lief
        auseinander: Es fehlten "Einreichen", der Festivalknopf und der Link auf
        die Leichte Sprache. Jetzt gibt es beides nur noch an einer Stelle. */}
    <HomeView stories={await getStoryTeasers()} header={<SiteHeader />} footer={<SiteFooter />} />
  </>;
}
