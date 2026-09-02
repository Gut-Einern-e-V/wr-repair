import Link from "next/link";

/* Leiste ueber dem Seitenkopf (Issue #47).
   BITV 2.0 § 4 verlangt, dass die Erklaerung in Leichter Sprache "ueber die
   Startseite" erreichbar ist; der BITV-Test prueft das als eigenes Kriterium.
   Durchgesetzt hat sich dafuer ueberall dieselbe Loesung - eine schmale Zeile
   ganz oben, mit Piktogramm.

   Warum nicht einfach ein Punkt in der Hauptnavigation: `.site-header nav`
   steht ab 720 Pixeln auf `display: none`. Der Link waere auf dem Telefon im
   Burger-Menue verschwunden - fuer genau die Menschen, die ihn suchen.

   Der Sprunglink steht davor, weil er der erste Tabstopp der Seite sein muss.
   Sichtbar wird er nur mit der Tastatur; Zielpunkt ist `#inhalt`. */
export function AccessBar() {
  return <div className="access-bar">
    <a className="skip-link" href="#inhalt">Zum Inhalt springen</a>
    <Link className="access-bar-link" href="/leichte-sprache">
      <EasyReadMark />
      Leichte Sprache
    </Link>
  </div>;
}

/* Eigenes Piktogramm, bewusst kein Nachbau des European Easy-to-Read Logos:
   Das gehoert Inclusion Europe und darf nur nach Genehmigung gefuehrt werden.
   Diese Zeichnung nimmt nur die gelernte Bildidee auf - ein Blatt mit wenig
   Text und einem Haken. */
function EasyReadMark() {
  return <svg className="access-bar-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {/* Kein Fuellton: Die Leiste ist dunkel, ein helles Blatt wuerde die Linien
        darin verschlucken. Alles zeichnet in der Textfarbe, nur der Haken traegt
        Gelb - er ist das, was das Zeichen erkennbar macht. */}
    <rect x="3" y="2.5" width="14" height="19" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M6.5 7.5h7M6.5 11h7M6.5 14.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12.8 16.2l3.6 3.9 5.4-9" fill="none" stroke="var(--yellow)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
