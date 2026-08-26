import { describe, expect, it } from "vitest";
import { anonymizeCoordinates, isAnonymizedPoint, CELL_SIZE_KM } from "./geo-anonymize";

/** Grobe Entfernung in Kilometern zwischen zwei Punkten. */
function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const latKm = (a.lat - b.lat) * 111.32;
  const lonKm = (a.lon - b.lon) * 111.32 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(latKm * latKm + lonKm * lonKm);
}

const koeln = { lat: 50.9375, lon: 6.9603 };

describe("anonymizeCoordinates", () => {
  it("verschiebt den Punkt, gibt ihn also nie unveraendert zurueck", () => {
    const result = anonymizeCoordinates(koeln.lat, koeln.lon);
    expect(result).not.toBeNull();
    expect(result).not.toEqual(koeln);
  });

  it("bleibt in der Groessenordnung einer Zelle vom Original entfernt", () => {
    const result = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    expect(distanceKm(koeln, result)).toBeLessThan(CELL_SIZE_KM * 1.5);
  });

  it("ist idempotent: ein zweiter Durchlauf aendert nichts mehr", () => {
    const once = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    const twice = anonymizeCoordinates(once.lat, once.lon)!;
    expect(twice).toEqual(once);
  });

  it("bildet nahe beieinander liegende Punkte auf denselben Wert ab", () => {
    const a = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    const b = anonymizeCoordinates(koeln.lat + 0.0005, koeln.lon + 0.0005)!;
    expect(b).toEqual(a);
  });

  it("mittelt sich nicht auf den echten Punkt zurueck", () => {
    // Der entscheidende Unterschied zu zufaelligem Jitter: Viele Messungen
    // rund um denselben Ort ergeben immer denselben Versatz, statt sich im
    // Mittel dem wahren Punkt anzunaehern.
    const samples = Array.from({ length: 200 }, (_, index) =>
      anonymizeCoordinates(koeln.lat + (index % 7) * 0.0002, koeln.lon + (index % 5) * 0.0002)!,
    );
    const mean = samples.reduce(
      (sum, point) => ({ lat: sum.lat + point.lat / samples.length, lon: sum.lon + point.lon / samples.length }),
      { lat: 0, lon: 0 },
    );
    expect(distanceKm(koeln, mean)).toBeGreaterThan(0.3);
  });

  it("trennt weit auseinander liegende Orte weiterhin", () => {
    const koelnCell = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    const dortmundCell = anonymizeCoordinates(51.5136, 7.4653)!;
    expect(dortmundCell).not.toEqual(koelnCell);
  });

  it("weist unbrauchbare Eingaben zurueck", () => {
    expect(anonymizeCoordinates(0, 0)).toBeNull();
    expect(anonymizeCoordinates(Number.NaN, 7)).toBeNull();
    expect(anonymizeCoordinates(91, 7)).toBeNull();
    expect(anonymizeCoordinates("51.2", 7)).toBeNull();
    expect(anonymizeCoordinates(undefined, undefined)).toBeNull();
  });
});

describe("isAnonymizedPoint", () => {
  it("akzeptiert eigene Ergebnisse", () => {
    const point = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    expect(isAnonymizedPoint(point.lat, point.lon)).toBe(true);
  });

  it("lehnt genaue Koordinaten ab, die nicht aus dem Raster stammen", () => {
    expect(isAnonymizedPoint(koeln.lat, koeln.lon)).toBe(false);
  });

  it("lehnt Werte ab, die knapp neben einem Zellpunkt liegen", () => {
    const point = anonymizeCoordinates(koeln.lat, koeln.lon)!;
    expect(isAnonymizedPoint(point.lat + 0.004, point.lon)).toBe(false);
  });
});
