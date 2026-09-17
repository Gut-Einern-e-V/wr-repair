import Link from "next/link";
import NextImage from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { brandPhotos } from "@/lib/brand-photos";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";

const CONTACT = mailto(CONTACT_EMAIL, "Reparaturrekord NRW - Betrieb");

export const metadata = {
  title: "Für Reparaturbetriebe",
  description:
    "Werkstätten, Fachbetriebe und Handwerk beim Reparaturrekord NRW: Aufsteller mit QR-Code ausdrucken, Kundschaft auf die Eintragung hinweisen und wissen, warum die Reparatur der Kundschaft gehört – nicht dem Betrieb.",
};

/**
 * Die Seite fuer Betriebe, die vom Reparieren leben (Issue #114).
 *
 * Der Rekord sammelt Reparaturen aus Repair Cafes, Kuechen und Hinterhoefen -
 * die gewerbliche Reparatur war darin bisher nur eine Zeile in den haeufigen
 * Fragen ("auch in der Werkstatt"). Wer einen Betrieb fuehrt, findet hier
 * stattdessen einen Arbeitsauftrag: Vorlage drucken, hinstellen, hinweisen.
 *
 * Der heikle Punkt steht bewusst als eigener Abschnitt und nicht im
 * Kleingedruckten: Ein Betrieb mit dreissig Reparaturen am Tag koennte das
 * Gewinnspiel im Alleingang fuellen. Die Teilnahmebedingungen schliessen das
 * schon aus - teilnehmen kann nur, wem der reparierte Gegenstand gehoert -,
 * aber eine Bedingung, die niemand liest, verhindert keine Enttaeuschung. Fuer
 * die Rekordzahl selbst gilt das nicht: Eine echte Reparatur zaehlt, egal wer
 * sie eintraegt. Nur eben einmal.
 */
