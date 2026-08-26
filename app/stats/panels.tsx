"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import { formatMinutes, type DashboardSnapshot } from "@/lib/dashboard";
import { type KreisRank } from "@/lib/nrw-map";
import { treemap } from "@/lib/treemap";

/** Feste Farbzuordnung, damit eine Kategorie ihre Farbe nie wechselt. */
const categoryColors: Record<string, string> = {
  computers_and_phones: "#465eab",
  bicycle: "#00b072",
  household_appliances: "#ffc432",
  furniture: "#ec424c",
  textiles: "#95d4bb",
  tools: "#f4bd4c",
  toys: "#8f6fd0",
  jewelry_glasses: "#e07ba8",
  watches: "#4fb8c9",
  photo_video_car: "#c2202b",
  sharpening: "#b4e0cc",
  other: "#8b93a7",
};

export function categoryColor(category: string) {
  return categoryColors[category] ?? "#8b93a7";
}

/**
 * Kategorien als Flaechenaufteilung.
 *
 * Vorher zwoelf Balken, von denen die meisten auf null standen - viel Zeile, wenig
 * Aussage. Die Flaeche einer Kachel ist der Anteil der Kategorie, leere Kategorien
 * entfallen, und aus zehn Metern erkennt man die groesste sofort.
 *
 * Das Seitenverhaeltnis der Kacheln haengt an dem der Flaeche, also wird sie
 * gemessen. Vor der ersten Messung liegen die Namen als Liste vor - ohne
 * Zwischenzustand mit falschen Proportionen.
 */
export function CategoryTreemap({ categories }: { categories: Record<string, number> }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const inputs = useMemo(
    () => repairCategories.map((item) => ({ key: item.value, value: categories[item.value] ?? 0 })),
    [categories],
  );
  const rects = useMemo(() => treemap(inputs, box.width, box.height), [inputs, box.width, box.height]);
  const total = inputs.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="category-map" ref={boxRef}>
      {rects.length === 0 && total === 0 && (
        <p className="category-map-empty">Die ersten Reparaturen erscheinen hier, sobald sie geprueft sind.</p>
      )}
      {rects.map((rect) => {
        // Beschriftung nur, wo sie hineinpasst - sonst bleibt die Farbflaeche
        // fuer sich, und die Zahl steht im Laufband und in der Sprechblase.
        const showLabel = rect.width > 74 && rect.height > 34;
        const showCount = rect.width > 44 && rect.height > 22;
        return (
          <div
            className="category-tile"
            key={rect.key}
            // Die Kategoriefarbe kommt nur als Variable herein. Gemischt wird sie
            // im Stylesheet, damit die Flaeche gedeckt und ruhig bleibt und die
            // volle Farbe allein in der Akzentkante steckt.
            style={{
              left: `${(rect.x / box.width) * 100}%`,
              top: `${(rect.y / box.height) * 100}%`,
              width: `${(rect.width / box.width) * 100}%`,
              height: `${(rect.height / box.height) * 100}%`,
              ["--tile" as string]: categoryColor(rect.key),
            }}
            title={`${repairCategoryLabel(rect.key)}: ${rect.value.toLocaleString("de-DE")}`}
          >
            {showLabel && <span className="category-tile-name">{repairCategoryLabel(rect.key)}</span>}
            {showCount && <strong className="category-tile-count">{rect.value.toLocaleString("de-DE")}</strong>}
          </div>
        );
      })}
    </div>
  );
}

export function TimelineChart({ timeline }: { timeline: DashboardSnapshot["timeline"] }) {
  const max = Math.max(...timeline.map((day) => day.total), 1);

  return (
    <div className="timeline-strip" role="img" aria-label="Reparaturen der letzten 30 Tage">
      {timeline.map((day, index) => (
        <span key={day.date} style={{ animationDelay: `${index * 22}ms` }}>
          <i style={{ height: `${Math.max((day.total / max) * 100, 2)}%` }} />
        </span>
      ))}
    </div>
  );
}

/**
 * Rangliste der aktivsten Kreise.
 *
 * Der Zuwachs bezieht sich auf den Start dieser Anzeige - eine Zeitreihe je
 * Kreis liefert das Aggregat nicht (siehe `rankKreise`). Ohne Zuwachs bleibt die
 * Spalte leer, statt eine Null hinzuschreiben, die wie ein Stillstand aussieht.
 */
/** Ab dieser Laenge wandert die Liste; darunter passt sie ohnehin ins Panel. */
const KREIS_SCROLL_FROM = 8;
/** Sekunden je Zeile fuer eine Richtung - langsam genug zum Mitlesen. */
const KREIS_SECONDS_PER_ROW = 1.9;

export function KreisTop({ ranking }: { ranking: KreisRank[] }) {
  if (ranking.length === 0) {
    return <p className="kreis-top-empty">Sobald genug Reparaturen je Ort zusammenkommen, erscheint hier die Rangliste.</p>;
  }

  const max = Math.max(...ranking.map((entry) => entry.total), 1);
  // Die Liste faehrt hinunter und wieder hinauf (CSS: `alternate`). Anders als
  // ein Endlosband braucht das keine zweite Kopie der Eintraege, und der erste
  // Platz bleibt regelmaessig zu sehen statt einmal pro Runde vorbeizuziehen.
  const sweeps = ranking.length >= KREIS_SCROLL_FROM;

  return (
    <div className={`kreis-top-viewport ${sweeps ? "is-sweeping" : ""}`}>
      <ol
        className="kreis-top"
        style={sweeps ? { animationDuration: `${(ranking.length * KREIS_SECONDS_PER_ROW).toFixed(0)}s` } : undefined}
      >
        {ranking.map((entry, index) => (
          <li key={entry.name}>
            <span className="kreis-top-rank" aria-hidden="true">{index + 1}</span>
            <span className="kreis-top-name">{entry.name}</span>
            <span className="kreis-top-track"><i style={{ width: `${(entry.total / max) * 100}%` }} /></span>
            <span className="kreis-top-total">{entry.total.toLocaleString("de-DE")}</span>
            <span className="kreis-top-delta">{entry.delta > 0 ? `+${entry.delta.toLocaleString("de-DE")}` : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Kennzahlen neben dem Zaehler.
 *
 * Bewusst nur drei: Erfolgsquote, Zeit und Warenwert. "Erzaehlte Geschichten"
 * und "haeufigste Reparaturart" standen daneben, ohne auf einer Buehne etwas
 * beizutragen - die Felder kommen weiter mit dem Aggregat, werden hier aber
 * nicht gezeigt.
 */
export function MetricTiles({ snapshot }: { snapshot: DashboardSnapshot }) {
  const successRate = snapshot.total > 0 ? (snapshot.succeeded / snapshot.total) * 100 : 0;

  return (
    <ul className="metric-tiles">
      <li>
        <strong>{successRate.toLocaleString("de-DE", { maximumFractionDigits: 0 })} %</strong>
        <span>erfolgreich repariert</span>
      </li>
      <li>
        <strong>{formatMinutes(snapshot.minutesSaved)}</strong>
        <span>investierte Schrauberzeit</span>
      </li>
      <li>
        <strong>{Math.round(snapshot.valueSavedEuros).toLocaleString("de-DE")} €</strong>
        <span>Warenwert gerettet</span>
      </li>
    </ul>
  );
}
