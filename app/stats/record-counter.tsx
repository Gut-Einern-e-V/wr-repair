"use client";

import { useEffect, useRef, useState } from "react";
import { changedDigitIndices, goalProgress } from "@/lib/dashboard";

/**
 * Grosser Live-Zaehler.
 *
 * Beim Wechsel zaehlt der Wert weich hoch. Jede Ziffer, die sich gegenueber
 * dem vorherigen Stand aendert, "explodiert" einmalig (CSS-Keyframe) und setzt
 * sich neu zusammen; unveraenderte Stellen bleiben ruhig stehen.
 */

const COUNT_UP_MS = 1_600;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function RecordCounter({ total, goal, reached }: { total: number; goal: number; reached: boolean }) {
  const [displayed, setDisplayed] = useState(total);
  const [exploding, setExploding] = useState<number[]>([]);
  const previousRef = useRef(total);

  useEffect(() => {
    const from = previousRef.current;
    if (from === total) return;

    setExploding(changedDigitIndices(from, total));
    previousRef.current = total;

    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      setDisplayed(Math.round(from + (total - from) * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
    });

    const timeout = window.setTimeout(() => setExploding([]), COUNT_UP_MS + 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [total]);

  const characters = displayed.toLocaleString("de-DE").split("");
  const percent = goalProgress(total, goal);

  // Trennzeichen zaehlen bei der Explosionsmarkierung nicht mit.
  let digitIndex = -1;

  return (
    <div className={`record-counter ${reached ? "is-reached" : ""}`}>
      <p className="panel-label">Freigegebene Reparaturen</p>
      <p className="counter-digits" aria-label={`${total.toLocaleString("de-DE")} freigegebene Reparaturen`} aria-live="polite">
        {characters.map((character, index) => {
          if (character !== ".") digitIndex += 1;
          const isExploding = character !== "." && exploding.includes(digitIndex);
          return (
            <span
              aria-hidden="true"
              className={`counter-digit ${character === "." ? "is-separator" : ""} ${isExploding ? "is-exploding" : ""}`}
              key={`${index}-${character}`}
            >
              {character}
            </span>
          );
        })}
      </p>
      <div className="counter-goal">
        <span>Ziel {goal.toLocaleString("de-DE")}</span>
        <span>{percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
      </div>
      <div className="counter-track" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div>
      {reached && <p className="counter-reached" role="status">Weltrekord-Ziel erreicht!</p>}
    </div>
  );
}
