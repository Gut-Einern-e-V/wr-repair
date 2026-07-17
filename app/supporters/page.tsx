import Image from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const supporters = [
  ["Bergische Gesellschaft", "bergische-gesellschaft.png", "https://bergische-gesellschaft.de/", "Regionale Zusammenarbeit und wirtschaftliche Innovation"],
  ["Bergische Universitaet Wuppertal", "uni-wuppertal.png", "https://www.uni-wuppertal.de/de/", "Forschung, Gruendung und Transfer"],
  ["CSCP", "cscp.png", "https://www.cscp.org/", "Nachhaltiger Konsum und Produktion"],
  ["Gut Einern e.V.", "gut-einern.png", "https://www.gut-einern.org/", "Reallabor fuer Bildung und nachhaltige Lebensweisen"],
  ["Gruenderschmiede Remscheid", "gruenderschmiede.png", "https://gruenderschmiede.org/", "Gruendung, Textilwerkstatt und Innovation"],
  ["Glaeserne Werkstatt Solingen", "glaeserne-werkstatt.png", "https://www.glaeserne-werkstatt-solingen.de/", "Offene Werkstatt und Kreislaufpraxis"],
  ["Institut Arbeit und Technik", "iat.png", "https://www.iat.eu/", "Angewandte Forschung und Regionalentwicklung"],
  ["Wuppertal Institut", "wuppertal-institut.png", "https://wupperinst.org/", "Transformationsforschung fuer Nachhaltigkeit"],
] as const;

export const metadata = { title: "Unterstuetzer | Reparaturrekord NRW" };

export default function SupportersPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="supporters-title"><p className="eyebrow">Unterstuetzer</p><h1 id="supporters-title">Reparatur braucht<br /><span>Rueckenwind.</span></h1><p>Der Weltrekordversuch verbindet Menschen, Orte und Wissen. Diese Partner stehen fuer die FAB Region und ihre Arbeit an einer regionalen Kreislaufwirtschaft.</p></section>
    <section className="content-section" aria-label="Projektpartner"><div className="supporter-grid">{supporters.map(([name, logo, href, detail]) => <a className="supporter-card" href={href} target="_blank" rel="noreferrer" key={name}><span className="supporter-logo"><Image src={`/partners/${logo}`} alt={`${name} Logo`} width={180} height={80} /></span><strong>{name}</strong><small>{detail}</small><i aria-hidden="true">&#8599;</i></a>)}</div></section>
    <section className="funding-note"><p className="section-index">Foerderhinweis</p><h2>Teil der FAB Region Bergisches Staedtedreieck.</h2><p>Die gezeigte Partnerstruktur orientiert sich an den offiziellen Projektinformationen der FAB Region. Foerderlogos, verbindliche Wortlaute und Platzierung muessen vor dem Launch durch die Foerdermittelgebenden freigegeben werden.</p><a className="text-button" href="https://www.fab-bergisch.org/ueber-uns/projektpartner-unterstutzende" target="_blank" rel="noreferrer">Projektpartner ansehen <span aria-hidden="true">&#8599;</span></a></section>
    <SiteFooter />
  </main>;
}