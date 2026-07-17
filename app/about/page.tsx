import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Über das Projekt | Reparaturrekord NRW" };

export default function AboutPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero" aria-labelledby="about-title"><p className="eyebrow">Über das Projekt</p><h1 id="about-title">Reparatur ist<br /><span>Infrastruktur.</span></h1><p>Reparaturrekord NRW macht alltägliches Reparieren sichtbar. Jede freigegebene Einreichung zeigt: Langlebige Dinge, praktisches Wissen und gemeinsames Handeln zählen.</p></section>
    <section className="content-section two-column-copy"><div><p className="section-index">Open Source</p><h2>Zum Anpassen gemacht.</h2></div><div><p>Diese Website liegt in einem öffentlichen Repository. Andere Initiativen können den technischen Ansatz für ihre eigene Reparaturkampagne prüfen, wiederverwenden und weiterentwickeln.</p><p>Das Repository enthält Einreichungsablauf, Moderationsmodell, Supabase-Migrationen, Deployment-Hinweise und das Inhaltssystem. Vor der Nutzung einer Kopie müssen verantwortliche Organisation, Rechtstexte, Löschfristen, Zugangsdaten und Teilnahmebedingungen angepasst werden.</p><a className="button button-primary" href="https://github.com/Gut-Einern-e-V/wr-repair" target="_blank" rel="noreferrer">Repository ansehen <span aria-hidden="true">&#8599;</span></a></div></section>
    <section className="content-section contribution-grid" aria-labelledby="contribute-title"><div><p className="section-index">Mitmachen</p><h2 id="contribute-title">Ein Rekord ist Gemeinschaftsarbeit.</h2></div><ol><li><p>Eine Reparatur dokumentieren und während des Zeitraums einreichen.</p></li><li><p>Reparaturwissen in Werkstatt, Schule oder Nachbarschaft teilen.</p></li><li><p>Website, Inhalte oder Dokumentation über das Repository verbessern.</p></li></ol></section>
    <section className="content-callout"><p>Reparaturrekord NRW ist Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region Bergisches Städtedreieck</a>.</p><Link className="button button-secondary" href="/supporters">Unterstützer ansehen <span aria-hidden="true">&#8594;</span></Link></section>
    <SiteFooter />
  </main>;
}