import { describe, expect, it } from "vitest";
import { anonymizeCoordinates } from "./geo-anonymize";
import { decideOrigin, expectedIpRegionTag, hasOriginMismatch, locateInRegion, signalsDisagree } from "./origin-check";
import { getRegionConfig } from "./region-config";

const nrw = getRegionConfig();

/** Wuppertal und Muenchen, jeweils schon anonymisiert. */
const inNrw = anonymizeCoordinates(51.256, 7.15)!;
const inBavaria = anonymizeCoordinates(48.137, 11.575)!;

function submission(
  headers: Record<string, string> = {},
  fields: Record<string, string> = {},
) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return { request: new Request("https://example.test/api/repairs", { headers }), formData };
}

/** Verbindung aus einem Bundesland, samt der stadtgenauen Vercel-Koordinate. */
function connectionFrom(region: string, point: { lat: number; lon: number }) {
  return {
    "x-vercel-ip-country": "DE",
    "x-vercel-ip-country-region": region,
    "x-vercel-ip-latitude": String(point.lat),
    "x-vercel-ip-longitude": String(point.lon),
  };
}

describe("Punkt im Gebiet", () => {
  it("erkennt innerhalb und ausserhalb ueber die Kreis-Polygone", () => {
    expect(locateInRegion(inNrw, nrw)).toBe("inside");
    expect(locateInRegion(inBavaria, nrw)).toBe("outside");
  });

  it("faellt fuer ein anderes Gebiet auf das Koordinatenfenster zurueck", () => {
    const berlin = { ...nrw, label: "Berlin", ipRegion: "BE", bounds: { latMin: 52.3, latMax: 52.7, lonMin: 13.0, lonMax: 13.8 } };
    expect(locateInRegion(anonymizeCoordinates(52.52, 13.4)!, berlin)).toBe("inside");
    expect(locateInRegion(inNrw, berlin)).toBe("outside");
  });

  it("urteilt nicht, wenn weder Polygone noch Fenster zustaendig sind", () => {
    const unconfigured = { ...nrw, ipRegion: "BE", bounds: null };
    expect(locateInRegion(inNrw, unconfigured)).toBe("unknown");
  });
});

describe("Herkunftspruefung einer Einreichung", () => {
  it("nimmt eine Einreichung aus dem Gebiet an und leitet den Kreis ab", () => {
    const { request, formData } = submission(connectionFrom("NW", { lat: 51.256, lon: 7.15 }));
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(true);
    expect(decision.kreis).toBe("Wuppertal");
    expect(decision.source).toBe("ip");
    expect(decision.regionLabel).toBe("Nordrhein-Westfalen");
    expect(decision.ipRegion).toBe("DE-NW");
  });

  it("weist eine Einreichung von ausserhalb ohne jeden Gebietsbezug ab", () => {
    const { request, formData } = submission(connectionFrom("BY", { lat: 48.137, lon: 11.575 }));
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(false);
    // Auch bei einer Absage steht die grobe Gegend fuer die Antwort bereit.
    expect(decision.ipRegion).toBe("DE-BY");
  });

  it("laesst eine ausdrueckliche Ortsangabe im Gebiet das IP-Urteil stechen", () => {
    const { request, formData } = submission(
      connectionFrom("BY", { lat: 48.137, lon: 11.575 }),
      { origin_lat: String(inNrw.lat), origin_lon: String(inNrw.lon), origin_source: "manual" },
    );
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(true);
    expect(decision.kreis).toBe("Wuppertal");
    expect(decision.source).toBe("manual");
    // Der Widerspruch geht mit an die Moderation, statt hier entschieden zu werden.
    expect(hasOriginMismatch(decision.ipRegion, decision.kreis, nrw)).toBe(true);
  });

  it("rettet eine Einreichung ueber das Foto-EXIF, wenn der Browser nichts geschickt hat", () => {
    const { request, formData } = submission(connectionFrom("BY", { lat: 48.137, lon: 11.575 }));

    expect(decideOrigin(request, formData, nrw).allowed).toBe(false);

    const withPhoto = decideOrigin(request, formData, nrw, inNrw);
    expect(withPhoto.allowed).toBe(true);
    expect(withPhoto.source).toBe("photo");
    expect(withPhoto.regionLabel).toBe("Nordrhein-Westfalen");
  });

  it("laesst fehlende Geo-Header nie zu einer Absage werden", () => {
    const { request, formData } = submission();
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(true);
    expect(decision.point).toBeNull();
    expect(decision.regionLabel).toBeNull();
    expect(decision.ipRegion).toBeNull();
  });

  it("blockiert nie bei abgeschalteter Gebietspruefung", () => {
    const { request, formData } = submission(connectionFrom("BY", { lat: 48.137, lon: 11.575 }));
    expect(decideOrigin(request, formData, { ...nrw, enabled: false }).allowed).toBe(true);
  });

  it("verwirft eine Ortsangabe ausserhalb des Gebiets, statt sie auf die Karte zu lassen", () => {
    const { request, formData } = submission(
      connectionFrom("NW", { lat: 51.256, lon: 7.15 }),
      { origin_lat: String(inBavaria.lat), origin_lon: String(inBavaria.lon), origin_source: "photo" },
    );
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(true);
    // Nicht der Muenchner Punkt, sondern die Zelle aus der Verbindung.
    expect(decision.kreis).toBe("Wuppertal");
    expect(decision.source).toBe("ip");
  });

  it("uebernimmt keine Koordinate, die genauer ist als die Anonymisierung", () => {
    const { request, formData } = submission(
      connectionFrom("BY", { lat: 48.137, lon: 11.575 }),
      { origin_lat: "51.2562", origin_lon: "7.1503", origin_source: "gps" },
    );

    expect(decideOrigin(request, formData, nrw).allowed).toBe(false);
  });
});