export default function RepairBusinessPage() {
  return <main className="page-shell content-page">
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="business-title">
      <p className="brand-kicker">Für Reparaturbetriebe</p>
      <h1 className="sticker-head is-mint" id="business-title"><span className="sticker">Ihr repariert</span><span className="sticker">sowieso</span></h1>
      <p>In eurer Werkstatt entsteht jeden Tag, worum es beim Reparaturrekord geht. Damit es mitzählt, braucht es nur einen Hinweis an der Theke – eintragen tut die Kundschaft selbst.</p>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="business-who-title">
      <div>
        <p className="section-index">Wer gemeint ist</p>
        <h2 id="business-who-title">Alle, die vom Reparieren leben.</h2>
      </div>
      <div>
        <p>Fahrradläden, Elektronik- und Handywerkstätten, Schuhmachereien, Änderungsschneidereien, Autowerkstätten, Haushaltsgeräte-Service, Uhrmacher, Polsterei, Fachbetriebe für Werkzeug und Garten – wenn bei euch Dinge repariert statt ersetzt werden, seid ihr gemeint.</p>
        <p>Es kostet nichts, verpflichtet zu nichts und braucht keine Anmeldung. Ihr müsst weder Mitglied werden noch Daten von uns bekommen oder an uns liefern.</p>
        <p>Ehrenamtliche Initiativen und Repair Cafés finden ihre eigene Seite unter <Link href="/repair-cafes">Hilfe beim Reparieren</Link>; fürs Festival gibt es die <Link href="/festival/initiativen">Seite für Initiativen</Link>.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="business-how-title">
      <div className="section-heading">
        <div>
          <p className="section-index">In drei Schritten</p>
          <h2 id="business-how-title">Vom Drucker auf die Theke.</h2>
          <p className="section-lead">Mehr ist es nicht. Der längste Schritt ist der zum Drucker.</p>
        </div>
        <Link className="text-button" href="/aufsteller">Zum Generator <span aria-hidden="true">&#8594;</span></Link>
      </div>
      <ol className="steps">
        <li>
          <span className="step-number" aria-hidden="true">01</span>
          <div>
            <strong>Aufsteller erzeugen</strong>
            <p>Der <Link href="/aufsteller">Generator</Link> baut die Druckvorlage im Browser: A4 einzeln oder mehrere kleine auf einem Bogen, auf Deutsch, Englisch, Türkisch oder Arabisch, mit oder ohne Schnittlinien. Der QR-Code darauf führt direkt ins Eintragungsformular.</p>
          </div>
        </li>
        <li>
          <span className="step-number" aria-hidden="true">02</span>
          <div>
            <strong>Aufstellen, wo gewartet wird</strong>
            <p>An der Theke, an der Kasse, am Abholregal, im Schaufenster. Gut ist jeder Ort, an dem jemand eine Minute Zeit hat und das Telefon ohnehin in der Hand hält.</p>
          </div>
        </li>
        <li>
          <span className="step-number" aria-hidden="true">03</span>
          <div>
            <strong>Bei der Abholung ansprechen</strong>
            <p>Ein Satz reicht: „Ihre Reparatur zählt gerade für einen Weltrekordversuch – einfach abscannen und eintragen.“ Wer mag, macht vorher noch ein Foto vom reparierten Stück.</p>
          </div>
        </li>
      </ol>
    </section>

    {/* Der Abschnitt, um den es im Issue eigentlich ging. Er steht bewusst
        offen da und nicht als Verbot: Ein Betrieb darf eine Reparatur
        eintragen, die er selbst gemacht hat - die Rekordzahl fragt nicht nach
        dem Gewerbeschein. Nur die Verlosung haengt am Eigentum, und zwar aus
        den Teilnahmebedingungen heraus. */}
    <section className="content-section two-column-copy" aria-labelledby="business-limits-title">
      <div>
        <p className="section-index">Die eine Regel</p>
        <h2 id="business-limits-title">Eintragen tut, wem das Ding gehört.</h2>
      </div>
      <div>
        <p>Beim Gewinnspiel ist das eine harte Bedingung: Teilnehmen kann nur, wem der reparierte Gegenstand gehört. Ein Betrieb kann die Reparaturen seiner Kundschaft also nicht für sie anmelden – der Platz in der Lostrommel gehört den Menschen, die das Gerät gebracht haben. Nachzulesen in den <Link href="/gewinnspiel">Teilnahmebedingungen</Link>.</p>
        <p>Für die Rekordzahl selbst ist das offener: Was ihr repariert habt, dürft ihr auch selbst eintragen. Wichtig ist nur, dass jede Reparatur genau einmal eingetragen wird – nicht einmal von euch und einmal von der Kundschaft. Die Moderation schaut sich jede Einreichung an, und doppelte oder erfundene Einträge zählen nicht mit.</p>
        <p>Unser Vorschlag bleibt trotzdem der Hinweis an der Theke: Die Kundschaft hat das Foto, die Geschichte zum Gerät und etwas davon, dabei zu sein. Ihr habt dafür keinen Abend voller Formulare.</p>
        <p className="link-row">
          <Link className="text-button" href="/gewinnspiel">Zum Gewinnspiel <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/mitmachen">Zum Einreichungsformular <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="business-more-title">
      <div>
        <p className="section-index">Wenn es mehr sein darf</p>
        <h2 id="business-more-title">Drei Wege über den Aufsteller hinaus.</h2>
      </div>
      <div>
        <ul>
          <li><strong>Einen Preis stiften.</strong> Ein Gutschein, Werkzeug oder Material aus eurem Sortiment geht in die Verlosung – mit eurem Namen und Logo auf der <Link href="/gewinnspiel">Gewinnspielseite</Link>.</li>
          <li><strong>Unterstützer werden.</strong> Wer das Projekt mit Reichweite, Räumen oder Material trägt, steht mit auf der Seite <Link href="/supporters">Unterstützung</Link>.</li>
          <li><strong>Zum Festival kommen.</strong> Beim Repair &amp; Share Festival zum Abschluss des Rekordmonats treffen sich alle, die reparieren – <Link href="/festival">Infos zum Tag</Link>.</li>
        </ul>
        <p>Für alles davon reicht eine kurze Mail. Wir melden uns und klären den Rest.</p>
        <p className="link-row">
          <a className="button button-primary" href={CONTACT}>Als Betrieb melden <span aria-hidden="true">&#8594;</span></a>
          <a className="text-button" href={CONTACT}>{CONTACT_EMAIL} <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>

    <section className="content-callout">
      <div className="banner-photo" aria-hidden="true"><NextImage src={brandPhotos.workshop.src} alt="" fill sizes="(max-width: 1120px) 100vw, 1120px" /></div>
      <p>Jede Reparatur an eurer Werkbank kann eine Reparatur im Rekord sein.</p>
      <Link className="button button-secondary" href="/aufsteller">Aufsteller ausdrucken <span aria-hidden="true">&#8594;</span></Link>
    </section>

    <SiteFooter />
  </main>;
}
