import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Impressum | Reparaturrekord NRW" };

export default function ImprintPage() {
  return <main className="page-shell content-page"><SiteHeader /><article className="legal-page">
    <p className="eyebrow">Rechtliche Informationen</p><h1>Impressum</h1>
    <section><h2>Anbieterkennzeichnung</h2><p>Gut Einern e.V.<br />Einern 120<br />42279 Wuppertal</p><p>Vertreten durch den Vorstand:<br />Dominik Stingl (1. Vorstand)<br />Patrik Beneke (2. Vorstand)<br />Silke Wilke (Kassenwartin)</p><p>Vereinsregister: Amtsgericht Wuppertal, VR 31296<br />Umsatzsteuer-ID: DE352779410</p></section>
    <section><h2>Kontakt</h2><p>E-Mail: <a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a><br />Telefon: 0202 75843282</p></section>
    <section><h2>Verantwortlich fuer redaktionelle Inhalte</h2><p>Dominik Stingl<br />Einern 120<br />42279 Wuppertal</p></section>
    <section><h2>Haftung fuer externe Inhalte</h2><p>Diese Anwendung verlinkt auf externe Angebote. Deren Inhalte liegen im Verantwortungsbereich der jeweiligen Anbieter. Bei Bekanntwerden einer Rechtsverletzung werden betroffene Verweise geprueft und gegebenenfalls entfernt.</p></section>
    <section><h2>Urheberrecht</h2><p>Texte, Gestaltung und selbst erstellte Inhalte dieser Anwendung duerfen nur im Rahmen der jeweils angegebenen Lizenz oder mit Zustimmung der Rechteinhaber weiterverwendet werden. Inhalte Dritter, insbesondere Logos und Bilder, sind als solche kenntlich gemacht und unterliegen den Rechten ihrer jeweiligen Urheber.</p></section>
    <section><h2>Rechtlicher Pruefstand</h2><p>Aufbau und Pflichtangaben orientieren sich an der Informationsstruktur der FAB Region. Die Angaben basieren auf dem Impressum von Gut Einern e.V. und muessen vor dem oeffentlichen Start durch die verantwortliche Organisation rechtlich freigegeben werden. Insbesondere Vertretung, Registerangaben, Steuerangaben und Streitbeilegungshinweise sind dann abschliessend zu bestaetigen.</p></section>
  </article><SiteFooter /></main>;
}