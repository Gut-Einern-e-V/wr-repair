import Link from "next/link";

/**
 * Gemeinsame Bausteine der Festivalseiten (Issue #33).
 *
 * Drei Seiten teilen sich Datum, Ort und die Unternavigation. Sie stehen hier
 * einmal, damit ein spaeter feststehender Zeitplan nicht an drei Stellen
 * nachgetragen werden muss - und damit die Angaben nicht auseinanderlaufen.
 */

/** Maschinenlesbar fuer `<time>`, ausgeschrieben fuer den Text. */
export const FESTIVAL_DATE_ISO = "2026-10-31";
export const FESTIVAL_DATE_TEXT = "Samstag, 31. Oktober 2026";

/** Der Ort, so genau wie er bisher feststeht. */
export const FESTIVAL_PLACE = "Utopiastadt und Wiesenwerke, Wuppertal";

export const festivalPages = [
  ["/festival", "Übersicht"],
  ["/festival/anreise", "Anreise"],
  ["/festival/initiativen", "Für Initiativen"],
] as const;

/**
 * Unternavigation der Festivalseiten.
 *
 * `current` bekommt `aria-current="page"` statt eines Links: Ein Link auf die
 * Seite, auf der man schon steht, ist fuer die Tastaturbedienung eine
 * Sackgasse.
 */
export function FestivalNav({ current }: { current: string }) {
  return <nav className="festival-nav" aria-label="Festivalseiten">
    {festivalPages.map(([href, label]) => (
      href === current
        ? <span key={href} aria-current="page">{label}</span>
        : <Link key={href} href={href}>{label}</Link>
    ))}
  </nav>;
}

/**
 * Was noch nicht feststeht.
 *
 * Bewusst als eigener, sichtbar abgesetzter Kasten und nicht als Fliesstext:
 * Ein Festival, dessen Programm noch offen ist, darf keine Seite bekommen, auf
 * der Erfundenes und Feststehendes gleich aussehen. Wer hier liest, soll auf
 * einen Blick erkennen, worauf noch kein Verlass ist.
 */
export function FestivalPending({ children }: { children: React.ReactNode }) {
  return <p className="festival-pending"><strong>Steht noch nicht fest:</strong> {children}</p>;
}

/** Die drei Eckdaten, die auf jeder Festivalseite oben stehen. */
export function FestivalFacts() {
  return <dl className="festival-facts">
    <div><dt>Wann</dt><dd><time dateTime={FESTIVAL_DATE_ISO}>{FESTIVAL_DATE_TEXT}</time></dd></div>
    <div><dt>Wo</dt><dd>{FESTIVAL_PLACE}</dd></div>
    <div><dt>Anreise</dt><dd>Bitte mit Bus, Bahn oder Rad</dd></div>
  </dl>;
}
