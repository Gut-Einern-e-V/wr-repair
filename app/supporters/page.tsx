import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Unterstützer | Reparaturrekord NRW" };

export default function SupportersPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="supporters-title"><p className="eyebrow">Unterstützer</p><h1 id="supporters-title">Reparatur braucht<br /><span>Rückenwind.</span></h1><p>Der Weltrekordversuch verbindet Menschen, Orte und Wissen. Diese Partner stehen für die FAB Region und ihre Arbeit an einer regionalen Kreislaufwirtschaft.</p></section>
    <section className="content-section" aria-label="Projektpartner"><PartnerLogoGrid /></section>
    <section className="funding-note"><p className="section-index">Förderhinweis</p><h2>Teil der FAB Region Bergisches Städtedreieck.</h2><p>Die gezeigte Partnerstruktur orientiert sich an den offiziellen Projektinformationen der FAB Region. Förderlogos, verbindliche Wortlaute und Platzierung müssen vor dem Launch durch die Fördermittelgebenden freigegeben werden.</p><a className="text-button" href="https://www.fab-bergisch.org/ueber-uns/projektpartner-unterstutzende" target="_blank" rel="noreferrer">Projektpartner ansehen <span aria-hidden="true">&#8599;</span></a></section>
    <SiteFooter />
  </main>;
}