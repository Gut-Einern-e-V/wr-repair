import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { buildQrGlyph } from "./qr-glyph";

const url = "https://reparatur.fab-bergisch.org/mitmachen";

/** Zerlegt das `d`-Attribut wieder in die einzelnen Modul-Laufweiten. */
function readRuns(path: string) {
  return [...path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)].map((match) => ({
    column: Number(match[1]),
    row: Number(match[2]),
    width: Number(match[3]),
  }));
}

describe("buildQrGlyph", () => {
  it("legt eine Ruhezone von vier Modulen um den Code", () => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    const glyph = buildQrGlyph(url);

    expect(glyph.size).toBe(modules.size + 8);
    for (const run of readRuns(glyph.path)) {
      expect(run.column).toBeGreaterThanOrEqual(4);
      expect(run.row).toBeGreaterThanOrEqual(4);
      expect(run.column + run.width).toBeLessThanOrEqual(glyph.size - 4);
    }
  });

  it("zeichnet genau die dunklen Module - nicht mehr und nicht weniger", () => {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    const expected = modules.data.reduce((total, bit) => total + (bit === 1 ? 1 : 0), 0);
    const drawn = readRuns(buildQrGlyph(url).path).reduce((total, run) => total + run.width, 0);

    expect(drawn).toBe(expected);
  });

  it("fasst waagerechte Nachbarn zu einem Zug zusammen, statt jedes Modul einzeln zu zeichnen", () => {
    const glyph = buildQrGlyph(url);
    const runs = readRuns(glyph.path);
    const drawnModules = runs.reduce((total, run) => total + run.width, 0);

    expect(runs.length).toBeGreaterThan(0);
    expect(runs.length).toBeLessThan(drawnModules);
  });
});
