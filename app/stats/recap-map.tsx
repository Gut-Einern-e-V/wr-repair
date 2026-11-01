"use client";

import { useMemo, useRef, useState } from "react";
import { nrwKreise, projectToUnitSquare } from "@/lib/nrw-map";

/**
 * NRW nach Kreisen eingefaerbt, daneben die Rangliste - fuer den Rueckblick.
 *
 * Nur Summen je Kreis, keine Punkte. Die Farbstufe folgt dem Logarithmus:
 * Wuppertal allein haette sonst alle anderen Kreise auf dieselbe blasse Farbe
 * gedrueckt. Karte und Liste teilen sich den hervorgehobenen Kreis: Wer auf
 * eine Zeile zeigt, sieht den Kreis auf der Karte, und umgekehrt.
 */

const SIZE = 1000;

/** So viele Kreise stehen in der Liste - etwa so hoch wie die Karte. */
const LIST_LENGTH = 20;

const kreisPaths = nrwKreise.map((kreis) => {
  const points = kreis.outline.map(projectToUnitSquare);
  const xs = points.map((point) => point.x * SIZE);
  const ys = points.map((point) => point.y * SIZE);
  return {
    name: kreis.name,
    d: `M${points.map((point) => `${(point.x * SIZE).toFixed(1)},${(point.y * SIZE).toFixed(1)}`).join("L")}Z`,
    box: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
  };
});

/* Die Karte ist nicht quadratisch; der Rahmen schneidet den leeren Rand ab. */
const bounds = kreisPaths.reduce(
  (box, kreis) => ({
    minX: Math.min(box.minX, kreis.box.minX),
    maxX: Math.max(box.maxX, kreis.box.maxX),
    minY: Math.min(box.minY, kreis.box.minY),
    maxY: Math.max(box.maxY, kreis.box.maxY),
  }),
  { minX: SIZE, maxX: 0, minY: SIZE, maxY: 0 },
);
const PAD = 8;
const viewWidth = bounds.maxX - bounds.minX + PAD * 2;
const viewHeight = bounds.maxY - bounds.minY + PAD * 2;
const viewBox = `${bounds.minX - PAD} ${bounds.minY - PAD} ${viewWidth} ${viewHeight}`;

/** Oberkante und Mitte eines Kreises in Prozent der Karte - fuer die Karte aus der Liste heraus. */
function anchorOf(name: string) {
  const kreis = kreisPaths.find((item) => item.name === name);
  if (!kreis) return null;
  return {
    x: (((kreis.box.minX + kreis.box.maxX) / 2 - bounds.minX + PAD) / viewWidth) * 100,
    y: ((kreis.box.minY - bounds.minY + PAD) / viewHeight) * 100,
  };
}

function shade(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  return 0.18 + 0.82 * (Math.log1p(value) / Math.log1p(max));
}

export function RecapPlaces({ kreise }: { kreise: Record<string, number> }) {
  const [active, setActive] = useState<string | null>(null);
  /* Zeigt die Maus auf die Karte, folgt die Karte ihr; kommt der Kreis aus der
     Liste, steht sie ueber dem Kreis. Angaben in Prozent der Kartenflaeche. */
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const ranking = useMemo(() => Object.entries(kreise).sort(([, left], [, right]) => right - left), [kreise]);
  const max = ranking[0]?.[1] ?? 0;
  const rankOf = useMemo(() => new Map(ranking.map(([name], index) => [name, index + 1])), [ranking]);
  const legend = useMemo(() => {
    if (max <= 0) return [];
    // Drei Stufen auf runden Werten zwischen 1 und dem Hoechstwert.
    const middle = Math.round(Math.sqrt(max));
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(middle)));
    return [1, Math.max(1, Math.round(middle / magnitude) * magnitude), max];
  }, [max]);

  const activeTotal = active ? kreise[active] ?? 0 : 0;
  const anchor = active ? pointer ?? anchorOf(active) : null;

  function track(event: React.PointerEvent) {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return;
    setPointer({ x: ((event.clientX - frame.left) / frame.width) * 100, y: ((event.clientY - frame.top) / frame.height) * 100 });
  }

  return (
    <div className="recap-places-body">
      <figure className="recap-map">
        <div className="recap-map-frame" ref={frameRef} onPointerMove={track} onPointerLeave={() => { setActive(null); setPointer(null); }}>
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
                />
              );
            })}
          </svg>
          {active && anchor && (
            <div
              className={`recap-map-card${anchor.x > 60 ? " is-left" : ""}${anchor.y < 22 ? " is-below" : ""}`}
              style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
              aria-hidden="true"
            >
              <span className="recap-map-card-name">{active}</span>
              <strong>{activeTotal.toLocaleString("de-DE")}</strong>
              <span className="recap-map-card-meta">
                {activeTotal > 0
                  ? <>Reparaturen &middot; Platz {rankOf.get(active)?.toLocaleString("de-DE")} von {ranking.length.toLocaleString("de-DE")}</>
                  : "noch keine Reparatur gezählt"}
              </span>
            </div>
          )}
        </div>
        <figcaption>
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

      <div>
        <ol className="recap-ranking is-places">
          {ranking.slice(0, LIST_LENGTH).map(([kreis, amount], index) => (
            <li
              key={kreis}
              className={active === kreis ? "is-active" : undefined}
              onPointerEnter={() => { setPointer(null); setActive(kreis); }}
              onPointerLeave={() => setActive((current) => (current === kreis ? null : current))}
            >
              <span className="recap-ranking-rank">{index + 1}</span>
              <span className="recap-ranking-label">{kreis}</span>
              <span className="recap-ranking-track" aria-hidden="true">
                <span style={{ width: `${(amount / (max || 1)) * 100}%` }} />
              </span>
              <strong>{amount.toLocaleString("de-DE")}</strong>
            </li>
          ))}
        </ol>
        {ranking.length > LIST_LENGTH && (
          <p className="recap-more">und {(ranking.length - LIST_LENGTH).toLocaleString("de-DE")} weitere</p>
        )}
      </div>
    </div>
  );
}
