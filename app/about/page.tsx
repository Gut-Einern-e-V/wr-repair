import Link from "next/link";
import NextImage from "next/image";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { RegionTriangle } from "@/components/region-triangle";
import { getAppSettings } from "@/lib/app-settings";
import { brandPhotos } from "@/lib/brand-photos";
import { CONTACT_EMAIL, circularWeek, mailto, operator } from "@/lib/organisation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Über das Projekt",
  description:
    "Warum der Reparaturrekord NRW einen Weltrekord versucht: Reparieren sichtbar machen, Wissen teilen und zeigen, wie viel Kreislaufwirtschaft im Alltag schon steckt. Eine Initiative der Circular Week 2026, getragen von der FAB Region Bergisches Städtedreieck.",
};

/* Die Seite nennt die eingestellte Zielzahl (Issue #74). Sie ist im Backend
   aenderbar, darf also nicht bis zum naechsten Deploy einfrieren - fuenf
   Minuten sind fuer eine Textseite reichlich. */
export const revalidate = 300;

/* Reihenfolge nach Issue #84: erst der Antrieb (warum ueberhaupt ein Rekord),
   dann der Absender (wer die FAB Region ist), dann das Mitmachen. Open Source
   stand hier frueher an zweiter Stelle und hatte damit mehr Gewicht als die
   Sache im Erzaehlbogen verdient - sie hat jetzt eine eigene Seite und hier nur
   noch eine Zeile unter "Mitmachen". */
