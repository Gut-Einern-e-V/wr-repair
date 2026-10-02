import { getSiteUrl } from "@/lib/share";
import { CONTACT_EMAIL, circularWeek, operator } from "@/lib/organisation";
import type { Story } from "@/lib/stories";
import { FESTIVAL_DATE_ISO, FESTIVAL_FAB_URL, festivalVenues } from "@/app/festival/festival-chrome";

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
   Week ausrichtet. Gut Einern hat die Website programmiert und steht deshalb
   als `creator`. Bis zum Wechsel unter das Dach der Circular Week stand hier
   die FAB Region, aus deren Projekt die Website urspruenglich kam. */
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
        name: "Gut Einern e.V.",
        url: "https://www.gut-einern.org/",
        description: "Verein in Wuppertal, der die Website zum Reparaturrekord NRW programmiert hat und betreut.",
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

/* Ende Oktober gilt wieder Winterzeit: Die Umstellung ist 2026 am 25. Oktober,
   das Festival am 31. liegt also in MEZ. */
const FESTIVAL_START = `${FESTIVAL_DATE_ISO}T11:00:00+01:00`;
const FESTIVAL_END = `${FESTIVAL_DATE_ISO}T17:00:00+01:00`;

/**
 * Das Repair & Share Festival als Veranstaltung.
 *
 * Damit kann Google das Festival in der Suche als Termin mit Datum und Ort
 * zeigen. Zwei Orte, weil das Festival auf zwei Gelaenden stattfindet - beide
 * stehen so, wie sie auch auf der Anreiseseite stehen. Ein `organizer` fehlt
 * mit Absicht: Wer das Festival ausrichtet, steht auf dieser Website nirgends
 * verbindlich, und eine geratene Angabe waere schlimmer als keine.
 */
export function FestivalStructuredData() {
  const siteUrl = getSiteUrl() || "http://localhost:3000";

  return <JsonLd data={{
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Repair & Share Festival",
    description: "Der Abschlusstag des Reparaturrekords NRW: Reparatur-Café XXL, Reparieren auf der Bühne, Secondhand, Workshops, Kinderwerkstatt und die letzten Reparaturen für den Weltrekord. Eintritt frei.",
    startDate: FESTIVAL_START,
    endDate: FESTIVAL_END,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    inLanguage: "de-DE",
    url: `${siteUrl}/festival`,
    image: [`${siteUrl}/opengraph-image`],
    sameAs: FESTIVAL_FAB_URL,
    location: festivalVenues.map((venue) => ({
      "@type": "Place",
      name: venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: venue.street,
        postalCode: venue.town.split(" ")[0],
        addressLocality: venue.town.split(" ").slice(1).join(" "),
        addressRegion: "Nordrhein-Westfalen",
        addressCountry: "DE",
      },
      geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lon },
    })),
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/festival`,
    },
  }} />;
}

/**
 * Brotkrumen fuer Unterseiten (Festival, Geschichten).
 *
 * Google zeigt dann statt der nackten Adresse den Pfad "Reparaturrekord NRW ›
 * Festival › Anreise" im Suchergebnis. Die Startseite steht immer vorne und
 * wird deshalb nicht mit uebergeben.
 */
export function BreadcrumbStructuredData({ trail }: { trail: readonly (readonly [path: string, name: string])[] }) {
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const items = [["/", "Reparaturrekord NRW"] as const, ...trail];

  return <JsonLd data={{
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([path, name], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: `${siteUrl}${path === "/" ? "/" : path}`,
    })),
  }} />;
}
