import { getSiteUrl } from "@/lib/share";
import type { Story } from "@/lib/stories";

/**
 * Strukturierte Daten nach schema.org (Issue #67).
 *
 * Suchmaschinen und Assistenten lesen daraus, wer hinter der Seite steht und
 * worum es bei einer Geschichte geht, ohne es aus dem Layout raten zu muessen.
 * Empfohlener Weg in Next: ein einfaches <script>-Element in der Seite selbst
 * (siehe node_modules/next/dist/docs/01-app/02-guides/json-ld.md).
 */

const ORGANIZATION_ID = "#organization";

/* `<` wird maskiert, damit auch ein spaeter aus Inhalten gespeister Wert das
   Script-Element nicht verlassen kann. */
function serialize(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />;
}

/** Traegerverein und Website - gehoert auf die Startseite. */
export function SiteStructuredData() {
  const siteUrl = getSiteUrl() || "http://localhost:3000";

  return <JsonLd data={{
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NGO",
        "@id": `${siteUrl}/${ORGANIZATION_ID}`,
        name: "FAB Region Bergisches Land",
        url: "https://www.fab-bergisch.org/",
        description: "Trägerin des Reparaturrekords NRW – einem Weltrekordversuch, bei dem Nordrhein-Westfalen einen Monat lang jede Reparatur zählt.",
        areaServed: { "@type": "AdministrativeArea", name: "Nordrhein-Westfalen" },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: "Reparaturrekord NRW",
        inLanguage: "de-DE",
        publisher: { "@id": `${siteUrl}/${ORGANIZATION_ID}` },
      },
    ],
  }} />;
}

/** Eine einzelne Reparaturgeschichte als Artikel. */
export function StoryStructuredData({ story }: { story: Story }) {
  const siteUrl = getSiteUrl() || "http://localhost:3000";

  return <JsonLd data={{
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.summary,
    articleSection: story.category,
    datePublished: story.date,
    inLanguage: "de-DE",
    mainEntityOfPage: `${siteUrl}/stories/${story.slug}`,
    author: { "@type": "Organization", name: "FAB Region Bergisches Land" },
    publisher: { "@id": `${siteUrl}/${ORGANIZATION_ID}` },
  }} />;
}
