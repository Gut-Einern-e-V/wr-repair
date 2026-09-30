import { describe, expect, it } from "vitest";
import {
  autoMilestone,
  countdown,
  formatLastDay,
  formatPeriod,
  goalPercent,
  kreisStanding,
  parseHeadline,
  parsePublicSharepicRequest,
  parseSharepicRequest,
  publicSharepicQuery,
  rankEntries,
} from "./sharepics";

const start = "2026-09-30T22:00:00.000Z"; // 1. Oktober, 0 Uhr in Berlin
const end = "2026-10-31T23:00:00.000Z"; // 1. November, 0 Uhr in Berlin

describe("Countdown der Sharepics", () => {
  it("zaehlt vor dem Start die Tage bis zum Start", () => {
    expect(countdown(start, end, Date.parse("2026-09-30T08:00:00Z"))).toEqual({ target: "start", value: 1, unit: "Tag" });
  });

  it("zaehlt den letzten Tag mit", () => {
    // 1. Oktober: 31 Tage inklusive heute.
    expect(countdown(start, end, Date.parse("2026-10-01T08:00:00Z"))).toEqual({ target: "end", value: 31, unit: "Tage" });
    // 30. Oktober: heute und morgen.
    expect(countdown(start, end, Date.parse("2026-10-30T08:00:00Z"))).toEqual({ target: "end", value: 2, unit: "Tage" });
  });

  it("zaehlt am letzten Tag in Stunden", () => {
    expect(countdown(start, end, Date.parse("2026-10-31T20:30:00Z"))).toEqual({ target: "end", value: 3, unit: "Stunden" });
  });

  it("meldet das Ende", () => {
    expect(countdown(start, end, Date.parse("2026-11-02T08:00:00Z"))?.target).toBe("over");
  });

  it("gibt ohne Zeitraum nichts aus", () => {
    expect(countdown(null, end, Date.now())).toBeNull();
  });
});

describe("Ranglisten", () => {
  it("sortiert absteigend und bei Gleichstand alphabetisch", () => {
    expect(rankEntries({ Köln: 5, Bonn: 5, Essen: 9, Hamm: 0 })).toEqual([
      { key: "Essen", count: 9 },
      { key: "Bonn", count: 5 },
      { key: "Köln", count: 5 },
    ]);
  });

  it("teilt Plaetze bei Gleichstand", () => {
    const stats = { kreise: { Essen: 9, Bonn: 5, Köln: 5, Hamm: 1 }, todayKreise: { Köln: 2 } };
    expect(kreisStanding(stats, "Köln")).toEqual({ name: "Köln", count: 5, rank: 2, of: 4, today: 2 });
    expect(kreisStanding(stats, "Hamm").rank).toBe(4);
    expect(kreisStanding(stats, "Bottrop").rank).toBeNull();
  });
});

describe("Meilensteine und Ziel", () => {
  it("nimmt die letzte erreichte Stufe", () => {
    expect(autoMilestone(42)).toBe(42);
    expect(autoMilestone(1_020)).toBe(1_000);
    expect(autoMilestone(12_345)).toBe(12_000);
  });

  it("rundet den Zielanteil nach unten", () => {
    expect(goalPercent(9_996, 10_000)).toBe(99);
    expect(goalPercent(5, 0)).toBe(0);
  });
});

describe("Anfrage", () => {
  it("faellt auf Vorgaben zurueck", () => {
    const request = parseSharepicRequest(new URLSearchParams("motif=unbekannt&ground=pink"));
    expect(request.motif).toBe("launch");
    expect(request.ground).toBe("yellow");
    expect(request.demo).toBe(false);
  });

  it("begrenzt die eigene Ueberschrift", () => {
    expect(parseHeadline("  Erste | Zweite\nDritte|Vierte ")).toEqual(["Erste", "Zweite", "Dritte"]);
    expect(parseHeadline(" | ")).toBeNull();
    expect(parseHeadline("x".repeat(40))?.[0]).toHaveLength(24);
  });

  it("nennt als letzten Tag den Tag vor Mitternacht", () => {
    expect(formatLastDay(end)).toBe("31. Oktober");
  });

  it("fasst den Zeitraum im selben Monat zusammen", () => {
    expect(formatPeriod(start, end)).toBe("1.–31. Oktober");
    expect(formatPeriod("2026-10-27T23:00:00Z", "2026-11-03T23:00:00Z")).toBe("28. Oktober – 3. November");
  });
});

describe("Oeffentliche Sharepics", () => {
  const kreise = ["Wuppertal", "Köln"];
  const parse = (query: string) => parsePublicSharepicRequest(new URLSearchParams(query), kreise);

  it("laesst Ueberschrift, Beispielzahlen und freien Meilenstein weg", () => {
    const request = parse("motif=milestone&headline=Alles%20gelogen&demo=1&milestone=1000000");
    expect(request).toMatchObject({ motif: "milestone", headline: null, demo: false, milestone: null });
  });

  it("nimmt nur Orte aus der Kreisliste", () => {
    expect(parse("motif=kreis&kreis=Köln").kreis).toBe("Köln");
    expect(parse("motif=kreis&kreis=Irgendwas%20Erfundenes").kreis).toBeNull();
  });

  it("nimmt Orte nur bei Motiven, die sie brauchen", () => {
    expect(parse("motif=launch&kreis=Köln&kreisB=Wuppertal")).toMatchObject({ kreis: null, kreisB: null });
    expect(parse("motif=kreis&kreis=Köln&kreisB=Wuppertal")).toMatchObject({ kreis: "Köln", kreisB: null });
  });

  it("hat eine kanonische Adresse ohne fremde Angaben", () => {
    const request = parse("t=123&kreis=Köln&motif=duel&download=1&ground=ink");
    expect(publicSharepicQuery(request)).toBe("motif=duel&ground=ink&kreis=K%C3%B6ln&download=1");
  });

  it("nimmt das Format mit, laesst die Story als Vorgabe aber weg", () => {
    expect(parse("motif=launch&format=square").format).toBe("square");
    expect(parse("motif=launch&format=riesig").format).toBe("story");
    expect(publicSharepicQuery(parse("motif=launch&format=story"))).toBe("motif=launch&ground=yellow");
    expect(publicSharepicQuery(parse("kreis=Köln&format=portrait&motif=kreis"))).toBe("motif=kreis&ground=mint&format=portrait&kreis=K%C3%B6ln");
  });

  it("aendert eine kanonische Adresse nicht", () => {
    const canonical = "motif=duel&ground=ink&kreis=K%C3%B6ln&kreisB=Wuppertal";
    expect(publicSharepicQuery(parse(canonical))).toBe(canonical);
    expect(new URLSearchParams(canonical).toString()).toBe(canonical);
  });
});
