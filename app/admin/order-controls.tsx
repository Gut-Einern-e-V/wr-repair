"use client";

/**
 * Zwei Pfeile, die einen Eintrag eine Position verschieben (Issue #98).
 *
 * Zweimal derselbe Handgriff im Backend - Unterstuetzer und Preise -, deshalb
 * ein Bauteil. Echte Knoepfe und kein Ziehen mit der Maus: Das laesst sich mit
 * der Tastatur bedienen und sagt einer Vorleseanwendung, was passiert.
 */
export default function OrderControls({
  label,
  isFirst,
  isLast,
  isBusy,
  onMove,
}: {
  /** Wovon die Rede ist, fuer die Beschriftung der Knoepfe: "Werkzeugkiste nach oben". */
  label: string;
  isFirst: boolean;
  isLast: boolean;
  isBusy: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <span className="order-controls">
      <button type="button" aria-label={`${label} nach oben`} title="Nach oben" disabled={isBusy || isFirst} onClick={() => onMove("up")}>
        <span aria-hidden="true">&#8593;</span>
      </button>
      <button type="button" aria-label={`${label} nach unten`} title="Nach unten" disabled={isBusy || isLast} onClick={() => onMove("down")}>
        <span aria-hidden="true">&#8595;</span>
      </button>
    </span>
  );
}
