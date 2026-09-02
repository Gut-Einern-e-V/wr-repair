/* Das Bergische Staedtedreieck als eigene Zeichnung (Issue #84).
   Kein Kartenmaterial und keine Bilddatei: drei Punkte, grob dort, wo die
   Staedte zueinander liegen - Wuppertal im Norden, Solingen im Suedwesten,
   Remscheid im Suedosten. Damit erklaert sich das Wort "Staedtedreieck" auf
   einen Blick, ohne dass eine Karte Genauigkeit verspricht, die sie nicht hat.

   Fuer Screenreader ist die Grafik ein einziges Bild mit Titel und
   Beschreibung; die drei Namen stehen ohnehin im Text daneben. Die Beschriftung
   in der Grafik skaliert mit der Grafik, nicht mit der Schriftgroesse des
   Browsers - deshalb darf sie nichts tragen, was nur hier steht. */

const cities = [
  { name: "Wuppertal", x: 232, y: 96, labelX: 232, labelY: 62, anchor: "middle" as const },
  { name: "Solingen", x: 96, y: 268, labelX: 96, labelY: 312, anchor: "middle" as const },
  { name: "Remscheid", x: 352, y: 244, labelX: 352, labelY: 284, anchor: "middle" as const },
];

export function RegionTriangle() {
  const outline = cities.map((city) => `${city.x},${city.y}`).join(" ");

  return <svg
    className="region-triangle"
    /* Der Ausschnitt ist auf den tatsaechlichen Inhalt zugeschnitten - bei
       einem Rahmen ab 0,0 stand oben und unten mehr Luft als neben den
       Staedtenamen, und die Zeichnung rutschte im Kasten nach oben. */
    viewBox="40 35 375 290"
    role="img"
    aria-labelledby="region-triangle-title region-triangle-desc"
  >
    <title id="region-triangle-title">Das Bergische Städtedreieck</title>
    <desc id="region-triangle-desc">Eine schematische Zeichnung: Wuppertal, Solingen und Remscheid bilden ein Dreieck. Wuppertal liegt im Norden, Solingen im Südwesten, Remscheid im Südosten.</desc>
    <polygon points={outline} fill="var(--mint)" stroke="none" opacity=".55" />
    <polygon points={outline} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
    {cities.map((city) => <g key={city.name}>
      <circle cx={city.x} cy={city.y} r="15" fill="var(--yellow)" stroke="var(--ink)" strokeWidth="2.5" />
      <circle cx={city.x} cy={city.y} r="4.5" fill="var(--ink)" />
      <text x={city.labelX} y={city.labelY} textAnchor={city.anchor} className="region-triangle-label">{city.name}</text>
    </g>)}
  </svg>;
}
