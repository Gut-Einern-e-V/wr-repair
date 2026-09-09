/* Der Foerderabbinder der FAB Region in zwei Fassungen.

   Quelle ist app/assets/logos/fab_region_abbinder_2025.pdf: EU-Emblem,
   zustaendiges Ministerium und efre-Wortmarke in einer Reihe. Diese gebundene
   Logo-Kombination darf laut Leitfaden Kommunikation des EFRE/JTF-Programms
   NRW (Stand Februar 2025, www.efre.nrw, Seiten 6, 7 und 24) nicht zerlegt
   oder mit anderen Elementen zusammengefuegt werden.

   Eine Aenderung erlaubt der Leitfaden ausdruecklich: "Wenn kleine Formate es
   erfordern, werden die beiden Logos untereinander gesetzt." Genau das ist die
   zweite Fassung. In einer Reihe waere der Abbinder auf dem Telefon rund 40
   Pixel hoch - die dreizeilige Ministeriumsangabe ist dann nicht mehr zu
   lesen. Untereinander steht sie auch auf 320 Pixeln Breite in etwa elf Pixeln
   Zeilenhoehe.

   Die untereinander-Fassung ist aus den Bausteinen derselben PDF-Datei
   aufgebaut, in der Anordnung, die der Leitfaden auf Seite 24 zeigt:
   EU-Emblem, darunter der Strich der Kombination waagerecht, darunter
   Ministeriumsangabe und Landeswappen, darunter die efre-Wortmarke. Das
   Ergebnis liegt als
   app/assets/logos/fab_region_abbinder_2025_untereinander.png bei, damit es
   sich nachvollziehen und nachbauen laesst. Offiziell geliefert ist diese
   Fassung nicht - kommt sie von der FAB Region, gehoert sie hier ersetzt.

   `<picture>` statt next/image: Gebraucht wird ein Bildwechsel nach
   Fenstergroesse, und den kann der Bildoptimierer nicht. Beide Dateien sind
   klein und in fester Groesse eingebaut, er haette hier also ohnehin nichts zu
   tun. Das Weiss steckt in beiden Dateien: Es ist die weisse
   Identitaetsflaeche, auf der die Logos laut Leitfaden immer sitzen. */

export const abbinderAlt =
  "Kofinanziert von der Europäischen Union · Ministerium für Umwelt, Naturschutz und Verkehr des Landes Nordrhein-Westfalen · www.efre.nrw";

export const abbinderRow = { src: "/funding/fab-region-abbinder-2025.webp", width: 2400, height: 320 };
export const abbinderStack = { src: "/funding/fab-region-abbinder-2025-untereinander.webp", width: 1200, height: 928 };

export function FundingAbbinder({ className }: { className?: string }) {
  return <picture>
    <source media="(max-width: 720px)" srcSet={abbinderStack.src} width={abbinderStack.width} height={abbinderStack.height} />
    <img className={className} src={abbinderRow.src} alt={abbinderAlt} width={abbinderRow.width} height={abbinderRow.height} />
  </picture>;
}
