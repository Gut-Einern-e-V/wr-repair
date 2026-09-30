import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontClassName } from "./fonts";
import { getSiteUrl } from "@/lib/share";
import { operator } from "@/lib/organisation";
import { ConsentAnalytics } from "@/components/consent-analytics";
import { ConsentBanner } from "@/components/consent-banner";
import { ScrollReveal } from "@/components/scroll-reveal";

/* Vorgaben fuer alle Seiten (Issue #67). Einzelne Seiten ueberschreiben Titel
   und Beschreibung; alles andere - Vorschaubild, Sprache, Indexierung - gilt
   von hier aus fuer die ganze Seite.

   `title.template` haengt den Projektnamen an jeden Seitentitel an. Die Seiten
   nennen deshalb nur ihr eigenes Thema - schreiben sie den Namen selbst mit
   hinein, steht er zweimal im Titel. Wo eine Seite ihn gar nicht tragen soll,
   umgeht `title: { absolute: "..." }` das Template. */
export const metadata: Metadata = {
  // Ohne metadataBase wuerden geteilte Links und Bilder relativ bleiben.
  metadataBase: new URL(getSiteUrl() || "http://localhost:3000"),
  title: {
    default: "Reparaturrekord NRW | FAB Region",
    template: "%s | Reparaturrekord NRW",
  },
  description: "Einen Monat lang zaehlt Nordrhein-Westfalen jede Reparatur: Repariere etwas, trage es ein und werde Teil des Reparatur-Weltrekords.",
  applicationName: "Reparaturrekord NRW",
  /* `creator` ist, wer die Seite gemacht hat, `publisher`, wer sie
     herausgibt - seit Issue #78 sind das zwei verschiedene Haeuser: Die
     Website kommt aus der FAB Region, herausgegeben wird sie vom CSCP, das
     auch im Impressum steht. */
  authors: [{ name: "FAB Region Bergisches Städtedreieck", url: "https://www.fab-bergisch.org/" }],
  creator: "FAB Region Bergisches Städtedreieck",
  publisher: operator.legalName,
  /* Der Kanonische zeigt je Seite auf sich selbst. Ohne diese Angabe zaehlen
     Suchmaschinen Aufrufe mit Kampagnenparametern als eigene Adressen. */
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Reparaturrekord NRW",
    title: "Reparaturrekord NRW",
    description: "Einen Monat lang zaehlt Nordrhein-Westfalen jede Reparatur. Mach mit beim Reparatur-Weltrekord.",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    // Ohne diese Angabe kuerzt Google die Vorschau selbst - mit ihr stehen
    // Textausschnitt und Bild in voller Laenge in den Ergebnissen.
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
};

/* Faerbt Adressleiste und Statusleiste. Ohne diesen Wert waehlt Chrome auf
   Android selbst - im installierten Zustand wurde daraus ein dunkler Balken
   ueber der hellen Seite. Gleicher Wert wie `theme_color` in app/manifest.ts. */
export const viewport: Viewport = {
  themeColor: "#efece5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={fontClassName}>
      <body>
        {children}
        <ScrollReveal />
        <ConsentBanner />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