export default async function AboutPage() {
  const { recordGoal } = await getAppSettings();
  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero project-hero" aria-labelledby="about-title">
      <div>
        <p className="brand-kicker">Über das Projekt</p>
        <h1 className="sticker-head" id="about-title"><span className="sticker">Reparatur ist</span><span className="sticker">Infrastruktur</span></h1>
        <p>Reparaturrekord NRW macht alltägliches Reparieren sichtbar. Jede Reparatur zeigt: Langlebige Dinge, praktisches Wissen und gemeinsames Handeln zählen.</p>
      </div>
      <div className="project-hero-visual"><NextImage src={brandPhotos.bicycle.src} alt={brandPhotos.bicycle.alt} width={900} height={620} sizes="(max-width: 720px) 100vw, 40vw" /></div>
    </section>

    <section className="content-section project-facts" aria-labelledby="project-facts-title">
      <div>
        <p className="section-index">Warum ein Weltrekord?</p>
        <h2 id="project-facts-title">Weil eine Reparatur allein unsichtbar bleibt.</h2>
      </div>
      <div>
        <p>Etwas selbst zu reparieren war einmal selbstverständlich. Heute ist Neukaufen oft schneller und billiger – und so verschwindet mit jedem weggeworfenen Gerät auch das Wissen, wie man es wieder hinbekommt.</p>
        <p>Dabei passiert Reparatur längst überall: in <Link href="/repair-cafes">Repair Cafés</Link>, in offenen Werkstätten, an Küchentischen und in Hinterhöfen. Nur zählt sie niemand.</p>
        <p>Genau das ändert ein Rekordversuch. Er gibt vielen einzelnen Handgriffen eine gemeinsame Zahl und macht daraus ein Signal: Dinge verdienen ein zweites Leben, und Reparaturwissen gehört in die Mitte der Gesellschaft.</p>
        <p>Der Rekord ist dabei Mittel, nicht Zweck. Uns geht es nicht um einen Eintrag ins Guinness-Buch, sondern um das, was auf dem Weg dorthin entsteht – nachzulesen in den <Link href="/stories">Geschichten</Link> der Menschen, die mitmachen.</p>
        <p>Unser Maßstab sind die dokumentierten Bestleistungen aus Großbritannien. Für Nordrhein-Westfalen haben wir uns {recordGoal.toLocaleString("de-DE")} Reparaturen vorgenommen.</p>
        <p className="link-row">
          <Link className="text-button" href="/#zahlen-und-fakten">Alle Rekordzahlen und Quellen <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/stats">Aktueller Stand <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section region-section" aria-labelledby="region-title">
      <div>
        <p className="section-index">Wer dahinter steht</p>
        <h2 id="region-title">Drei Städte, eine gemeinsame Idee.</h2>
        <p>Der Reparaturrekord ist eine Initiative der <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>, der europäischen Aktionswoche zur Kreislaufwirtschaft. Organisiert wird er vom <a href={operator.website} target="_blank" rel="noreferrer">{operator.shortName}</a> in Wuppertal.</p>
        <p>In der Region getragen wird er von der FAB Region Bergisches Städtedreieck – einem gemeinsamen Projekt von Wuppertal, Solingen und Remscheid. Die drei Städte liegen so dicht beieinander, dass man sie seit jeher als Dreieck denkt.</p>
        <p>Die Idee stammt aus dem weltweiten <a href="https://fab.city/" target="_blank" rel="noreferrer">Fab-City-Netzwerk</a>: Regionen sollen wieder mehr von dem herstellen, reparieren und im Kreislauf halten, was sie verbrauchen. Im Bergischen richtet sich das auf drei Bereiche – Textilien, Ernährung und Bauen.</p>
        <p>Ausprobiert wird das an drei Orten:</p>
        <ul className="region-places">
          <li><a href="https://www.gut-einern.org/" target="_blank" rel="noreferrer">Gut Einern <span aria-hidden="true">&#8599;</span></a> <span>Wuppertal</span></li>
          <li><a href="https://www.glaeserne-werkstatt-solingen.de/" target="_blank" rel="noreferrer">Gläserne Werkstatt <span aria-hidden="true">&#8599;</span></a> <span>Solingen</span></li>
          <li><a href="https://gruenderschmiede.org/" target="_blank" rel="noreferrer">Gründerschmiede <span aria-hidden="true">&#8599;</span></a> <span>Remscheid</span></li>
        </ul>
        <p>Reparatur ist dabei der Anfang von allem. Bevor etwas recycelt, gespendet oder ersetzt wird, ist die längere Nutzung immer die beste Option – ökologisch wie sozial.</p>
        <p className="link-row">
          <a className="text-button" href="https://www.fab-bergisch.org/ueber-uns" target="_blank" rel="noreferrer">Mehr über die FAB Region <span aria-hidden="true">&#8599;</span></a>
          <Link className="text-button" href="/supporters">Wer das Projekt trägt <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
      <figure className="region-figure">
        <RegionTriangle />
        <figcaption>Drei Städte, eine Region: Wuppertal im Norden, Solingen im Südwesten, Remscheid im Südosten.</figcaption>
      </figure>
    </section>

    <section className="content-section contribution-grid" aria-labelledby="contribute-title">
      <div>
        <p className="section-index">Mitmachen</p>
        <h2 id="contribute-title">Ein Rekord ist Gemeinschaftsarbeit.</h2>
      </div>
      <ol>
        <li><p>Eine Reparatur dokumentieren und während des Zeitraums <Link href="/mitmachen">eintragen</Link>.</p></li>
        <li><p>Reparaturwissen in Werkstatt, Schule oder Nachbarschaft teilen – Einrichtungen bekommen Plakate und Material über den <a href="https://www.fab-bergisch.org/reparatur-weltrekord-in-nrw" target="_blank" rel="noreferrer">Verteiler</a>.</p></li>
        <li><p>Diese Website weiterentwickeln oder für die eigene Region nachnutzen – der Quelltext ist <Link href="/open-source">offen</Link>.</p></li>
      </ol>
    </section>

    <section className="content-section project-supporters" aria-labelledby="supporters-title">
      <div>
        <p className="section-index">Unterstützt von</p>
        <h2 id="supporters-title">Ein Projekt mit vielen Verbündeten.</h2>
        <p>Die Logos führen direkt zu den Organisationen, die das Projekt mittragen.</p>
      </div>
      <PartnerLogoGrid />
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.celebrate.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Reparaturrekord NRW ist Teil der <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>.</p>
      <div className="project-contact-actions">
        <a className="button button-secondary" href={mailto(CONTACT_EMAIL, "Reparaturrekord NRW unterstuetzen")}>Projekt unterstützen <span aria-hidden="true">&#8594;</span></a>
        <Link className="text-button" href="/supporters">Alle, die uns unterstützen <span aria-hidden="true">&#8594;</span></Link>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
