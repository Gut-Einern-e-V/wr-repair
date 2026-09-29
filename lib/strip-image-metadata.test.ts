import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractExif } from "./exif";
import { readImageDimensions } from "./image-dimensions";
import { stripImageMetadata } from "./strip-image-metadata";

const photos = path.join(process.cwd(), "public", "photos");

describe("Metadaten aus hochgeladenen Bildern entfernen", () => {
  it("entfernt GPS aus einem JPEG und behaelt die Ausrichtung", async () => {
    const original = await jpegWithGps(6);
    expect((await extractExif(toArrayBuffer(original))).latitude).toBeCloseTo(51.25, 2);

    const stripped = stripImageMetadata(original, "image/jpeg");
    expect(stripped).not.toBeNull();

    const exif = await extractExif(toArrayBuffer(stripped!));
    expect(exif.latitude).toBeNull();
    expect(exif.longitude).toBeNull();
    expect(exif.capturedAt).toBeNull();
    expect(contains(stripped!, "Kommentar mit Namen")).toBe(false);
    expect(contains(stripped!, "http://ns.adobe.com/xap")).toBe(false);

    // Hochkant bleibt hochkant.
    expect(readImageDimensions(Buffer.from(stripped!))).toEqual({ width: 200, height: 400 });
    // Die Bilddaten hinter Start of Scan bleiben unveraendert.
    expect(endsWith(stripped!, scanData)).toBe(true);
  });

  it("laesst echte Fotos lesbar und die Bilddaten unangetastet", async () => {
    const file = await readFile(path.join(photos, "fahrrad-pexels-cottonbro-10505928.jpg"));
    const stripped = stripImageMetadata(new Uint8Array(file), "image/jpeg");
    expect(stripped).not.toBeNull();
    expect(readImageDimensions(Buffer.from(stripped!))).toEqual({ width: 1600, height: 1067 });
    expect(stripped!.length).toBeLessThanOrEqual(file.length);
  });

  it("entfernt Textbloecke aus einem PNG", async () => {
    const icon = new Uint8Array(await readFile(path.join(process.cwd(), "public", "icons", "icon-192.png")));
    const withText = insertPngChunk(icon, "tEXt", "Author\0Max Mustermann");
    expect(contains(withText, "Max Mustermann")).toBe(true);

    const stripped = stripImageMetadata(withText, "image/png");
    expect(stripped).not.toBeNull();
    expect(contains(stripped!, "Max Mustermann")).toBe(false);
    expect(readImageDimensions(Buffer.from(stripped!))).toEqual({ width: 192, height: 192 });
  });

  it("entfernt EXIF und XMP aus einem WebP und passt Kopf und Flags an", () => {
    const vp8x = riffChunk("VP8X", Uint8Array.from([0x0c, 0, 0, 0, 1, 0, 0, 1, 0, 0]));
    const image = riffChunk("VP8 ", new Uint8Array(11));
    const exif = riffChunk("EXIF", Uint8Array.from(ascii("GPS 51.25 7.15")));
    const xmp = riffChunk("XMP ", Uint8Array.from(ascii("<x:xmpmeta/>")));
    const webp = riffFile([vp8x, image, exif, xmp]);

    const stripped = stripImageMetadata(webp, "image/webp");
    expect(stripped).not.toBeNull();
    expect(contains(stripped!, "GPS 51.25")).toBe(false);
    expect(contains(stripped!, "xmpmeta")).toBe(false);

    const view = new DataView(stripped!.buffer, stripped!.byteOffset);
    expect(view.getUint32(4, true)).toBe(stripped!.length - 8);
    expect(stripped![20] & 0x0c).toBe(0);
  });

  it("weist Dateien ab, die nicht dem angegebenen Format entsprechen", () => {
    const text = Uint8Array.from(ascii("kein Bild, nur Text in einer Datei."));
    expect(stripImageMetadata(text, "image/jpeg")).toBeNull();
    expect(stripImageMetadata(text, "image/png")).toBeNull();
    expect(stripImageMetadata(text, "image/webp")).toBeNull();
    // Abgeschnittenes JPEG: Segmentlaenge zeigt ueber das Dateiende hinaus.
    expect(stripImageMetadata(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x10, 0x00, 0x00]), "image/jpeg")).toBeNull();
  });
});

const scanData = Uint8Array.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9]);

