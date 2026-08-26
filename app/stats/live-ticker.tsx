"use client";

import { formatRelativeTime, type DashboardHighlight } from "@/lib/dashboard";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { categoryColor } from "./panels";

/**
 * Laufband der zuletzt freigeschalteten Reparaturen.
 *
 * Der jeweils neueste Eintrag traegt eine Marke, damit auf der Buehne sichtbar
 * ist, dass gerade etwas dazugekommen ist. Die Liste wird so oft wiederholt,
 * dass das Band auch bei wenigen Eintraegen ohne Luecke laeuft: Die Animation
 * schiebt um genau die halbe Breite, also muss die zweite Haelfte der ersten
 * gleichen.
 */

/** Mindestzahl an Eintraegen pro Haelfte, damit keine Luecke entsteht. */
const MIN_ENTRIES = 14;

export function LiveTicker({ highlights, nowMs }: { highlights: DashboardHighlight[]; nowMs: number }) {
  if (highlights.length === 0) {
    return (
      <footer className="dashboard-ticker" aria-hidden="true">
        <div className="ticker-empty">
          <span>Die ersten Reparaturen erscheinen hier, sobald sie geprueft sind.</span>
        </div>
      </footer>
    );
  }

  const repeats = Math.ceil(MIN_ENTRIES / highlights.length);
  const half = Array.from({ length: repeats }, () => highlights).flat();

  // Bewusst aus dem Vorlesefluss genommen: Das Band wiederholt seinen Inhalt und
  // wuerde als Endlosliste vorgelesen. Die Zahlen stehen zugaenglich im Zaehler.
  return (
    <footer className="dashboard-ticker" aria-hidden="true">
      <div>
        {[...half, ...half].map((item, index) => {
          const relative = formatRelativeTime(item.approvedAt, nowMs);
          return (
            <span key={`${item.id}-${index}`}>
              <i style={{ background: categoryColor(item.category) }} />
              {index % half.length === 0 && <em>neu</em>}
              <b>{repairCategoryLabel(item.category)}</b>
              {item.brandModel ? <span className="ticker-model">{item.brandModel}</span> : null}
              {relative ? <time dateTime={item.approvedAt ?? undefined}>{relative}</time> : null}
            </span>
          );
        })}
      </div>
    </footer>
  );
}
