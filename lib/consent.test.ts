import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  allAccepted,
  isAllowed,
  necessaryOnly,
  parseStoredConsent,
  serializeConsent,
} from "./consent";

describe("Voreinstellung", () => {
  it("laesst ohne Entscheidung nur das Notwendige laufen", () => {
    expect(necessaryOnly()).toEqual({ necessary: true, statistics: false });
    expect(isAllowed(null, "statistics")).toBe(false);
  });

  it("behandelt Notwendiges immer als erlaubt", () => {
    expect(isAllowed(null, "necessary")).toBe(true);
  });
});

describe("Speichern und Lesen", () => {
  it("liest eine gespeicherte Entscheidung unveraendert zurueck", () => {
    const decidedAt = "2026-10-01T09:30:00.000Z";
    const stored = parseStoredConsent(serializeConsent(allAccepted(), decidedAt));
    expect(stored).toEqual({ version: CONSENT_VERSION, decidedAt, choices: { necessary: true, statistics: true } });
    expect(isAllowed(stored, "statistics")).toBe(true);
  });

  it("haelt eine Ablehnung fest, statt sie als offen zu behandeln", () => {
    const stored = parseStoredConsent(serializeConsent(necessaryOnly(), "2026-10-01T09:30:00.000Z"));
    expect(stored).not.toBeNull();
    expect(isAllowed(stored, "statistics")).toBe(false);
  });

  it("laesst Notwendiges nicht abwaehlen", () => {
    const stored = parseStoredConsent(serializeConsent({ necessary: false, statistics: false }, "2026-10-01T09:30:00.000Z"));
    expect(stored?.choices.necessary).toBe(true);
  });
});

describe("Ungueltige Zustaende", () => {
  /* Alles, was nicht genau passt, muss als "noch nicht entschieden" gelten,
     damit im Zweifel gefragt wird und nichts ungefragt laeuft. */
  const invalid: Array<[string, string | null]> = [
    ["kein Eintrag", null],
    ["leerer Eintrag", ""],
    ["kaputtes JSON", "{nope"],
    ["kein Objekt", '"ja"'],
    ["null", "null"],
    ["fehlende Version", JSON.stringify({ decidedAt: "2026-10-01", choices: { necessary: true, statistics: true } })],
    ["alte Version", JSON.stringify({ version: CONSENT_VERSION - 1, decidedAt: "2026-10-01", choices: { necessary: true, statistics: true } })],
    ["fehlender Zeitpunkt", JSON.stringify({ version: CONSENT_VERSION, choices: { necessary: true, statistics: true } })],
    ["leerer Zeitpunkt", JSON.stringify({ version: CONSENT_VERSION, decidedAt: "", choices: { necessary: true, statistics: true } })],
    ["fehlende Kategorie", JSON.stringify({ version: CONSENT_VERSION, decidedAt: "2026-10-01", choices: { necessary: true } })],
    ["Kategorie kein Boolean", JSON.stringify({ version: CONSENT_VERSION, decidedAt: "2026-10-01", choices: { necessary: true, statistics: "ja" } })],
  ];

  for (const [label, raw] of invalid) {
    it(`fragt erneut bei: ${label}`, () => {
      expect(parseStoredConsent(raw)).toBeNull();
    });
  }
});
