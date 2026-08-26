"use client";

import { goalLaps, goalOverflow, goalPercent, goalProgress } from "@/lib/dashboard";
import { CounterCloud } from "./counter-cloud";

/**
 * Grosser Live-Zaehler.
 *
 * Die Zahl selbst zeichnet `CounterCloud` als Punktwolke auf eine Canvas. Hier
 * bleiben der Rahmen - Beschriftung, Ziel, Fortschritt - und die zugaengliche
 * Textfassung, denn eine Canvas ist fuer Screenreader nicht lesbar.
 *
 * Zwei Besonderheiten:
 *
 * - Der Zaehler laesst sich ins Vollbild schalten. Auf einer Buehne ist das der
 *   Moment, in dem nur die Zahl zaehlt.
 * - Das Ziel ist keine Obergrenze. Ist es erreicht, laeuft ein zweiter Balken
 *   fuer den Ueberschuss an und die Prozentangabe zaehlt ueber 100 hinaus.
 */

type Props = {
  total: number;
  goal: number;
  /** Laeuft nach dem Erreichen einer Zielrunde; loest die Feier-Animation aus. */
  celebrating: boolean;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
};

export function RecordCounter({ total, goal, celebrating, fullscreen, onToggleFullscreen }: Props) {
  const laps = goalLaps(total, goal);
  const reached = laps >= 1;
  const percent = goalPercent(total, goal);
  const overflow = goalOverflow(total, goal);

  return (
    <div className={`record-counter ${reached ? "is-reached" : ""} ${fullscreen ? "is-fullscreen" : ""} ${celebrating ? "is-celebrating" : ""}`}>
      <p className="panel-label">Reparaturen in Nordrhein-Westfalen</p>

      {/* Die Bedienung steht nicht auf der Buehne: Auf einer Projektion soll nur
          die Zahl zu sehen sein. Der Hinweis lebt im title-Attribut. */}
      <button
        className="counter-cloud"
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "Vollbild des Zaehlers verlassen" : "Zaehler im Vollbild zeigen"}
        aria-pressed={fullscreen}
        title={fullscreen ? "Vollbild verlassen (Esc)" : "Zaehler im Vollbild zeigen (F)"}
      >
        <CounterCloud celebrating={celebrating} fullscreen={fullscreen} reached={reached} value={total} />
        <span className="counter-readout" aria-live="polite">{total.toLocaleString("de-DE")} Reparaturen</span>
      </button>

      <div className="counter-goal">
        <span>{reached ? `Ziel ${laps > 1 ? `${laps}× ` : ""}erreicht` : `Ziel ${goal.toLocaleString("de-DE")}`}</span>
        <span>{percent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %</span>
      </div>

      <div className="counter-track" aria-hidden="true">
        <i style={{ width: `${goalProgress(total, goal)}%` }} />
      </div>
      {/* Zweite Runde: erscheint erst, wenn das Ziel wirklich ueberschritten ist. */}
      {overflow > 0 && (
        <div className="counter-track is-overflow" aria-hidden="true">
          <i style={{ width: `${overflow}%` }} />
        </div>
      )}

      {reached && <p className="counter-reached" role="status">Weltrekord-Ziel erreicht!</p>}
    </div>
  );
}
