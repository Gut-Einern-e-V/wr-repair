"use client";

import { useEffect, useRef, useState } from "react";
import { formatRelativeTime, isFreshlyApproved, recentHighlights, type DashboardHighlight } from "@/lib/dashboard";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { categoryColor } from "./panels";

/**
 * Laufband der Reparaturen der letzten 24 Stunden.
 *
 * Aelteres laeuft nicht mit: Ein Band, in dem "vor 39 Tagen" steht, ist kein
 * Live-Band. Gemessen wird am Einreichungszeitpunkt - die Zeit soll sagen, wann
 * repariert wurde, nicht wann die Moderation fertig war.
 *
 * Gelaufen wird nur, wenn der Inhalt breiter ist als das Band. Bei zwei
 * Eintraegen fuenfmal dieselbe Reparatur vorbeizuschieben sieht nach Betrieb
 * aus, wo keiner ist; dann stehen sie einfach da.
 */

/** Sekunden, die ein Eintrag fuer die Breite des Bandes braucht. */
const SECONDS_PER_SCREEN = 26;

export function LiveTicker({ highlights, nowMs }: { highlights: DashboardHighlight[]; nowMs: number }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(0);

  const recent = recentHighlights(highlights, nowMs);

  // Ueberlaenge messen, statt sie aus der Zahl der Eintraege zu raten: Wie viel
  // Platz eine Reparatur braucht, haengt an Marke, Ort und Bildschirmbreite.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const parent = track.parentElement;
      if (!parent) return;
      setOverflow(Math.max(0, track.scrollWidth - parent.clientWidth));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    if (track.parentElement) observer.observe(track.parentElement);
    return () => observer.disconnect();
  }, [recent.length, nowMs]);

  if (recent.length === 0) {
    return (
      <footer className="dashboard-ticker" aria-hidden="true">
        <div className="ticker-empty">
          <span>In den letzten 24 Stunden ist noch keine Reparatur dazugekommen.</span>
        </div>
      </footer>
    );
  }

  const scrolls = overflow > 0;

  // Bewusst aus dem Vorlesefluss genommen: Das Band wiederholt seinen Inhalt und
  // wuerde als Endlosliste vorgelesen. Die Zahlen stehen zugaenglich im Zaehler.
  return (
    <footer className={`dashboard-ticker ${scrolls ? "is-scrolling" : ""}`} aria-hidden="true">
      <div
        className="ticker-track"
        ref={trackRef}
        style={scrolls ? { animationDuration: `${Math.round((overflow / 900) * SECONDS_PER_SCREEN) + SECONDS_PER_SCREEN}s`, ["--ticker-shift" as string]: `-${overflow}px` } : undefined}
      >
        {recent.map((item) => {
          const relative = formatRelativeTime(item.submittedAt, nowMs);
          return (
            <span key={item.id}>
              <i style={{ background: categoryColor(item.category) }} />
              {/* Frisch freigegeben heisst: gerade hier aufgetaucht. Das haengt
                  an der Freigabe, nicht daran, wann repariert wurde. */}
              {isFreshlyApproved(item.approvedAt, nowMs) && <em>neu</em>}
              <b>{item.brandModel ?? repairCategoryLabel(item.category)}</b>
              {item.kreis && <span className="ticker-meta">{item.kreis}</span>}
              {relative && <time className="ticker-meta" dateTime={item.submittedAt ?? undefined}>{relative}</time>}
            </span>
          );
        })}
      </div>
    </footer>
  );
}
