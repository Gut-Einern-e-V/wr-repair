import Link from "next/link";
import NextImage from "next/image";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { getAppSettings } from "@/lib/app-settings";
import { brandPhotos } from "@/lib/brand-photos";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Über das Projekt" };

/* Die Seite nennt die eingestellte Zielzahl (Issue #74). Sie ist im Backend
   aenderbar, darf also nicht bis zum naechsten Deploy einfrieren - fuenf
   Minuten sind fuer eine Textseite reichlich. */
export const revalidate = 300;

export default async function AboutPage() {
  const { recordGoal } = await getAppSettings();
  return <main className="page-shell content-page">
    <SiteHeader />
    <section className="content-hero project-hero" aria-labelledby="about-title"><div><p className="brand-kicker">Über das Projekt</p><h1 className="sticker-head" id="about-title"><span className="sticker">Reparatur ist</span><span className="sticker">Infrastruktur</span></h1><p>Reparaturrekord NRW macht alltägliches Reparieren sichtbar. Jede Reparatur zeigt: Langlebige Dinge, praktisches Wissen und gemeinsames Handeln zählen.</p></div><div className="project-hero-visual"><NextImage src={brandPhotos.bicycle.src} alt={brandPhotos.bicycle.alt} width={900} height={620} sizes="(max-width: 720px) 100vw, 40vw" /></div></section>
    <section className="content-section project-facts" aria-labelledby="project-facts-title"><div><p className="section-index">Warum ein Rekord?</p><h2 id="project-facts-title">Sichtbarkeit schafft Wirkung.</h2></div><div><p>Der Rekordversuch bündelt viele einzelne Reparaturen zu einem gemeinsamen Signal: Dinge verdienen ein zweites Leben, und Reparaturwissen gehört in die Mitte der Gesellschaft.</p><p>Als Maßstab dienen die dokumentierten Bestleistungen der britischen Kampagne The BIG FIX: 268 Reparaturen an einem Tag und Ort (2019, Exeter) sowie 3.177 Reparaturen in einem Monat landesweit (2024). Für Nordrhein-Westfalen haben wir uns {recordGoal.toLocaleString("de-DE")} Reparaturen vorgenommen. Uns geht es dabei nicht um einen Eintrag ins Guinness-Buch, sondern darum, Reparatur sichtbar zu machen.</p><a className="text-button" href="https://www.recycledevon.org/thebigfix" target="_blank" rel="noreferrer">Quelle: The BIG FIX, Recycle Devon <span aria-hidden="true">&#8599;</span></a></div></section>
    <section className="content-section two-column-copy"><div><p className="section-index">Open Source</p><h2>Zum Anpassen gemacht.</h2></div><div><p>Diese Website liegt in einem öffentlichen Repository. Andere Initiativen können den technischen Ansatz für ihre eigene Reparaturkampagne prüfen, wiederverwenden und weiterentwickeln.</p><p>Das Repository enthält Einreichungsablauf, Moderationsmodell, Supabase-Migrationen, Deployment-Hinweise und das Inhaltssystem. Vor der Nutzung einer Kopie müssen verantwortliche Organisation, Rechtstexte, Löschfristen, Zugangsdaten und Teilnahmebedingungen angepasst werden.</p><a className="button button-primary" href="https://github.com/Gut-Einern-e-V/wr-repair" target="_blank" rel="noreferrer">Repository ansehen <span aria-hidden="true">&#8599;</span></a><Link className="text-button" href="/api-doku">Schnittstellen für eigene Anzeigen <span aria-hidden="true">&#8594;</span></Link></div></section>
    <section className="content-section contribution-grid" aria-labelledby="contribute-title"><div><p className="section-index">Mitmachen</p><h2 id="contribute-title">Ein Rekord ist Gemeinschaftsarbeit.</h2></div><ol><li><p>Eine Reparatur dokumentieren und während des Zeitraums einreichen.</p></li><li><p>Reparaturwissen in Werkstatt, Schule oder Nachbarschaft teilen.</p></li><li><p>Website, Inhalte oder Dokumentation über das Repository verbessern.</p></li></ol></section>
    <section className="content-section project-supporters" aria-labelledby="supporters-title"><div><p className="section-index">Unterstützt von</p><h2 id="supporters-title">Ein Projekt mit vielen Verbündeten.</h2><p>Die Logos führen direkt zu den Organisationen, die das Projekt mittragen.</p></div><PartnerLogoGrid /></section>
    <section className="content-callout"><div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.celebrate.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div><p>Reparaturrekord NRW ist Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region Bergisches Städtedreieck</a>.</p><div className="project-contact-actions"><a className="button button-secondary" href="mailto:mail@gut-einern.org?subject=Reparaturrekord%20NRW%20unterstuetzen">Projekt unterstützen <span aria-hidden="true">&#8594;</span></a><Link className="text-button" href="/supporters">Alle, die uns unterstützen <span aria-hidden="true">&#8594;</span></Link></div></section>
    <SiteFooter />
  </main>;
}