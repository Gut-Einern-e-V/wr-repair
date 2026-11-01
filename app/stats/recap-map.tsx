"use client";

import { useMemo, useState } from "react";
import { nrwKreise, projectToUnitSquare } from "@/lib/nrw-map";

/**
 * NRW nach Kreisen eingefaerbt, fuer den Rueckblick.
 *
 * Nur Summen je Kreis, wie in der Rangliste daneben - keine Punkte. Die
 * Farbstufe folgt dem Logarithmus: Wuppertal allein haette sonst alle anderen
 * Kreise auf dieselbe blasse Farbe gedrueckt.
 */

const SIZE = 1000;

const kreisPaths = nrwKreise.map((kreis) => ({
  name: kreis.name,
  d: `M${kreis.outline.map((point) => {
    const { x, y } = projectToUnitSquare(point);
    return `${(x * SIZE).toFixed(1)},${(y * SIZE).toFixed(1)}`;
  }).join("L")}Z`,
}));

/* Die Karte ist breiter als hoch; der Rahmen schneidet den leeren Rand ab. */
const bounds = kreisPaths.reduce(
  (box, kreis) => {
    for (const match of kreis.d.matchAll(/([\d.]+),([\d.]+)/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
    return box;
  },
  { minX: SIZE, maxX: 0, minY: SIZE, maxY: 0 },
);
const viewBox = `${bounds.minX - 8} ${bounds.minY - 8} ${bounds.maxX - bounds.minX + 16} ${bounds.maxY - bounds.minY + 16}`;

function shade(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  return 0.18 + 0.82 * (Math.log1p(value) / Math.log1p(max));
}

export function RecapMap({ kreise }: { kreise: Record<string, number> }) {
  const [active, setActive] = useState<string | null>(null);
  const max = useMemo(() => Math.max(0, ...Object.values(kreise)), [kreise]);
  const legend = useMemo(() => {
    if (max <= 0) return [];
    // Drei Stufen auf runden Werten zwischen 1 und dem Hoechstwert.
    const middle = Math.round(Math.sqrt(max));
    const round = (value: number) => {
      const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(value)));
      return Math.max(1, Math.round(value / magnitude) * magnitude);
    };
    return [1, round(middle), max];
  }, [max]);

  const activeTotal = active ? kreise[active] ?? 0 : null;

  return (
    <figure className="recap-map">
      <svg viewBox={viewBox} role="img" aria-label="Karte von Nordrhein-Westfalen, Kreise nach Zahl der Reparaturen eingefärbt">
        {kreisPaths.map((kreis) => {
          const total = kreise[kreis.name] ?? 0;
          return (
            <path
              key={kreis.name}
              d={kreis.d}
              className={[total > 0 ? "" : "is-empty", active === kreis.name ? "is-active" : ""].filter(Boolean).join(" ") || undefined}
              style={{ fillOpacity: shade(total, max) }}
              onPointerEnter={() => setActive(kreis.name)}
              onPointerLeave={() => setActive((current) => (current === kreis.name ? null : current))}
            >
              <title>{`${kreis.name}: ${total.toLocaleString("de-DE")}`}</title>
            </path>
          );
        })}
      </svg>
      <figcaption>
        <p className="recap-map-active" aria-live="polite">
          {active
            ? <><strong>{active}</strong> {activeTotal?.toLocaleString("de-DE")} Reparaturen</>
            : "Auf einen Kreis tippen oder zeigen für die Zahl."}
        </p>
        {legend.length > 0 && (
          <p className="recap-map-legend" aria-hidden="true">
            {legend.map((value) => (
              <span key={value}><i style={{ opacity: shade(value, max) }} />{value.toLocaleString("de-DE")}</span>
            ))}
          </p>
        )}
        <p className="recap-map-credit">Kartendaten © OpenStreetMap-Mitwirkende</p>
      </figcaption>
    </figure>
  );
}
