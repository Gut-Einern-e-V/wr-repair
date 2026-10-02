import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BreadcrumbStructuredData, FestivalStructuredData } from "@/components/structured-data";
import { brandPhotos } from "@/lib/brand-photos";
import { FESTIVAL_DATE_ISO, FESTIVAL_DATE_TEXT, FESTIVAL_FAB_URL, FESTIVAL_SIGNUP_URL, FestivalFacts, FestivalNav, FestivalPending } from "./festival-chrome";

export const metadata = {
  title: "Repair & Share Festival",
  description:
    "Am 31. Oktober 2026 endet der Reparaturrekord mit dem Repair & Share Festival in Utopiastadt und Wiesenwerken in Wuppertal: 11 bis 17 Uhr, Eintritt frei, mit Reparatur-Café XXL, Secondhand, Workshops und Kinderwerkstatt.",
};

/* Programm und Fragen wie auf der Festivalseite der FAB Region
   (FESTIVAL_FAB_URL), dort gepflegt vom Festivalteam. Hier stehen sie als
   Liste und nicht als Kopie der Seite: ohne Emojis und ohne Anmeldelinks
   fuer Fragen, die auf dieser Website anders beantwortet werden - etwa das
   Einreichen von Reparaturen, das hier ueber /mitmachen laeuft. */
const programme = [
  ["Reparatur-Café XXL", "Die letzten Reparaturen für den Rekord – mit Hilfe bei Elektro, Kleingeräten, Fahrrädern, Kleidung, Textilien und Möbeln."],
  ["Reparieren auf der Bühne", "Bekannte DIY-Expert:innen reparieren live, dazu der Countdown zum Rekordversuch."],
  ["DIY-Reparaturbereiche", "Selbst Hand anlegen an Fahrrad, Elektro, Möbel und Textil – vom Laufrad bis zum Rollator."],
  ["Secondhand", "Secondhand-Pop-ups, eine Tauschbörse für aussortierte Kleidung und 2nd-use-Brautmoden."],
  ["Workshops", "Unter anderem „Pimp your Shirt“: Bringt ein altes Shirt mit und macht etwas Neues daraus."],
  ["Kinder", "Eine Kinderwerkstatt und ein eigenes Bühnenprogramm für Kinder."],
  ["Impulse", "Ein Future Talk zum Recht auf Reparatur und Beiträge zum zirkulären Bauen, zu Ressourcen, Resilienz und Gemeinwohl."],
  ["Lernen zum Anfassen", "Vertical Farming, digitale Module zum Zocken, eine virtuelle Lernreise in die Permakultur, Büchertisch und Info-Point."],
  ["Essen & Trinken", "Für alle, die den ganzen Tag bleiben."],
] as const;

const questions = [
  ["Was kann vor Ort repariert werden?", "Ziemlich viel: Elektro- und Haushaltsgeräte, Kleidung und Textilien, Fahrräder, Holzgegenstände und kleine Möbel und alles, was mechanisch ist. Die Faustregel: alles, was ihr allein zum Festival tragen könnt."],
  ["Muss ich selbst reparieren?", "Nein, aber ihr dürft sehr gerne. Manche reparieren komplett für euch, andere zeigen euch, wie es geht. Sagt einfach, welche Hilfe ihr braucht – vielleicht stellt sich heraus, dass Schrauben richtig Spaß macht."],
  ["Wer schraubt und näht da eigentlich?", "Reparaturinitiativen aus dem Bergischen Städtedreieck und aus ganz NRW haben schon zugesagt. Dazu kommen vielleicht Handwerker:innen aus der Nachbarschaft, Handy-Reparaturläden und Händler mit eigenem Reparaturservice."],
  ["Ist das Festival für die ganze Familie?", "Ja. Es gibt Angebote für Kinder, Jugendliche und Erwachsene."],
  ["Aber da ist doch Halloween …?", "Perfekt. Kommt gerne verkleidet oder bastelt euer Kostüm vor Ort aus gebrauchtem Material. Auch die Halloween-Deko für das Festival entsteht aus Resten."],
  ["Welchen Rekord wollen wir schlagen?", "2024 wurden in Großbritannien 3.177 erfolgreiche Reparaturen in einem Monat gezählt, 2019 in Exeter 268 an einem einzigen Tag und Ort. Beides nehmen wir uns vor: den Monatsrekord in ganz NRW – und am Festivaltag mindestens 300 erfolgreiche Reparaturen an einem Ort."],
  ["Ich brauche jetzt Hilfe, nicht erst am Festivaltag.", "Auf unserer Karte stehen die Repair Cafés und Reparaturinitiativen in NRW, mehr findet ihr bei reparatur-initiativen.de. Die Initiativen freuen sich über alle, die vorbeikommen – mit kaputtem Toaster oder mit Werkzeugkoffer."],
  ["Ich kann gar nicht reparieren, will aber mithelfen.", "Reparaturinitiativen brauchen nicht nur Reparaturprofis: Aufbauen, Organisieren, Registrieren, Kuchen backen und Menschen ins Gespräch bringen gehört genauso dazu. Für das Festival könnt ihr euch über das Anmeldeformular melden, für die Zeit davor bei einer Initiative in eurer Nähe."],
] as const;

/* Eigener Bereich statt eines Abschnitts auf /repair-cafes (Issue #33).
   Das Festival ist der Schlusspunkt des Rekordmonats und richtet sich an zwei
   sehr verschiedene Gruppen: an Menschen, die einen Tag lang hinkommen, und an
   Initiativen, die dort selbst etwas anbieten. Beide brauchen andere Angaben,
   deshalb die Unterseiten - hier steht nur, was fuer alle gilt.

   Uhrzeit, Eintritt und Programmpunkte stehen fest, das Buehnenprogramm mit
   Uhrzeiten noch nicht. Was fehlt, steht als solches auf der Seite: eine Save-the-date-Seite, die so tut, als
   waere schon alles geplant, muesste spaeter jede Angabe widerrufen. */
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
          <p className="section-index">Save the Date</p>
          <h2 id="festival-facts-title"><time dateTime={FESTIVAL_DATE_ISO}>{FESTIVAL_DATE_TEXT}</time></h2>
        </div>
      </div>
      <FestivalFacts />
    </section>

    <section className="content-section" aria-labelledby="festival-programme-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Programm &amp; Highlights</p>
          <h2 id="festival-programme-title">Ein Tag zum Mitmachen.</h2>
        </div>
      </div>
      <dl className="travel-routes">
        {programme.map(([title, text]) => (
          <div key={title}><dt>{title}</dt><dd>{text}</dd></div>
        ))}
      </dl>
      <FestivalPending>Das Bühnenprogramm mit Uhrzeiten. Es folgt bald und steht dann hier und auf der <a href={FESTIVAL_FAB_URL} target="_blank" rel="noreferrer">Festivalseite der FAB Region</a>.</FestivalPending>
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
