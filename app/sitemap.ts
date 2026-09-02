import type { MetadataRoute } from "next";
import { getStoryTeasers } from "@/lib/stories";
import { getSiteUrl } from "@/lib/share";

/**
 * Sitemap der oeffentlichen Seiten (Issue #67).
 *
 * Bewusst nur was auch in robots.txt erlaubt ist: Backend, API und die privaten
 * Statuslinks unter `/reparatur/<id>` gehoeren nicht hinein. Die Geschichten
 * kommen aus content/stories/ und damit ohne Datenbankabfrage - die Datei wird
 * wie die Startseite beim Build erzeugt.
 */

type StaticEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const staticPages: StaticEntry[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/mitmachen", changeFrequency: "monthly", priority: 0.9 },
  { path: "/stats", changeFrequency: "hourly", priority: 0.8 },
  { path: "/stories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/repair-cafes", changeFrequency: "weekly", priority: 0.7 },
  { path: "/gewinnspiel", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  /* Die Schnittstellen-Doku gehoert in den Index: Sie ist fuer Menschen
     geschrieben, die eine eigene Anzeige bauen wollen, und die suchen danach
     (Issue #80). Nicht zu verwechseln mit `/api/` selbst - das bleibt in
     robots.txt gesperrt. */
  { path: "/api-doku", changeFrequency: "monthly", priority: 0.4 },
  { path: "/supporters", changeFrequency: "monthly", priority: 0.5 },
  /* Nachnutzung ist der Zweck des offenen Quelltextes - dafuer muss die Seite
     auffindbar sein, auch wenn sie im Erzaehlbogen der Projektseite bewusst
     weit hinten steht (Issue #84). */
  { path: "/open-source", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/imprint", changeFrequency: "yearly", priority: 0.2 },
  { path: "/accessibility", changeFrequency: "yearly", priority: 0.2 },
  /* Hoeher gewichtet als die Rechtstexte: Die Seite ist ein eigenes Angebot,
     kein Kleingedrucktes (Issue #47). */
  { path: "/leichte-sprache", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const stories = await getStoryTeasers();
  /* Ohne eigenes Datum fuer die statischen Seiten: das juengste
     Veroeffentlichungsdatum ist die beste Angabe, die ohne Buildzeitstempel zu
     haben ist - und ein Zeitstempel aus dem Build wuerde bei jedem Deploy alle
     Seiten als geaendert melden. */
  const latestStory = stories[0]?.date;

  return [
    ...staticPages.map((page) => ({
      url: `${siteUrl}${page.path}`,
      ...(latestStory ? { lastModified: latestStory } : {}),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...stories.map((story) => ({
      url: `${siteUrl}/stories/${story.slug}`,
      lastModified: story.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
