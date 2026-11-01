import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { fitLogo, MAX_LOGO_EDGE } from "./fit-logo";
import { readImageDimensions } from "./image-dimensions";

function blank(width: number, height: number) {
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
}

describe("Partnerlogos auf anzeigbare Groesse bringen", () => {
  it("verkleinert ein riesiges PNG und behaelt Format und Seitenverhaeltnis", async () => {
    // Wie das DOTT-Logo aus Issue #174, nur in einem Zehntel der Groesse.
    const input = await blank(2252, 750).png().toBuffer();
    const output = await fitLogo(input, "image/png");

    expect(output).not.toBeNull();
    expect(readImageDimensions(output!)).toEqual({ width: MAX_LOGO_EDGE, height: 400 });
    expect((await sharp(output!).metadata()).format).toBe("png");
  });

  it("verkleinert hochkant nach der laengeren Kante", async () => {
    const output = await fitLogo(await blank(800, 2400).jpeg().toBuffer(), "image/jpeg");
    expect(readImageDimensions(output!)).toEqual({ width: 400, height: MAX_LOGO_EDGE });
  });

  it("laesst kleine Logos unveraendert", async () => {
    const input = await blank(600, 200).webp().toBuffer();
    expect(await fitLogo(input, "image/webp")).toBe(input);
  });

  it("laesst SVGs durch", async () => {
    const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>');
    expect(await fitLogo(input, "image/svg+xml")).toBe(input);
  });

  it("weist Dateien ab, die nicht zum Format passen", async () => {
    expect(await fitLogo(Buffer.from("kein Bild, nur Text, aber lang genug"), "image/png")).toBeNull();
  });
});
