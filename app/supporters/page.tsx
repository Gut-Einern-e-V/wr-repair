import Link from "next/link";
import NextImage from "next/image";
import { FundingAbbinder } from "@/components/funding-abbinder";
import { PartnerLogoGrid } from "@/components/partner-logo-grid";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL, circularWeek, mailto, projectCredits } from "@/lib/organisation";

const CONTACT = mailto(CONTACT_EMAIL, "Reparaturrekord NRW unterstuetzen");

export const metadata = {
  title: "Unterstützung",
  description:
    "Danke an alle, die den Reparaturrekord NRW mittragen – und eine Einladung an alle, die dazukommen möchten: mit einem Preis fürs Gewinnspiel, mit Reichweite, Räumen oder Material.",
};

/* Weil die Foerderlogos hier gross im Inhalt stehen, laesst diese Seite die
   Foerderleiste im Footer weg.

   EU-Emblem, Ministerium und efre-Wortmarke standen bis Issue #97 als drei
   Karten mit eigener Rollenzeile nebeneinander. Der EFRE-Leitfaden erlaubt das
   nicht: Die drei sind eine gebundene Logo-Kombination und duerfen nicht
   zerlegt werden. Sie stehen jetzt als ein Abbinder unter der Karte des
   Projekttraegers, die Rollen nennt die Zeile darunter. */

export default function SupportersPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <section id="inhalt" className="content-hero" aria-labelledby="supporters-title"><p className="brand-kicker">Unterstützung</p><h1 className="sticker-head is-mint" id="supporters-title"><span className="sticker">Reparatur braucht</span><span className="sticker">Rückenwind</span></h1><p>Der Weltrekordversuch verbindet Menschen, Orte und Wissen. Er gehört zur <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>; diese Partnerorganisationen tragen ihn in der Region mit.</p></section>
    {/* Die Logowand hatte nur ein `aria-label` und darueber kein Wort (Issue
        #114). Was hier fehlte, war das Naheliegendste: der Dank. */}
    <section className="content-section" aria-labelledby="partners-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Danke</p>
          <h2 id="partners-title">Ohne diese Häuser bliebe es eine Idee.</h2>
          <p className="section-lead">Sie stellen Räume, Werkzeug, Reichweite und Preise für das Gewinnspiel – und sie tun das, weil ihnen Reparatur genauso wichtig ist wie uns. Dafür ein großes Dankeschön.</p>
        </div>
      </div>
      <PartnerLogoGrid />
    </section>
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
    {/* Und die Einladung, die zum Dank gehoert (Issue #114): Eine Logowand
        ohne Weg hinein liest sich wie ein geschlossener Kreis. Die vier Wege
        sind die, nach denen wirklich gefragt wird - fuer alles andere steht
        die Adresse darunter. */}
    <section className="content-section two-column-copy" aria-labelledby="join-title">
      <div>
        <p className="section-index">Mithelfen</p>
        <h2 id="join-title">Ihr möchtet dazugehören?</h2>
      </div>
      <div>
        <p>Der Rekordversuch lebt davon, dass viele ein kleines Stück beitragen. Am hilfreichsten ist gerade:</p>
        <ul>
          <li><strong>Einen Preis stiften.</strong> Werkzeug, Material oder ein Gutschein wandern in die Verlosung, der Name der stiftenden Organisation steht mit auf der <Link href="/gewinnspiel">Gewinnspielseite</Link>.</li>
          <li><strong>Reichweite geben.</strong> Ein Aushang im Schaufenster, ein Beitrag im Newsletter, ein Hinweis in der Mitgliederpost.</li>
          <li><strong>Räume und Material.</strong> Ein Ort für eine Reparaturaktion, Werkbänke, Ersatzteile, Verpflegung für Helfende.</li>
          <li><strong>Kundschaft hinweisen.</strong> Wer beruflich repariert, stellt einen <Link href="/aufsteller">Aufsteller mit QR-Code</Link> auf die Theke – wie das geht, steht auf der Seite <Link href="/reparaturbetriebe">für Reparaturbetriebe</Link>.</li>
        </ul>
        <p>Etwas anderes im Kopf? Schreibt uns trotzdem. Wir sagen ehrlich, ob es passt.</p>
        <p className="link-row">
          <a className="button button-primary" href={CONTACT}>Projekt unterstützen <span aria-hidden="true">&#8594;</span></a>
          <a className="text-button" href={CONTACT}>{CONTACT_EMAIL} <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>
    <section className="funding-note" aria-labelledby="funding-title">
      <p className="section-index">Förderhinweis</p>
      <h2 id="funding-title">Gefördert vom Land NRW und aus EFRE-Mitteln.</h2>
      {/* Praezisiert nach Issue #78: Gefoerdert wird das Projekt, in dem diese
          Website entstanden ist - nicht der Rekordversuch als Ganzes. Der
          gehoert zur Circular Week. */}
      <p>Diese Website ist im Projekt &bdquo;FAB.Region Bergisches Städtedreieck &ndash; Transformation hin zu einer co-kreativen Kreislaufwirtschaftsregion&ldquo; entstanden. Es wird aus Mitteln des Europäischen Fonds für regionale Entwicklung (EFRE) und des Landes Nordrhein-Westfalen gefördert.</p>
      <div className="funding-cards">
        <a className="funding-card" href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">
          <NextImage src="/funding/fab-region-dark.png" alt="FAB Region Bergisches Städtedreieck" width={1355} height={381} sizes="200px" />
          <span>Projektträger</span>
        </a>
        <a className="funding-card is-abbinder" href="https://www.efre.nrw/" target="_blank" rel="noreferrer">
          <FundingAbbinder />
          <span>Europäischer Fonds für regionale Entwicklung (EFRE) und Land Nordrhein-Westfalen</span>
        </a>
      </div>
      <a className="text-button" href="https://www.fab-bergisch.org/ueber-uns/projektpartner-unterstutzende" target="_blank" rel="noreferrer">Alle Projektbeteiligten ansehen <span aria-hidden="true">&#8599;</span></a>
    </section>
    <SiteFooter funding={false} />
  </main>;
}
