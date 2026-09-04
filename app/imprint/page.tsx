import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { CONTACT_EMAIL, mailto, operator, projectCredits } from "@/lib/organisation";

export const metadata = { title: "Impressum" };

/* Betreiber ist seit Issue #78 das CSCP: Der Reparaturrekord gehoert zur
   Circular Week 2026, und damit wandert die Anbieterkennzeichnung von Gut
   Einern e.V. dorthin. Die Pflichtangaben stehen in lib/organisation.ts und
   sind aus https://www.cscp.org/imprint/ uebernommen.

   Der Abschnitt "Wer hinter dem Reparaturrekord steht" ist keine
   Pflichtangabe, gehoert aber hierher: Drei Organisationen tragen drei
   verschiedene Rollen, und ohne die Aufzaehlung liest sich das Impressum so,
   als haette das CSCP auch die Website gebaut. */
export default function ImprintPage() {
  return <main className="page-shell content-page"><SiteHeader /><article id="inhalt" className="legal-page">
    <p className="eyebrow">Rechtliche Informationen</p><h1>Impressum</h1>
    <section>
      <h2>Anbieterkennzeichnung</h2>
      <p>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</p>
      <p>{operator.legalName} ({operator.shortName})<br />{operator.street}<br />{operator.postalCode} {operator.city}</p>
      <p>Vertreten durch:<br />{operator.representedBy}</p>
      <p>Handelsregister: {operator.registerCourt}, {operator.registerNumber}<br />Umsatzsteuer-Identifikationsnummer nach § 27 a Umsatzsteuergesetz: {operator.vatId}</p>
    </section>
    <section>
      <h2>Kontakt</h2>
      <p>E-Mail: <a href={mailto(CONTACT_EMAIL)}>{CONTACT_EMAIL}</a><br />Telefon: {operator.phone}</p>
    </section>
    <section>
      <h2>Verantwortlich für redaktionelle Inhalte</h2>
      <p>{operator.legalName}<br />{operator.street}<br />{operator.postalCode} {operator.city}</p>
    </section>
    <section>
      <h2>Wer hinter dem Reparaturrekord steht</h2>
      {projectCredits.map((credit) => <p key={credit.role}>
        <strong>{credit.role}:</strong> {credit.description}{" "}
        <a href={credit.url} target="_blank" rel="noreferrer">{credit.name} <span aria-hidden="true">&#8599;</span></a>
      </p>)}
    </section>
    <section>
      <h2>Streitbeilegung</h2>
      <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr <span aria-hidden="true">&#8599;</span></a>. Unsere E-Mail-Adresse steht oben in dieser Anbieterkennzeichnung.</p>
      <p>Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nicht bereit.</p>
    </section>
    <section>
      <h2>Haftung für externe Inhalte</h2>
      <p>Diese Anwendung verlinkt auf externe Angebote. Für deren Inhalte ist die jeweils dahinterstehende Organisation verantwortlich. Bei Bekanntwerden einer Rechtsverletzung werden betroffene Verweise geprüft und gegebenenfalls entfernt.</p>
    </section>
    <section>
      <h2>Urheberrecht</h2>
      <p>Texte, Gestaltung und selbst erstellte Inhalte dieser Anwendung dürfen nur im Rahmen der jeweils angegebenen Lizenz oder mit Zustimmung der Rechteinhabenden weiterverwendet werden. Inhalte Dritter, insbesondere Logos und Bilder, sind als solche kenntlich gemacht und unterliegen dem Urheberrecht der jeweiligen Rechteinhabenden.</p>
    </section>
    <section>
      <h2>Rechtlicher Prüfstand</h2>
      <p>Die Pflichtangaben sind aus dem Impressum des {operator.shortName} übernommen. Vor dem öffentlichen Start müssen sie durch die verantwortliche Organisation für dieses Angebot bestätigt werden – insbesondere, ob Vertretung, Register- und Steuerangaben unverändert gelten und ob eine eigene Kontakttelefonnummer für den Reparaturrekord angegeben werden soll.</p>
    </section>
  </article><SiteFooter /></main>;
}
