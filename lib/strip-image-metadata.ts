/**
 * Metadaten aus einem hochgeladenen Bild entfernen, ohne es neu zu kodieren
 * (Issue #44).
 *
 * Das Formular rendert jedes Bild im Browser ueber ein Canvas neu und verwirft
 * dabei EXIF und GPS. Eine selbst gebaute Anfrage umgeht das Formular aber,
 * und dann kaeme ein Foto mit dem genauen Aufnahmeort in den Storage und nach
 * der Freigabe ueber die signierte URL ins Netz. Der Server schneidet deshalb
 * selbst alle Bloecke heraus, die Metadaten tragen koennen.
 *
 * Bewusst von Hand statt mit einer Abhaengigkeit, wie schon
 * `lib/image-dimensions.ts`: Die drei erlaubten Formate sind Containerformate
 * mit klar abgegrenzten Bloecken, und die Bilddaten selbst bleiben
 * unangetastet - es wird nichts dekodiert, also geht auch nichts an Qualitaet
 * verloren.
 *
 * Gibt `null` zurueck, wenn die Datei nicht dem angegebenen Format entspricht.
 * Eine solche Datei kaeme aus keinem Browser und wird abgewiesen.
 */

export type StrippableImageType = "image/jpeg" | "image/png" | "image/webp";

export function stripImageMetadata(input: Uint8Array, type: StrippableImageType): Uint8Array | null {
  try {
    if (type === "image/jpeg") return stripJpeg(input);
    if (type === "image/png") return stripPng(input);
    return stripWebp(input);
  } catch {
    return null;
  }
}

/* JPEG ------------------------------------------------------------------ */

/* Behalten werden nur APP0 (JFIF), ein ICC-Farbprofil in APP2 und APP14
   (Adobe, noetig fuer die Farbumrechnung mancher JPEGs). Alles andere in
   APP1 bis APP15 und COM kann Metadaten tragen: EXIF und XMP in APP1,
   Photoshop-IPTC in APP13, Herstellerbloecke in den uebrigen. */
function keepJpegSegment(marker: number, data: Uint8Array) {
  if (marker === 0xe0 || marker === 0xee) return true;
  if (marker === 0xe2) return startsWith(data, "ICC_PROFILE\0");
  if (marker >= 0xe1 && marker <= 0xef) return false;
  if (marker === 0xfe) return false;
  return true;
}

function stripJpeg(input: Uint8Array): Uint8Array | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;

  const parts: Uint8Array[] = [input.subarray(0, 2)];
  let orientation = 1;
  let offset = 2;

  while (offset < input.length) {
    if (input[offset] !== 0xff) return null;
    // Fuellbytes vor einem Marker sind erlaubt.
    while (input[offset] === 0xff && input[offset + 1] === 0xff) offset += 1;
    if (offset + 1 >= input.length) return null;

    const marker = input[offset + 1];

    // Marker ohne Laengenangabe.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(input.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (marker === 0xd9) {
      parts.push(input.subarray(offset, offset + 2));
      break;
    }

    if (offset + 4 > input.length) return null;
    const length = (input[offset + 2] << 8) | input[offset + 3];
    if (length < 2 || offset + 2 + length > input.length) return null;

    const segmentEnd = offset + 2 + length;
    const data = input.subarray(offset + 4, segmentEnd);

    // Ab Start of Scan folgen die komprimierten Bilddaten bis zum Ende.
    if (marker === 0xda) {
      parts.push(input.subarray(offset));
      break;
    }

    if (marker === 0xe1 && startsWith(data, "Exif\0\0")) {
      orientation = readTiffOrientation(data.subarray(6));
    }

    if (keepJpegSegment(marker, data)) {
      parts.push(input.subarray(offset, segmentEnd));
    }
    offset = segmentEnd;
  }

  /* Die Ausrichtung ist die einzige EXIF-Angabe, die fuer die Anzeige zaehlt:
     Ohne sie steht ein hochkant fotografiertes Handybild quer. Sie verraet
     nichts ueber die Person und wird deshalb als einziges Feld in einem neuen,
     minimalen EXIF-Block zurueckgeschrieben - direkt hinter SOI bzw. APP0. */
  if (orientation !== 1) {
    const insertAt = parts.length > 1 && parts[1][1] === 0xe0 ? 2 : 1;
    parts.splice(insertAt, 0, orientationSegment(orientation));
  }

  return concat(parts);
}

