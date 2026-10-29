import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BreadcrumbStructuredData, FestivalStructuredData } from "@/components/structured-data";
import { brandPhotos } from "@/lib/brand-photos";
import { FESTIVAL_DATE_ISO, FESTIVAL_DATE_TEXT, FESTIVAL_SIGNUP_URL, FestivalFacts, FestivalNav } from "./festival-chrome";
import { festivalAreas, festivalSchedule, repairWorkshops, type FestivalArea, type FestivalOfferKind, type FestivalVenueName } from "./programm";

export const metadata = {
  title: "Repair & Share Festival",
  description:
    "Am 31. Oktober 2026 endet der Reparaturrekord mit dem Repair & Share Festival in Utopiastadt und Wiesenwerken in Wuppertal: 11 bis 17 Uhr, Eintritt frei. Das ganze Programm: ReparaturCafé XXL, Live-Reparatur auf der Bühne, Rallye mit rund 40 Mitmachstationen, Workshops, Secondhand und die Countdown-Show zum Rekord.",
};

/* Fragen wie auf der Festivalseite der FAB Region (FESTIVAL_FAB_URL), ohne
   Emojis und ohne Anmeldelinks fuer Fragen, die auf dieser Website anders
   beantwortet werden - etwa das Einreichen von Reparaturen ueber /mitmachen.
   Das Programm steht in ./programm.ts. */
const questions = [
  ["Was kann vor Ort repariert werden?", "Ziemlich viel: Elektro- und Haushaltsgeräte, Kleidung und Textilien, Fahrräder und alles, was mechanisch ist. Die Faustregel: alles, was ihr allein zum Festival tragen könnt. Nur Möbel nicht – eine Möbelreparatur dauert meist länger als der Festivaltag."],
  ["Muss ich selbst reparieren?", "Nein, aber ihr dürft sehr gerne. Im ReparaturCafé XXL helfen euch Ehrenamtliche, eure Sachen selbst zu reparieren. Sagt einfach, welche Hilfe ihr braucht – vielleicht stellt sich heraus, dass Schrauben richtig Spaß macht."],
  ["Wer schraubt und näht da eigentlich?", "Das Netzwerk Reparatur Wuppertal betreibt die Werkstätten, dazu kommen unter anderem das MACHBAR ReparaturCafé, das ASTA RepairCafé Bochum, Repair & Share Ruhr, die Arrenbergstatt und iFixit."],
  ["Ist das Festival für die ganze Familie?", "Ja. Für Kinder gibt es das Theaterstück „Zirkus Stinknich“ (ab 4 Jahren), Holzflitzer bauen, Kinderschminken, Basteltiere unter Strom und die Rallye über das ganze Gelände."],
  ["Aber da ist doch Halloween …?", "Perfekt. Kommt gerne verkleidet – oder lasst euch beim Kinderschminken im Wartesaal 1 tierisch, märchenhaft oder gruselig herrichten. Auch die Halloween-Deko für das Festival entsteht aus Resten."],
  ["Wie komme ich zwischen den beiden Orten hin und her?", "Utopiastadt und Wiesenwerke liegen rund 700 Meter auseinander an der Nordbahntrasse, etwa zehn Minuten zu Fuß. Für alle, die nicht gut zu Fuß sind, pendelt ein Rikscha-Shuttle."],
  ["Gibt es etwas zu essen?", "Ja. Für veganes Essen ist im Bahnhof Blo in den Wiesenwerken und an der Nordbahntrasse bei der Utopiastadt gesorgt, Kaffee und Kuchen gibt es beim Kulturkindergarten."],
  ["Welchen Rekord wollen wir schlagen?", "2024 wurden in Großbritannien 3.177 erfolgreiche Reparaturen in einem Monat gezählt, 2019 in Exeter 268 an einem einzigen Tag und Ort. Beides nehmen wir uns vor: den Monatsrekord in ganz NRW – und am Festivaltag mindestens 300 erfolgreiche Reparaturen an einem Ort."],
  ["Ich brauche jetzt Hilfe, nicht erst am Festivaltag.", "Auf unserer Karte stehen die Repair Cafés und Reparaturinitiativen in NRW, mehr findet ihr bei reparatur-initiativen.de. Die Initiativen freuen sich über alle, die vorbeikommen – mit kaputtem Toaster oder mit Werkzeugkoffer."],
  ["Ich kann gar nicht reparieren, will aber mithelfen.", "Reparaturinitiativen brauchen nicht nur Reparaturprofis: Aufbauen, Organisieren, Registrieren, Kuchen backen und Menschen ins Gespräch bringen gehört genauso dazu. Für das Festival könnt ihr euch über das Anmeldeformular melden, für die Zeit davor bei einer Initiative in eurer Nähe."],
] as const;

