import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BreadcrumbStructuredData, FestivalStructuredData } from "@/components/structured-data";
import { brandPhotos } from "@/lib/brand-photos";
import { DAY_PLACE_RECORD, MONTH_RECORD } from "@/lib/repair-records";
import { FestivalFacts, FestivalNav, FestivalVenues } from "./festival-chrome";
import { FestivalJumpNav } from "./festival-jump-nav";
import { FestivalMap } from "./festival-map";
import { FestivalNow, FestivalSchedule } from "./festival-schedule";
import { FestivalStations } from "./festival-stations";
import { festivalAreas, festivalSchedule, repairWorkshops, roomId } from "./programm";

export const metadata = {
  title: "Repair & Share Festival",
  description:
    "Am 31. Oktober 2026 endete der Reparaturrekord mit dem Repair & Share Festival in Utopiastadt und Wiesenwerken in Wuppertal – dort fiel auch der Weltrekord für die meisten Reparaturen an einem Tag und Ort. Das Programm im Rückblick: ReparaturCafé XXL, Live-Reparatur auf der Bühne, Rallye mit rund 40 Mitmachstationen, Workshops, Secondhand und die Countdown-Show zum Rekord.",
};

/* Fragen wie auf der Festivalseite der FAB Region (FESTIVAL_FAB_URL), ohne
   Emojis und ohne Anmeldelinks. Seit dem Festival stehen sie als Rueckblick
   in der Vergangenheit; die Seite ist an einen Tag gebunden, der vorbei ist,
   und braucht deshalb keinen Wechsel nach Phase (lib/campaign-closed.ts).
   Das Programm steht in ./programm.ts. */
const questions = [
  ["Was konnte vor Ort repariert werden?", "Ziemlich viel: Elektro- und Haushaltsgeräte, Kleidung und Textilien, Fahrräder und alles, was mechanisch ist. Die Faustregel: alles, was man allein zum Festival tragen konnte. Nur Möbel nicht – eine Möbelreparatur dauert meist länger als der Festivaltag."],
  ["Musste man selbst reparieren?", "Nein, aber man durfte sehr gerne. Im ReparaturCafé XXL halfen Ehrenamtliche, die mitgebrachten Sachen selbst zu reparieren – und manche haben dabei gemerkt, dass Schrauben richtig Spaß macht."],
  ["Wer hat da eigentlich geschraubt und genäht?", "Das Netzwerk Reparatur Wuppertal betrieb die Werkstätten, dazu kamen unter anderem das MACHBAR ReparaturCafé, das ASTA RepairCafé Bochum, Repair & Share Ruhr, die Arrenbergstatt und iFixit."],
  ["War das Festival für die ganze Familie?", "Ja. Für Kinder gab es das Theaterstück „Zirkus Stinknich“ (ab 4 Jahren), Holzflitzer bauen, Kinderschminken, Basteltiere unter Strom und die Rallye über das ganze Gelände."],
  ["Und Halloween?", "Passte perfekt. Verkleiden war ausdrücklich erwünscht, und beim Kinderschminken im Wartesaal 1 ging es tierisch, märchenhaft oder gruselig zu. Auch die Halloween-Deko für das Festival entstand aus Resten."],
  ["Wie kam man zwischen den beiden Orten hin und her?", "Utopiastadt und Wiesenwerke liegen rund 700 Meter auseinander an der Nordbahntrasse, etwa zehn Minuten zu Fuß. Für alle, die nicht gut zu Fuß waren, pendelte ein Rikscha-Shuttle."],
  ["Gab es etwas zu essen?", "Ja. Für veganes Essen war im Bahnhof Blo in den Wiesenwerken und an der Nordbahntrasse bei der Utopiastadt gesorgt, Kaffee und Kuchen gab es beim Kulturkindergarten."],
  ["Welche Rekorde haben wir geschlagen?", `Zwei Bestmarken aus Großbritannien: 2024 wurden dort ${MONTH_RECORD.toLocaleString("de-DE")} erfolgreiche Reparaturen in einem Monat gezählt, 2019 in Exeter ${DAY_PLACE_RECORD.toLocaleString("de-DE")} an einem einzigen Tag und Ort. NRW hat im Oktober den Monatsrekord übertroffen – und am Festivaltag fiel hier in Wuppertal auch der Rekord für einen Tag und einen Ort.`],
  ["Ich brauche Hilfe beim Reparieren.", "Auf unserer Karte stehen die Repair Cafés und Reparaturinitiativen in NRW, mehr findet ihr bei reparatur-initiativen.de. Die Initiativen freuen sich auch nach dem Festival über alle, die vorbeikommen – mit kaputtem Toaster oder mit Werkzeugkoffer."],
  ["Ich kann gar nicht reparieren, will aber mithelfen.", "Reparaturinitiativen brauchen nicht nur Reparaturprofis: Aufbauen, Organisieren, Registrieren, Kuchen backen und Menschen ins Gespräch bringen gehört genauso dazu. Fragt einfach bei einer Initiative in eurer Nähe."],
] as const;

