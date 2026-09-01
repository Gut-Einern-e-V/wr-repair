import { describe, expect, it } from "vitest";
import { campaignPhaseAt, nextPhaseChange } from "./campaign-phase";

const campaign = { startAt: "2026-10-01T00:00:00.000Z", endAt: "2026-10-31T22:00:00.000Z" };
const at = (iso: string) => Date.parse(iso);

describe("Phase des Rekordversuchs", () => {
  it("erkennt davor, waehrend und danach", () => {
    expect(campaignPhaseAt(campaign, at("2026-09-30T23:59:59Z"))).toBe("before");
    expect(campaignPhaseAt(campaign, at("2026-10-15T12:00:00Z"))).toBe("open");
    expect(campaignPhaseAt(campaign, at("2026-11-01T00:00:00Z"))).toBe("after");
  });

  it("kippt in derselben Sekunde, in der die Frist ablaeuft", () => {
    expect(campaignPhaseAt(campaign, at(campaign.endAt))).toBe("open");
    expect(campaignPhaseAt(campaign, at(campaign.endAt) + 1)).toBe("after");
  });

  it("bleibt unbekannt ohne brauchbaren Zeitraum", () => {
    expect(campaignPhaseAt({ startAt: null, endAt: null }, at("2026-10-15T12:00:00Z"))).toBe("invalid");
    expect(campaignPhaseAt({ startAt: campaign.endAt, endAt: campaign.startAt }, at("2026-10-15T12:00:00Z"))).toBe("invalid");
    // Vor dem ersten Uhrentakt: derselbe Stand wie beim Server-Rendering.
    expect(campaignPhaseAt(campaign, 0)).toBe("invalid");
  });

  it("nennt den naechsten Wechsel und danach keinen mehr", () => {
    expect(nextPhaseChange(campaign, at("2026-09-01T00:00:00Z"))).toBe(at(campaign.startAt));
    expect(nextPhaseChange(campaign, at("2026-10-15T12:00:00Z"))).toBe(at(campaign.endAt));
    expect(nextPhaseChange(campaign, at("2026-11-01T00:00:00Z"))).toBeNull();
  });
});