describe("Herkunftssignale", () => {
  /** Koeln, damit es einen zweiten Kreis innerhalb von NRW gibt. */
  const inCologne = anonymizeCoordinates(50.938, 6.96)!;

  it("hebt nichts auf, solange alle Signale denselben Kreis nennen", () => {
    const { request, formData } = submission(
      connectionFrom("NW", { lat: 51.256, lon: 7.15 }),
      {
        origin_lat: String(inNrw.lat),
        origin_lon: String(inNrw.lon),
        origin_source: "gps",
        origin_signals: JSON.stringify({ gps: inNrw }),
      },
    );
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.kreis).toBe("Wuppertal");
    // Verbindung und Standortabfrage zeigen beide nach Wuppertal - eine klare
    // Entscheidung, und dann wird nichts zusaetzlich gespeichert.
    expect(decision.signals).toEqual([]);
  });

  it("haelt alle Signale fest, wenn sie auf verschiedene Kreise zeigen", () => {
    const { request, formData } = submission(
      connectionFrom("NW", { lat: 50.938, lon: 6.96 }),
      {
        origin_lat: String(inNrw.lat),
        origin_lon: String(inNrw.lon),
        origin_source: "manual",
        origin_signals: JSON.stringify({ manual: inNrw, photo: inBavaria }),
      },
    );
    const decision = decideOrigin(request, formData, nrw);

    // Gespeichert wird weiterhin die Angabe mit der hoechsten Beweiskraft im
    // Gebiet; das Foto aus Bayern faellt dafuer durch.
    expect(decision.kreis).toBe("Wuppertal");

    // Absteigend nach Beweiskraft, unabhaengig davon, wie der Browser sie
    // geschickt hat.
    expect(decision.signals.map((signal) => signal.source)).toEqual(["photo", "manual", "ip"]);
    expect(decision.signals.map((signal) => signal.kreis)).toEqual([null, "Wuppertal", "Köln"]);
  });

  it("setzt das IP-Signal immer selbst, auch wenn der Browser eines mitschickt", () => {
    const { request, formData } = submission(
      connectionFrom("NW", { lat: 50.938, lon: 6.96 }),
      {
        origin_lat: String(inNrw.lat),
        origin_lon: String(inNrw.lon),
        origin_source: "gps",
        // Behauptet, die Verbindung komme aus Wuppertal - der Header sagt Koeln.
        origin_signals: JSON.stringify({ gps: inNrw, ip: inNrw }),
      },
    );
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.signals.find((signal) => signal.source === "ip")?.kreis).toBe("Köln");
  });

  it("verwirft ein zu genaues Signal, ohne die Einreichung zu verlieren", () => {
    const { request, formData } = submission(
      connectionFrom("NW", { lat: 50.938, lon: 6.96 }),
      {
        origin_lat: String(inNrw.lat),
        origin_lon: String(inNrw.lon),
        origin_source: "gps",
        origin_signals: JSON.stringify({ gps: inNrw, photo: { lat: 51.25621, lon: 7.15034 } }),
      },
    );
    const decision = decideOrigin(request, formData, nrw);

    expect(decision.allowed).toBe(true);
    expect(decision.signals.map((signal) => signal.source)).toEqual(["gps", "ip"]);
  });

  it("uebersteht kaputte Signale, statt die Einreichung abzuweisen", () => {
    for (const raw of ["", "kein json", "[]", "null", JSON.stringify({ gps: "irgendwas", quelle: inNrw })]) {
      const { request, formData } = submission(
        connectionFrom("NW", { lat: 51.256, lon: 7.15 }),
        { origin_signals: raw },
      );
      const decision = decideOrigin(request, formData, nrw);

      expect(decision.allowed).toBe(true);
      expect(decision.signals).toEqual([]);
    }
  });

  it("misst den Widerspruch am Kreis und nicht am Punkt", () => {
    const wuppertal = { source: "gps" as const, ...inNrw, kreis: "Wuppertal" };
    const nochmalWuppertal = { source: "photo" as const, ...inCologne, kreis: "Wuppertal" };
    const draussen = { source: "ip" as const, ...inBavaria, kreis: null };

    // Verschiedene Punkte, derselbe Kreis: kein Widerspruch.
    expect(signalsDisagree([wuppertal, nochmalWuppertal], nrw)).toBe(false);
    // Ein einzelnes Signal kann sich nicht widersprechen.
    expect(signalsDisagree([draussen], nrw)).toBe(false);
    // Innerhalb und ausserhalb ist der Fall aus Issue #87.
    expect(signalsDisagree([wuppertal, draussen], nrw)).toBe(true);
  });
});

