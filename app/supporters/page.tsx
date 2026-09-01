import NextImage from "next/image";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Unterstützung | Reparaturrekord NRW" };

/* Die Foerderlogos liegen als dunkle Variante in public/funding/ und stammen aus
   dem offiziellen Abbinder der FAB Region. Weil sie hier gross im Inhalt stehen,
   laesst diese Seite die Foerderleiste im Footer weg. */
const fundingLogos = [
  { src: "/funding/fab-region-dark.png", width: 1355, height: 381, name: "FAB Region Bergisches Städtedreieck", role: "Projektträger", href: "https://www.fab-bergisch.org/" },
  { src: "/funding/eu-dark.png", width: 1405, height: 293, name: "Kofinanziert von der Europäischen Union", role: "Europäischer Fonds für regionale Entwicklung (EFRE)", href: "https://www.efre.nrw/" },
  { src: "/funding/nrw-dark.png", width: 1359, height: 294, name: "Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen", role: "Land Nordrhein-Westfalen", href: "https://www.umwelt.nrw.de/" },
];

export default function SupportersPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="supporters-title"><p className="brand-kicker">Unterstützung</p><h1 className="sticker-head is-mint" id="supporters-title"><span className="sticker">Reparatur braucht</span><span className="sticker">Rückenwind</span></h1><p>Der Weltrekordversuch verbindet Menschen, Orte und Wissen. Diese Partnerorganisationen stehen für die FAB Region und ihre Arbeit an einer regionalen Kreislaufwirtschaft.</p></section>
    <section className="content-section" aria-label="Projektpartner"><PartnerLogoGrid /></section>
    <section className="funding-note" aria-labelledby="funding-title">
      <p className="section-index">Förderhinweis</p>
      <h2 id="funding-title">Gefördert vom Land NRW und aus EFRE-Mitteln.</h2>
      <p>Der Weltrekordversuch ist Teil des Projekts &bdquo;FAB.Region Bergisches Städtedreieck &ndash; Transformation hin zu einer co-kreativen Kreislaufwirtschaftsregion&ldquo;. Es wird aus Mitteln des Europäischen Fonds für regionale Entwicklung (EFRE) und des Landes Nordrhein-Westfalen gefördert.</p>
      <div className="funding-cards">
        {fundingLogos.map((logo) => (
          <a className="funding-card" href={logo.href} target="_blank" rel="noreferrer" key={logo.src}>
            <NextImage src={logo.src} alt={logo.name} width={logo.width} height={logo.height} sizes="260px" />
            <span>{logo.role}</span>
          </a>
        ))}
      </div>
      <a className="text-button" href="https://www.fab-bergisch.org/ueber-uns/projektpartner-unterstutzende" target="_blank" rel="noreferrer">Alle Projektbeteiligten ansehen <span aria-hidden="true">&#8599;</span></a>
    </section>
    <SiteFooter funding={false} />
  </main>;
}
