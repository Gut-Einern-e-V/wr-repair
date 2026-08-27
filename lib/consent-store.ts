"use client";

import { useSyncExternalStore } from "react";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  parseStoredConsent,
  serializeConsent,
  type ConsentCategory,
  type ConsentChoices,
  type StoredConsent,
} from "./consent";

/* Die Entscheidung liegt im localStorage der Besucherin, nicht in einem Cookie:
   Sie wird nur im Browser gebraucht und muss nicht bei jeder Anfrage mitgesendet
   werden. Der Zugriff ist gekapselt, weil er im privaten Modus oder bei
   blockiertem Speicher wirft. */

const CONSENT_EVENT = "reparaturrekord:consent";

/**
 * `status: "unknown"` gilt auf dem Server und waehrend des Hydrierens - dort ist
 * localStorage nicht lesbar. Erst danach steht fest, ob eine Entscheidung
 * vorliegt. Ohne diese Unterscheidung wuerde der Banner fuer einen Frame auch
 * denen gezeigt, die schon entschieden haben.
 */
export type ConsentSnapshot =
  | { status: "unknown" }
  | { status: "ready"; consent: StoredConsent | null };

const UNKNOWN: ConsentSnapshot = { status: "unknown" };

let snapshot: ConsentSnapshot = UNKNOWN;

function readStorage(): StoredConsent | null {
  try {
    return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/* Die Referenz muss zwischen Aufrufen stabil bleiben, sonst rendert
   useSyncExternalStore endlos. Deshalb wird nur bei Aenderungen neu gebaut. */
function getSnapshot(): ConsentSnapshot {
  if (snapshot.status === "unknown") snapshot = { status: "ready", consent: readStorage() };
  return snapshot;
}

function getServerSnapshot(): ConsentSnapshot {
  return UNKNOWN;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  // Andere Tabs derselben Domain aendern die Entscheidung ebenfalls.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveConsent(choices: ConsentChoices, decidedAt = new Date().toISOString()) {
  const stored: StoredConsent = { version: CONSENT_VERSION, decidedAt, choices: { ...choices, necessary: true } };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choices, decidedAt));
    snapshot = UNKNOWN;
  } catch {
    /* Kein Speicher verfuegbar (privater Modus, blockierte Website-Daten): Die
       Entscheidung gilt dann nur fuer diese Sitzung, statt den Banner in einer
       Schleife wieder aufzuklappen. */
    snapshot = { status: "ready", consent: stored };
  }

  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function useConsentSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useConsentFor(category: ConsentCategory) {
  const current = useConsentSnapshot();
  if (category === "necessary") return true;
  return current.status === "ready" && current.consent?.choices[category] === true;
}
