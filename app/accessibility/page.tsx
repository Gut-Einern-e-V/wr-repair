import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = { title: "Barrierefreiheit | Reparaturrekord NRW" };

export default function AccessibilityPage() {
  return <main className="page-shell content-page"><SiteHeader /><article className="legal-page">
    <p className="eyebrow">Barrierefreiheit</p><h1>Reparatur soll fuer alle erreichbar sein.</h1>
    <section><h2>Stand der Umsetzung</h2><p>Die Seiten sind mit semantischen Bereichen, sichtbaren Fokuszustanden, ausreichenden Kontrasten, responsiven Layouts und einer Einstellung fuer reduzierte Bewegung umgesetzt. Formulare liefern Fehler- und Statusmeldungen mit passenden Rollen fuer assistive Technologien.</p></section>
    <section><h2>Bekannte Einschraenkungen</h2><p>Der externe hCaptcha-Dienst kann je nach Hilfstechnologie oder Einstellung zusaetzliche Huerden verursachen. Eingereichte Fotos werden in der Galerie nur dann sinnvoll beschrieben, wenn eine Bildbeschreibung vorliegt. Diese Punkte werden vor dem oeffentlichen Start mit Tastatur, Screenreader und unterschiedlichen Displaygroessen getestet.</p></section>
    <section><h2>Feedback</h2><p>Falls du auf eine Barriere stoesst oder Informationen in einer anderen Form benoetigst, schreibe an <a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a>. Bitte beschreibe die Seite, das verwendete Geraet und den Browser, damit wir das Problem nachvollziehen koennen.</p></section>
  </article><SiteFooter /></main>;
}