/* Eigener Bereich statt eines Abschnitts auf /repair-cafes (Issue #33).
   Das Festival ist der Schlusspunkt des Rekordmonats und richtet sich an zwei
   sehr verschiedene Gruppen: an Menschen, die einen Tag lang hinkommen, und an
   Initiativen, die dort selbst etwas anbieten. Beide brauchen andere Angaben,
   deshalb die Unterseiten - hier steht nur, was fuer alle gilt.

   Seit das Programm steht (Issue #163), steht es hier vollstaendig: erst
   alles mit fester Uhrzeit, dann die Werkstaetten, fuer die man einen
   kaputten Gegenstand mitbringt, dann jeder Ort Raum fuer Raum wie auf den
   Aushaengen vor Ort. */
export default function FestivalPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <FestivalStructuredData />
    <BreadcrumbStructuredData trail={[["/festival", "Repair & Share Festival"]]} />

    <section id="inhalt" className="content-hero" aria-labelledby="festival-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="festival-title">Am letzten Tag kommt alles zusammen.</h1>
        <p>Der Rekordmonat endet mit einem Festival zum Mitmachen in Utopiastadt und Wiesenwerken in Wuppertal: Reparieren und Secondhand zum Anfassen, Workshops, Impulse – und die letzten Reparaturen für den Rekord. Wer keinen kaputten Gegenstand dabei hat, ist selber schuld.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="festival-facts-title">
      <FestivalNav current="/festival" />
      <div className="section-heading">
        <div>
          <p className="section-index">Der Termin</p>
          <h2 id="festival-facts-title"><time dateTime={FESTIVAL_DATE_ISO}>{FESTIVAL_DATE_TEXT}</time></h2>
        </div>
      </div>
      <FestivalFacts />
    </section>

    <section className="content-section" aria-labelledby="festival-schedule-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Rahmenprogramm</p>
          <h2 id="festival-schedule-title">Was wann passiert.</h2>
        </div>
      </div>
      <p className="section-lead">Bühne, Vorträge, Führungen und Workshops mit fester Uhrzeit. Alles andere läuft den ganzen Tag von 11 bis 17 Uhr.</p>
      <ol className="festival-schedule">
        {festivalSchedule.map((slot) => (
          <li key={`${slot.start}-${slot.title}-${slot.venue}`}>
            <p className="festival-schedule-time"><time dateTime={`${FESTIVAL_DATE_ISO}T${slot.start}`}>{slot.start}</time>&ndash;<time dateTime={`${FESTIVAL_DATE_ISO}T${slot.end}`}>{slot.end}</time></p>
            <div>
              <h3>{slot.title}</h3>
              {slot.by ? <p className="festival-schedule-by">{slot.by}</p> : null}
              <p>{slot.text}</p>
            </div>
            <p className="festival-schedule-place">{slot.venue}<br />{slot.room}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className="content-section" aria-labelledby="festival-repair-title">
      <div className="section-heading">
        <div>
          <p className="section-index">ReparaturCafé XXL</p>
          <h2 id="festival-repair-title">Bringt mit, was kaputt ist.</h2>
        </div>
      </div>
      <p className="section-lead">In den Wiesenwerken helfen euch Ehrenamtliche vom Netzwerk Reparatur Wuppertal und vielen weiteren Initiativen, eure mitgebrachten Sachen selbst zu reparieren. Jede gelungene Reparatur zählt für den Rekord.</p>
      <dl className="travel-routes">
        {repairWorkshops.map((workshop) => (
          <div key={workshop.name}><dt>{workshop.name}</dt><dd><strong>{workshop.where}.</strong> {workshop.text}</dd></div>
        ))}
      </dl>
    </section>

    <section className="content-section" aria-labelledby="festival-rallye-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Rallye &amp; Stände</p>
          <h2 id="festival-rallye-title">Raum für Raum.</h2>
        </div>
      </div>
      <p className="section-lead">An den Infoständen im Wartesaal 1 der Utopiastadt und am Bauwagen und im Bahnhof Blo der Wiesenwerke bekommt ihr den Rallye-Plan. An jeder <span className="festival-tag" data-kind="rallye">Rallye</span>-Station legt ihr selbst Hand an; die <span className="festival-tag" data-kind="workshop">Workshop</span>-Stationen brauchen etwas mehr Zeit und Geschick.</p>
      <nav className="festival-nav" aria-label="Festivalorte">
        {festivalAreas.map((area) => <a key={area.venue} href={`#${areaId(area.venue)}`}>{area.venue}</a>)}
      </nav>
      {festivalAreas.map((area) => <FestivalAreaBlock key={area.venue} area={area} />)}
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
        <p>Engagierte aus Reparaturinitiativen und Secondhand-Fashion sind das Herzstück des Festivals. Ob als Reparateur:in, beim Organisieren, als Unternehmen mit eigenem Angebot oder als Sponsor: Meldet euch über das Anmeldeformular – eine Anmeldung pro Person.</p>
        <p>Was ihr sonst wissen müsst, steht auf der Seite für Initiativen.</p>
        <p className="link-row">
          <a className="button button-primary" href={FESTIVAL_SIGNUP_URL} target="_blank" rel="noreferrer">Zum Festival anmelden <span aria-hidden="true">&#8599;</span></a>
          <Link className="text-button" href="/festival/initiativen">Infos für Initiativen <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/repair-cafes">Alle Repair Cafés in NRW <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="festival-faq-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Fragen &amp; Antworten</p>
          <h2 id="festival-faq-title">Was ihr vorher wissen wollt.</h2>
        </div>
      </div>
      <div className="faq-list">
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}<i aria-hidden="true">+</i></summary>
            <p>{answer}</p>
          </details>
        ))}
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

