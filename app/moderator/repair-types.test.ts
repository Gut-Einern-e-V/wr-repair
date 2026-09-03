import { describe, expect, it } from "vitest";
import { buildQuery, draftFromRepair, isUnderReview, missingImageNote, originSignalRows, originWarning, type ModerationRepair } from "./repair-types";
import type { ModerationOrigin, ModerationOriginSignal } from "@/lib/moderation";

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
    imageDeletedAt: null,
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

describe("Fehlendes Bild", () => {
  it("unterscheidet nie eingereicht von geloescht", () => {
    expect(missingImageNote(repair())).toBe("Kein Bild eingereicht");
    expect(missingImageNote(repair({ status: "rejected", imageDeletedAt: "2026-08-27T09:00:00.000Z" })))
      .toBe("Bild mit der Ablehnung gelöscht");
  });

  it("nennt die Loeschung ausserhalb einer Ablehnung nachtraeglich", () => {
    expect(missingImageNote(repair({ status: "approved", imageDeletedAt: "2026-08-27T09:00:00.000Z" })))
      .toBe("Bild nachträglich gelöscht");
    expect(missingImageNote(repair({ status: "pending", imageDeletedAt: "2026-08-27T09:00:00.000Z" })))
      .toBe("Bild nachträglich gelöscht");
  });
});

/** Eine Herkunft, wie sie aus lib/moderation.ts kommt. */
function origin(overrides: Partial<ModerationOrigin> = {}): ModerationOrigin {
  return {
    lat: 51.256, lon: 7.15, kreis: "Wuppertal", source: "manual", ipRegion: "DE-NW",
    mismatch: false, outside: false, mapX: 0.5, mapY: 0.5, signals: [],
    ...overrides,
  };
}

function signal(overrides: Partial<ModerationOriginSignal> = {}): ModerationOriginSignal {
  return { source: "photo", lat: 48.137, lon: 11.575, kreis: null, mapX: 3, mapY: 2, used: false, ...overrides };
}

describe("Herkunftshinweis", () => {
  it("nennt widerspruechliche Angaben vor dem Hinweis auf die Verbindung", () => {
    const widerspruch = repair({
      origin: origin({
        mismatch: true,
        signals: [signal(), signal({ source: "manual", lat: 51.256, lon: 7.15, kreis: "Wuppertal", used: true })],
      }),
    });

    expect(originWarning(widerspruch)).toBe("Angaben widersprechen sich");
  });

  it("bleibt still, wenn nur eine stimmige Angabe vorliegt", () => {
    expect(originWarning(repair({ origin: origin() }))).toBeNull();
  });

  it("schlaegt nicht an, solange alle Angaben irgendwo im Land liegen", () => {
    /* Die IP-Herkunft raet stadtgenau und landet regelmaessig im Nachbarkreis.
       Gespeichert wird dieser Unterschied, aber er aendert nichts an der
       Frage, ob die Reparatur zaehlt - und darf die Schnellpruefung deshalb
       nicht anhalten. */
    const nachbarkreis = repair({
      origin: origin({
        signals: [
          signal({ source: "manual", lat: 51.256, lon: 7.15, kreis: "Wuppertal", used: true }),
          signal({ source: "ip", lat: 50.938, lon: 6.96, kreis: "Köln" }),
        ],
      }),
    });

    expect(originWarning(nachbarkreis)).toBeNull();
    // Sichtbar sind die Angaben trotzdem, nur eben in der Vollansicht.
    expect(originSignalRows(nachbarkreis.origin!)).toHaveLength(2);
  });
});

describe("Liste der Herkunftsangaben", () => {
  it("bleibt leer, solange es nichts zu vergleichen gibt", () => {
    expect(originSignalRows(origin())).toEqual([]);
  });

  it("stellt die gespeicherte Angabe voran und nummeriert wie die Karte", () => {
    const rows = originSignalRows(origin({
      signals: [
        signal(),
        signal({ source: "manual", lat: 51.256, lon: 7.15, kreis: "Wuppertal", used: true }),
        signal({ source: "ip", lat: 50.938, lon: 6.96, kreis: "Köln" }),
      ],
    }));

    // Die als `used` markierte Angabe steht nicht doppelt in der Liste.
    expect(rows.map((row) => row.number)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({ number: 1, kreis: "Wuppertal", used: true });
    expect(rows[1]).toMatchObject({ number: 2, kreis: null, used: false });
    expect(rows[2]).toMatchObject({ number: 3, kreis: "Köln", used: false });
  });
});