describe("Widerspruch zwischen Verbindung und Ortsangabe", () => {
  it("meldet nur, wenn beide Angaben da sind und sich unterscheiden", () => {
    expect(hasOriginMismatch("DE-BY", "Wuppertal", nrw)).toBe(true);
    expect(hasOriginMismatch("DE-NW", "Wuppertal", nrw)).toBe(false);
    expect(hasOriginMismatch(null, "Wuppertal", nrw)).toBe(false);
    expect(hasOriginMismatch("DE-BY", null, nrw)).toBe(false);
    expect(hasOriginMismatch("DE-BY", "Wuppertal", { ...nrw, enabled: false })).toBe(false);
  });
});

describe("expectedIpRegionTag", () => {
  // Denselben Wert bekommt `claim_next_repair()` als Parameter, damit die
  // Schnellpruefung genau die Einreichungen ueberspringt, die die Konsole als
  // "Verbindung woanders" kennzeichnet.
  it("setzt Land und Unterregion zusammen", () => {
    expect(expectedIpRegionTag({ ...nrw, ipCountry: "DE", ipRegion: "NW" })).toBe("DE-NW");
  });

  it("nimmt ohne Unterregion nur das Land", () => {
    expect(expectedIpRegionTag({ ...nrw, ipCountry: "DE", ipRegion: "" })).toBe("DE");
  });

  it("prueft nicht, wenn die Gebietsbeschraenkung aus ist", () => {
    expect(expectedIpRegionTag({ ...nrw, enabled: false })).toBeNull();
  });

  it("passt zu hasOriginMismatch", () => {
    const tag = expectedIpRegionTag(nrw)!;
    expect(hasOriginMismatch(tag, "Wuppertal", nrw)).toBe(false);
    expect(hasOriginMismatch(`${tag}-anders`, "Wuppertal", nrw)).toBe(true);
  });
});
