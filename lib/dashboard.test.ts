import { describe, expect, it } from "vitest";
import { changedDigitIndices, goalProgress, formatMinutes, mergeDashboardDelta, MAX_HIGHLIGHTS, type DashboardDelta, type DashboardSnapshot } from "./dashboard";

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

describe("goalProgress", () => {
  it("begrenzt den Fortschritt auf 0 bis 100 Prozent", () => {
    expect(goalProgress(2_500, 10_000)).toBe(25);
    expect(goalProgress(12_000, 10_000)).toBe(100);
    expect(goalProgress(-5, 10_000)).toBe(0);
    expect(goalProgress(5, 0)).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("wechselt ab einer Stunde auf Stundenangaben", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(7_200)).toBe("120 h");
  });
});
