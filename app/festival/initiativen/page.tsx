import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BreadcrumbStructuredData } from "@/components/structured-data";
import { CONTACT_EMAIL, mailto } from "@/lib/organisation";
import { FESTIVAL_DATE_TEXT, FestivalFacts, FestivalNav } from "../festival-chrome";

const CONTACT = mailto(CONTACT_EMAIL, "Repair & Share Festival - Initiative");

export const metadata = {
  title: "Festival für Initiativen",
  description:
    "Repair Cafés, offene Werkstätten und Initiativen beim Repair & Share Festival am 31. Oktober 2026 in Wuppertal: mit eigenem Stand dabei, jede Reparatur für den Rekord gezählt – ein Rückblick und Dank.",
};

/* Die Seite fuer die Initiativen (Issue #33).
   Seit dem Festival ein Rueckblick: Anmeldung, Einreichungsformular und die
   offenen Planungsangaben sind entfallen, weil es nichts mehr zu planen gibt.
   Wie die Uebersicht ist die Seite an einen vergangenen Tag gebunden und
   wechselt deshalb nicht nach Phase. */
export default function FestivalInitiativesPage() {
  return <main className="page-shell content-page">
    <BreadcrumbStructuredData trail={[["/festival", "Repair & Share Festival"], ["/festival/initiativen", "Für Initiativen"]]} />
    <SiteHeader />

    <section id="inhalt" className="content-hero" aria-labelledby="initiatives-title">
      <div>
        <p className="brand-kicker">Repair &amp; Share Festival</p>
        <h1 id="initiatives-title">Ihr wart dabei, mit dem, was ihr könnt.</h1>
        <p>Zum Abschluss des Rekordmonats kamen Reparaturinitiativen aus ganz NRW nach Wuppertal – mit Werkbank, Nähmaschine, Lötkolben oder einfach mit ihren Leuten. Danke an alle, die mitgeschraubt haben.</p>
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
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-who-title">
      <div>
        <p className="section-index">Wer gemeint war</p>
        <h2 id="initiatives-who-title">Alle, bei denen repariert wird.</h2>
      </div>
      <div>
        <p>Repair Cafés, offene Werkstätten, Fahrradselbsthilfen, Nähtreffs, Elektronikwerkstätten, Materiallager, Tauschregale, Bibliotheken der Dinge – wenn bei euch Dinge länger leben, wart ihr gemeint.</p>
        <p>Dafür musste niemand schon vorher beim Rekord mitgemacht haben oder aus Wuppertal kommen: Der Rekordversuch galt für ganz Nordrhein-Westfalen, das Festival auch.</p>
        <p className="link-row">
          <Link className="text-button" href="/repair-cafes">Karte der Initiativen <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-how-title">
      <div>
        <p className="section-index">Mitgemacht</p>
        <h2 id="initiatives-how-title">Ihr wart das Rückgrat der Aktion.</h2>
      </div>
      <div>
        <p>Reparaturinitiativen haben auf drei Wegen zum Rekord beigetragen:</p>
        <ul>
          <li><strong>Am Festival mitrepariert.</strong> Reparateur:innen, Organisator:innen und Helfende kamen am 31. Oktober nach Wuppertal. Einen Tag lang haben wir miteinander repariert, voneinander gelernt – und eines der bisher größten ehrenamtlichen Reparaturevents auf die Beine gestellt.</li>
          <li><strong>Das Repair Café wie gewohnt.</strong> Viele Initiativen haben ihre Termine im Oktober wie immer veranstaltet und ihren Besuchenden geholfen, gelungene Reparaturen hier einzutragen.</li>
          <li><strong>Eigene Geräte repariert.</strong> Auch was bei euch selbst repariert wurde, hat gezählt.</li>
        </ul>
        <p className="link-row">
          <a className="text-button" href={CONTACT}>Ideen fürs nächste Mal? Schreibt uns <span aria-hidden="true">&#8594;</span></a>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-count-title">
      <div>
        <p className="section-index">Reparaturen gezählt</p>
        <h2 id="initiatives-count-title">Der letzte Tag hat mitgezählt.</h2>
      </div>
      <div>
        <p>Was am Festivaltag repariert wurde, ging in den Rekord ein wie jede andere Reparatur auch – eingetragen am Telefon der reparierenden Person oder an einem Gerät bei euch am Stand.</p>
        <p>Und es hat gereicht: Am Festivaltag fiel in Wuppertal der Weltrekord für die meisten Reparaturen an einem Tag und einem Ort.</p>
        <p className="link-row">
          <Link className="text-button" href="/stats">Zum Ergebnis <span aria-hidden="true">&#8594;</span></Link>
        </p>
      </div>
    </section>

    <section className="content-section two-column-copy" aria-labelledby="initiatives-contact-title">
      <div>
        <p className="section-index">Kontakt</p>
        <h2 id="initiatives-contact-title">Fragen? Immer her damit.</h2>
      </div>
      <div>
        <p>Das Festival wurde von der FAB Region Bergisches Städtedreieck zusammen mit der Utopiastadt organisiert. Für Fragen und Rückmeldungen schreibt uns direkt.</p>
        <p className="link-row">
          <a className="text-button" href={CONTACT}>{CONTACT_EMAIL} <span aria-hidden="true">&#8594;</span></a>
          <a className="text-button" href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region <span aria-hidden="true">&#8599;</span></a>
        </p>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
