import { describe, expect, it } from "vitest";
import { nrwOutline, projectToUnitSquare } from "./nrw-map";
import { OUTLINE_SIZE, nrwOutlinePath } from "./nrw-outline-path";

/**
 * Der vorberechnete Pfad ist eine Kopie der Landesgrenze aus lib/nrw-map.ts.
 * Kopien veralten - deshalb wird sie hier bei jedem Testlauf neu erzeugt und
 * verglichen. Schlaegt das fehl, wurde die Kontur geaendert und der Pfad muss
 * mit derselben Formel neu erzeugt werden.
 */
describe("vorberechnete Landesgrenze", () => {
  it("entspricht exakt der projizierten Kontur aus nrw-map", () => {
    const expected = nrwOutline
      .map((point, index) => {
        const { x, y } = projectToUnitSquare(point);
        return `${index === 0 ? "M" : "L"}${(x * OUTLINE_SIZE).toFixed(1)} ${(y * OUTLINE_SIZE).toFixed(1)}`;
      })
      .join(" ") + " Z";

    expect(nrwOutlinePath).toBe(expected);
  });
});
