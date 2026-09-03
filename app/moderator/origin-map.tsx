"use client";

import { OUTLINE_SIZE, nrwOutlinePath } from "@/lib/nrw-outline-path";
import type { ModerationOrigin, ModerationOriginSignal } from "@/lib/moderation";

/**
 * Wie weit ausserhalb des Landes ein Punkt noch mitgezeichnet wird, gemessen
 * in Kantenlaengen der Karte. Darueber hinaus schrumpft NRW zu einem Fleck und
 * die Karte sagt weniger als die Koordinaten daneben.
 */
const MAX_OUTSIDE = 1.5;

/**
 * Herkunft einer Einreichung auf der Landeskarte.
 *
 * Gezeigt wird die anonymisierte Angabe, nicht der Reparaturort - genauer ist
 * sie auch in der Datenbank nicht. Fuer die Moderation reicht das genau aus:
 * Die Frage ist nicht "wo genau", sondern "passt die Gegend zu dem, was die
 * Einreichung behauptet".
 *
 * Widersprechen sich die erhobenen Signale, stehen sie alle auf der Karte und
 * nicht nur das eine, das gespeichert wurde (Issue #87). Erst damit ist zu
 * sehen, was der Unterschied ist: Ein Foto aus Bayern und ein angeklickter
 * Kreis in NRW liegen dann sichtbar weit auseinander, verbunden durch eine
 * gestrichelte Linie. Die Nummern an den Punkten entsprechen der Liste
 * darunter in der Vollansicht.
 *
 * Liegt ein Punkt ausserhalb des Landes, waechst der Ausschnitt mit, bis er
 * hineinpasst. Die Kontur rutscht dann in eine Ecke - was gewollt ist: Man
 * sieht auf einen Blick, dass und in welche Richtung der Punkt danebenliegt.
 */
export default function OriginMap({ origin }: { origin: ModerationOrigin }) {
  /* Die Hauptangabe steht immer auf der Karte. Ist sie unter den Signalen
     ohnehin enthalten (`used`), waere sie sonst doppelt gezeichnet. */
  const extras = origin.signals.filter((signal) => !signal.used);
  /* Die Nummer haengt an der Reihenfolge und nicht am Zeichnen: Faellt ein
     weit entfernter Punkt gleich aus der Karte, behalten die uebrigen ihre
     Nummer und passen weiter zur Liste darunter. */
  const points = [
    { number: 1, x: origin.mapX, y: origin.mapY, main: true, signal: null as ModerationOriginSignal | null },
    ...extras.map((signal, index) => ({ number: index + 2, x: signal.mapX, y: signal.mapY, main: false, signal })),
  ];

  /* Ein Signal von weit weg wuerde die Karte auf einen Punkt zusammenschrumpfen
     lassen. Solche Punkte fallen raus - in der Liste unter der Karte stehen sie
     mit Koordinaten trotzdem. */
  const drawn = points.filter(({ x, y }) =>
    x >= -MAX_OUTSIDE && x <= 1 + MAX_OUTSIDE && y >= -MAX_OUTSIDE && y <= 1 + MAX_OUTSIDE);

  if (!drawn.length) return null;

  const scaled = drawn.map((point) => ({ ...point, x: point.x * OUTLINE_SIZE, y: point.y * OUTLINE_SIZE }));

  // Rand, damit ein Punkt am Kartenrand nicht halb abgeschnitten wird.
  const padding = OUTLINE_SIZE * 0.04;
  const minX = Math.min(0, ...scaled.map((point) => point.x)) - padding;
  const minY = Math.min(0, ...scaled.map((point) => point.y)) - padding;
  const maxX = Math.max(OUTLINE_SIZE, ...scaled.map((point) => point.x)) + padding;
  const maxY = Math.max(OUTLINE_SIZE, ...scaled.map((point) => point.y)) + padding;
  const span = Math.max(maxX - minX, maxY - minY);

  // Punkte und Schrift sollen auf jedem Ausschnitt gleich gross wirken, nicht
  // mit dem Zoom mitwachsen.
  const dotRadius = span * 0.022;
  /* Fehlt, wenn die Hauptangabe selbst zu weit draussen liegt - dann gibt es
     keinen Bezugspunkt fuer die Verbindungslinien. */
  const main = scaled.find((point) => point.main);

  const label = extras.length
    ? `Herkunftssignale der Einreichung: ${origin.kreis ?? "außerhalb des Landes"} und ${extras.length} abweichende Angabe${extras.length === 1 ? "" : "n"}`
    : `Herkunft der Einreichung: ${origin.kreis ?? "außerhalb des Landes"}`;

  return (
    <figure className={`origin-map${origin.outside ? " is-outside" : ""}`}>
      <svg viewBox={`${minX} ${minY} ${span} ${span}`} role="img" aria-label={label}>
        <path className="origin-map-outline" d={nrwOutlinePath} />
        {/* Erst die Verbindungslinien, damit sie unter den Punkten liegen. */}
        {main && scaled.filter((point) => !point.main).map((point) => (
          <line
            key={`line-${point.signal!.source}`}
            className="origin-map-link"
            x1={main.x} y1={main.y} x2={point.x} y2={point.y}
          />
        ))}
        {scaled.map((point) => (
          <g key={point.main ? "main" : point.signal!.source}>
            {point.main && <circle className="origin-map-halo" cx={point.x} cy={point.y} r={dotRadius * 2.4} />}
            <circle
              className={point.main ? "origin-map-dot" : "origin-map-other"}
              cx={point.x} cy={point.y} r={dotRadius}
            />
            {/* Nummern nur, wenn es etwas zu unterscheiden gibt. */}
            {extras.length > 0 && (
              <text className="origin-map-number" x={point.x} y={point.y - dotRadius * 1.8} fontSize={dotRadius * 2.4}>
                {point.number}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption>
        {extras.length
          ? "Alle erhobenen Herkunftssignale. Jeder Punkt ist um bis zu 1 km zufällig verschoben – kleine Abstände sind Rauschen, große sind ein Widerspruch."
          : "Anonymisierte Herkunft, um bis zu 1 km zufällig verschoben."}
        {" "}Kartendaten &copy; OpenStreetMap-Mitwirkende, ODbL.
      </figcaption>
    </figure>
  );
}
