import { describe, expect, it } from "vitest";
import { treemap, type TreemapRect } from "./treemap";

/** Ueberlappen sich zwei Rechtecke mit mehr als Rundungsfehler? */
function overlaps(a: TreemapRect, b: TreemapRect) {
  const slack = 1e-6;
  return (
    a.x + a.width - slack > b.x &&
    b.x + b.width - slack > a.x &&
    a.y + a.height - slack > b.y &&
    b.y + b.height - slack > a.y
  );
}

describe("treemap", () => {
  const categories = [
    { key: "furniture", value: 40 },
    { key: "bicycle", value: 25 },
    { key: "tools", value: 15 },
    { key: "textiles", value: 10 },
    { key: "watches", value: 6 },
    { key: "toys", value: 4 },
  ];

  it("fuellt die Flaeche vollstaendig aus", () => {
    const rects = treemap(categories, 400, 300);
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBeCloseTo(400 * 300, 3);
  });

  it("bleibt innerhalb der Flaeche", () => {
    for (const rect of treemap(categories, 400, 300)) {
      expect(rect.x).toBeGreaterThanOrEqual(-1e-6);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-6);
      expect(rect.x + rect.width).toBeLessThanOrEqual(400 + 1e-6);
      expect(rect.y + rect.height).toBeLessThanOrEqual(300 + 1e-6);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
    }
  });

  it("legt keine Kachel auf eine andere", () => {
    const rects = treemap(categories, 400, 300);
    for (let index = 0; index < rects.length; index += 1) {
      for (let other = index + 1; other < rects.length; other += 1) {
        expect(overlaps(rects[index], rects[other]), `${rects[index].key} / ${rects[other].key}`).toBe(false);
      }
    }
  });

  it("haelt die Flaechen im Verhaeltnis der Werte", () => {
    const rects = treemap(categories, 400, 300);
    const total = categories.reduce((sum, item) => sum + item.value, 0);
    for (const rect of rects) {
      const expected = (rect.value / total) * 400 * 300;
      expect(rect.width * rect.height).toBeCloseTo(expected, 2);
    }
  });

  it("laesst leere Kategorien weg", () => {
    const rects = treemap([...categories, { key: "leer", value: 0 }, { key: "negativ", value: -5 }], 400, 300);
    expect(rects.map((rect) => rect.key)).not.toContain("leer");
    expect(rects.map((rect) => rect.key)).not.toContain("negativ");
    expect(rects).toHaveLength(categories.length);
  });

  it("sortiert absteigend und bei Gleichstand nach Schluessel", () => {
    const rects = treemap([{ key: "b", value: 5 }, { key: "a", value: 5 }, { key: "c", value: 9 }], 100, 100);
    expect(rects.map((rect) => rect.key)).toEqual(["c", "a", "b"]);
  });

  it("gibt der groessten Kategorie die groesste Kachel", () => {
    const rects = treemap(categories, 400, 300);
    const biggest = rects.reduce((best, rect) => (rect.width * rect.height > best.width * best.height ? rect : best));
    expect(biggest.key).toBe("furniture");
  });

  it("kommt mit einer einzigen Kategorie aus", () => {
    expect(treemap([{ key: "solo", value: 3 }], 200, 100)).toEqual([
      { key: "solo", value: 3, x: 0, y: 0, width: 200, height: 100 },
    ]);
  });

  it("liefert nichts ohne Werte oder ohne Flaeche", () => {
    expect(treemap([], 400, 300)).toEqual([]);
    expect(treemap([{ key: "a", value: 0 }], 400, 300)).toEqual([]);
    expect(treemap(categories, 0, 300)).toEqual([]);
    expect(treemap(categories, 400, -1)).toEqual([]);
  });

  it("bleibt auch bei sehr schiefer Verteilung sauber", () => {
    const skewed = [{ key: "riesig", value: 10_000 }, { key: "winzig", value: 1 }, { key: "klein", value: 3 }];
    const rects = treemap(skewed, 500, 200);
    const area = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(area).toBeCloseTo(500 * 200, 3);
    for (const rect of rects) expect(rect.width * rect.height).toBeGreaterThan(0);
  });
});
