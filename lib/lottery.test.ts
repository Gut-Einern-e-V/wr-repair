import { describe, expect, it } from "vitest";
import {
  eligibleEntries,
  isExcludedAddress,
  matchesExclusion,
  normalizeEmail,
  openSlots,
  pickEntries,
  pickEntry,
  type LotteryEntry,
} from "./lottery";

function entry(overrides: Partial<LotteryEntry> & { id: string; email: string }): LotteryEntry {
  return {
    repairId: `repair-${overrides.id}`,
    name: "Testperson",
    winner: false,
    excluded: false,
    approved: true,
    ...overrides,
  };
}

describe("Verlosung: wer teilnimmt", () => {
  it("laesst nur Anmeldungen zu freigegebenen Reparaturen zu", () => {
    const entries = [
      entry({ id: "a", email: "a@example.org" }),
      entry({ id: "b", email: "b@example.org", approved: false }),
    ];

    expect(eligibleEntries(entries).map((item) => item.id)).toEqual(["a"]);
  });

  it("zaehlt jede Einreichung als eigenes Los", () => {
    const entries = [
      entry({ id: "a1", email: "a@example.org" }),
      entry({ id: "a2", email: "a@example.org" }),
      entry({ id: "b", email: "b@example.org" }),
    ];

    expect(eligibleEntries(entries)).toHaveLength(3);
  });

  it("nimmt alle weiteren Lose einer Person aus dem Topf, sobald sie gewonnen hat", () => {
    const entries = [
      entry({ id: "a1", email: "Anna@Example.org", winner: true }),
      entry({ id: "a2", email: "anna@example.org " }),
      entry({ id: "b", email: "b@example.org" }),
    ];

    expect(eligibleEntries(entries).map((item) => item.id)).toEqual(["b"]);
  });

  it("uebergeht einzeln ausgeschlossene Lose", () => {
    const entries = [entry({ id: "a", email: "a@example.org", excluded: true }), entry({ id: "b", email: "b@example.org" })];
    expect(eligibleEntries(entries).map((item) => item.id)).toEqual(["b"]);
  });

  it("schliesst das Projektteam ueber die Ausschlussliste aus", () => {
    const entries = [
      entry({ id: "team", email: "moderation@gut-einern.org" }),
      entry({ id: "extern", email: "jemand@example.org" }),
    ];

    expect(eligibleEntries(entries, ["@gut-einern.org"]).map((item) => item.id)).toEqual(["extern"]);
  });
});

describe("Verlosung: Ausschlussliste", () => {
  it("vergleicht ganze Adressen unabhaengig von der Schreibweise", () => {
    expect(matchesExclusion(" Anna@Example.org ", "anna@example.org")).toBe(true);
    expect(matchesExclusion("anna@example.org", "anne@example.org")).toBe(false);
  });

  it("nimmt mit einem fuehrenden @ ein ganzes Haus aus", () => {
    expect(matchesExclusion("wer@example.org", "@example.org")).toBe(true);
    expect(matchesExclusion("wer@anderswo.org", "@example.org")).toBe(false);
  });

  it("verwechselt eine Domain nicht mit einer Adresse, die darauf endet", () => {
    // "beispiel.org" als Regel ohne @ ist eine Adresse und trifft niemanden.
    expect(isExcludedAddress("wer@beispiel.org", ["beispiel.org"])).toBe(false);
  });

  it("ignoriert leere Eintraege statt alle auszuschliessen", () => {
    expect(isExcludedAddress("wer@example.org", ["", "   "])).toBe(false);
  });
});

describe("Verlosung: Ziehung", () => {
  it("zieht das Los an der Stelle, die der Zufallswert nennt", () => {
    const entries = [entry({ id: "a", email: "a@e.org" }), entry({ id: "b", email: "b@e.org" }), entry({ id: "c", email: "c@e.org" })];
    expect(pickEntry(entries, () => 0)?.id).toBe("a");
    expect(pickEntry(entries, () => 0.5)?.id).toBe("b");
    // Ein Zufallswert am oberen Rand darf nicht hinter das Ende greifen.
    expect(pickEntry(entries, () => 0.999999)?.id).toBe("c");
    expect(pickEntry(entries, () => 1)?.id).toBe("c");
  });

  it("gibt ohne Lose nichts zurueck, statt etwas zu erfinden", () => {
    expect(pickEntry([], () => 0)).toBeNull();
  });

  it("zieht fuer einen mehrfach vorhandenen Preis verschiedene Personen", () => {
    const entries = [
      entry({ id: "a1", email: "a@example.org" }),
      entry({ id: "a2", email: "a@example.org" }),
      entry({ id: "b", email: "b@example.org" }),
    ];

    const picked = pickEntries(entries, 2, () => 0);
    expect(picked.map((item) => item.email)).toEqual(["a@example.org", "b@example.org"]);
  });

  it("zieht nicht mehr, als noch im Topf ist", () => {
    const entries = [entry({ id: "a", email: "a@example.org" })];
    expect(pickEntries(entries, 5, () => 0)).toHaveLength(1);
  });
});

describe("Verlosung: offene Exemplare", () => {
  it("zaehlt herunter und nie unter null", () => {
    expect(openSlots(3, 1)).toBe(2);
    expect(openSlots(1, 1)).toBe(0);
    expect(openSlots(1, 4)).toBe(0);
  });
});

describe("Verlosung: Adressen", () => {
  it("vereinheitlicht Schreibweise und Leerzeichen", () => {
    expect(normalizeEmail("  Anna@Example.ORG ")).toBe("anna@example.org");
  });
});
