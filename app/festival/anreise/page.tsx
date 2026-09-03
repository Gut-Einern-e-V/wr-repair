import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FESTIVAL_DATE_TEXT, FestivalFacts, FestivalNav, FestivalPending } from "../festival-chrome";

export const metadata = {
  title: "Anreise zum Festival",
  description:
    "Wie ihr am 31. Oktober 2026 zum Repair & Share Festival in der Utopiastadt in Wuppertal kommt: mit Bus und Bahn, mit dem Rad über die Nordbahntrasse, zu Fuß – und warum wir vom Auto abraten.",
};

/* Eigene Seite und nicht nur ein Absatz (Issue #33).
   Die Bitte, mit Bus, Bahn oder Rad zu kommen, ist im Issue ausdruecklich
   genannt und keine Nebensache: Am Gelaende gibt es kaum Parkplaetze, und ein
   Fest ueber den sorgsamen Umgang mit Ressourcen kann schlecht einen Tag lang
   Parksuchverkehr durch den Stadtteil schicken. Eine eigene Seite kann diese
   Bitte begruenden, statt sie nur auszusprechen. */
export default function FestivalTravelPage() {
  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="travel-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="travel-title">Am besten mit Bahn, Bus oder Rad.</h1>
        <p>Das Festivalgelände liegt mitten in Wuppertal und ist ohne Auto am einfachsten zu erreichen. Hier stehen die Wege, die wir empfehlen.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="travel-facts-title">
      <FestivalNav current="/festival/anreise" />
      <div className="section-heading">
        <div>
          <p className="section-index">Der Termin</p>
          <h2 id="travel-facts-title">{FESTIVAL_DATE_TEXT}</h2>
        </div>
      </div>
      <FestivalFacts />
      <FestivalPending>Die genaue Adresse des Eingangs, die nächstgelegene Haltestelle mit Linien und Fahrtzeiten sowie die Stellplätze für Räder. Sobald das Gelände geplant ist, steht es hier.</FestivalPending>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-transit-title">
      <div>
        <p className="section-index">Mit Bus und Bahn</p>
        <h2 id="travel-transit-title">Wuppertal ist gut angebunden.</h2>
      </div>
      <div>
        <p>Wuppertal liegt an der Bahnstrecke zwischen Köln und Dortmund; aus dem ganzen Rheinland und dem Ruhrgebiet sind es Regionalzüge im dichten Takt. Vom Hauptbahnhof und von der Schwebebahn geht es mit dem Stadtbus weiter Richtung Norden.</p>
        <p>Wer aus dem Bergischen kommt, fährt am besten mit dem VRR-Ticket durch – ein Gruppenticket lohnt sich, wenn ihr als Initiative gemeinsam anreist.</p>
        <FestivalPending>Welche Linien und Haltestellen wir konkret empfehlen. Das hängt am Eingang, der noch nicht festgelegt ist.</FestivalPending>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-bike-title">
      <div>
        <p className="section-index">Mit dem Rad</p>
        <h2 id="travel-bike-title">Über die Nordbahntrasse bis vor die Tür.</h2>
      </div>
      <div>
        <p>Die Nordbahntrasse führt fast ohne Steigung quer durch Wuppertal und direkt an der Utopiastadt vorbei. Für Wuppertaler Verhältnisse ist das die bequemste Art, mit dem Rad quer durch die Stadt zu kommen – und die schönste.</p>
        <p>Bringt ein Schloss mit: Abstellmöglichkeiten planen wir ein, bewacht sind sie nicht.</p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-car-title">
      <div>
        <p className="section-index">Mit dem Auto</p>
        <h2 id="travel-car-title">Bitte nur, wenn es nicht anders geht.</h2>
      </div>
      <div>
        <p>Rund um das Gelände gibt es kaum Parkplätze, und die Straßen im Viertel sind eng. Ein Tag lang Parksuchverkehr wäre für die Nachbarschaft eine Zumutung – und für ein Fest über den sorgsamen Umgang mit Dingen ein schiefes Bild.</p>
        <p>Wer auf das Auto angewiesen ist, etwa weil schwere Werkzeugkisten mitkommen oder weil Bus und Bahn nicht barrierefrei nutzbar sind, meldet sich bitte vorher bei uns. Für Anlieferung und für Menschen mit Mobilitätseinschränkungen finden wir eine Lösung.</p>
        <p className="link-row">
          <a className="text-button" href="mailto:mail@gut-einern.org?subject=Repair%20%26%20Share%20Festival%20-%20Anreise">Wegen der Anreise schreiben <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="travel-access-title">
      <div>
        <p className="section-index">Barrierefreiheit</p>
        <h2 id="travel-access-title">Sagt uns, was ihr braucht.</h2>
      </div>
      <div>
        <p>Das Gelände ist ein ehemaliges Bahn- und Industriegelände; nicht jeder Weg dort ist eben. Was am Festivaltag barrierefrei erreichbar sein wird, steht noch nicht in allen Punkten fest.</p>
        <p>Schreibt uns, was ihr braucht – Begleitung, ein ruhiger Ort, ein Weg ohne Stufen. Je früher wir es wissen, desto eher lässt es sich einplanen.</p>
        <p className="link-row">
          <Link className="text-button" href="/accessibility">Barrierefreiheit auf dieser Website <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
