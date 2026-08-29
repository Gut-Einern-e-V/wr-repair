import { describe, expect, it } from "vitest";
import { anonymizeCoordinates, isCoarsePoint, BLUR_RADIUS_KM, DECIMALS } from "./geo-anonymize";

/** Grobe Entfernung in Kilometern zwischen zwei Punkten. */
function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const latKm = (a.lat - b.lat) * 111.32;
  const lonKm = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(latKm * latKm + lonKm * lonKm);
}

const koeln = { lat: 50.9375, lon: 6.9603 };

/** Ein Stapel Ergebnisse derselben Eingabe - der Versatz ist zufaellig. */
function sample(size: number) {
  return Array.from({ length: size }, () => anonymizeCoordinates(koeln.lat, koeln.lon)!);
}

describe("anonymizeCoordinates", () => {
  it("verschiebt den Punkt, gibt ihn also nie unveraendert zurueck", () => {
    for (const point of sample(50)) {
      expect(point).not.toEqual(koeln);
    }
  });

  it("bleibt innerhalb des Versatzradius", () => {
    // Die Rundung kann den Punkt um bis zu ~78 m ueber den Radius schieben.
    for (const point of sample(500)) {
      expect(distanceKm(koeln, point)).toBeLessThanOrEqual(BLUR_RADIUS_KM + 0.1);
    }
  });

  it("liefert bei gleicher Eingabe verschiedene Ergebnisse", () => {
    // Genau das unterscheidet den Versatz vom frueheren Raster: Zwei
    // Reparaturen vom selben Ort bekommen nicht denselben Wert.
    const distinct = new Set(sample(50).map((point) => `${point.lat}:${point.lon}`));
    expect(distinct.size).toBeGreaterThan(30);
  });

  it("rundet auf die Genauigkeit der Datenbankspalte", () => {
    const factor = 10 ** DECIMALS;
    for (const point of sample(100)) {
      expect(Math.round(point.lat * factor) / factor).toBe(point.lat);
      expect(Math.round(point.lon * factor) / factor).toBe(point.lon);
    }
  });

  it("verteilt gleichmaessig ueber die Flaeche statt zur Mitte hin", () => {
    // Bei Gleichverteilung ueber die Kreisflaeche liegt die Haelfte der Punkte
    // ausserhalb des halben Radius (die aeussere Haelfte hat dieselbe Flaeche).
    // Ohne die Wurzel im Radius waeren es nur rund ein Viertel - dann waere der
    // echte Ort deutlich wahrscheinlicher als sein Umfeld.
    const outer = sample(600).filter((point) => distanceKm(koeln, point) > BLUR_RADIUS_KM / 2).length;
    expect(outer).toBeGreaterThan(600 * 0.6);
    expect(outer).toBeLessThan(600 * 0.9);
  });

  it("weist unbrauchbare Eingaben ab", () => {
    expect(anonymizeCoordinates(0, 0)).toBeNull();
    expect(anonymizeCoordinates(Number.NaN, 7)).toBeNull();
    expect(anonymizeCoordinates(91, 7)).toBeNull();
    expect(anonymizeCoordinates("51.2", 7)).toBeNull();
    expect(anonymizeCoordinates(undefined, undefined)).toBeNull();
  });
});

describe("isCoarsePoint", () => {
  it("nimmt an, was aus der Anonymisierung kommt", () => {
    for (const point of sample(50)) {
      expect(isCoarsePoint(point.lat, point.lon)).toBe(true);
    }
  });

  it("weist eine rohe GPS-Koordinate ab", () => {
    expect(isCoarsePoint(51.26583, 7.16142)).toBe(false);
    expect(isCoarsePoint(koeln.lat, koeln.lon)).toBe(false);
  });

  it("weist Unsinn ab", () => {
    expect(isCoarsePoint(Number.NaN, 7)).toBe(false);
    expect(isCoarsePoint(0, 0)).toBe(false);
    expect(isCoarsePoint("51.2", 7)).toBe(false);
    expect(isCoarsePoint(91, 7)).toBe(false);
  });

  it("kann nicht erkennen, ob wirklich verschoben wurde", () => {
    // Festgehalten, weil es die bewusst in Kauf genommene Schwaeche des
    // Verfahrens ist: Ein auf 110 m gerundeter echter Ort sieht fuer den
    // Server genauso aus wie ein verschobener (siehe Modulkopf).
    expect(isCoarsePoint(51.266, 7.161)).toBe(true);
  });
});
