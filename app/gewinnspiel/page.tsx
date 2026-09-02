import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { getAppSettings } from "@/lib/app-settings";
import { readPrizes, type PrizeRow } from "@/lib/lottery-store";
import { publicPrizeLogoUrl } from "@/lib/prize-logo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Oeffentliche Seite zum Gewinnspiel (Issue #70).
 *
 * Das Gewinnspiel gab es bisher nur als Haekchen im Einreichungsformular. Wer
 * wissen wollte, worauf er sich damit einlaesst, fand nichts - weder die
 * Bedingungen noch die Preise. Diese Seite ist der Ort, auf den der Prozess
 * auf der Startseite und das Formular verweisen.
 *
 * Die Preise kommen aus dem Backend (Issue #45): Sie werden gestiftet und
 * stehen oft erst kurz vor dem Start fest. Solange keiner eingetragen ist,
 * sagt die Seite ehrlich, dass die Liste noch waechst, statt eine Zahl zu
 * erfinden - und dasselbe gilt fuer den Veranstalter, der ebenfalls aus den
 * Einstellungen kommt und noch nicht abschliessend geklaert ist.
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

/* Zeitraum, Preise und Veranstalter kommen aus dem Backend. Fuenf Minuten,
   nicht eine Stunde: Ein Preis wird oft kurz vor einer Veranstaltung
   nachgetragen, und dann soll er auch dort stehen. */
export const revalidate = 300;

const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" });

/** Ein Satz zum Zeitraum, der auch ohne hinterlegte Daten stimmt. */
function periodLine(startAt: Date | null, endAt: Date | null) {
  if (!startAt || !endAt) return "Der genaue Zeitraum wird gerade festgelegt und steht hier, sobald er feststeht.";
  return `Teilnehmen kannst du mit jeder Reparatur, die du zwischen dem ${dateFormat.format(startAt)} Uhr und dem ${dateFormat.format(endAt)} Uhr einreichst.`;
}

/**
 * Ein Preis auf der oeffentlichen Seite.
 *
 * Das Logo steht nur bei einer Organisation - eine Privatperson hat keines,
 * und ein Link auf sie waere eine Veroeffentlichung, die niemand zugesagt hat.
 * Die Anzahl steht dabei, sobald es mehr als eines gibt: Sie ist der
 * Unterschied zwischen einem und zehn Gewinnen.
 */
function PrizeCard({ prize }: { prize: PrizeRow }) {
  const logoUrl = prize.sponsor_kind === "organisation" ? publicPrizeLogoUrl(prize.logo_path) : null;

  return <li className={prize.is_main ? "prize-card is-main" : "prize-card"}>
    {prize.is_main && <span className="prize-badge">Hauptpreis</span>}
    <strong>{prize.title}{prize.quantity > 1 ? ` (${prize.quantity}×)` : ""}</strong>
    {prize.description && <p>{prize.description}</p>}
    {prize.sponsor_name && (
      <p className="prize-sponsor">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Logo aus dem oeffentlichen Speicher, Groesse steht im CSS.
          <img src={logoUrl} alt="" />
        )}
        <span>
          Gestiftet von{" "}
          {prize.sponsor_website && prize.sponsor_kind === "organisation"
            ? <a href={prize.sponsor_website} target="_blank" rel="noreferrer">{prize.sponsor_name}</a>
            : prize.sponsor_name}
        </span>
      </p>
    )}
  </li>;
}

/**
 * Die Preise aus dem Backend. Faellt die Datenbank aus oder fehlt die
 * Migration, bleibt die Liste leer - die Seite zeigt dann den Platzhalter und
 * nicht einen Fehler: Wer wissen will, wie das Gewinnspiel laeuft, findet die
 * Bedingungen darunter trotzdem.
 */
async function loadPrizes() {
  try {
    const { rows } = await readPrizes(createSupabaseAdminClient());
    return rows ?? [];
  } catch {
    return [];
  }
}

export default async function LotteryPage() {
  /* Zeitraum, Gebiet und Veranstalter kommen aus den Einstellungen, damit hier
     dasselbe steht wie im Formular - auch wenn das Backend sie waehrend der
     Aktion aendert. */
  const [{ submissionWindow, region, lotteryOrganizer: organizer }, prizes] = await Promise.all([
    getAppSettings(),
    loadPrizes(),
  ]);
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
      {prizes.length > 0
        ? <><ul className="prize-list">{prizes.map((prize) => <PrizeCard key={prize.id} prize={prize} />)}</ul>
            <p className="form-notice">Die Liste wächst bis zum Start. Wer etwas beisteuern möchte, meldet sich gerne bei uns.</p></>
        : <><ul className="prize-placeholder">
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
          <p className="form-notice">Die genauen Preise samt stiftender Organisation stehen hier, sobald sie feststehen.</p></>}
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
          {/* Kommt aus dem Backend und ist noch nicht abschliessend geklaert.
              Solange nichts hinterlegt ist, steht hier genau das - eine
              erfundene Angabe waere in Teilnahmebedingungen das Schlimmste. */}
          {organizer.name
            ? <p>
                {organizer.name}{organizer.address ? `, ${organizer.address}` : ""}, im Rahmen des Projekts Reparaturrekord NRW.
                {organizer.email
                  ? <> Kontakt: <a href={`mailto:${organizer.email}`}>{organizer.email}</a>.</>
                  : " Eine Kontaktadresse für das Gewinnspiel wird noch bekannt gegeben."}
                {" "}Die vollständigen Angaben stehen im <Link href="/imprint">Impressum</Link>.
              </p>
            : <p>Der Veranstalter des Gewinnspiels steht noch nicht abschließend fest und wird hier genannt, sobald er feststeht. Für Rückfragen bis dahin: die Angaben im <Link href="/imprint">Impressum</Link>.</p>}
        </section>
        <section>
          <h3>Wer darf teilnehmen?</h3>
          <p>Alle Personen ab 18 Jahren mit Wohnsitz in {regionLabel}, die eine Reparatur aus {regionLabel} einreichen. Jüngere Personen dürfen mit Einverständnis einer erziehungsberechtigten Person teilnehmen. Gewinnen kann nur, wem der reparierte Gegenstand gehört. Ausgeschlossen sind Personen, die am Projekt oder an der Durchführung des Gewinnspiels mitwirken, sowie deren Angehörige.</p>
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
          <p>Die Ziehung erfolgt nach dem Ende des Einreichungszeitraums unter allen angemeldeten und von der Moderation freigegebenen Einreichungen. Gezogen wird nach dem Zufallsprinzip, und zwar für jeden Preis einzeln; einzelne Preise können im Rahmen einer öffentlichen Veranstaltung gezogen werden. Wer gewinnt, wird an die angegebene E-Mail-Adresse benachrichtigt und hat vier Wochen Zeit zu antworten; danach kann der Preis neu vergeben werden.</p>
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
