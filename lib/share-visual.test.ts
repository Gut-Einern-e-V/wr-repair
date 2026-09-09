import { describe, expect, it } from "vitest";
import {
  isShareVisualFormat,
  parseShareVisualFormat,
  shareVisualClaims,
  shareVisualFileName,
  shareVisualFormatOrder,
  shareVisualFormats,
  shareVisualGroundOrder,
  shareVisualGrounds,
  shareVisualHeadlineSize,
  shareVisualLook,
  shareVisualPath,
  shareVisualSeed,
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

describe("Aussehen einer Karte", () => {
  const someId = "3f1b7c2e-8a4d-4f10-9b22-5e6d7c8a9b01";

  it("bleibt fuer dieselbe Reparatur gleich", () => {
    // Der wichtigste Punkt: Vorschau und heruntergeladene Datei muessen
    // dasselbe Bild zeigen, und ein zweiter Aufruf darf nichts veraendern.
    expect(shareVisualLook(someId)).toEqual(shareVisualLook(someId));
    expect(shareVisualSeed(someId)).toBe(shareVisualSeed(someId));
  });

  it("faellt fuer verschiedene Reparaturen verschieden aus", () => {
    const ids = Array.from({ length: 200 }, (_, index) => `${index.toString(16).padStart(8, "0")}-8a4d-4f10-9b22-5e6d7c8a9b01`);
    const looks = new Set(ids.map((id) => {
      const look = shareVisualLook(id);
      return `${look.ground}|${look.claim.join("/")}`;
    }));

    // Alle Grundfarben mal alle Sprueche - waeren Grund und Spruch an
    // dieselbe Stelle des Streuwerts gekoppelt, gaebe es nur vier.
    expect(looks.size).toBe(shareVisualGroundOrder.length * shareVisualClaims.length);
  });

  it("nutzt jede Grundfarbe", () => {
    const grounds = new Set(Array.from({ length: 200 }, (_, index) =>
      shareVisualLook(`${index.toString(16).padStart(8, "0")}-8a4d-4f10-9b22-5e6d7c8a9b01`).ground));

    for (const ground of shareVisualGroundOrder) {
      expect(grounds).toContain(ground);
    }
  });

  it("neigt jede Aufkleberzeile, aber unter zwei Grad", () => {
    // Styleguide 7.1: darueber wirkt es wie ein Fehler und nicht wie ein
    // Aufkleber.
    for (let index = 0; index < 200; index += 1) {
      const look = shareVisualLook(`${index.toString(16).padStart(8, "0")}-8a4d-4f10-9b22-5e6d7c8a9b01`);
      expect(look.rotations).toHaveLength(look.claim.length);

      for (const rotation of look.rotations) {
        expect(Math.abs(rotation)).toBeGreaterThan(0);
        expect(Math.abs(rotation)).toBeLessThan(2);
      }
    }
  });

  it("neigt aufeinanderfolgende Zeilen in verschiedene Richtungen", () => {
    const zigzag = shareVisualLook(someId).rotations;
    if (zigzag.length > 1) {
      expect(Math.sign(zigzag[0])).not.toBe(Math.sign(zigzag[1]));
    }
  });

  it("haelt Aufkleber und Grund aus verschiedenen Farben", () => {
    for (const ground of shareVisualGroundOrder) {
      const spec = shareVisualGrounds[ground];
      expect(spec.sticker).not.toBe(spec.ground);
      expect(spec.stickerText).not.toBe(spec.sticker);
      expect(spec.text).not.toBe(spec.ground);
    }
  });
});

describe("shareVisualHeadlineSize", () => {
  it("bleibt bei der Grundgroesse, solange der Spruch passt", () => {
    expect(shareVisualHeadlineSize(["Wieder ganz."], 56, 900)).toBe(56);
  });

  it("verkleinert einen zu langen Spruch, statt ihn ueberlaufen zu lassen", () => {
    // Satori bricht nicht von selbst um - eine zu lange Zeile liefe aus dem
    // Aufkleber heraus.
    const long = "Ein ausgesprochen langer Spruch, der so nie hineinpasst";
    expect(shareVisualHeadlineSize([long], 56, 900)).toBeLessThan(56);
  });

  it("richtet sich nach der laengsten Zeile", () => {
    const claim = ["kurz", "eine deutlich laengere Zeile als die erste"];
    expect(shareVisualHeadlineSize(claim, 56, 400)).toBe(shareVisualHeadlineSize([claim[1]], 56, 400));
  });

  it("laesst jeden hinterlegten Spruch nahe an der Grundgroesse", () => {
    /* Die Sprueche in `shareVisualClaims` sind so gewaehlt, dass sie in beide
       Formate passen. Ein paar Pixel darf die Grenze abziehen - die
       angenommenen 0,52 em je Zeichen sind bewusst zu hoch geschaetzt, damit
       nichts ueberlaeuft, und der laengste Spruch landet dadurch knapp
       darunter. Wuerde ein neuer Spruch deutlich schrumpfen, faellt er in der
       Reihe der Bilder auf, und dieser Test schlaegt an. */
    for (const claim of shareVisualClaims) {
      expect(shareVisualHeadlineSize(claim, 56, 880)).toBeGreaterThanOrEqual(52);
      expect(shareVisualHeadlineSize(claim, 74, 864)).toBeGreaterThanOrEqual(70);
    }
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
