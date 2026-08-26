"use client";

import { repairCategories, repairCategoryLabel } from "@/lib/repair-catalog";
import { formatMinutes, type DashboardSnapshot } from "@/lib/dashboard";

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

export function CategoryBars({ categories }: { categories: Record<string, number> }) {
  const entries = repairCategories
    .map((item) => ({ value: item.value, label: item.label, total: categories[item.value] ?? 0 }))
    .sort((left, right) => right.total - left.total);
  const max = Math.max(...entries.map((entry) => entry.total), 1);

  return (
    <ol className="category-bars">
      {entries.map((entry, index) => (
        <li key={entry.value} style={{ animationDelay: `${index * 55}ms` }}>
          <span className="category-name">{repairCategoryLabel(entry.value)}</span>
          <span className="category-track">
            <i style={{ width: `${(entry.total / max) * 100}%`, background: categoryColor(entry.value) }} />
          </span>
          <span className="category-count">{entry.total.toLocaleString("de-DE")}</span>
        </li>
      ))}
    </ol>
  );
}

export function TimelineChart({ timeline }: { timeline: DashboardSnapshot["timeline"] }) {
  const max = Math.max(...timeline.map((day) => day.total), 1);

  return (
    <div className="timeline-strip" role="img" aria-label="Freigaben der letzten 30 Tage">
      {timeline.map((day, index) => (
        <span key={day.date} style={{ animationDelay: `${index * 22}ms` }}>
          <i style={{ height: `${Math.max((day.total / max) * 100, 2)}%` }} />
        </span>
      ))}
    </div>
  );
}

const performedByLabels: Record<string, string> = {
  alone: "allein",
  with_support: "mit Hilfe",
  by_someone: "für mich repariert",
};

export function MetricTiles({ snapshot }: { snapshot: DashboardSnapshot }) {
  const successRate = snapshot.total > 0 ? (snapshot.succeeded / snapshot.total) * 100 : 0;
  const performed = Object.entries(snapshot.performedBy).sort(([, left], [, right]) => right - left)[0];

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
      <li>
        <strong>{snapshot.withStory.toLocaleString("de-DE")}</strong>
        <span>erzählte Geschichten</span>
      </li>
      <li>
        <strong>{performed ? performedByLabels[performed[0]] ?? performed[0] : "–"}</strong>
        <span>häufigste Reparaturart</span>
      </li>
    </ul>
  );
}
