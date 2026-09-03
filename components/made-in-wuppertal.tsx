/**
 * Schlusszeile unter dem Footer (Issue #89).
 *
 * Die Leiste nimmt bewusst die Gestalt der Zugangsleiste ganz oben auf
 * (components/access-bar.tsx): dieselbe Hoehe, dieselbe dunkelblaue Flaeche
 * ueber die volle Breite. Oben und unten schliesst die Seite damit mit
 * demselben Band ab, und die Zeile wirkt als Abschluss und nicht als weiterer
 * Absatz des Footers.
 *
 * Inhaltlich ist sie kein Navigationselement: kein Link, keine Angabe, die
 * jemand braucht - eine Unterschrift. Deshalb steht sie ausserhalb des
 * `<footer>` und traegt keine eigene Ueberschrift.
 */
export function MadeInWuppertal() {
  return <div className="made-bar">
    <p className="made-line">
      made with <PrideHeart /> in Wuppertal
    </p>
  </div>;
}

/**
 * Herz in den Farben der Progress-Pride-Flagge.
 *
 * Gezeichnet statt als Emoji: Das bunte Herz kommt auf jedem System anders
 * heraus, und die Streifen des Winkels gibt es als Emoji ueberhaupt nicht.
 * Die Herzform dient als Schnittmaske, darunter liegen die sechs
 * Regenbogenstreifen und links der fuenffarbige Winkel.
 *
 * Reihenfolge des Winkels von aussen nach innen: Weiss, Rosa, Hellblau (die
 * Farben der Trans-Flagge), danach Braun und Schwarz fuer Schwarze und
 * People of Color. Genau diese Anordnung macht die Progress-Flagge aus - sie
 * stellt die zuletzt hinzugekommenen Farben nach vorn, statt sie unten
 * anzuhaengen.
 */
function PrideHeart() {
  /* Ein Bogen je Herzhaelfte, unten in einer Spitze zusammenlaufend. Der Pfad
     fuellt die Zeichenflaeche fast ganz aus, damit das Herz neben der
     Textzeile nicht zu klein geraet. */
  const heart = "M12 21.4C12 21.4 2.6 15.3 2.6 9.1 2.6 6.1 4.9 3.9 7.7 3.9 9.6 3.9 11.2 4.9 12 6.4 12.8 4.9 14.4 3.9 16.3 3.9 19.1 3.9 21.4 6.1 21.4 9.1 21.4 15.3 12 21.4 12 21.4Z";

  const stripes = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"];
  /* In Zeichenreihenfolge, also von innen nach aussen: Jedes Dreieck ist
     schmaler als sein Vorgaenger und deckt ihn links ab. Sichtbar bleibt
     dadurch aussen Weiss und innen - direkt am Regenbogen - Schwarz. */
  const chevron = ["#000000", "#613915", "#74d7ee", "#ffafc8", "#ffffff"];

  return <svg className="made-heart" viewBox="0 0 24 24" role="img" aria-label="love">
    <defs>
      <clipPath id="made-heart-shape"><path d={heart} /></clipPath>
    </defs>
    <g clipPath="url(#made-heart-shape)">
      {/* Waagerechte Baender ueber die volle Hoehe der Herzform. Die Streifen
          reichen absichtlich ueber den Rand hinaus - die Maske schneidet sie
          zurecht, und so bleibt an den Rundungen keine Luecke. */}
      {stripes.map((color, index) => (
        <rect key={color} x="0" y={3 + index * 3.1} width="24" height="3.15" fill={color} />
      ))}
      {/* Der Winkel: fuenf ineinandergeschachtelte Dreiecke, jedes etwas
          schmaler als das davor und darueber gezeichnet. So entstehen gleich
          breite Streifen, ohne fuenf Polygone einzeln zu berechnen. */}
      {chevron.map((color, index) => (
        <path key={color} d={`M-1 -1 L${10.4 - index * 1.6} 12 L-1 25 Z`} fill={color} />
      ))}
    </g>
  </svg>;
}
