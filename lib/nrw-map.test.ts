import { describe, expect, it } from "vitest";
import { hashString, nrwBounds, nrwOutline, positionForId, projectToUnitSquare, seededRandom, symbolicPosition } from "./nrw-map";

describe("projectToUnitSquare", () => {
  it("bildet die gesamte Kontur in das Einheitsquadrat ab", () => {
    for (const point of nrwOutline) {
      const projected = projectToUnitSquare(point);
      expect(projected.x).toBeGreaterThanOrEqual(0);
      expect(projected.x).toBeLessThanOrEqual(1);
      expect(projected.y).toBeGreaterThanOrEqual(0);
      expect(projected.y).toBeLessThanOrEqual(1);
    }
  });

  it("legt den Norden nach oben", () => {
    const north = projectToUnitSquare({ lat: nrwBounds.latMax, lon: 7 });
    const south = projectToUnitSquare({ lat: nrwBounds.latMin, lon: 7 });
    expect(north.y).toBeLessThan(south.y);
  });
});

describe("seededRandom", () => {
  it("liefert reproduzierbare Werte im Intervall [0, 1)", () => {
    const first = Array.from({ length: 5 }, seededRandom(hashString("abc")));
    const second = Array.from({ length: 5 }, seededRandom(hashString("abc")));

    expect(first).toEqual(second);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("symbolicPosition", () => {
  it("ist deterministisch pro ID", () => {
    expect(symbolicPosition("repair-1")).toEqual(symbolicPosition("repair-1"));
  });

  it("verteilt verschiedene IDs auf verschiedene Punkte", () => {
    const positions = new Set(Array.from({ length: 200 }, (_, index) => JSON.stringify(symbolicPosition(`id-${index}`))));
    expect(positions.size).toBeGreaterThan(190);
  });

  it("bleibt innerhalb der Kartenflaeche", () => {
    for (let index = 0; index < 500; index += 1) {
      const point = symbolicPosition(`id-${index}`);
      expect(point.x).toBeGreaterThan(-0.05);
      expect(point.x).toBeLessThan(1.05);
      expect(point.y).toBeGreaterThan(-0.05);
      expect(point.y).toBeLessThan(1.05);
    }
  });
});

describe("positionForId", () => {
  const cells = [
    { lat: 50.94, lon: 6.96, count: 40 },
    { lat: 51.51, lon: 7.47, count: 10 },
  ];

  it("faellt ohne Zellen auf die symbolische Position zurueck", () => {
    expect(positionForId("repair-1", [])).toEqual(symbolicPosition("repair-1"));
    expect(positionForId("repair-1", [{ lat: 51, lon: 7, count: 0 }])).toEqual(symbolicPosition("repair-1"));
  });

  it("ist deterministisch pro ID", () => {
    expect(positionForId("repair-1", cells)).toEqual(positionForId("repair-1", cells));
  });

  it("legt Punkte nahe an die Zellen und gewichtet nach Anzahl", () => {
    const koeln = projectToUnitSquare({ lat: cells[0].lat, lon: cells[0].lon });
    const dortmund = projectToUnitSquare({ lat: cells[1].lat, lon: cells[1].lon });

    let nearKoeln = 0;
    for (let index = 0; index < 400; index += 1) {
      const point = positionForId(`id-${index}`, cells);
      const toKoeln = Math.hypot(point.x - koeln.x, point.y - koeln.y);
      const toDortmund = Math.hypot(point.x - dortmund.x, point.y - dortmund.y);
      // Der Streuradius liegt weit unter dem Abstand der beiden Zellen.
      expect(Math.min(toKoeln, toDortmund)).toBeLessThan(0.03);
      if (toKoeln < toDortmund) nearKoeln += 1;
    }

    expect(nearKoeln).toBeGreaterThan(280);
    expect(nearKoeln).toBeLessThan(400);
  });
});
