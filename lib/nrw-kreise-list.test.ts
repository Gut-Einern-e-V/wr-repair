import { describe, expect, it } from "vitest";
import { nrwKreiseList } from "./nrw-kreise-list";
import { kreisForPoint, nrwKreise } from "./nrw-map";
import { anonymizeCoordinates } from "./geo-anonymize";

describe("nrwKreiseList", () => {
  it("covers exactly the Kreise from nrwKreise, once each", () => {
    const expected = nrwKreise.map((kreis) => kreis.name).sort((a, b) => a.localeCompare(b, "de"));
    const actual = nrwKreiseList.map((kreis) => kreis.name).sort((a, b) => a.localeCompare(b, "de"));
    expect(actual).toEqual(expected);
  });

  it("every reference point resolves back to its own Kreis", () => {
    for (const kreis of nrwKreiseList) {
      expect(kreisForPoint({ lat: kreis.lat, lon: kreis.lon })).toBe(kreis.name);
    }
  });

  it("stays inside its own Kreis at radiusKm after the full anonymization pipeline", () => {
    // Deckt dieselbe Streuung ab, die das Formular tatsaechlich anwendet:
    // Radius/Winkel -> anonymizeCoordinates() (5-km-Raster + eigener Zell-Jitter)
    // -> kreisForPoint(). radiusKm ist empirisch gegen genau diesen Pfad
    // geprueft (siehe Kommentar in nrw-kreise-list.ts) - ein deterministisches
    // Raster aus Winkeln und Radiusanteilen haelt den Test schnell und
    // reproduzierbar, statt echten Zufall zu verwenden.
    for (const kreis of nrwKreiseList) {
      for (let angleIndex = 0; angleIndex < 24; angleIndex += 1) {
        const angle = (angleIndex / 24) * Math.PI * 2;
        for (const fraction of [0.25, 0.5, 0.75, 1]) {
          const distance = kreis.radiusKm * fraction;
          const point = {
            lat: kreis.lat + (Math.sin(angle) * distance) / 111.32,
            lon: kreis.lon + (Math.cos(angle) * distance) / (111.32 * Math.cos((kreis.lat * Math.PI) / 180)),
          };
          const anonymized = anonymizeCoordinates(point.lat, point.lon);
          expect(anonymized).not.toBeNull();
          expect(kreisForPoint(anonymized as { lat: number; lon: number })).toBe(kreis.name);
        }
      }
    }
  });
});
