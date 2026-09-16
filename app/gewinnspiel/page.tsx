import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { getAppSettings } from "@/lib/app-settings";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";
import { readPrizes, type PrizeRow } from "@/lib/lottery-store";
import { isPrizeListBinding, prizeListLead, totalPrizeCount } from "@/lib/prize-list";
import { publicPrizeLogoUrl, publicPrizePhotoUrl } from "@/lib/prize-logo";
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
 * erfinden. Der Veranstalter kommt aus derselben Quelle, hat seit Issue #78
 * aber eine Vorgabe im Quelltext - das CSCP, das den Rekordversuch im Rahmen
 * der Circular Week 2026 ausrichtet.
 *
 * Mit dem Start der Teilnahme wechselt die Seite den Ton (Issue #110): Bis
 * dahin waechst die Preisliste, danach ist sie die Zusage, auf die sich
 * Teilnehmende verlassen. Der Wortlaut der Bedingungen stammt seither aus
 * einer rechtlichen Pruefung; wer ihn aendert, sollte im Issue nachlesen,
 * warum ein Satz so und nicht anders steht.
 *
 * Die Teilnahmebedingungen stehen hier als geltende Bedingungen, nicht als
 * Entwurf (Issue #94): Der frueher angehaengte Abschnitt "Rechtlicher
 * Pruefstand" war eine Notiz ans eigene Team - eine Teilnahmebedingung, die
 * sich selbst fuer unfertig erklaert, bindet niemanden. Interne Vorbehalte
 * gehoeren in Issues und in docs/, nicht auf eine oeffentliche Seite.
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
/* Fuer den Stichtag der Preisliste: Der Tag entscheidet, die Minute nicht. */
const dayFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "Europe/Berlin" });

/** Ein Satz zum Zeitraum, der auch ohne hinterlegte Daten stimmt. */
function periodLine(startAt: Date | null, endAt: Date | null) {
  if (!startAt || !endAt) return "Der genaue Zeitraum wird gerade festgelegt und steht hier, sobald er feststeht.";
  return `Teilnehmen kannst du mit jeder Reparatur, die du zwischen dem ${dateFormat.format(startAt)} Uhr und dem ${dateFormat.format(endAt)} Uhr einreichst.`;
}

/**
 * Ein Preis auf der oeffentlichen Seite.
 *
 * Zwei Bilder mit verschiedenen Rollen (Issue #99): Das Foto zeigt, was es zu
 * gewinnen gibt, und steht deshalb gross ueber dem Titel - vorher las man nur
 * eine Zeile Text und sah einen Gewinn nie. Das Logo gehoert der stiftenden
 * Organisation und bleibt klein an ihrem Namen; bei einer Privatperson bleibt
 * es aus - sie hat keines, und ein Link auf sie waere eine Veroeffentlichung,
 * die niemand zugesagt hat.
 *
 * Die Anzahl steht dabei, sobald es mehr als eines gibt: Sie ist der
 * Unterschied zwischen einem und zehn Gewinnen.
 */
