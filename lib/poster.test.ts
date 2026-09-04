import { describe, expect, it } from "vitest";
import {
  SHEET_LONG_MM,
  SHEET_SHORT_MM,
  posterBackgroundOrder,
  posterBackgrounds,
  posterCopy,
  posterFormatOrder,
  posterFormats,
  posterLanguageLabel,
  sheetSizeMm,
  stepsFit,
  trilingualOrder,
} from "./poster";

describe("Aufsteller-Formate", () => {
  it("fuellt den A4-Bogen in jedem Format restlos aus", () => {
    for (const format of posterFormatOrder) {
      const spec = posterFormats[format];
      const sheet = sheetSizeMm(format);
      expect(spec.columns * spec.rows).toBe(spec.perSheet);
      expect(spec.columns * spec.cardWidthMm).toBeCloseTo(sheet.widthMm, 5);
      expect(spec.rows * spec.cardHeightMm).toBeCloseTo(sheet.heightMm, 5);
    }
  });

  it("haelt jeden Aufsteller im DIN-Hochformat, egal wie der Bogen liegt", () => {
    const dinRatio = SHEET_SHORT_MM / SHEET_LONG_MM;
    for (const format of posterFormatOrder) {
      const spec = posterFormats[format];
      expect(spec.cardWidthMm / spec.cardHeightMm).toBeCloseTo(dinRatio, 3);
      expect(spec.cardWidthMm).toBeLessThan(spec.cardHeightMm);
    }
  });

  it("laesst die Schrittliste weg, wo sie zu klein wuerde", () => {
    expect(stepsFit("a4", "de")).toBe(true);
    expect(stepsFit("a5", "en")).toBe(true);
    expect(stepsFit("a6", "de")).toBe(false);
    expect(stepsFit("a4", "all")).toBe(false);
    expect(stepsFit("a5", "all")).toBe(false);
  });
});

describe("Aufsteller-Texte", () => {
  it("beschriftet jede Sprachfassung und die dreisprachige Variante", () => {
    expect(posterLanguageLabel("de")).toBe("Deutsch");
    expect(posterLanguageLabel("ar")).toBe(posterCopy.ar.nativeName);
    expect(posterLanguageLabel("all")).toBe("Dreisprachig");
  });

  it("liefert fuer jede Sprache eine vollstaendige Fassung", () => {
    for (const language of trilingualOrder) {
      const copy = posterCopy[language];
      expect(copy.headline.length).toBeGreaterThanOrEqual(2);
      expect(copy.steps).toHaveLength(3);
      for (const text of [copy.kicker, copy.lead, copy.leadShort, copy.footer, ...copy.headline, ...copy.steps]) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("setzt Arabisch rechtslaeufig und die uebrigen Fassungen linkslaeufig", () => {
    expect(posterCopy.ar.direction).toBe("rtl");
    expect(posterCopy.de.direction).toBe("ltr");
    expect(posterCopy.en.direction).toBe("ltr");
  });

  it("haelt die Aufkleberzeilen kurz, damit im Druck nichts mitten im Wort umbricht", () => {
    for (const language of trilingualOrder) {
      for (const line of posterCopy[language].headline) {
        expect(line.length).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe("Aufsteller-Hintergruende", () => {
  it("gibt nur den farbigen Varianten runde Ecken", () => {
    expect(posterBackgrounds.paper.rounded).toBe(false);
    for (const background of posterBackgroundOrder.filter((value) => value !== "paper")) {
      expect(posterBackgrounds[background].rounded).toBe(true);
    }
  });
});