function readTiffOrientation(tiff: Uint8Array) {
  if (tiff.length < 8) return 1;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const byteOrder = view.getUint16(0);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;
  const little = byteOrder === 0x4949;

  const directory = view.getUint32(4, little);
  if (directory + 2 > tiff.length) return 1;
  const entries = view.getUint16(directory, little);

  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > tiff.length) break;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** APP1 mit einem TIFF-Kopf, der genau einen Eintrag enthaelt: Orientation. */
function orientationSegment(orientation: number) {
  const tiff = [
    0x4d, 0x4d, 0x00, 0x2a, // big endian, TIFF
    0x00, 0x00, 0x00, 0x08, // erstes IFD direkt dahinter
    0x00, 0x01, // ein Eintrag
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // Orientation, SHORT, 1 Wert
    0x00, orientation, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // kein weiteres IFD
  ];
  const payload = [...ascii("Exif\0\0"), ...tiff];
  const length = payload.length + 2;
  return Uint8Array.from([0xff, 0xe1, length >> 8, length & 0xff, ...payload]);
}

/* PNG ------------------------------------------------------------------- */

/* Textbloecke (auch XMP steht in iTXt), EXIF und der Aenderungszeitpunkt.
   Alles andere gehoert zum Bild. */
const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function stripPng(input: Uint8Array): Uint8Array | null {
  if (input.length < 8 || PNG_SIGNATURE.some((byte, index) => input[index] !== byte)) return null;

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const parts: Uint8Array[] = [input.subarray(0, 8)];
  let offset = 8;
  let sawEnd = false;

  while (offset + 12 <= input.length) {
    const length = view.getUint32(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > input.length) return null;

    const type = String.fromCharCode(...input.subarray(offset + 4, offset + 8));
    if (!PNG_METADATA_CHUNKS.has(type)) parts.push(input.subarray(offset, chunkEnd));
    offset = chunkEnd;

    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }

  return sawEnd ? concat(parts) : null;
}

/* WebP ------------------------------------------------------------------ */

const VP8X_FLAG_EXIF = 0x08;
const VP8X_FLAG_XMP = 0x04;

function stripWebp(input: Uint8Array): Uint8Array | null {
  if (input.length < 12 || !startsWith(input, "RIFF") || !startsWith(input.subarray(8), "WEBP")) return null;

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const riffEnd = Math.min(input.length, 8 + view.getUint32(4, true));
  const chunks: Uint8Array[] = [];
  let offset = 12;

  while (offset + 8 <= riffEnd) {
    const size = view.getUint32(offset + 4, true);
    const chunkEnd = offset + 8 + size + (size % 2);
    if (offset + 8 + size > riffEnd) return null;

    const fourcc = String.fromCharCode(...input.subarray(offset, offset + 4));
    if (fourcc === "VP8X") {
      // Kopie, damit die Flags angepasst werden koennen, ohne die Eingabe zu veraendern.
      const chunk = input.slice(offset, Math.min(chunkEnd, riffEnd));
      chunk[8] &= ~(VP8X_FLAG_EXIF | VP8X_FLAG_XMP);
      chunks.push(chunk);
    } else if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      chunks.push(input.subarray(offset, Math.min(chunkEnd, riffEnd)));
    }
    offset = chunkEnd;
  }

  if (chunks.length === 0) return null;

  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(input.subarray(0, 4), 0);
  new DataView(header.buffer).setUint32(4, 4 + body.length, true);
  header.set(input.subarray(8, 12), 8);
  return concat([header, body]);
}

/* Hilfen ---------------------------------------------------------------- */

function ascii(text: string) {
  return Array.from(text, (character) => character.charCodeAt(0));
}

function startsWith(data: Uint8Array, text: string) {
  if (data.length < text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (data[index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
