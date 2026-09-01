import { HomeView } from "./home-view";
import { SiteStructuredData } from "@/components/structured-data";
import { getStoryTeasers } from "@/lib/stories";

/* Die Startseite wird statisch vorgerendert: Die Blog-Uebersicht kommt aus den
   Markdown-Dateien in content/stories/ und wird beim Build eingelesen. Neue
   Beitraege erscheinen mit dem naechsten Deploy, ein Seitenaufruf loest dafuer
   keine zusaetzliche Anfrage aus. */
export default async function Home() {
  return <>
    <SiteStructuredData />
    <HomeView stories={await getStoryTeasers()} />
  </>;
}
