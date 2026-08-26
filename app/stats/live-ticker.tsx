"use client";

import { formatRelativeTime, recentHighlights, type DashboardHighlight } from "@/lib/dashboard";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { categoryColor } from "./panels";

/**
 * Laufband der Reparaturen der letzten 24 Stunden.
 *
 * Aelteres laeuft nicht mit: Ein Band, in dem "vor 39 Tagen" steht, ist kein
 * Live-Band. Der jeweils neueste Eintrag traegt eine Marke, damit auf der Buehne
 * sichtbar ist, dass gerade etwas dazugekommen ist.
 *
 * Die Liste wird so oft wiederholt, dass das Band auch bei wenigen Eintraegen
 * ohne Luecke laeuft: Die Animation schiebt um genau die halbe Breite, also muss
 * die zweite Haelfte der ersten gleichen.
 */

/** Mindestzahl an Eintraegen pro Haelfte, damit keine Luecke entsteht. */
const MIN_ENTRIES = 14;

export function LiveTicker({ highlights, nowMs }: { highlights: DashboardHighlight[]; nowMs: number }) {
  const recent = recentHighlights(highlights, nowMs);

  if (recent.length === 0) {
    return (
      <footer className="dashboard-ticker" aria-hidden="true">
        <div className="ticker-empty">
          <span>In den letzten 24 Stunden ist noch keine Reparatur dazugekommen.</span>
        </div>
      </footer>
    );
  }

  const repeats = Math.ceil(MIN_ENTRIES / recent.length);
  const half = Array.from({ length: repeats }, () => recent).flat();

  // Bewusst aus dem Vorlesefluss genommen: Das Band wiederholt seinen Inhalt und
  // wuerde als Endlosliste vorgelesen. Die Zahlen stehen zugaenglich im Zaehler.
  return (
    <footer className="dashboard-ticker" aria-hidden="true">
      <div>
        {[...half, ...half].map((item, index) => {
          // Einreichung, nicht Freigabe: Die Zeit soll sagen, wann repariert
          // wurde, nicht wann die Moderation den Beitrag abgearbeitet hat.
          const relative = formatRelativeTime(item.submittedAt, nowMs);
          return (
            <span key={`${item.id}-${index}`}>
              <i style={{ background: categoryColor(item.category) }} />
              {index % half.length === 0 && <em>neu</em>}
              <b>{repairCategoryLabel(item.category)}</b>
              {item.brandModel ? <span className="ticker-model">{item.brandModel}</span> : null}
              {relative ? <time dateTime={item.submittedAt ?? undefined}>{relative}</time> : null}
            </span>
          );
        })}
      </div>
    </footer>
  );
}
