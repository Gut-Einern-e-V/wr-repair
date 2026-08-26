import Link from "next/link";
import { QuickSubmission } from "./quick-submission";

export const metadata = {
  title: "Reparatur eintragen | Reparaturrekord NRW",
  description: "Trage deine Reparatur direkt ein – ohne Umwege, optimiert für das Smartphone.",
};

export default function QuickSubmissionPage() {
  return <main className="quick-submit-page">
    <header className="quick-submit-header">
      <Link className="brand" href="/" aria-label="Reparaturrekord NRW Startseite"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link>
      <Link className="header-link" href="/stats">Live-Stand</Link>
    </header>
    <section className="quick-submit-intro">
      <p className="brand-kicker">Schnell eintragen</p>
      <h1 className="sticker-head is-mint"><span className="sticker">Deine Reparatur</span><span className="sticker">zählt</span></h1>
      <p>Foto, Kategorie, ein paar Angaben – fertig. Die Einreichung dauert nur wenige Minuten und zählt nach der Prüfung zum Rekord.</p>
    </section>
    <section className="quick-submit-panel" aria-labelledby="submission-title">
      <QuickSubmission />
    </section>
    <footer className="quick-submit-footer">
      <div><Link href="/privacy">Datenschutz</Link><Link href="/imprint">Impressum</Link><Link href="/accessibility">Barrierefreiheit</Link></div>
      <p>Ein Projekt der <a href="https://www.fab-bergisch.org/" target="_blank" rel="noreferrer">FAB Region Bergisches Städtedreieck</a>.</p>
    </footer>
  </main>;
}
