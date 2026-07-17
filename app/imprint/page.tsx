import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Impressum | Reparaturrekord NRW" };

export default function ImprintPage() {
  return <main className="page-shell content-page"><SiteHeader /><article className="legal-page">
    <p className="eyebrow">Rechtliche Informationen</p><h1>Impressum</h1>
    <section><h2>Anbieterkennzeichnung</h2><p>Gut Einern e.V.<br />Einern 120<br />42279 Wuppertal</p><p>Vertreten durch den Vorstand:<br />Dominik Stingl (1. Vorstand)<br />Patrik Beneke (2. Vorstand)<br />Silke Wilke (Kassenwartin)</p><p>Vereinsregister: Amtsgericht Wuppertal, VR 31296<br />Umsatzsteuer-ID: DE352779410</p></section>
    <section><h2>Kontakt</h2><p>E-Mail: <a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a><br />Telefon: 0202 75843282</p></section>
    <section><h2>Verantwortlich fuer redaktionelle Inhalte</h2><p>Dominik Stingl<br />Einern 120<br />42279 Wuppertal</p></section>
    <section><h2>Hinweis</h2><p>Die Angaben basieren auf dem Impressum von Gut Einern e.V. und muessen vor dem oeffentlichen Start durch die verantwortliche Organisation geprueft werden. Fuer externe Links sind deren jeweilige Betreiber verantwortlich.</p></section>
  </article><SiteFooter /></main>;
}