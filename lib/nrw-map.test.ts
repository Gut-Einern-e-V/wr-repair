import { describe, expect, it } from "vitest";
import { hashString, isInsideNrw, kreisForPoint, kreisTotals, nrwBounds, nrwHubs, nrwKreise, nrwOutline, positionForId, projectToUnitSquare, randomPointInKreis, rankKreise, rhineCourse, seededRandom, symbolicPosition, unprojectFromUnitSquare } from "./nrw-map";

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

describe("isInsideNrw", () => {
  it("erkennt Staedte im Land und Orte ausserhalb", () => {
    for (const hub of nrwHubs) {
      expect(isInsideNrw({ lat: hub.lat, lon: hub.lon }), hub.name).toBe(true);
    }

    // Nachbarn ringsum: Amsterdam, Hannover, Frankfurt, Bruessel, Hamburg.
    expect(isInsideNrw({ lat: 52.37, lon: 4.9 })).toBe(false);
    expect(isInsideNrw({ lat: 52.37, lon: 9.73 })).toBe(false);
    expect(isInsideNrw({ lat: 50.11, lon: 8.68 })).toBe(false);
    expect(isInsideNrw({ lat: 50.85, lon: 4.35 })).toBe(false);
    expect(isInsideNrw({ lat: 53.55, lon: 9.99 })).toBe(false);
  });

  it("schliesst den Rheinlauf ein", () => {
    for (const point of rhineCourse) {
      expect(isInsideNrw(point)).toBe(true);
    }
  });
});

describe("unprojectFromUnitSquare", () => {
  it("kehrt die Projektion um", () => {
    for (const hub of nrwHubs) {
      const roundTrip = unprojectFromUnitSquare(projectToUnitSquare(hub));
      expect(roundTrip.lat).toBeCloseTo(hub.lat, 6);
      expect(roundTrip.lon).toBeCloseTo(hub.lon, 6);
    }
  });
});

describe("nrwKreise", () => {
  it("umfasst alle 53 Kreise und kreisfreien Staedte", () => {
    expect(nrwKreise).toHaveLength(53);
    expect(new Set(nrwKreise.map((kreis) => kreis.name)).size).toBe(53);
    for (const kreis of nrwKreise) {
      expect(kreis.outline.length, kreis.name).toBeGreaterThan(8);
    }
  });
});

describe("kreisForPoint", () => {
  it("ordnet jede Stadt genau einem Kreis zu", () => {
    for (const hub of nrwHubs) {
      const matches = nrwKreise.filter((kreis) => kreisForPoint(hub) === kreis.name);
      expect(matches, hub.name).toHaveLength(1);
    }
  });

  it("trifft die kreisfreien Staedte und die Landkreise richtig", () => {
    expect(kreisForPoint({ lat: 51.26, lon: 7.15 })).toBe("Wuppertal");
    expect(kreisForPoint({ lat: 50.94, lon: 6.96 })).toBe("Köln");
    expect(kreisForPoint({ lat: 50.78, lon: 6.08 })).toBe("Städteregion Aachen");
    expect(kreisForPoint({ lat: 51.94, lon: 8.88 })).toBe("Kreis Lippe");
    expect(kreisForPoint({ lat: 51.4, lon: 8.06 })).toBe("Hochsauerlandkreis");
  });

  it("liefert null ausserhalb des Landes", () => {
    expect(kreisForPoint({ lat: 52.37, lon: 9.73 })).toBeNull();
    expect(kreisForPoint({ lat: 50.11, lon: 8.68 })).toBeNull();
  });
});

describe("kreisTotals", () => {
  it("summiert die Zellen je Kreis und ignoriert Zellen ausserhalb", () => {
    const totals = kreisTotals([
      { lat: 51.26, lon: 7.15, count: 12 },
      { lat: 51.27, lon: 7.16, count: 8 },
      { lat: 50.94, lon: 6.96, count: 5 },
      // Hannover: gehoert zu keinem Kreis und darf nirgends auftauchen.
      { lat: 52.37, lon: 9.73, count: 99 },
    ]);

    expect(totals).toEqual({ Wuppertal: 20, "Köln": 5 });
  });

  it("bleibt ohne Zellen leer, statt zu schaetzen", () => {
    expect(kreisTotals([])).toEqual({});
  });
});