const offerLabels: Record<FestivalOfferKind, string> = { rallye: "Rallye", workshop: "Workshop" };

function areaId(venue: FestivalVenueName) {
  return `ort-${venue.toLowerCase()}`;
}

/* Ein Ort wie auf seinem Aushang: Raeume, darin Anbieter, darunter deren
   Stationen. Ohne Aufklappen - die Texte sind kurz, und so findet die Suche
   im Browser auch, was in einem Raum steht. */
function FestivalAreaBlock({ area }: { area: FestivalArea }) {
  return <section className="festival-area" id={areaId(area.venue)} aria-labelledby={`${areaId(area.venue)}-title`}>
    <h3 id={`${areaId(area.venue)}-title`}>{area.venue}</h3>
    <p className="festival-area-intro">{area.intro}</p>
    <div className="festival-rooms">
      {area.rooms.map((room) => (
        <article key={room.name} className="festival-room">
          <h4>{room.name}{room.where ? <small>{room.where}</small> : null}</h4>
          {room.intro ? <p className="festival-room-intro">{room.intro}</p> : null}
          <ul className="festival-providers">
            {room.providers.map((provider) => (
              <li key={provider.name}>
                <p className="festival-provider-name">{provider.name}</p>
                {provider.about ? <p>{provider.about}</p> : null}
                {provider.offers?.length ? <ul className="festival-offers">
                  {provider.offers.map((offer) => (
                    <li key={offer.title}>
                      <span className="festival-tag" data-kind={offer.kind}>{offerLabels[offer.kind]}</span>
                      <strong>{offer.title}</strong>
                      <p>{offer.text}</p>
                    </li>
                  ))}
                </ul> : null}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  </section>;
}
