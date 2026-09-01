import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { getAppSettings } from "@/lib/app-settings";

/**
 * Oeffentliche Seite zum Gewinnspiel (Issue #70).
 *
 * Das Gewinnspiel gab es bisher nur als Haekchen im Einreichungsformular. Wer
 * wissen wollte, worauf er sich damit einlaesst, fand nichts - weder die
 * Bedingungen noch die Preise. Diese Seite ist der Ort, auf den der Prozess
 * auf der Startseite und das Formular verweisen.
 *
 * Die Preise stehen bewusst noch nicht hier: Sie werden gesponsert und sollen
 * laut Issue #45 aus dem Backend gepflegt werden. Bis dahin sagt die Seite
 * ehrlich, dass die Liste noch waechst, statt eine Zahl zu erfinden.
 *
 * Die Teilnahmebedingungen sind wie Impressum und Datenschutz formuliert: So
 * genau wie moeglich, mit einem sichtbaren Hinweis, dass sie vor dem
 * oeffentlichen Start rechtlich freigegeben werden muessen.
 */

export const metadata = {
  // Nur das Thema: Den Projektnamen haengt `title.template` aus app/layout.tsx an.
  title: "Gewinnspiel",
  description: "Jede eingereichte Reparatur kann am Gewinnspiel teilnehmen – kostenlos, unabhängig davon, ob die Reparatur geglückt ist. Teilnahmebedingungen und Ablauf der Verlosung.",
};

// Der Zeitraum kommt aus dem Admin-Backend und kann sich aendern; stuendlich
// neu ist fuer eine Seite mit zwei Datumsangaben reichlich.
export const revalidate = 3600;

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Ein Satz zum Zeitraum, der auch ohne hinterlegte Daten stimmt. */
function periodLine(startAt: Date | null, endAt: Date | null) {
  if (!startAt || !endAt) return "Der genaue Zeitraum wird gerade festgelegt und steht hier, sobald er feststeht.";
  return `Teilnehmen kannst du mit jeder Reparatur, die du zwischen dem ${dateFormat.format(startAt)} Uhr und dem ${dateFormat.format(endAt)} Uhr einreichst.`;
}