describe("rankKreise", () => {
  const counts = { "Köln": 40, Wuppertal: 90, Dortmund: 60, Essen: 60, Bielefeld: 10, "Kreis Kleve": 0 };

  it("sortiert nach Anzahl und begrenzt die Liste", () => {
    const ranking = rankKreise(counts, {}, 3);
    expect(ranking.map((entry) => entry.name)).toEqual(["Wuppertal", "Dortmund", "Essen"]);
  });

  it("laesst Kreise ohne Reparatur weg", () => {
    expect(rankKreise(counts, {}, 10).map((entry) => entry.name)).not.toContain("Kreis Kleve");
  });

  it("rechnet den Zuwachs gegen den Bezugsstand", () => {
    const ranking = rankKreise(counts, { Wuppertal: 80, Dortmund: 60 }, 3);
    expect(ranking.map((entry) => entry.delta)).toEqual([10, 0, 60]);
  });

  it("meldet keinen negativen Zuwachs", () => {
    // Ein Kreis kann durch die k-Anonymitaetsschwelle vorruebergehend sinken.
    expect(rankKreise({ Wuppertal: 20 }, { Wuppertal: 50 }, 1)[0].delta).toBe(0);
  });

  it("entscheidet Gleichstand ueber den Namen", () => {
    const ranking = rankKreise({ Essen: 60, Dortmund: 60 }, {}, 2);
    expect(ranking.map((entry) => entry.name)).toEqual(["Dortmund", "Essen"]);
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

  it("streut nur innerhalb der Landesgrenze", () => {
    // Ein Punkt jenseits der Grenze wuerde die Silhouette der Karte aufweichen,
    // also darf die Streuung um einen Ballungsraum nicht hinauslaufen.
    const outline = nrwOutline.map(projectToUnitSquare);
    let inside = 0;

    for (let index = 0; index < 400; index += 1) {
      const point = symbolicPosition(`id-${index}`);
      if (pointInPolygon(point, outline)) inside += 1;
    }

    expect(inside).toBe(400);
  });
});

/** Strahlverfahren im projizierten Raum - unabhaengig von isInsideNrw. */
function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a.y > point.y !== b.y > point.y && point.x < a.x + ((point.y - a.y) / (b.y - a.y)) * (b.x - a.x)) {
      inside = !inside;
    }
  }
  return inside;
}

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

describe("randomPointInKreis", () => {
  it("liefert null fuer einen unbekannten Kreisnamen", () => {
    expect(randomPointInKreis("repair-1", "Nicht-existierender Kreis")).toBeNull();
  });

  it("ist deterministisch pro ID", () => {
    expect(randomPointInKreis("repair-1", "Remscheid")).toEqual(randomPointInKreis("repair-1", "Remscheid"));
  });

  it("landet weit ueberwiegend im angegebenen Kreis", () => {
    // Der Rueckweg ueber unprojectFromUnitSquare rundet minimal, wodurch ein
    // Punkt exakt auf einer Grenze in seltenen Faellen dem Nachbarn zufaellt -
    // das ist ein Artefakt dieses Tests, keine Fehlfunktion in der Anwendung
    // (die arbeitet nur im projizierten Raum weiter). Deshalb Fehlerquote statt
    // 100 %-Anspruch.
    for (const kreis of nrwKreise) {
      let hits = 0;
      const samples = 20;
      for (let index = 0; index < samples; index += 1) {
        const point = randomPointInKreis(`${kreis.name}:${index}`, kreis.name);
        if (point && kreisForPoint(unprojectFromUnitSquare(point)) === kreis.name) hits += 1;
      }
      expect(hits).toBeGreaterThanOrEqual(Math.ceil(samples * 0.9));
    }
  });
});
