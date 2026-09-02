import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Open Source",
  description:
    "Der Reparaturrekord NRW liegt vollständig als offener Quelltext vor. Was im Repository steckt, wofür sich eine Nachnutzung eignet und was eine andere Region vor dem Start anpassen muss.",
};

const REPO = "https://github.com/Gut-Einern-e-V/wr-repair";

/* Eigene Seite statt eines Abschnitts auf /about (Issue #84).
   Auf der Projektseite hatte Open Source den zweiten Platz und damit mehr
   Gewicht, als die Sache im Erzaehlbogen verdient: Erst kommt, warum wir den
   Rekord versuchen, und wer wir sind. Wer nachnutzen will, sucht gezielt - und
   findet hier alles an einer Stelle, statt verstreut zwischen Projekttext und
   Schnittstellen-Doku. */
export default function OpenSourcePage() {
  return <main className="page-shell content-page">
    <SiteHeader />
    <article className="legal-page">
      <p className="eyebrow">Open Source</p>
      <h1>Zum Nachbauen gemacht.</h1>
      <section>
        <h2>Der Quelltext ist offen</h2>
        <p>Diese Website liegt vollständig in einem öffentlichen Repository. Andere Initiativen können den technischen Ansatz für ihre eigene Reparaturkampagne prüfen, übernehmen und weiterentwickeln – ohne bei null anzufangen und ohne uns um Erlaubnis zu fragen.</p>
        <p><a className="button button-primary" href={REPO} target="_blank" rel="noreferrer">Repository ansehen <span aria-hidden="true">&#8599;</span></a></p>
      </section>
      <section>
        <h2>Was darin steckt</h2>
        <ul>
          <li>Der Einreichungsablauf mit Foto, Kategorie und Standortprüfung.</li>
          <li>Das Moderationsmodell samt Freigabe, Ablehnung und Rückfragen.</li>
          <li>Die Datenbankmigrationen für Supabase.</li>
          <li>Der Live-Stand mit Zähler, Karte und Bilderwand.</li>
          <li>Das Inhaltssystem für Geschichten und Textseiten.</li>
          <li>Hinweise zum Deployment und zum Betrieb.</li>
        </ul>
      </section>
      <section>
        <h2>Bevor eine Kopie online geht</h2>
        <p>Eine Kopie ist schnell aufgesetzt, aber nicht ohne Weiteres startklar. Anzupassen sind mindestens: die verantwortliche Organisation, alle Rechtstexte, die Löschfristen für Fotos und Standortdaten, sämtliche Zugangsdaten und Schlüssel sowie die Teilnahmebedingungen. Die Region selbst – Name, Grenzen, Prüfung der Herkunft – steht in der Konfiguration und muss nicht im Code geändert werden.</p>
      </section>
      <section>
        <h2>Nur die Zahlen, nicht der ganze Code</h2>
        <p>Wer keine eigene Kampagne aufsetzen, sondern nur den Stand anzeigen will – auf einem Display in der Werkstatt, im Schaufenster oder auf der eigenen Website –, braucht das Repository nicht. Dafür gibt es offene Schnittstellen ohne Schlüssel und Anmeldung.</p>
        <p><Link className="text-button" href="/api-doku">Schnittstellen für eigene Anzeigen <span aria-hidden="true">&#8594;</span></Link></p>
      </section>
      <section>
        <h2>Mitarbeiten</h2>
        <p>Fehler, Verbesserungen und Ideen gehören in die Issues des Repositorys. Wer lieber schreibt als programmiert: Auch Texte, Übersetzungen und Dokumentation liegen dort und freuen sich über Korrekturen.</p>
        <p><a className="text-button" href={`${REPO}/issues`} target="_blank" rel="noreferrer">Issues ansehen <span aria-hidden="true">&#8599;</span></a></p>
      </section>
    </article>
    <SiteFooter />
  </main>;
}
