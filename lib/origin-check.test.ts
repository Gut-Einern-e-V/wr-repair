import { describe, expect, it } from "vitest";
import { anonymizeCoordinates } from "./geo-anonymize";
import { decideOrigin, hasOriginMismatch, locateInRegion } from "./origin-check";
import { getRegionConfig } from "./region-config";

const nrw = getRegionConfig();

/** Wuppertal und Muenchen, jeweils schon auf ihre Rasterzelle geschnappt. */
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

  it("uebernimmt keine Koordinate, die nicht auf einem Rasterzellpunkt liegt", () => {
    const { request, formData } = submission(
      connectionFrom("BY", { lat: 48.137, lon: 11.575 }),
      { origin_lat: "51.2562", origin_lon: "7.1503", origin_source: "gps" },
    );

    expect(decideOrigin(request, formData, nrw).allowed).toBe(false);
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