export default async function LotteryPage() {
  /* Zeitraum und Gebiet kommen beide aus den Einstellungen, damit hier dasselbe
     steht wie im Formular - auch wenn das Backend sie waehrend der Aktion aendert. */
  const { submissionWindow, region } = await getAppSettings();
  const regionLabel = region.label || "Nordrhein-Westfalen";

  return <main className="page-shell content-page">
    <SiteHeader />

    <section className="content-hero" aria-labelledby="lottery-title">
      <p className="brand-kicker">Gewinnspiel</p>
      <h1 className="sticker-head is-mint" id="lottery-title">
        <span className="sticker">Reparieren</span>
        <span className="sticker">und gewinnen</span>
      </h1>
      <p>Jede Reparatur, die du einreichst, kann am Gewinnspiel teilnehmen. Die Teilnahme ist kostenlos, freiwillig und hat keinen Einfluss darauf, ob dein Beitrag für den Rekord zählt.</p>
    </section>

    <section className="content-section" aria-labelledby="lottery-how-title">
      <div className="section-heading">
        <div>
          <p className="section-index">In drei Schritten</p>
          <h2 id="lottery-how-title">So bist du dabei.</h2>
          <p className="section-lead">{periodLine(submissionWindow.startAt, submissionWindow.endAt)}</p>
        </div>
        <Link className="text-button" href="/mitmachen">Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
      </div>
      <ol className="steps">
        <li>
          <span className="step-number" aria-hidden="true">01</span>
          <div>
            <strong>Reparatur eintragen</strong>
            <p>Foto, Kategorie und ein paar Angaben – wie bei jeder Einreichung.</p>
          </div>
        </li>
        <li>
          <span className="step-number" aria-hidden="true">02</span>
          <div>
            <strong>Häkchen setzen</strong>
            <p>Im Formular steht unten „Ich möchte am Gewinnspiel teilnehmen“. Dafür brauchen wir Name und E-Mail-Adresse.</p>
          </div>
        </li>
        <li>
          <span className="step-number" aria-hidden="true">03</span>
          <div>
            <strong>Ziehung abwarten</strong>
            <p>Nach dem Ende des Rekordmonats wird gezogen. Wer gewinnt, bekommt eine E-Mail.</p>
          </div>
        </li>
      </ol>
    </section>

    <section className="content-section" aria-labelledby="lottery-prizes-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Die Preise</p>
          <h2 id="lottery-prizes-title">Was es zu gewinnen gibt.</h2>
          <p className="section-lead">Die Preise werden von Unternehmen und Initiativen aus der Region gestiftet. Die Liste wächst bis zum Start – schau also gerne noch einmal vorbei.</p>
        </div>
      </div>
      <ul className="prize-placeholder">
        <li>
          <strong>Werkzeug und Material</strong>
          <p>Ausstattung für die nächste Reparatur, gestiftet von Betrieben aus der Region.</p>
        </li>
        <li>
          <strong>Gutscheine</strong>
          <p>Für Reparaturbetriebe, Werkstätten und Secondhand-Läden in Nordrhein-Westfalen.</p>
        </li>
        <li>
          <strong>Überraschungen aus der Reparaturszene</strong>
          <p>Wird bis zum Start ergänzt. Wer etwas beisteuern möchte, meldet sich gerne bei uns.</p>
        </li>
      </ul>
      <p className="form-notice">Die genauen Preise samt stiftender Organisation stehen hier, sobald sie feststehen.</p>
    </section>

    <section className="content-section" aria-labelledby="lottery-terms-title">
      <div className="section-heading">
        <div>
          <p className="section-index">Teilnahmebedingungen</p>
          <h2 id="lottery-terms-title">Das Kleingedruckte, kurz gehalten.</h2>
        </div>
      </div>
      <div className="legal-terms">
        <section>
          <h3>Wer veranstaltet das Gewinnspiel?</h3>
          <p>Gut Einern e.V., Einern 120, 42279 Wuppertal, im Rahmen des Projekts Reparaturrekord NRW. Kontakt: <a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a>. Die vollständigen Angaben stehen im <Link href="/imprint">Impressum</Link>.</p>
        </section>
        <section>
          <h3>Wer darf teilnehmen?</h3>
          <p>Alle Personen ab 18 Jahren mit Wohnsitz in Deutschland, die eine Reparatur aus {regionLabel} einreichen. Jüngere Personen dürfen mit Einverständnis einer erziehungsberechtigten Person teilnehmen. Ausgeschlossen sind Personen, die am Projekt oder an der Durchführung des Gewinnspiels mitwirken, sowie deren Angehörige.</p>
        </section>
        <section>
          <h3>Wie funktioniert die Teilnahme?</h3>
          <p>Die Teilnahme erfolgt ausschließlich über das Einreichungsformular: Reparatur eintragen, das Feld für das Gewinnspiel ankreuzen und Name und E-Mail-Adresse angeben. Die Teilnahme ist kostenlos und unabhängig vom Kauf einer Ware oder Leistung. Ob die Reparatur geglückt ist, spielt keine Rolle.</p>
        </section>
        <section>
          <h3>Zählt jede Einreichung einzeln?</h3>
          <p>Ja, jede eingereichte Reparatur kann angemeldet werden. Gewinnen kann jede Person aber nur einen Preis – nach einem Gewinn scheidet sie aus den weiteren Ziehungen aus. Mehrfach eingereichte oder offensichtlich erfundene Beiträge werden von der Teilnahme ausgeschlossen.</p>
        </section>
        <section>
          <h3>Wann und wie wird gezogen?</h3>
          <p>Die Ziehung erfolgt nach dem Ende des Einreichungszeitraums unter allen angemeldeten und von der Moderation freigegebenen Einreichungen. Gezogen wird nach dem Zufallsprinzip. Wer gewinnt, wird an die angegebene E-Mail-Adresse benachrichtigt und hat vier Wochen Zeit zu antworten; danach kann der Preis neu vergeben werden.</p>
        </section>
        <section>
          <h3>Was passiert mit den Preisen?</h3>
          <p>Die Preise werden zugeschickt oder in Wuppertal zur Abholung bereitgestellt. Eine Barauszahlung, ein Umtausch oder eine Übertragung auf andere Personen sind nicht möglich.</p>
        </section>
        <section>
          <h3>Was passiert mit deinen Daten?</h3>
          <p>Name und E-Mail-Adresse werden ausschließlich für die Durchführung der Verlosung verarbeitet und nicht veröffentlicht. Sie stehen getrennt von der Reparatur selbst und werden nach Abschluss der Verlosung gelöscht. Alles Weitere steht in der <Link href="/privacy">Datenschutzerklärung</Link>.</p>
        </section>
        <section>
          <h3>Sonstiges</h3>
          <p>Der Rechtsweg ist ausgeschlossen. Das Gewinnspiel kann aus wichtigem Grund – etwa bei technischen Störungen oder Manipulationsversuchen – geändert oder beendet werden. Es steht in keiner Verbindung zu einem sozialen Netzwerk oder einer Plattform.</p>
        </section>
        <section>
          <h3>Rechtlicher Prüfstand</h3>
          <p>Diese Bedingungen sind ein Entwurf des Projektteams. Vor dem öffentlichen Start müssen sie durch die verantwortliche Organisation rechtlich freigegeben werden – insbesondere Altersgrenze, Teilnahmeausschlüsse, Fristen und die Angaben zu den gestifteten Preisen.</p>
        </section>
      </div>
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.celebrate.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Erst reparieren. Dann eintragen. Dann Daumen drücken.</p>
      <Link className="button button-secondary" href="/mitmachen">Reparatur eintragen <span aria-hidden="true">&#8594;</span></Link>
    </section>

    <SiteFooter />
  </main>;
}
