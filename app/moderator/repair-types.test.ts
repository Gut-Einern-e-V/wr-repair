import { describe, expect, it } from "vitest";
import { buildQuery, draftFromRepair, isUnderReview, type ModerationRepair } from "./repair-types";

function repair(overrides: Partial<ModerationRepair> = {}): ModerationRepair {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    category: "bicycle",
    brand_model: "Hollandrad",
    duration_minutes: 45,
    item_value_euros: 120,
    performed_by: "alone",
    story: "Kette gewechselt.",
    image_alt_text: null,
    tags: ["kette", "fahrrad"],
    repair_succeeded: true,
    consent_publication: true,
    status: "pending",
    location_region: "Wuppertal",
    origin: null,
    moderator_comment: null,
    created_at: "2026-08-27T08:00:00.000Z",
    entry_time: "2026-08-27T08:00:00.000Z",
    imageUrl: null,
    claimedUntil: null,
    claimedByMe: false,
    ...overrides,
  };
}

describe("Moderationsfilter", () => {
  it("laesst leere Filter aus der Abfrage weg", () => {
    expect(buildQuery({ status: "pending", category: "", consent: "", search: "", sort: "oldest" }))
      .toBe("status=pending&sort=oldest");
  });

  it("nimmt gesetzte Filter mit", () => {
    const query = new URLSearchParams(buildQuery({ status: "approved", category: "bicycle", consent: "yes", search: "Toaster", sort: "newest" }));
    expect(Object.fromEntries(query)).toEqual({ status: "approved", sort: "newest", category: "bicycle", consent: "yes", q: "Toaster" });
  });
});

describe("Anspruch auf eine Einreichung", () => {
  const now = Date.parse("2026-08-27T10:00:00.000Z");
  const soon = new Date(now + 60_000).toISOString();
  const past = new Date(now - 60_000).toISOString();

  it("meldet eine fremde, laufende Pruefung", () => {
    expect(isUnderReview(repair({ claimedUntil: soon }), now)).toBe(true);
  });

  it("meldet den eigenen Anspruch nicht", () => {
    expect(isUnderReview(repair({ claimedUntil: soon, claimedByMe: true }), now)).toBe(false);
  });

  it("laesst einen abgelaufenen Anspruch fallen", () => {
    expect(isUnderReview(repair({ claimedUntil: past }), now)).toBe(false);
  });

  it("meldet nichts fuer bereits entschiedene Einreichungen", () => {
    expect(isUnderReview(repair({ status: "approved", claimedUntil: soon }), now)).toBe(false);
  });
});

describe("Bearbeitbare Angaben", () => {
  it("uebernimmt die Einreichung als Entwurf", () => {
    expect(draftFromRepair(repair())).toEqual({
      category: "bicycle",
      imageAltText: "",
      tags: "kette, fahrrad",
      brandModel: "Hollandrad",
      durationMinutes: "45",
      itemValueEuros: "120",
      performedBy: "alone",
      story: "Kette gewechselt.",
      repairSucceeded: true,
    });
  });

  it("macht aus fehlenden Angaben leere Felder statt null", () => {
    const draft = draftFromRepair(repair({ brand_model: null, story: null, performed_by: null, duration_minutes: null, item_value_euros: null }));
    expect(draft).toMatchObject({ brandModel: "", story: "", performedBy: "", durationMinutes: "", itemValueEuros: "" });
  });
});
