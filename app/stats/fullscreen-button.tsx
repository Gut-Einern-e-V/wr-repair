"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Vollbild der Buehne, echtes Browser-Vollbild (Issue #62).
 *
 * Nicht zu verwechseln mit dem Vollbild des Zaehlers (Taste F): Das ist eine
 * Anordnung innerhalb der Seite. Hier geht es um die Browserleiste. Auf einem
 * iPad oder einem Laptop im Repair-Cafe soll ein Druck genuegen, damit nur noch
 * die Buehne zu sehen ist - das Vollbild des Fenstersystems (macOS, gruener
 * Knopf) laesst die Adressleiste stehen, die Fullscreen-API nicht.
 *
 * Safari kennt die API bis heute nur unter dem eigenen Praefix, also beide
 * Namen. Kann ein Browser gar kein Vollbild - Safari auf dem iPhone -, bleibt
 * die Schaltflaeche weg: Ein Knopf, der nichts tut, ist auf einer Buehne
 * schlimmer als keiner.
 */

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function activeElement(): Element | null {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Beide Ereignisnamen: Auch Escape und das Verlassen ueber das System laufen
 * hier durch, sonst zeigte das Symbol den falschen Zustand.
 */
function subscribe(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

/** Die Unterstuetzung wechselt nicht, es gibt also nichts zu abonnieren. */
function never() {
  return () => {};
}

function isSupported() {
  const root = document.documentElement as FullscreenRoot;
  return typeof root.requestFullscreen === "function" || typeof root.webkitRequestFullscreen === "function";
}

/** Ein abgelehntes Vollbild ist kein Grund, die Anzeige zu stoeren. */
function run(action: (() => Promise<void> | void) | undefined) {
  try {
    void Promise.resolve(action?.()).catch(() => {});
  } catch {
    // Aeltere Safari-Fassungen werfen synchron, statt abzulehnen.
  }
}

export function FullscreenButton() {
  // Auf dem Server ist beides falsch: Dort gibt es weder ein Dokument noch ein
  // Vollbild, und das Markup muss zu dem des Browsers passen.
  const supported = useSyncExternalStore(never, isSupported, () => false);
  const active = useSyncExternalStore(subscribe, () => activeElement() !== null, () => false);

  const toggle = useCallback(() => {
    const doc = document as FullscreenDocument;
    if (activeElement()) {
      run(doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc));
      return;
    }

    // Das Wurzelelement und nicht die Buehne selbst: So bleibt der Rahmen
    // derselbe, egal welches Panel gerade gross ist.
    const root = document.documentElement as FullscreenRoot;
    run(root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root));
  }, []);

  if (!supported) return null;

  return (
    <button
      aria-label={active ? "Vollbild verlassen" : "Vollbild"}
      aria-pressed={active}
      className="stage-fullscreen"
      onClick={toggle}
      title={active ? "Vollbild verlassen" : "Vollbild"}
      type="button"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {active
          ? <path d="M9 4v5H4M15 4v5h5M15 20v-5h5M9 20v-5H4" />
          : <path d="M4 9V4h5M20 9V4h-5M20 15v5h-5M4 15v5h5" />}
      </svg>
    </button>
  );
}
