import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BreadcrumbStructuredData } from "@/components/structured-data";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";
import { FESTIVAL_DATE_TEXT, FESTIVAL_SIGNUP_URL, FestivalFacts, FestivalNav, FestivalPending } from "../festival-chrome";

const CONTACT = mailto(CONTACT_EMAIL, "Repair & Share Festival - Initiative");

export const metadata = {
  title: "Festival für Initiativen",
  description:
    "Repair Cafés, offene Werkstätten und Initiativen beim Repair & Share Festival am 31. Oktober 2026 in Wuppertal: mit eigenem Stand dabei sein, Reparaturen zählen lassen, Kontakt aufnehmen.",
};

/* Die Seite fuer die Initiativen (Issue #33).
   Sie ist bewusst nuechterner geschrieben als die Uebersicht: Wer hier liest,
   plant einen Arbeitstag und will wissen, was gestellt wird, was mitzubringen
   ist und bis wann Bescheid zu geben ist. Was davon noch offen ist, steht als
   offen da - eine Initiative kann mit "Details folgen" planen, mit einer
   spaeter widerrufenen Zusage nicht. */
export default function FestivalInitiativesPage() {
  return <main className="page-shell content-page">
    <BreadcrumbStructuredData trail={[["/festival", "Repair & Share Festival"], ["/festival/initiativen", "Für Initiativen"]]} />
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="initiatives-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="initiatives-title">Seid dabei, mit dem, was ihr könnt.</h1>
        <p>Zum Abschluss des Rekordmonats laden wir alle Reparaturinitiativen aus NRW nach Wuppertal ein – mit Werkbank, Nähmaschine, Lötkolben oder einfach mit euren Leuten.</p>
      </div>
    </section>

    <section className="content-section" aria-labelledby="initiatives-facts-title">
      <FestivalNav current="/festival/initiativen" />
      <div className="section-heading">
        <div>
          <p className="section-index">Der Termin</p>
          <h2 id="initiatives-facts-title">{FESTIVAL_DATE_TEXT}</h2>
        </div>
      </div>
      <FestivalFacts />
      <FestivalPending>Aufbauzeiten, Standgrößen, Strom- und Wasseranschlüsse, Verpflegung für Helfende und die Anmeldefrist. Wer sich anmeldet, bekommt diese Angaben direkt; hier tragen wir sie nach, sobald die Planung des Geländes steht.</FestivalPending>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-who-title">
      <div>
        <p className="section-index">Wer gemeint ist</p>
        <h2 id="initiatives-who-title">Alle, bei denen repariert wird.</h2>
      </div>
      <div>
        <p>Repair Cafés, offene Werkstätten, Fahrradselbsthilfen, Nähtreffs, Elektronikwerkstätten, Materiallager, Tauschregale, Bibliotheken der Dinge – wenn bei euch Dinge länger leben, seid ihr gemeint.</p>
        <p>Ihr müsst dafür nicht schon beim Rekord mitgemacht haben. Und ihr müsst nicht aus Wuppertal kommen: Der Rekordversuch gilt für ganz Nordrhein-Westfalen, das Festival auch.</p>
        <p className="link-row">
          <Link className="text-button" href="/repair-cafes">Karte der Initiativen <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-how-title">
      <div>
        <p className="section-index">Mitmachen</p>
        <h2 id="initiatives-how-title">Ihr seid das Rückgrat der Aktion.</h2>
      </div>
      <div>
        <p>Als Reparaturinitiative könnt ihr auf drei Wegen zum Rekord beitragen:</p>
        <ul>
          <li><strong>Am Festival mitreparieren.</strong> Schickt Reparateur:innen, Organisator:innen und Helfende aus euren Reihen am 31. Oktober nach Wuppertal. Einen Tag lang reparieren wir miteinander, lernen voneinander – und stellen nebenbei vielleicht das bisher größte ehrenamtliche Reparaturevent auf die Beine.</li>
          <li><strong>Euer Repair Café wie gewohnt.</strong> Veranstaltet eure Termine im Oktober wie immer und helft euren Besuchenden, gelungene Reparaturen hier einzutragen. Das geht schnell und mit wenigen Angaben.</li>
          <li><strong>Eigene Geräte reparieren.</strong> Auch was ihr bei euch selbst repariert, zählt – eingetragen über dasselbe Formular.</li>
        </ul>
        <p>Für das Festival meldet sich jede Person einzeln an, damit das Team Stärken und Einsatzgebiete planen kann. Nach der Anmeldung kommt per E-Mail ein Link, über den ihr die Details ergänzt. Auch Unternehmen mit eigenen Angeboten und Sponsoren melden sich dort.</p>
        <p className="link-row">
          <a className="button button-primary" href={FESTIVAL_SIGNUP_URL} target="_blank" rel="noreferrer">Zum Festival anmelden <span aria-hidden="true">&#8599;</span></a>
          <a className="text-button" href={CONTACT}>Eigene Idee? Schreibt uns <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-count-title">
      <div>
        <p className="section-index">Reparaturen zählen lassen</p>
        <h2 id="initiatives-count-title">Der letzte Tag zählt noch mit.</h2>
      </div>
      <div>
        <p>Was am Festivaltag repariert wird, geht in den Rekord ein wie jede andere Reparatur auch – über dasselbe Formular, am Telefon der reparierenden Person oder an einem Gerät bei euch am Stand.</p>
        <p>Für Werkstätten mit vielen Reparaturen an einem Tag gibt es Aufsteller mit QR-Code, damit nicht alles über ein einziges Gerät läuft.</p>
        <p className="link-row">
          <Link className="text-button" href="/mitmachen">Zum Einreichungsformular <span aria-hidden="true">&#8594;</span></Link>
          <Link className="text-button" href="/aufsteller">Aufsteller mit QR-Code <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-contact-title">
      <div>
        <p className="section-index">Kontakt</p>
        <h2 id="initiatives-contact-title">Fragen? Immer her damit.</h2>
      </div>
      <div>
        <p>Das Festival wird von der FAB Region Bergisches Städtedreieck zusammen mit der Utopiastadt organisiert. Für alles, was mit eurer Teilnahme zu tun hat, schreibt uns direkt.</p>
        <p className="link-row">
          <a className="text-button" href={CONTACT}>{CONTACT_EMAIL} <span aria-hidden="true">&#8594;</span></a>
          <a className="text-button" href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region <span aria-hidden="true">&#8599;</span></a>
        </p>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
