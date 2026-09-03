import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { FESTIVAL_DATE_ISO, FESTIVAL_DATE_TEXT, FestivalFacts, FestivalNav, FestivalPending } from "./festival-chrome";

export const metadata = {
  title: "Repair & Share Festival",
  description:
    "Am 31. Oktober 2026 endet der Reparaturrekord mit dem Repair & Share Festival in der Utopiastadt in Wuppertal. Was bisher feststeht, für Besuchende und für Reparaturinitiativen.",
};

/* Eigener Bereich statt eines Abschnitts auf /repair-cafes (Issue #33).
   Das Festival ist der Schlusspunkt des Rekordmonats und richtet sich an zwei
   sehr verschiedene Gruppen: an Menschen, die einen Tag lang hinkommen, und an
   Initiativen, die dort selbst etwas anbieten. Beide brauchen andere Angaben,
   deshalb die Unterseiten - hier steht nur, was fuer alle gilt.

   Der groesste Teil des Programms steht im Moment noch nicht fest. Was fehlt,
   steht als solches auf der Seite: eine Save-the-date-Seite, die so tut, als
   waere schon alles geplant, muesste spaeter jede Angabe widerrufen. */
export default function FestivalPage() {
  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="festival-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="festival-title">Am letzten Tag kommt alles zusammen.</h1>
        <p>Der Rekordmonat endet dort, wo Reparieren im Bergischen ohnehin zu Hause ist: in der Utopiastadt in Wuppertal. Ein Tag mit Werkstätten, Tauschen, Musik und der Zahl, die wir gemeinsam erreicht haben.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="festival-facts-title">
      <FestivalNav current="/festival" />
      <div className="section-heading">
        <div>
          <p className="section-index">Save the Date</p>
          <h2 id="festival-facts-title"><time dateTime={FESTIVAL_DATE_ISO}>{FESTIVAL_DATE_TEXT}</time></h2>
        </div>
      </div>
      <FestivalFacts />
      <FestivalPending>Uhrzeiten, das Programm des Tages und die genaue Adresse auf dem Gelände. Sobald die Planung steht, wird sie hier nachgetragen.</FestivalPending>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="festival-visit-title">
      <div>
        <p className="section-index">Für Besuchende</p>
        <h2 id="festival-visit-title">Kommt vorbei – und kommt bitte ohne Auto.</h2>
      </div>
      <div>
        <p>Das Festival ist offen für alle: für Menschen, die selbst schrauben, für alle, die das noch nie gemacht haben, und für alle, die einfach schauen wollen, was aus einem Monat Reparieren geworden ist.</p>
        <p>Das Gelände liegt mitten in Wuppertal und ist mit Bus, Bahn und Rad gut zu erreichen. Parkplätze gibt es dort so gut wie keine – und ein Fest über Ressourcen, zu dem alle einzeln mit dem Auto anreisen, wäre eine seltsame Sache.</p>
        <p className="link-row">
          <Link className="text-button" href="/festival/anreise">So kommt ihr hin <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="festival-initiatives-title">
      <div>
        <p className="section-index">Für Reparaturinitiativen</p>
        <h2 id="festival-initiatives-title">Ohne die Initiativen gibt es kein Festival.</h2>
      </div>
      <div>
        <p>Repair Cafés, offene Werkstätten, Nähtreffs, Fahrradselbsthilfen: Wer im Rekordmonat mitgemacht hat, ist am 31. Oktober herzlich eingeladen – mit einem eigenen Stand, einer Werkstatt oder einfach als Gast.</p>
        <p>Was ihr dafür wissen müsst, was wir stellen und was ihr selbst mitbringt, steht auf der Seite für Initiativen.</p>
        <p className="link-row">
          <Link className="text-button" href="/festival/initiativen">Infos für Initiativen <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/repair-cafes">Alle Repair Cafés in NRW <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.celebrate.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Bis dahin zählt jede Reparatur.</p>
      <Link className="button button-secondary" href="/mitmachen">Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
    </section>

    <SiteFooter />
  </main>;
}
