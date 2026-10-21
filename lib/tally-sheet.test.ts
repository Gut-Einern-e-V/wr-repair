import { describe, expect, it } from "vitest";
import { eventTimestamp, expandCounts, isPastOrToday, parseTallySheet } from "./tally-sheet";

const today = "2026-10-21";
const valid = {
  cafeName: "Repair-Café Elberfeld",
  address: "Musterstraße 1, 42103 Wuppertal",
  eventDate: "2026-10-18",
  lat: "51.25661",
  lon: 7.15,
  counts: { bicycle: "12", furniture: 5, toys: "" },
};

describe("Strichlisten", () => {
  it("nimmt eine vollstaendige Liste an und rundet den Punkt", () => {
    const result = parseTallySheet(valid, today);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.total).toBe(17);
    expect(result.sheet.counts).toEqual({ bicycle: 12, furniture: 5 });
    expect(result.sheet.point).toEqual({ lat: 51.257, lon: 7.15 });
    expect(result.sheet.lottery).toBeNull();
  });

  it("akzeptiert ein Komma als Dezimaltrenner", () => {
    const result = parseTallySheet({ ...valid, lat: "51,2566" }, today);
    expect(result.ok && result.sheet.point.lat).toBe(51.257);
  });

  it("lehnt leere Listen, unbekannte Kategorien und Bruchzahlen ab", () => {
    expect(parseTallySheet({ ...valid, counts: {} }, today).ok).toBe(false);
    expect(parseTallySheet({ ...valid, counts: { spaceship: 1 } }, today).ok).toBe(false);
    expect(parseTallySheet({ ...valid, counts: { bicycle: 1.5 } }, today).ok).toBe(false);
    expect(parseTallySheet({ ...valid, counts: { bicycle: -1 } }, today).ok).toBe(false);
  });

  it("verlangt Koordinaten und ein Datum, das nicht in der Zukunft liegt", () => {
    expect(parseTallySheet({ ...valid, lat: "" }, today).ok).toBe(false);
    expect(parseTallySheet({ ...valid, eventDate: "2026-10-22" }, today).ok).toBe(false);
    expect(isPastOrToday("2026-02-30", today)).toBe(false);
    expect(isPastOrToday(today, today)).toBe(true);
  });

  it("nimmt mit Adresse am Gewinnspiel teil, sonst nicht", () => {
    const withLottery = parseTallySheet({ ...valid, lottery: true, lotteryEmail: " Cafe@Example.org " }, today);
    expect(withLottery.ok && withLottery.sheet.lottery).toEqual({ name: "Repair-Café Elberfeld", email: "cafe@example.org" });
    expect(parseTallySheet({ ...valid, lottery: true, lotteryEmail: "keine-adresse" }, today).ok).toBe(false);
    expect(parseTallySheet({ ...valid, lottery: false, lotteryEmail: "cafe@example.org" }, today).ok && true).toBe(true);
  });

  it("macht aus den Anzahlen eine Kategorie je Reparatur", () => {
    expect(expandCounts({ furniture: 2, bicycle: 1 })).toEqual(["bicycle", "furniture", "furniture"]);
  });

  it("zaehlt am Tag der Veranstaltung, auch in Berliner Zeit", () => {
    const stamp = new Date(eventTimestamp("2026-03-29"));
    expect(stamp.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })).toBe("2026-03-29");
  });
});
