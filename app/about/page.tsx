import Link from "next/link";
import NextImage from "next/image";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { RegionTriangle } from "@/components/region-triangle";
import { getAppSettings } from "@/lib/app-settings";
import { brandPhotos } from "@/lib/brand-photos";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Über das Projekt",
  description:
    "Warum die FAB Region Bergisches Städtedreieck einen Reparatur-Weltrekord versucht: Reparieren sichtbar machen, Wissen teilen und zeigen, wie viel Kreislaufwirtschaft im Alltag schon steckt.",
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
        <p>Etwas selbst zu reparieren war einmal selbstverständlich. Heute ist Neukaufen oft schneller und billiger – und so verschwindet mit jedem weggeworfenen Gerät auch das Wissen, wie man es wieder hinbekommt. Dabei passiert Reparatur längst überall: in Repair Cafés, in offenen Werkstätten, an Küchentischen und in Hinterhöfen. Nur zählt sie niemand.</p>
        <p>Genau das ändert ein Rekordversuch. Er gibt vielen einzelnen Handgriffen eine gemeinsame Zahl und macht daraus ein Signal: Dinge verdienen ein zweites Leben, und Reparaturwissen gehört in die Mitte der Gesellschaft. Der Rekord ist dabei Mittel, nicht Zweck – uns geht es nicht um einen Eintrag ins Guinness-Buch, sondern um das, was auf dem Weg dorthin entsteht.</p>
        <p>Als Maßstab dienen die dokumentierten Bestleistungen der britischen Kampagne The BIG FIX: 268 Reparaturen an einem Tag und Ort (2019, Exeter) sowie 3.177 Reparaturen in einem Monat landesweit (2024). Für Nordrhein-Westfalen haben wir uns {recordGoal.toLocaleString("de-DE")} Reparaturen vorgenommen.</p>
        <a className="text-button" href="https://www.recycledevon.org/thebigfix" target="_blank" rel="noreferrer">Quelle: The BIG FIX, Recycle Devon <span aria-hidden="true">&#8599;</span></a>
      </div>
    </section>

    <section className="content-section region-section" aria-labelledby="region-title">
      <div>
        <p className="section-index">Wer dahinter steht</p>
        <h2 id="region-title">Drei Städte, eine gemeinsame Idee.</h2>
        <p>Der Reparaturrekord kommt aus der FAB Region Bergisches Städtedreieck – einem Projekt von Wuppertal, Solingen und Remscheid. Die drei Städte liegen so dicht beieinander, dass man sie seit jeher als Dreieck denkt. Die FAB Region arbeitet daran, aus dieser Nachbarschaft eine Wirtschaftsweise zu machen: nachhaltig, lokal produzierend und global vernetzt. Getragen wird sie von Organisationen aus Zivilgesellschaft, Wirtschaft und Wissenschaft, gefördert vom Land Nordrhein-Westfalen und der Europäischen Union.</p>
        <p>Die Idee dahinter stammt aus dem weltweiten Fab-City-Netzwerk: Regionen sollen wieder mehr von dem herstellen, reparieren und im Kreislauf halten, was sie verbrauchen. Im Bergischen richtet sich das auf drei Bereiche – Textilien, Ernährung und Bauen – und auf reale Orte, an denen das ausprobiert wird: Gut Einern in Wuppertal, die Gläserne Werkstatt in Solingen, die Gründerschmiede in Remscheid.</p>
        <p>Reparatur ist dabei der Anfang von allem. Bevor etwas recycelt, gespendet oder ersetzt wird, ist die längere Nutzung immer die beste Option – ökologisch wie sozial. Der Reparaturrekord bringt diesen Gedanken aus den Werkstätten in die ganze Region.</p>
        <a className="text-button" href="https://www.fab-bergisch.org/ueber-uns" target="_blank" rel="noreferrer">Mehr über die FAB Region <span aria-hidden="true">&#8599;</span></a>
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
        <li><p>Reparaturwissen in Werkstatt, Schule oder Nachbarschaft teilen.</p></li>
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
      <p>Reparaturrekord NRW ist Teil der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region Bergisches Städtedreieck</a>.</p>
      <div className="project-contact-actions">
        <a className="button button-secondary" href="mailto:mail@gut-einern.org?subject=Reparaturrekord%20NRW%20unterstuetzen">Projekt unterstützen <span aria-hidden="true">&#8594;</span></a>
        <Link className="text-button" href="/supporters">Alle, die uns unterstützen <span aria-hidden="true">&#8594;</span></Link>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
