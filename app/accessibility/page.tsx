import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Barrierefreiheit",
  description:
    "Erklärung zur Barrierefreiheit für den Reparaturrekord NRW: Stand der Umsetzung, bekannte Einschränkungen, Angebot in Leichter Sprache und wie sich Barrieren melden lassen.",
};

/* Erklaerung zur Barrierefreiheit (Issue #47).
   Aufbau nach BITV 2.0 § 12: Stand, Einschraenkungen, Meldeweg, und der
   Verweis auf das Angebot in Leichter Sprache. Der Text stand vorher mit
   "fuer" und "Fokuszustanden" auf der Seite - Umlautumschreibungen gehoeren in
   Quelltextkommentare, nicht in etwas, das jemand vorgelesen bekommt. */
export default function AccessibilityPage() {
  return <main className="page-shell content-page"><SiteHeader /><article id="inhalt" className="legal-page">
    <p className="eyebrow">Barrierefreiheit</p><h1>Reparatur soll für alle erreichbar sein.</h1>
    <section><h2>Stand der Umsetzung</h2><p>Wir orientieren uns an der Barrierefreie-Informationstechnik-Verordnung (BITV 2.0) und damit an den Web Content Accessibility Guidelines in Version 2.1, Stufe AA. Die Seiten sind mit semantischen Bereichen, einem Sprunglink zum Inhalt, sichtbaren Fokuszuständen, ausreichenden Kontrasten, responsiven Layouts und einer Einstellung für reduzierte Bewegung umgesetzt. Formulare liefern Fehler- und Statusmeldungen mit passenden Rollen für assistive Technologien.</p></section>
    <section><h2>Angebot in Leichter Sprache</h2><p>Es gibt eine eigene Seite in Leichter Sprache. Sie erklärt, worum es beim Reparaturrekord geht, wie eine Reparatur eingetragen wird, wie die Website aufgebaut ist und an wen sich Menschen wenden können, die auf eine Barriere stoßen. Sie kommt ohne Animationen aus und ist über die Leiste am oberen Rand jeder Seite erreichbar.</p><p><Link className="text-button" href="/leichte-sprache">Zur Seite in Leichter Sprache <span aria-hidden="true">&#8594;</span></Link></p></section>
    <section><h2>Bekannte Einschränkungen</h2><p>Informationen in Deutscher Gebärdensprache gibt es bisher nicht. Das Einreichungsformular ist bewusst dasselbe wie auf der Hauptseite, damit Änderungen daran überall gleichzeitig ankommen – seine Beschriftungen sind deshalb nicht in Leichter Sprache. Der externe Dienst Friendly Captcha kann je nach Hilfstechnologie, Netzwerk oder Einstellung zusätzliche Hürden verursachen. Eingereichte Fotos werden in der Galerie nur dann sinnvoll beschrieben, wenn eine Bildbeschreibung vorliegt.</p></section>
    <section><h2>Feedback und Kontakt</h2><p>Falls du auf eine Barriere stößt oder Informationen in einer anderen Form benötigst, schreibe an <a href="mailto:mail@gut-einern.org">mail@gut-einern.org</a>. Bitte beschreibe die Seite, das verwendete Gerät und den Browser, damit wir das Problem nachvollziehen können.</p></section>
  </article><SiteFooter /></main>;
}
