import Link from "next/link";
import { AccessBar } from "@/components/access-bar";
import { circularWeek, operator } from "@/lib/organisation";
import { QuickSubmission } from "./quick-submission";

export const metadata = {
  title: "Reparatur eintragen",
  description: "Trage deine Reparatur direkt ein – ohne Umwege, optimiert für das Smartphone.",
  // Eigene installierbare App statt der Hauptseite (siehe lib/app-manifests.ts).
  manifest: "/mitmachen/manifest.webmanifest",
};

export default function QuickSubmissionPage() {
  return <main className="quick-submit-page">
    <AccessBar />
    <header className="quick-submit-header">
      <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
      <Link className="header-link" href="/stats">Live-Stand</Link>
    </header>
    <section id="inhalt" className="quick-submit-intro">
      <p className="brand-kicker">Schnell eintragen</p>
      <h1 className="sticker-head is-mint"><span className="sticker">Deine Reparatur</span><span className="sticker">zählt</span></h1>
      <p>Foto, Kategorie, ein paar Angaben – fertig. Die Einreichung dauert nur wenige Minuten und zählt nach der Prüfung zum Rekord.</p>
    </section>
    <section className="quick-submit-panel" aria-labelledby="submission-title">
      <QuickSubmission />
    </section>
    {/* Nach dem Eintragen die naheliegende Frage: Wie erzaehle ich es weiter?
        Unter dem Formular, damit es beim Eintragen nicht im Weg steht. */}
    <section className="quick-submit-share" aria-labelledby="share-title">
      <h2 id="share-title">Weitersagen</h2>
      <p>Hol dir ein Bild mit dem Live-Stand für deine Story oder deinen Feed – als Story, Hochformat oder Quadrat.</p>
      <Link className="text-button" href="/sharepics">Zu den Sharepics <span aria-hidden="true">&#8594;</span></Link>
    </section>
    <footer className="quick-submit-footer">
      <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link></div>
      <p>Eine Initiative der <a href={circularWeek.url} target="_blank" rel="noreferrer">{circularWeek.name}</a>, organisiert vom <a href={operator.website} target="_blank" rel="noreferrer">{operator.shortName}</a>.</p>
    </footer>
  </main>;
}
