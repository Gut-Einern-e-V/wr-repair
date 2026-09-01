import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readImageDimensions } from "./image-dimensions";

const photos = path.join(process.cwd(), "public", "photos");

describe("Bildmasse aus dem Dateikopf", () => {
  it("liest die Masse der Markenbilder", async () => {
    const cases: [string, number, number][] = [
      ["fahrrad-pexels-cottonbro-10505928.jpg", 1600, 1067],
      ["werkstatt-pexels-cottonbro-4482005.jpg", 1067, 1600],
      ["gemeinsam-feiern-ki-generiert.jpg", 864, 1234],
    ];

    for (const [file, width, height] of cases) {
      expect(readImageDimensions(await readFile(path.join(photos, file)))).toEqual({ width, height });
    }
  });

  it("liest PNG aus dem IHDR-Block", async () => {
    const png = await readFile(path.join(process.cwd(), "public", "icons", "icon-192.png"));
    expect(readImageDimensions(png)).toEqual({ width: 192, height: 192 });
  });

  it("tauscht Breite und Hoehe bei gedrehter EXIF-Ausrichtung", () => {
    expect(readImageDimensions(jpegWithOrientation(6))).toEqual({ width: 200, height: 400 });
    expect(readImageDimensions(jpegWithOrientation(1))).toEqual({ width: 400, height: 200 });
  });

  it("gibt null zurueck, wenn das Format unbekannt ist", () => {
    expect(readImageDimensions(Buffer.alloc(64))).toBeNull();
    expect(readImageDimensions(Buffer.from("kein Bild, nur Text in einer Datei."))).toBeNull();
  });
});

/** Minimales JPEG aus EXIF-Segment und Start-of-Frame - mehr braucht der Leser nicht. */
function jpegWithOrientation(orientation: number) {
  // "Exif\0\0" (6) + TIFF-Kopf (8) + ein IFD-Eintrag samt Zaehler (2 + 12).
  const exifPayload = Buffer.alloc(28);
  exifPayload.write("Exif\0\0", 0, "latin1");
  exifPayload.write("MM", 6, "latin1"); // Big Endian
  exifPayload.writeUInt16BE(0x002a, 8);
  exifPayload.writeUInt32BE(8, 10); // IFD0 direkt hinter dem TIFF-Kopf
  exifPayload.writeUInt16BE(1, 14); // ein Eintrag
  exifPayload.writeUInt16BE(0x0112, 16); // Tag "Orientation"
  exifPayload.writeUInt16BE(3, 18); // Typ SHORT
  exifPayload.writeUInt32BE(1, 20);
  exifPayload.writeUInt16BE(orientation, 24); // Wertfeld des Eintrags

  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1]),
    lengthPrefixed(exifPayload),
  ]);

  const frame = Buffer.alloc(7);
  frame.writeUInt8(8, 0); // Bittiefe
  frame.writeUInt16BE(200, 1); // Hoehe
  frame.writeUInt16BE(400, 3); // Breite
  const sof = Buffer.concat([Buffer.from([0xff, 0xc0]), lengthPrefixed(frame)]);

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sof]);
}

function lengthPrefixed(payload: Buffer) {
  const header = Buffer.alloc(2);
  header.writeUInt16BE(payload.length + 2, 0);
  return Buffer.concat([header, payload]);
}
