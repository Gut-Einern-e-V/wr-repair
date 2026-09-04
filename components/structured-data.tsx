import { getSiteUrl } from "@/lib/share";
import { CONTACT_EMAIL, circularWeek, operator } from "@/lib/organisation";
import type { Story } from "@/lib/stories";

/**
 * Strukturierte Daten nach schema.org (Issue #67).
 *
 * Suchmaschinen und Assistenten lesen daraus, wer hinter der Seite steht und
 * worum es bei einer Geschichte geht, ohne es aus dem Layout raten zu muessen.
 * Empfohlener Weg in Next: ein einfaches <script>-Element in der Seite selbst
 * (siehe node_modules/next/dist/docs/01-app/02-guides/json-ld.md).
 */

/* Zwei Organisationen mit verschiedenen Rollen (Issue #78): Betreiberin und
   damit `publisher` ist das CSCP, das den Rekordversuch im Rahmen der Circular
   Week ausrichtet. Die FAB Region hat die Website beigesteuert und steht
   deshalb als `creator`. Vorher war beides die FAB Region - fuer Suchmaschinen
   war der Absender damit ein anderer als im Impressum. */
const ORGANIZATION_ID = "#organization";
const CREATOR_ID = "#creator";

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
        "@type": "Organization",
        "@id": `${siteUrl}/${ORGANIZATION_ID}`,
        name: operator.legalName,
        alternateName: operator.shortName,
        url: operator.website,
        email: CONTACT_EMAIL,
        telephone: operator.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: operator.street,
          postalCode: operator.postalCode,
          addressLocality: operator.city,
          addressCountry: "DE",
        },
        description: `Betreiberin des Reparaturrekords NRW – einem Weltrekordversuch im Rahmen der ${circularWeek.name}, bei dem Nordrhein-Westfalen einen Monat lang jede Reparatur zählt.`,
        areaServed: { "@type": "AdministrativeArea", name: "Nordrhein-Westfalen" },
      },
      {
        "@type": "NGO",
        "@id": `${siteUrl}/${CREATOR_ID}`,
        name: "FAB Region Bergisches Städtedreieck",
        url: "https://www.fab-bergisch.org/",
        description: "Partnerprojekt, in dem die Website zum Reparaturrekord NRW entstanden ist.",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: `${siteUrl}/`,
        name: "Reparaturrekord NRW",
        inLanguage: "de-DE",
        publisher: { "@id": `${siteUrl}/${ORGANIZATION_ID}` },
        creator: { "@id": `${siteUrl}/${CREATOR_ID}` },
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
    /* Die Organisation steht hier ausgeschrieben und nicht nur als Verweis:
       Diese Seite rendert `SiteStructuredData` nicht mit, ein blosser `@id`
       zeigte also auf einen Knoten, den dieses Dokument gar nicht enthaelt.
       Die `@id` bleibt trotzdem dabei, damit beide Seiten dieselbe
       Organisation meinen. */
    author: { "@type": "Organization", "@id": `${siteUrl}/${ORGANIZATION_ID}`, name: operator.legalName, url: operator.website },
    publisher: { "@id": `${siteUrl}/${ORGANIZATION_ID}` },
  }} />;
}