const sections = [
  ["zeitplan", "Zeitplan"],
  ["reparieren", "Reparieren"],
  ["lageplan", "Lageplan"],
  ["stationen", "Stationen"],
  ["anreise", "Anreise"],
  ["fragen", "Fragen"],
] as const;

/* Eigener Bereich statt eines Abschnitts auf /repair-cafes (Issue #33).
   Das Festival war der Schlusspunkt des Rekordmonats und richtet sich an zwei
   sehr verschiedene Gruppen: an Menschen, die einen Tag lang hinkommen, und an
   Initiativen, die dort selbst etwas anbieten. Beide brauchen andere Angaben,
   deshalb die Unterseiten - hier steht nur, was fuer alle gilt.

   Die Reihenfolge folgt dem, was Besuchende zuerst wissen wollen: Was laeuft
   jetzt, wann ist was, wo repariere ich mein Ding, wo ist was, wie komme ich
   hin. Die Mitwirkung fuer Initiativen steht am Ende, weil sie sich an wenige
   richtet. Zeitplan und Stationen sind filterbar und zugeklappt, damit die
   Seite auf dem Telefon nicht mehr rund 28 Bildschirme lang ist. */
export default function FestivalPage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <FestivalStructuredData />
    <BreadcrumbStructuredData trail={[["/festival", "Repair & Share Festival"]]} />

    <section id="inhalt" className="content-hero festival-hero" aria-labelledby="festival-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival &middot; So war das Festival</p>
        <h1 id="festival-title">Am letzten Tag kam alles zusammen.</h1>
        <p>Der Rekordmonat endete mit einem Festival zum Mitmachen in Utopiastadt und Wiesenwerken in Wuppertal: Reparieren und Secondhand zum Anfassen, Workshops, Impulse – und die letzten Reparaturen für den Rekord. Dabei fiel hier auch der Weltrekord für die meisten Reparaturen an einem Tag und einem Ort.</p>
        <p className="hero-actions">
          <Link className="button button-primary" href="/stats">Zum Ergebnis <span aria-hidden="true">&#8594;</span></Link>
          <a className="button button-secondary" href="#zeitplan">Programm <span aria-hidden="true">&#8595;</span></a>
          <a className="button button-secondary" href="#lageplan">Was war wo? <span aria-hidden="true">&#8595;</span></a>
        </p>
      </div>
      <FestivalNow schedule={festivalSchedule} />
    </section>

    <section className="content-section festival-facts-section" aria-label="Eckdaten">
      <FestivalNav current="/festival" />
      <FestivalFacts />
    </section>

    <FestivalJumpNav sections={sections} />

    <section id="zeitplan" className="content-section festival-anchor" aria-labelledby="festival-schedule-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Zeitplan</p>
          <h2 id="festival-schedule-title">Was wann lief.</h2>
        </div>
      </div>
      <p className="section-lead">Bühne, Vorträge, Führungen und Workshops mit fester Uhrzeit. Tippt einen Punkt an für Details. Alles andere lief den ganzen Tag von 11 bis 17 Uhr.</p>
      <FestivalSchedule schedule={festivalSchedule} />
    </section>

    <section id="reparieren" className="content-section festival-anchor" aria-labelledby="festival-repair-title">
      <div className="section-heading">
        <div>
          <p className="section-index">ReparaturCafé XXL · Wiesenwerke</p>
          <h2 id="festival-repair-title">Mitgebracht, was kaputt war.</h2>
        </div>
      </div>
      <p className="section-lead">Ehrenamtliche vom Netzwerk Reparatur Wuppertal und vielen weiteren Initiativen halfen, die mitgebrachten Sachen selbst zu reparieren. Jede gelungene Reparatur zählte für den Rekord.</p>
      <ul className="festival-workshops">
        {repairWorkshops.map((workshop) => (
          <li key={workshop.name}>
            <h3>{workshop.name}</h3>
            <p className="festival-workshop-where">{workshop.where}</p>
            <p>{workshop.text}</p>
            <a className="text-button" href={`#${roomId(workshop.name)}`}>Was dort sonst lief <span aria-hidden="true">&#8595;</span></a>
          </li>
        ))}
      </ul>
    </section>

    <section id="lageplan" className="content-section festival-anchor" aria-labelledby="festival-map-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Lageplan</p>
          <h2 id="festival-map-title">Zwei Orte, eine Trasse.</h2>
        </div>
      </div>
      <p className="section-lead">Utopiastadt und Wiesenwerke liegen rund 700 Meter auseinander an der Nordbahntrasse. Tippt einen Ort an, um seine Stationen zu sehen.</p>
      <FestivalMap />
    </section>

    <section id="stationen" className="content-section festival-anchor" aria-labelledby="festival-rallye-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Rallye &amp; Stände</p>
          <h2 id="festival-rallye-title">Raum für Raum.</h2>
        </div>
      </div>
      <p className="section-lead">An den Infoständen gab es den Rallye-Plan. An jeder <span className="festival-tag" data-kind="rallye">Rallye</span>-Station legte man selbst Hand an; die <span className="festival-tag" data-kind="workshop">Workshop</span>-Stationen brauchten etwas mehr Zeit und Geschick.</p>
      <FestivalStations areas={festivalAreas} />
    </section>

    <section id="anreise" className="content-section festival-anchor" aria-labelledby="festival-visit-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Anreise</p>
          <h2 id="festival-visit-title">Zwei Adressen in Wuppertal.</h2>
        </div>
      </div>
      <p className="section-lead">Das Gelände liegt mitten in Wuppertal und ist mit Bus, Bahn und Rad gut zu erreichen. Die beiden Orte lohnen auch nach dem Festival einen Besuch.</p>
      <FestivalVenues />
      <p className="link-row festival-more-link">
        <Link className="text-button" href="/festival/anreise">Bus, Bahn &amp; Rad im Detail <span aria-hidden="true">&#8594;</span></Link>
      </p>
    </section>

    <section id="fragen" className="content-section festival-anchor" aria-labelledby="festival-faq-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Fragen &amp; Antworten</p>
          <h2 id="festival-faq-title">Was ihr wissen wolltet.</h2>
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

    <section className="content-section festival-join" aria-labelledby="festival-initiatives-title">
      <div>
        <p className="section-index">Für Reparaturinitiativen</p>
        <h2 id="festival-initiatives-title">Danke fürs Mitschrauben.</h2>
        <p>Engagierte aus Reparaturinitiativen und Secondhand-Fashion waren das Herzstück des Festivals. Ohne sie hätte es keinen Rekord an diesem Tag gegeben.</p>
      </div>
      <p className="link-row">
        <Link className="text-button" href="/festival/initiativen">Die Seite für Initiativen <span aria-hidden="true">&#8594;</span></Link>
      </p>
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.celebrate.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Danke an alle, die mitrepariert, mitgefeiert und mitgezählt haben.</p>
      <Link className="button button-secondary" href="/stats">Zum Ergebnis <span aria-hidden="true">&#8594;</span></Link>
    </section>

    <SiteFooter />
  </main>;
}
