"use client";

import { useEffect, useRef } from "react";

/**
 * Anzeige-Einstellungen der Buehne, hinter einem Zahnrad.
 *
 * Auf der Projektion soll nichts von den Zahlen ablenken, also steht hier nur
 * ein kleines Symbol. Aufgeklappt wird es ueber `<details>` - das braucht keinen
 * eigenen Zustand. Nur das Zuklappen beim Klick daneben ist ergaenzt, damit das
 * Menue nicht versehentlich offen auf der Wand stehen bleibt.
 */

type Props = {
  showSpotlight: boolean;
  onToggleSpotlight: () => void;
  beamer: boolean;
  onToggleBeamer: () => void;
};

export function StageSettings({ showSpotlight, onToggleSpotlight, beamer, onToggleBeamer }: Props) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") details.open = false;
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details className="stage-settings" ref={detailsRef}>
      <summary aria-label="Anzeige-Einstellungen" title="Anzeige-Einstellungen">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
        </svg>
      </summary>
      <div className="stage-settings-panel">
        <button type="button" onClick={onToggleSpotlight} aria-pressed={showSpotlight}>
          <span>Einzelbilder</span>
          <b>{showSpotlight ? "an" : "aus"}</b>
        </button>
        <button type="button" onClick={onToggleBeamer} aria-pressed={beamer}>
          <span>Beamer-Modus</span>
          <b>{beamer ? "an" : "aus"}</b>
        </button>
        <p>
          Beamer-Modus setzt den Hintergrund auf reines Schwarz. Ein DLP-Projektor
          laesst dort das Licht ganz aus - das ergibt den hoechsten Kontrast.
        </p>
        <p className="stage-settings-keys">
          <kbd>F</kbd> Vollbild · <kbd>B</kbd> Einzelbilder · <kbd>Esc</kbd> zurueck
        </p>
      </div>
    </details>
  );
}
