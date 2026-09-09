import { describe, expect, it } from "vitest";
import { isOrderDirection, reorder, type Ordered } from "./sort-order";

function list(...ids: string[]): Ordered[] {
  return ids.map((id, index) => ({ id, sort_order: index }));
}

/** Die Liste, wie sie nach den zurueckgegebenen Aenderungen aussieht. */
function applied(items: Ordered[], changes: Ordered[] | null) {
  const next = new Map(changes?.map((row) => [row.id, row.sort_order]));
  return [...items]
    .map((item) => ({ id: item.id, sort_order: next.get(item.id) ?? item.sort_order }))
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((item) => item.id);
}

describe("reorder", () => {
  it("schiebt einen Eintrag nach oben", () => {
    const items = list("a", "b", "c");
    expect(applied(items, reorder(items, "c", "up"))).toEqual(["a", "c", "b"]);
  });

  it("schiebt einen Eintrag nach unten", () => {
    const items = list("a", "b", "c");
    expect(applied(items, reorder(items, "a", "down"))).toEqual(["b", "a", "c"]);
  });

  it("laesst den ersten Eintrag nicht weiter nach oben", () => {
    expect(reorder(list("a", "b"), "a", "up")).toBeNull();
  });

  it("laesst den letzten Eintrag nicht weiter nach unten", () => {
    expect(reorder(list("a", "b"), "b", "down")).toBeNull();
  });

  it("kennt keinen fremden Eintrag", () => {
    expect(reorder(list("a", "b"), "x", "up")).toBeNull();
  });

  /* Der Fall, um den es hier eigentlich geht: Alle Zeilen kommen mit 0 auf die
     Welt. Ein Tausch zweier Nullen waere kein Tausch, deshalb wird die ganze
     Liste neu durchnummeriert. */
  it("nummeriert eine Liste mit lauter Nullen durch", () => {
    const items = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 0 },
      { id: "c", sort_order: 0 },
    ];
    const changes = reorder(items, "c", "up");
    expect(changes).toEqual([{ id: "c", sort_order: 1 }, { id: "b", sort_order: 2 }]);
    expect(applied(items, changes)).toEqual(["a", "c", "b"]);
  });

  it("gibt nur die Zeilen zurueck, deren Zahl sich aendert", () => {
    const items = list("a", "b", "c", "d");
    expect(reorder(items, "c", "up")).toEqual([{ id: "c", sort_order: 1 }, { id: "b", sort_order: 2 }]);
  });

  it("nummeriert Luecken beim Verschieben glatt", () => {
    const items = [
      { id: "a", sort_order: 5 },
      { id: "b", sort_order: 9 },
      { id: "c", sort_order: 40 },
    ];
    expect(applied(items, reorder(items, "b", "down"))).toEqual(["a", "c", "b"]);
  });
});

describe("isOrderDirection", () => {
  it("nimmt nur hoch und runter", () => {
    expect(isOrderDirection("up")).toBe(true);
    expect(isOrderDirection("down")).toBe(true);
    expect(isOrderDirection("left")).toBe(false);
    expect(isOrderDirection(undefined)).toBe(false);
  });
});
