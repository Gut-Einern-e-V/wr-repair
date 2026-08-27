"use client";

import { CONSENT_OPEN_EVENT } from "@/components/consent-banner";

/* Eine Einwilligung muss so einfach widerrufbar sein, wie sie erteilt wurde -
   deshalb steht dieser Link im Footer jeder Seite. */
export function ConsentSettingsLink() {
  return <button
    className="consent-settings-link"
    type="button"
    onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
  >
    Cookie-Einstellungen
  </button>;
}
