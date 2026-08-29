import { describe, expect, it } from "vitest";
import { MAX_TIMELINE_DAYS, berlinDay, readPublicStats, shiftDay, timelineRange } from "./public-stats";

const context = {
  goal: 3_177,
  dayRecord: 412,
  campaign: { startAt: new Date("2026-10-01T06:00:00.000Z"), endAt: new Date("2026-10-31T20:00:00.000Z") },
};

describe("berlinDay", () => {
  it("uses the Berlin calendar day, not the UTC one", () => {
    // Sommerzeit: 22:30 UTC ist in Berlin schon der naechste Tag.
    expect(berlinDay(new Date("2026-07-14T22:30:00.000Z"))).toBe("2026-07-15");
    expect(berlinDay(new Date("2026-01-14T22:30:00.000Z"))).toBe("2026-01-14");
  });
});

describe("shiftDay", () => {
  it("counts calendar days across month and daylight saving boundaries", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-03-30", -2)).toBe("2026-03-28");
    expect(shiftDay("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("timelineRange", () => {
  it("follows the configured submission window instead of a fixed 30 days", () => {
    const range = timelineRange(
      new Date("2026-10-01T06:00:00.000Z"),
      new Date("2026-10-31T20:00:00.000Z"),
      new Date("2026-10-20T09:00:00.000Z"),
    );

    expect(range).toEqual({ start: "2026-10-01", end: "2026-10-20" });
  });

  it("stops at the end of the window once the campaign is over", () => {
    const range = timelineRange(
      new Date("2026-10-01T06:00:00.000Z"),
      new Date("2026-10-31T20:00:00.000Z"),
      new Date("2026-11-05T09:00:00.000Z"),
    );

    expect(range.end).toBe("2026-10-31");
  });

  it("caps a very long window so the payload stays small", () => {
    const range = timelineRange(
      new Date("2020-01-01T00:00:00.000Z"),
      new Date("2030-01-01T00:00:00.000Z"),
      new Date("2026-10-20T09:00:00.000Z"),
    );

    expect(range.end).toBe("2026-10-20");
    expect(range.start).toBe(shiftDay("2026-10-20", -(MAX_TIMELINE_DAYS - 1)));
  });

  it("returns an empty span while the campaign is still ahead", () => {
    const range = timelineRange(
      new Date("2026-10-01T06:00:00.000Z"),
      new Date("2026-10-31T20:00:00.000Z"),
      new Date("2026-09-20T09:00:00.000Z"),
    );

    expect(range.end < range.start).toBe(true);
  });
});

describe("readPublicStats", () => {
  it("carries every aggregate field into the response", () => {
    const stats = readPublicStats(
      {
        total: 184,
        pending: 12,
        today: 7,
        bestDay: { date: "2026-10-17", total: 41 },
        categories: { textiles: 2 },
        kreise: { Wuppertal: 9, "Kreis Kleve": 1 },
        timeline: [{ date: "2026-10-01", total: 3 }, { date: "2026-10-02", total: 0 }],
      },
      context,
    );

    expect(stats).toEqual({
      total: 184,
      goal: 3_177,
      pending: 12,
      today: 7,
      bestDay: { date: "2026-10-17", total: 41 },
      dayRecord: 412,
      categories: { textiles: 2 },
      kreise: { Wuppertal: 9, "Kreis Kleve": 1 },
      timeline: [{ date: "2026-10-01", total: 3 }, { date: "2026-10-02", total: 0 }],
      campaign: { startAt: "2026-10-01T06:00:00.000Z", endAt: "2026-10-31T20:00:00.000Z" },
    });
  });

  it("lists every kreis, not just the busiest ones", () => {
    const kreise = Object.fromEntries(Array.from({ length: 53 }, (_, index) => [`Kreis ${index}`, index + 1]));

    expect(Object.keys(readPublicStats({ kreise }, context).kreise)).toHaveLength(53);
  });

  it("reads numbers that Postgres returned as strings", () => {
    const stats = readPublicStats({ total: "184", categories: { toys: "2" } }, context);

    expect(stats.total).toBe(184);
    expect(stats.categories).toEqual({ toys: 2 });
  });

  it("stays usable when the aggregate is missing fields or malformed", () => {
    const stats = readPublicStats(null, { ...context, dayRecord: null });

    expect(stats).toMatchObject({ total: 0, pending: 0, today: 0, bestDay: null, dayRecord: null, categories: {}, kreise: {}, timeline: [] });
  });

  it("drops a best day without repairs instead of announcing a zero record", () => {
    expect(readPublicStats({ bestDay: { date: "2026-10-17", total: 0 } }, context).bestDay).toBeNull();
  });
});
