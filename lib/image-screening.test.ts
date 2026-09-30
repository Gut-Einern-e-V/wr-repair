import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyScreening, screenImage, toStoredScreening } from "./image-screening";

function response(nudity: Record<string, number>, goreProb: number) {
  return {
    status: "success",
    nudity: { sexual_activity: 0.01, sexual_display: 0.01, erotica: 0.01, very_suggestive: 0.01, none: 0.99, ...nudity },
    gore: { prob: goreProb, classes: {} },
  };
}

describe("classifyScreening", () => {
  it("laesst ein unauffaelliges Reparaturfoto durch", () => {
    expect(classifyScreening(response({}, 0.02))).toEqual({
      verdict: "clear",
      scores: { explicit: 0.01, suggestive: 0.01, gore: 0.02 },
      reasons: [],
    });
  });

  it("sperrt eindeutige Nacktheit und eindeutiges Gore", () => {
    expect(classifyScreening(response({ sexual_display: 0.93 }, 0.01))?.verdict).toBe("blocked");
    expect(classifyScreening(response({}, 0.95))).toMatchObject({ verdict: "blocked", reasons: ["gore"] });
  });

  it("markiert nur, was nicht eindeutig ist", () => {
    expect(classifyScreening(response({ erotica: 0.6 }, 0.01))).toMatchObject({ verdict: "flagged", reasons: ["explicit"] });
    expect(classifyScreening(response({ very_suggestive: 0.85 }, 0.01))).toMatchObject({ verdict: "flagged", reasons: ["suggestive"] });
    // Ein blutiger Finger nach dem Abrutschen ist kein Sperrgrund.
    expect(classifyScreening(response({}, 0.7))).toMatchObject({ verdict: "flagged", reasons: ["gore"] });
  });

  it("haelt eine unerwartete Antwort nicht fuer unauffaellig", () => {
    expect(classifyScreening(null)).toBeNull();
    expect(classifyScreening({ status: "success" })).toBeNull();
    expect(classifyScreening({ status: "success", nudity: {}, gore: {} })).toBeNull();
    expect(classifyScreening({ status: "failure", error: { message: "x" } })).toBeNull();
  });
});

describe("screenImage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const image = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });

  it("prueft ohne Schluessel gar nicht erst", async () => {
    vi.stubEnv("SIGHTENGINE_API_USER", "");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "");
    const fetchImpl = vi.fn();
    expect(await screenImage(image, fetchImpl)).toEqual({ verdict: "unchecked", cause: "unconfigured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("wertet ein aufgebrauchtes Kontingent als Stoerung, nicht als Urteil", async () => {
    vi.stubEnv("SIGHTENGINE_API_USER", "user");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
    const fetchImpl = vi.fn(async () => Response.json(
      { status: "failure", error: { type: "usage_limit", code: 32, message: "Daily usage limit reached" } },
      { status: 429 },
    ));
    expect(await screenImage(image, fetchImpl)).toMatchObject({ verdict: "unchecked", cause: "unavailable" });
  });

  it("faengt Netzfehler ab", async () => {
    vi.stubEnv("SIGHTENGINE_API_USER", "user");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
    const fetchImpl = vi.fn(async () => {
      throw new Error("The operation was aborted due to timeout");
    });
    expect(await screenImage(image, fetchImpl)).toMatchObject({ verdict: "unchecked", cause: "unavailable" });
  });

  it("schickt beide Modelle und liefert das Urteil", async () => {
    vi.stubEnv("SIGHTENGINE_API_USER", "user");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect((init?.body as FormData).get("models")).toBe("nudity-2.1,gore-2.0");
      return Response.json(response({}, 0.01));
    });
    expect(await screenImage(image, fetchImpl as typeof fetch)).toMatchObject({ verdict: "clear" });
  });
});

describe("toStoredScreening", () => {
  it("liest einen gespeicherten Eintrag und verwirft Unsinn", () => {
    expect(toStoredScreening({ verdict: "flagged", scores: { explicit: 0.6, suggestive: 0.1, gore: 0 }, reasons: ["explicit", "quatsch"] }))
      .toEqual({ verdict: "flagged", scores: { explicit: 0.6, suggestive: 0.1, gore: 0 }, reasons: ["explicit"] });
    expect(toStoredScreening({ verdict: "blocked", scores: {} })).toBeNull();
    expect(toStoredScreening(null)).toBeNull();
  });
});
