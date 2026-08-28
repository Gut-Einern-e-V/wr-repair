"use client";

import { OUTLINE_SIZE, nrwOutlinePath } from "@/lib/nrw-outline-path";
import type { ModerationOrigin } from "@/lib/moderation";

/**
 * Wie weit ausserhalb des Landes ein Punkt noch mitgezeichnet wird, gemessen
 * in Kantenlaengen der Karte. Darueber hinaus schrumpft NRW zu einem Fleck und
 * die Karte sagt weniger als die Koordinaten daneben.
 */
const MAX_OUTSIDE = 1.5;

/**
 * Herkunft einer Einreichung auf der Landeskarte.
 *
 * Gezeigt wird die anonymisierte ~5-km-Zelle, nicht der Reparaturort - feiner
 * ist die Angabe auch in der Datenbank nicht. Fuer die Moderation reicht das
 * genau aus: Die Frage ist nicht "wo genau", sondern "passt die Gegend zu dem,
 * was die Einreichung behauptet".
 *
 * Liegt der Punkt ausserhalb des Landes, waechst der Ausschnitt mit, bis er
 * hineinpasst. Die Kontur rutscht dann in eine Ecke - was gewollt ist: Man
 * sieht auf einen Blick, dass und in welche Richtung der Punkt danebenliegt.
 */
export default function OriginMap({ origin }: { origin: ModerationOrigin }) {
  const x = origin.mapX * OUTLINE_SIZE;
  const y = origin.mapY * OUTLINE_SIZE;

  const tooFarOut =
    origin.mapX < -MAX_OUTSIDE || origin.mapX > 1 + MAX_OUTSIDE ||
    origin.mapY < -MAX_OUTSIDE || origin.mapY > 1 + MAX_OUTSIDE;

  if (tooFarOut) return null;

  // Rand, damit der Punkt am Kartenrand nicht halb abgeschnitten wird.
  const padding = OUTLINE_SIZE * 0.04;
  const minX = Math.min(0, x) - padding;
  const minY = Math.min(0, y) - padding;
  const maxX = Math.max(OUTLINE_SIZE, x) + padding;
  const maxY = Math.max(OUTLINE_SIZE, y) + padding;
  const span = Math.max(maxX - minX, maxY - minY);

  // Der Punkt soll auf jedem Ausschnitt gleich gross wirken, nicht mit dem
  // Zoom mitwachsen.
  const dotRadius = span * 0.022;

  return (
    <figure className={`origin-map${origin.outside ? " is-outside" : ""}`}>
      <svg viewBox={`${minX} ${minY} ${span} ${span}`} role="img" aria-label={`Herkunft der Einreichung: ${origin.kreis ?? "außerhalb des Landes"}`}>
        <path className="origin-map-outline" d={nrwOutlinePath} />
        <circle className="origin-map-halo" cx={x} cy={y} r={dotRadius * 2.4} />
        <circle className="origin-map-dot" cx={x} cy={y} r={dotRadius} />
      </svg>
      <figcaption>
        Anonymisierte Herkunftszelle, rund 5 km Kantenlänge. Kartendaten &copy; OpenStreetMap-Mitwirkende, ODbL.
      </figcaption>
    </figure>
  );
}
