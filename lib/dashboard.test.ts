import { describe, expect, it } from "vitest";
import { changedDigitIndices, changedSlotIndices, formatRelativeTime, goalLaps, goalOverflow, goalPercent, goalProgress, formatMinutes, mergeDashboardDelta, MAX_HIGHLIGHTS, type DashboardDelta, type DashboardSnapshot } from "./dashboard";

function highlight(id: string, category = "tools") {
  return { id, category, brandModel: null, imageUrl: null, imageAltText: null, approvedAt: "2026-10-01T10:00:00.000Z" };
}

const snapshot: DashboardSnapshot = {
  total: 10,
  goal: 100,
  succeeded: 8,
  withStory: 2,
  minutesSaved: 120,
  valueSavedEuros: 500,
  categories: { tools: 6, bicycle: 4 },
  performedBy: { alone: 10 },
  timeline: [{ date: "2026-10-01", total: 10 }],
  cells: [],
  highlights: [highlight("a"), highlight("b")],
  cursor: "2026-10-01T10:00:00.000Z",
  generatedAt: "2026-10-01T10:00:00.000Z",
};

describe("mergeDashboardDelta", () => {
  const delta: DashboardDelta = {
    total: 12,
    added: [highlight("c"), highlight("d", "bicycle")],
    categories: { tools: 1, bicycle: 1 },
    cursor: "2026-10-01T10:05:00.000Z",
    generatedAt: "2026-10-01T10:05:00.000Z",
  };

  it("stellt neue Eintraege nach vorne und zaehlt Kategorien hoch", () => {
    const merged = mergeDashboardDelta(snapshot, delta);

    expect(merged.total).toBe(12);
    expect(merged.highlights.map((item) => item.id)).toEqual(["c", "d", "a", "b"]);
    expect(merged.categories).toEqual({ tools: 7, bicycle: 5 });
    expect(merged.cursor).toBe("2026-10-01T10:05:00.000Z");
  });

  it("ignoriert bereits bekannte Eintraege und laesst die Kategorien unveraendert", () => {
    const repeated: DashboardDelta = { ...delta, added: [highlight("a")], categories: { tools: 1 } };
    const merged = mergeDashboardDelta(snapshot, repeated);

    expect(merged.highlights.map((item) => item.id)).toEqual(["a", "b"]);
    expect(merged.categories).toEqual(snapshot.categories);
  });

  it("laesst die Gesamtzahl nie sinken", () => {
    expect(mergeDashboardDelta(snapshot, { ...delta, total: 3, added: [] }).total).toBe(10);
  });

  it("begrenzt die Anzahl vorgehaltener Highlights", () => {
    const many = Array.from({ length: MAX_HIGHLIGHTS + 5 }, (_, index) => highlight(`new-${index}`));
    const merged = mergeDashboardDelta(snapshot, { ...delta, added: many, categories: {} });

    expect(merged.highlights).toHaveLength(MAX_HIGHLIGHTS);
    expect(merged.highlights[0].id).toBe("new-0");
  });
});

describe("changedDigitIndices", () => {
  it("markiert nur die geaenderten Stellen", () => {
    expect(changedDigitIndices(1234, 1237)).toEqual([3]);
    expect(changedDigitIndices(1234, 1244)).toEqual([2]);
  });

  it("vergleicht rechtsbuendig, wenn eine Stelle dazukommt", () => {
    expect(changedDigitIndices(999, 1000)).toEqual([0, 1, 2, 3]);
    expect(changedDigitIndices(940, 1940)).toEqual([0]);
  });

  it("liefert nichts bei unveraenderten Zahlen", () => {
    expect(changedDigitIndices(42, 42)).toEqual([]);
  });
});

describe("changedSlotIndices", () => {
  it("beruecksichtigt den Tausenderpunkt an seiner Position", () => {
    // Nur die letzte Stelle wechselt, der Punkt bleibt unberuehrt.
    expect(changedSlotIndices("1.234", "1.235")).toEqual([4]);
  });

  it("markiert bei einer zusaetzlichen Stelle nur die neuen Positionen", () => {
    // "999" -> "1.000": rechtsbuendig verglichen aendert sich jede Position.
    expect(changedSlotIndices("999", "1.000")).toEqual([0, 1, 2, 3, 4]);
    // Die vorderen Stellen von "10.940" -> "11.940" bleiben stehen.
    expect(changedSlotIndices("10.940", "11.940")).toEqual([1]);
  });

  it("liefert nichts bei gleicher Zeichenkette", () => {
    expect(changedSlotIndices("4.711", "4.711")).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-10-05T12:00:00.000Z");

  it("staffelt Minuten, Stunden und Tage", () => {
    expect(formatRelativeTime("2026-10-05T11:59:30.000Z", now)).toBe("gerade eben");
    expect(formatRelativeTime("2026-10-05T11:56:00.000Z", now)).toBe("vor 4 Min.");
    expect(formatRelativeTime("2026-10-05T09:00:00.000Z", now)).toBe("vor 3 Std.");
    expect(formatRelativeTime("2026-10-04T11:00:00.000Z", now)).toBe("vor 1 Tag");
    expect(formatRelativeTime("2026-10-02T11:00:00.000Z", now)).toBe("vor 3 Tagen");
  });

  it("behandelt eine vorlaufende Uhr wie jetzt", () => {
    expect(formatRelativeTime("2026-10-05T12:04:00.000Z", now)).toBe("gerade eben");
  });

  it("bleibt bei fehlender oder unlesbarer Angabe leer", () => {
    expect(formatRelativeTime(null, now)).toBe("");
    expect(formatRelativeTime("irgendwann", now)).toBe("");
  });
});

describe("goalProgress", () => {
  it("begrenzt den Fortschritt auf 0 bis 100 Prozent", () => {
    expect(goalProgress(2_500, 10_000)).toBe(25);
    expect(goalProgress(12_000, 10_000)).toBe(100);
    expect(goalProgress(-5, 10_000)).toBe(0);
    expect(goalProgress(5, 0)).toBe(0);
  });
});

describe("goalPercent", () => {
  it("zaehlt ueber das Ziel hinaus weiter", () => {
    expect(goalPercent(2_500, 10_000)).toBe(25);
    expect(goalPercent(12_500, 10_000)).toBe(125);
    expect(goalPercent(-5, 10_000)).toBe(0);
    expect(goalPercent(5, 0)).toBe(0);
  });
});

describe("goalOverflow", () => {
  it("bleibt vor dem Ziel bei null", () => {
    expect(goalOverflow(9_999, 10_000)).toBe(0);
    expect(goalOverflow(10_000, 10_000)).toBe(0);
  });

  it("zeigt den Fortschritt der laufenden Zusatzrunde", () => {
    expect(goalOverflow(12_500, 10_000)).toBe(25);
    // Genau am Rundenende voll, nicht zurueck auf null.
    expect(goalOverflow(20_000, 10_000)).toBe(100);
    expect(goalOverflow(23_000, 10_000)).toBe(30);
  });
});

describe("goalLaps", () => {
  it("zaehlt die vollstaendig erreichten Ziele", () => {
    expect(goalLaps(9_999, 10_000)).toBe(0);
    expect(goalLaps(10_000, 10_000)).toBe(1);
    expect(goalLaps(21_400, 10_000)).toBe(2);
    expect(goalLaps(5, 0)).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("wechselt ab einer Stunde auf Stundenangaben", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(7_200)).toBe("120 h");
  });
});
