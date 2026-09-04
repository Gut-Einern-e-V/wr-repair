import NextImage from "next/image";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { circularWeek, projectCredits } from "@/lib/organisation";

export const metadata = { title: "Unterstützung" };

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
    <section id="inhalt" className="content-hero" aria-labelledby="supporters-title"><p className="brand-kicker">Unterstützung</p><h1 className="sticker-head is-mint" id="supporters-title"><span className="sticker">Reparatur braucht</span><span className="sticker">Rückenwind</span></h1><p>Der Weltrekordversuch verbindet Menschen, Orte und Wissen. Er gehört zur <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>; diese Partnerorganisationen tragen ihn in der Region mit.</p></section>
    <section className="content-section" aria-label="Projektpartner"><PartnerLogoGrid /></section>
    {/* Drei Rollen, die im Alltag gern zusammenfallen (Issue #78): Das CSCP
        richtet den Rekordversuch aus, die FAB Region hat die Website
        beigesteuert, Gut Einern hat sie gebaut. Ohne diese Aufteilung liest
        sich der Foerderhinweis darunter so, als traege die FAB Region auch
        die Initiative. */}
    <section className="content-section credit-section" aria-labelledby="credits-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Wer was macht</p>
          <h2 id="credits-title">Drei Häuser, drei Rollen.</h2>
        </div>
      </div>
      <ul className="credit-list">
        {projectCredits.map((credit) => <li key={credit.role}>
          {credit.logoUrl && <span className="credit-logo">
            {/* Statische Logos aus public/ in fester Groesse - der
                Bildoptimierer bringt bei vier Dateien nichts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={credit.logoUrl} alt="" />
          </span>}
          <p className="section-index">{credit.role}</p>
          <p>{credit.description}</p>
          <a className="text-button" href={credit.url} target="_blank" rel="noreferrer">{credit.shortName} <span aria-hidden="true">&#8599;</span></a>
        </li>)}
      </ul>
    </section>
    <section className="funding-note" aria-labelledby="funding-title">
      <p className="section-index">Förderhinweis</p>
      <h2 id="funding-title">Gefördert vom Land NRW und aus EFRE-Mitteln.</h2>
      {/* Praezisiert nach Issue #78: Gefoerdert wird das Projekt, in dem diese
          Website entstanden ist - nicht der Rekordversuch als Ganzes. Der
          gehoert zur Circular Week. */}
      <p>Diese Website ist im Projekt &bdquo;FAB.Region Bergisches Städtedreieck &ndash; Transformation hin zu einer co-kreativen Kreislaufwirtschaftsregion&ldquo; entstanden. Es wird aus Mitteln des Europäischen Fonds für regionale Entwicklung (EFRE) und des Landes Nordrhein-Westfalen gefördert.</p>
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
