import { describe, expect, it } from "vitest";
import {
  isShareVisualFormat,
  parseShareVisualFormat,
  shareVisualFileName,
  shareVisualFormatOrder,
  shareVisualFormats,
  shareVisualPath,
} from "./share-visual";

describe("Formate des Teilbildes", () => {
  it("liefert beide Formate in 1080 Pixel Breite", () => {
    // Unter 1080 skalieren Instagram, Facebook und TikTok das Bild hoch.
    for (const format of shareVisualFormatOrder) {
      expect(shareVisualFormats[format].width).toBe(1080);
    }
  });

  it("haelt das Quadrat quadratisch und das Hochformat bei 9:16", () => {
    expect(shareVisualFormats.square.height).toBe(shareVisualFormats.square.width);
    expect(shareVisualFormats.story.height / shareVisualFormats.story.width).toBeCloseTo(16 / 9, 5);
  });

  it("beschreibt jedes Format mit Namen und Einsatzort", () => {
    for (const format of shareVisualFormatOrder) {
      expect(shareVisualFormats[format].label.length).toBeGreaterThan(0);
      expect(shareVisualFormats[format].hint.length).toBeGreaterThan(0);
    }
  });
});

describe("parseShareVisualFormat", () => {
  it("nimmt die beiden bekannten Formate", () => {
    expect(parseShareVisualFormat("square")).toBe("square");
    expect(parseShareVisualFormat("story")).toBe("story");
  });

  it("faellt auf das Quadrat zurueck statt abzubrechen", () => {
    // Die Adresse kommt aus dem Browser: Ein unbekanntes Format darf kein
    // Fehler sein, sondern das gaengigere Bild.
    expect(parseShareVisualFormat(null)).toBe("square");
    expect(parseShareVisualFormat("")).toBe("square");
    expect(parseShareVisualFormat("hochkant")).toBe("square");
  });

  it("erkennt nur Zeichenketten als Format", () => {
    expect(isShareVisualFormat("square")).toBe(true);
    expect(isShareVisualFormat(undefined)).toBe(false);
    expect(isShareVisualFormat(1)).toBe(false);
  });
});

describe("Adresse und Dateiname", () => {
  it("baut die Bildadresse mit Format", () => {
    expect(shareVisualPath("abc", "story")).toBe("/reparatur/abc/share-image?format=story");
  });

  it("nennt die Datei nach dem Projekt und dem Format, ohne die Kennung", () => {
    // Der Name reist mit der Datei weiter - die Kennung der Einreichung muss
    // das nicht tun.
    expect(shareVisualFileName("square")).toBe("reparaturrekord-nrw-quadrat.png");
    expect(shareVisualFileName("story")).toBe("reparaturrekord-nrw-story.png");
    expect(shareVisualFileName("square")).not.toContain("/");
  });
});