function PrizeCard({ prize }: { prize: PrizeRow }) {
  const logoUrl = prize.sponsor_kind === "organisation" ? publicPrizeLogoUrl(prize.logo_path) : null;
  const photoUrl = publicPrizePhotoUrl(prize.image_path);

  return <li className={prize.is_main ? "prize-card is-main" : "prize-card"}>
    {prize.is_main && <span className="prize-badge">Hauptpreis</span>}
    {photoUrl && (
      <span className="prize-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- Foto aus dem oeffentlichen Speicher, Groesse steht im CSS. */}
        <img src={photoUrl} alt="" />
      </span>
    )}
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
 *
 * Der Fehler wird dabei protokolliert (Issue #99). Vorher verschwand er
 * lautlos, und eine leere Liste sah genauso aus wie ein Gewinnspiel ohne
 * eingetragene Preise - der Unterschied war von aussen nicht zu erkennen.
 */
async function loadPrizes() {
  try {
    const { rows, error } = await readPrizes(createSupabaseAdminClient());
    if (error) console.error("Gewinnspiel: Preise konnten nicht gelesen werden.", error.message);
    return rows ?? [];
  } catch (error) {
    console.error("Gewinnspiel: Preise konnten nicht gelesen werden.", error);
    return [];
  }
}

/**
 * Der Hinweis unter den Preisen (Issue #99).
 *
 * Er steht unter beiden Faellen - eingetragene Preise und Platzhalter -, weil
 * genau dann jemand darauf stoesst, der selbst etwas zu stiften haette. Mit
 * Adresse und nicht nur "meldet sich gerne bei uns": Wer erst nach einem
 * Kontakt suchen muss, schreibt nicht.
 */
function ContributeNote() {
  return <p className="prize-contribute">
    Du möchtest auch etwas beisteuern – Werkzeug, einen Gutschein, eine Reparaturstunde?{" "}
    <a href={mailto(CONTACT_EMAIL, "Preis für das Gewinnspiel")}>Schreib uns</a>, wir nehmen es gerne mit auf.
  </p>;
}

/**
 * Was statt der Liste steht, wenn die Teilnahme laeuft und trotzdem kein Preis
 * lesbar ist (Issue #110).
 *
 * Der Platzhalter mit den drei Beispielen darf hier nicht stehen: Ab dem Start
 * liest ihn jemand als die Preise, um die es geht. Stattdessen der Weg, auf dem
 * die Frage wahrheitsgemaess beantwortet wird.
 */
function PrizesUnavailableNote() {
  return <p className="prize-contribute">
    Du willst wissen, was verlost wird?{" "}
    <a href={mailto(CONTACT_EMAIL, "Preise im Gewinnspiel")}>Schreib uns</a>, wir sagen es dir.
  </p>;
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
  /* Ab dem Start der Teilnahme ist die Preisliste verbindlich (Issue #110).
     Dieselbe Regel gilt im Backend, wo sie das Entfernen verhindert. */
  const prizesAreBinding = isPrizeListBinding(submissionWindow);

  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="lottery-title">
      <p className="brand-kicker">Gewinnspiel</p>
      <h1 className="sticker-head is-mint" id="lottery-title">
        <span className="sticker">Reparieren</span>
        <span className="sticker">und gewinnen</span>
      </h1>
      {/* Der Verweis auf die Erlaeuterungen zum Rekord (Issue #110): Wer
          ueber einen geteilten Link hier einsteigt, hat die Startseite nie
          gesehen - dann steht "Rekord" ohne alles da und kann alles
          Moegliche heissen. */}
      <p>Jede Reparatur, die du einreichst, kann am Gewinnspiel teilnehmen. Die Teilnahme ist kostenlos, freiwillig und hat keinen Einfluss darauf, ob dein Beitrag für den Rekord zählt. Was es mit dem Rekordversuch auf sich hat, steht unter <Link href="/#zahlen-und-fakten">Zahlen und Fakten</Link> und auf der Seite <Link href="/about">Über das Projekt</Link>.</p>
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
          <p className="section-lead">{prizeListLead(prizesAreBinding, submissionWindow.startAt ? dayFormat.format(submissionWindow.startAt) : null, totalPrizeCount(prizes))}</p>
        </div>
      </div>
      {prizes.length > 0
        ? <><ul className="prize-list">{prizes.map((prize) => <PrizeCard key={prize.id} prize={prize} />)}</ul>
            <ContributeNote /></>
        : prizesAreBinding
        ? <PrizesUnavailableNote />
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
              {/* Die Einladung zum Beisteuern steht seit Issue #99 mit Adresse
                  unter der Liste; zweimal derselbe Satz waere einer zu viel. */}
              <p>Wird bis zum Start ergänzt.</p>
            </li>
          </ul>
          <ContributeNote /></>}
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
          {/* Kommt weiterhin aus dem Backend, hat seit Issue #78 aber eine
              Vorgabe im Quelltext - der Zweig "steht noch nicht fest" ist
              damit entfallen. Ein Gewinnspiel ohne benannten Veranstalter
              waere in Teilnahmebedingungen ohnehin eine Luecke. */}
          <p>
            {organizer.name}, {organizer.address}, im Rahmen des Projekts Reparaturrekord NRW.
            {" "}Kontakt: <a href={mailto(organizer.email)}>{organizer.email}</a>.
            {" "}Die vollständigen Angaben stehen im <Link href="/imprint">Impressum</Link>.
          </p>
        </section>
        <section>
          <h3>Wer darf teilnehmen?</h3>
          {/* Wortlaut aus der rechtlichen Pruefung (Issue #110). Vorher stand
              hier "ab 18 Jahren", und im naechsten Satz durften Juengere doch
              mit Einverstaendnis teilnehmen - zwei Saetze, die sich
              widersprachen. Und aus "Gewinnen kann nur, wem der Gegenstand
              gehoert" wird "Teilnehmen kann nur": Eine Voraussetzung, die
              erst bei der Ziehung geprueft wird, waere fuer alle anderen eine
              Teilnahme ohne Chance. */}
          <p>Teilnahmeberechtigt sind natürliche Personen mit Wohnsitz in {regionLabel}. Minderjährige dürfen nur mit vorheriger Zustimmung ihrer gesetzlichen Vertreter teilnehmen. Ausgeschlossen sind Personen, die am Projekt „Reparaturrekord NRW“ oder an der Durchführung des Gewinnspiels mitwirken, sowie deren Angehörige. Teilnehmen kann nur, wem der Gegenstand gehört, der repariert wurde oder dessen Reparatur versucht wurde. Die eingereichte Reparatur muss in {regionLabel} durchgeführt worden sein.</p>
        </section>
        <section>
          <h3>Wie funktioniert die Teilnahme?</h3>
          <p>Die Teilnahme erfolgt ausschließlich über das Einreichungsformular: Reparatur eintragen, das Feld für das Gewinnspiel ankreuzen und Name und E-Mail-Adresse angeben. Die Teilnahme ist kostenlos und unabhängig vom Kauf einer Ware oder Leistung. Ob die Reparatur geglückt ist, spielt keine Rolle.</p>
        </section>
        <section>
          <h3>Zählt jede Einreichung einzeln?</h3>
          <p>Ja, jede eingereichte Reparatur kann angemeldet werden. Gewinnen kann jede Person aber nur einen Preis: Personen, für die bereits ein Preis gezogen wurde, scheiden aus den weiteren Ziehungen aus. Mehrfach eingereichte oder offensichtlich erfundene Beiträge werden von der Teilnahme ausgeschlossen.</p>
        </section>
        <section>
          <h3>Wann und wie wird gezogen?</h3>
          <p>Die Ziehung erfolgt nach dem Ende des Einreichungszeitraums unter allen angemeldeten und von der Moderation freigegebenen Einreichungen. Gezogen wird nach dem Zufallsprinzip, und zwar für jeden Preis einzeln; einzelne Preise können im Rahmen einer öffentlichen Veranstaltung gezogen werden. Wer gewinnt, wird an die angegebene E-Mail-Adresse benachrichtigt und hat vier Wochen Zeit zu antworten; danach kann der Preis neu vergeben werden.</p>
          {/* Woran die Moderation gebunden ist (Issue #110). Die Ziehung lief
              schon vorher nur unter freigegebenen Einreichungen - was aber
              nirgends stand, war, dass die Freigabe kein freies Ermessen ist.
              Ohne diesen Satz haengt jede Gewinnchance an einer Entscheidung,
              deren Massstab niemand kennt. */}
          <p>Die Moderation prüft ausschließlich, ob die in diesen Teilnahmebedingungen genannten Teilnahmevoraussetzungen erfüllt sind. Eine Einreichung wird insbesondere nicht zugelassen, wenn sie offensichtlich erfunden ist oder dieselbe Reparatur bereits eingereicht wurde. Personen, für die bereits ein Preis gezogen wurde, scheiden von weiteren Ziehungen aus.</p>
        </section>
        <section>
          <h3>Was passiert mit den Preisen?</h3>
          {/* Die Preisliste ist Teil der Bedingungen (Issue #110): Wer zur
              Teilnahme aufgefordert wird, soll erkennen koennen, was er
              gewinnen kann - und sich darauf verlassen duerfen. */}
          <p>Verlost werden die oben auf dieser Seite aufgeführten Preise; spätestens zum Beginn der Teilnahme steht dort die vollständige Liste mit Anzahl und Beschreibung. Danach können weitere Preise hinzukommen; ein aufgeführter Preis wird weder gestrichen noch in seiner Anzahl verringert.</p>
          <p>Die Preise werden zugeschickt oder in Wuppertal zur Abholung bereitgestellt. Eine Barauszahlung, ein Umtausch oder eine Übertragung auf andere Personen sind nicht möglich.</p>
        </section>
        <section>
          <h3>Was passiert mit deinen Daten?</h3>
          {/* Zweck und Rechtsgrundlage gehoeren nach Artikel 13 Absatz 1
              Buchstabe c DSGVO zusammen (Issue #110). Und die Anschrift der
              Gewinnerinnen und Gewinner steht jetzt hier: Ohne sie laesst
              sich kein Paket verschicken - erhoben wurde sie also ohnehin,
              nur genannt wurde sie nicht. */}
          <p>Wenn du am Gewinnspiel teilnimmst, verarbeiten wir deinen Namen und deine E-Mail-Adresse zur Durchführung des Gewinnspiels, insbesondere zur Ermittlung und Benachrichtigung der Gewinnerinnen und Gewinner. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Die für das Gewinnspiel angegebenen Daten stehen getrennt von der Reparatur selbst, werden nicht veröffentlicht und nach Abschluss der Verlosung gelöscht. Von Gewinnerinnen und Gewinnern erheben wir, soweit dies für den Versand eines Gewinns erforderlich ist, zusätzlich die Versandanschrift. Diese wird ausschließlich zur Versendung des Gewinns verarbeitet und anschließend gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Alles Weitere steht in der <Link href="/privacy">Datenschutzerklärung</Link>.</p>
        </section>
        <section>
          <h3>Sonstiges</h3>
          {/* Enger gefasst nach der rechtlichen Pruefung (Issue #110). Ein
              pauschal ausgeschlossener Rechtsweg haelt vor Gericht nicht
              zuverlaessig und erweckt den Eindruck, der Veranstalter koenne
              angekuendigte Preise auch gar nicht vergeben. Ausgeschlossen ist
              deshalb nur, was sich sinnvoll ausschliessen laesst: die
              Ziehung selbst. Dasselbe beim Abbruch - "aendern" ohne Grenze
              waere das Recht, die Bedingungen nachtraeglich umzuschreiben. */}
          <p>Der Rechtsweg ist hinsichtlich der Ziehung der Gewinne ausgeschlossen. Gesetzliche Ansprüche der Teilnehmerinnen und Teilnehmer, insbesondere wegen einer nicht ordnungsgemäßen Durchführung des Gewinnspiels, bleiben hiervon unberührt. Der Veranstalter ist berechtigt, das Gewinnspiel aus wichtigem Grund vorzeitig zu beenden, vorübergehend auszusetzen oder seine Durchführung anzupassen, soweit eine ordnungsgemäße Durchführung andernfalls nicht gewährleistet werden kann. Ein wichtiger Grund liegt insbesondere bei erheblichen technischen Störungen, Manipulationsversuchen oder sonstigen Umständen vor, die außerhalb des zumutbaren Einflussbereichs des Veranstalters liegen. Bereits entstandene Ansprüche von Gewinnern bleiben unberührt. Das Gewinnspiel steht in keiner Verbindung zu einem sozialen Netzwerk oder einer Plattform.</p>
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