/** JPEG mit EXIF (Ausrichtung, Aufnahmezeit, GPS), XMP und Kommentar. */
async function jpegWithGps(orientation: number) {
  // TIFF, big endian. IFD0: Orientation, ExifIFD, GPSInfo.
  const tiff = new Uint8Array(160);
  const view = new DataView(tiff.buffer);
  tiff.set(ascii("MM"), 0);
  view.setUint16(2, 0x2a);
  view.setUint32(4, 8);

  let at = 8;
  view.setUint16(at, 3); at += 2;
  const entry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(at, tag); view.setUint16(at + 2, type); view.setUint32(at + 4, count);
    if (type === 3 && count === 1) view.setUint16(at + 8, value); else view.setUint32(at + 8, value);
    at += 12;
  };
  const exifIfd = 60;
  const gpsIfd = 80;
  entry(0x0112, 3, 1, orientation);
  entry(0x8769, 4, 1, exifIfd);
  entry(0x8825, 4, 1, gpsIfd);
  view.setUint32(at, 0);

  // Exif-IFD: DateTimeOriginal (ASCII, 20 Bytes) bei Offset 140.
  at = exifIfd;
  view.setUint16(at, 1); at += 2;
  entry(0x9003, 2, 20, 140);
  view.setUint32(at, 0);
  tiff.set(ascii("2026:09:20 14:30:00\0"), 140);

  // GPS-IFD: N 51 15 0, E 7 9 0 - Rationals ab Offset 180 (Puffer vergroessert).
  const gps = new Uint8Array(96);
  const gpsView = new DataView(gps.buffer);
  const full = new Uint8Array(tiff.length + gps.length);
  full.set(tiff, 0);
  const rationalsAt = tiff.length;
  const rationals = [51, 1, 15, 1, 0, 1, 7, 1, 9, 1, 0, 1];
  rationals.forEach((value, index) => gpsView.setUint32(index * 4, value));
  full.set(gps, rationalsAt);

  const fullView = new DataView(full.buffer);
  at = gpsIfd;
  fullView.setUint16(at, 4); at += 2;
  const gpsEntry = (tag: number, type: number, count: number, value: number, inline = false) => {
    fullView.setUint16(at, tag); fullView.setUint16(at + 2, type); fullView.setUint32(at + 4, count);
    if (inline) full[at + 8] = value; else fullView.setUint32(at + 8, value);
    at += 12;
  };
  gpsEntry(0x0001, 2, 2, "N".charCodeAt(0), true);
  gpsEntry(0x0002, 5, 3, rationalsAt);
  gpsEntry(0x0003, 2, 2, "E".charCodeAt(0), true);
  gpsEntry(0x0004, 5, 3, rationalsAt + 24);
  fullView.setUint32(at, 0);

  const app1 = segment(0xe1, [...ascii("Exif\0\0"), ...full]);
  const xmp = segment(0xe1, ascii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>"));
  const comment = segment(0xfe, ascii("Kommentar mit Namen"));
  const app0 = segment(0xe0, [...ascii("JFIF\0"), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const sof = segment(0xc0, [8, 0, 200, 1, 144, 1, 1, 0x11, 0]);
  const sos = segment(0xda, [1, 1, 0, 0, 63, 0]);

  return concat([Uint8Array.from([0xff, 0xd8]), app0, app1, xmp, comment, sof, sos, scanData]);
}

function segment(marker: number, payload: number[]) {
  const length = payload.length + 2;
  return Uint8Array.from([0xff, marker, length >> 8, length & 0xff, ...payload]);
}

function insertPngChunk(png: Uint8Array, type: string, text: string) {
  const data = ascii(text);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(ascii(type), 4);
  chunk.set(data, 8);
  // CRC ist fuer den Test egal; der Entferner prueft sie nicht.
  const ihdrEnd = 8 + 12 + 13;
  return concat([png.subarray(0, ihdrEnd), chunk, png.subarray(ihdrEnd)]);
}

function riffChunk(fourcc: string, data: Uint8Array) {
  const padded = data.length % 2 ? 1 : 0;
  const chunk = new Uint8Array(8 + data.length + padded);
  chunk.set(ascii(fourcc), 0);
  new DataView(chunk.buffer).setUint32(4, data.length, true);
  chunk.set(data, 8);
  return chunk;
}

function riffFile(chunks: Uint8Array[]) {
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(ascii("RIFF"), 0);
  new DataView(header.buffer).setUint32(4, 4 + body.length, true);
  header.set(ascii("WEBP"), 8);
  return concat([header, body]);
}

function ascii(text: string) {
  return Array.from(text, (character) => character.charCodeAt(0));
}

function contains(data: Uint8Array, text: string) {
  return Buffer.from(data).includes(Buffer.from(text, "latin1"));
}

function endsWith(data: Uint8Array, tail: Uint8Array) {
  return Buffer.from(data.subarray(data.length - tail.length)).equals(Buffer.from(tail));
}

function concat(parts: Uint8Array[]) {
  return new Uint8Array(Buffer.concat(parts));
}

function toArrayBuffer(data: Uint8Array) {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}
