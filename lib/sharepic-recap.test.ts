import { describe, expect, it } from "vitest";
import { bucketTimeline, demoRecap, readRecapStats, recapChange, recapRange, recapSharePercent, recapSuccessPercent, stackCategories, type RecapDay } from "./sharepic-recap";

describe("Zeitraeume der Rueckschau", () => {
  it("nimmt fuer 7 Tage heute und die sechs Tage davor", () => {
    expect(recapRange("7d", new Date("2026-10-07T10:00:00Z"))).toEqual({ start: "2026-10-01", end: "2026-10-07" });
  });

  it("nimmt fuer die Woche die letzte abgeschlossene Montag-bis-Sonntag-Woche", () => {
    // Mittwoch, 7. Oktober 2026: letzte Woche war 28. September bis 4. Oktober.
    expect(recapRange("week", new Date("2026-10-07T10:00:00Z"))).toEqual({ start: "2026-09-28", end: "2026-10-04" });
  });

  it("nimmt am Montag die gestern beendete Woche und am Sonntag die davor", () => {
    expect(recapRange("week", new Date("2026-10-05T10:00:00Z"))).toEqual({ start: "2026-09-28", end: "2026-10-04" });
    expect(recapRange("week", new Date("2026-10-04T10:00:00Z"))).toEqual({ start: "2026-09-21", end: "2026-09-27" });
  });

  it("rechnet in Berliner Zeit: kurz nach Mitternacht ist schon der naechste Tag", () => {
    expect(recapRange("7d", new Date("2026-10-06T22:30:00Z")).end).toBe("2026-10-07");
  });

  it("beginnt 'seit Anfang an' am Start der Aktion, sonst offen", () => {
    const now = new Date("2026-10-07T10:00:00Z");
    expect(recapRange("all", now)).toEqual({ start: null, end: "2026-10-07" });
    expect(recapRange("all", now, "2026-09-30T22:00:00.000Z")).toEqual({ start: "2026-10-01", end: "2026-10-07" });
  });
});

describe("Zahlen der Rueckschau", () => {
  it("vergleicht erst ab zehn Reparaturen im Vorzeitraum", () => {
    expect(recapChange(120, 100)).toBe(20);
    expect(recapChange(5, 100)).toBe(-95);
    expect(recapChange(50, 9)).toBeNull();
    expect(recapChange(50, null)).toBeNull();
  });

  it("rundet die Erfolgsquote nach unten", () => {
    expect(recapSuccessPercent(199, 1)).toBe(99);
    expect(recapSuccessPercent(0, 0)).toBe(0);
  });

  it("zeigt kleine Anteile mit einer Nachkommastelle", () => {
    expect(recapSharePercent(3, 200)).toBe(1.5);
    expect(recapSharePercent(46, 100)).toBe(46);
    expect(recapSharePercent(1, 0)).toBe(0);
  });

  it("liest eine unvollstaendige Antwort ohne abzubrechen", () => {
    const stats = readRecapStats({ succeeded: "12", timeline: [{ date: "2026-10-01", succeeded: 4 }, { foo: 1 }, null] });
    expect(stats.succeeded).toBe(12);
    expect(stats.previousSucceeded).toBeNull();
    expect(stats.timeline).toEqual([{ date: "2026-10-01", succeeded: 4, failed: 0, categories: {} }]);
    expect(readRecapStats(null).succeeded).toBe(0);
  });
});

describe("Balken des Verlaufs", () => {
  const days = (count: number): RecapDay[] => Array.from({ length: count }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`,
    succeeded: 1,
    failed: 1,
    categories: { bicycle: 1 },
  }));

  it("laesst kurze Zeitraeume als Tagesbalken", () => {
    expect(bucketTimeline(days(7), 7)).toHaveLength(7);
  });

  it("fasst lange Zeitraeume zusammen und verliert nichts", () => {
    const bars = bucketTimeline(days(30), 12);
    expect(bars.length).toBeLessThanOrEqual(12);
    expect(bars.reduce((sum, bar) => sum + bar.succeeded, 0)).toBe(30);
    expect(bars.reduce((sum, bar) => sum + bar.failed, 0)).toBe(30);
    expect(bars.reduce((sum, bar) => sum + (bar.categories.bicycle ?? 0), 0)).toBe(30);
  });

  it("macht den juengsten Balken voll und den aeltesten kurz", () => {
    const bars = bucketTimeline(days(7), 3); // 3 Tage je Balken
    expect(bars.map((bar) => bar.succeeded)).toEqual([1, 3, 3]);
  });

  it("gibt ohne Tage nichts zurueck", () => {
    expect(bucketTimeline([], 7)).toEqual([]);
  });

  it("stapelt die groessten Kategorien", () => {
    expect(stackCategories({ a: 5, b: 9, c: 1, d: 0 }, 2)).toEqual(["b", "a"]);
  });
});

describe("Beispielzahlen der Rueckschau", () => {
  it("passen zum Zeitraum", () => {
    const now = new Date("2026-10-07T10:00:00Z");
    expect(demoRecap("week", now).timeline).toHaveLength(7);
    expect(demoRecap("all", now).previousSucceeded).toBeNull();
    expect(demoRecap("7d", now).succeeded).toBe(demoRecap("7d", now).timeline.reduce((sum, day) => sum + day.succeeded, 0));
  });
});
