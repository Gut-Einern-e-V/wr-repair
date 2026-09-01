/**
 * Bildmasse aus dem Dateikopf lesen - ohne das Bild zu dekodieren.
 *
 * Gebraucht fuer die Bilder der Reparaturgeschichten (Issue #60):
 * `next/image` braucht Breite und Hoehe, sonst springt das Layout beim Laden.
 * Die Pfade stehen als Text in den Markdown-Dateien, ein statischer Import
 * (der die Masse mitliefern wuerde) kommt dafuer nicht in Frage.
 *
 * Bewusst von Hand statt mit einer Abhaengigkeit: Es sind vier Formate, die
 * Angaben stehen alle in den ersten Bytes, und der Code laeuft nur beim Build.
 * `sharp` liegt zwar im node_modules, gehoert aber Next und steht in keiner
 * package.json dieses Projekts.
 */

export type ImageDimensions = { width: number; height: number };

/* EXIF-Ausrichtungen, bei denen das Bild beim Anzeigen um 90 Grad gedreht wird.
   Der Optimizer von Next dreht mit, die Masse im Dateikopf beziehen sich aber
   auf das ungedrehte Bild - ohne den Tausch waere der Rahmen quer statt hoch. */
const ROTATED_ORIENTATIONS = new Set([5, 6, 7, 8]);

/* Start-of-Frame-Marker: dort stehen die Masse. 0xC4, 0xC8 und 0xCC sind
   ausgenommen, das sind Huffman-Tabellen und arithmetische Varianten. */
function isStartOfFrame(marker: number) {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/** Ausrichtung aus dem TIFF-Kopf eines EXIF-Segments, oder 1 wenn sie fehlt. */
function readExifOrientation(buffer: Buffer, tiffStart: number) {
  const byteOrder = buffer.readUInt16BE(tiffStart);
  if (byteOrder !== 0x4949 && byteOrder !== 0x4d4d) return 1;

  const little = byteOrder === 0x4949;
  const read16 = (at: number) => (little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
  const read32 = (at: number) => (little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));

  const directory = tiffStart + read32(tiffStart + 4);
  if (directory + 2 > buffer.length) return 1;

  const entries = read16(directory);
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > buffer.length) break;
    // 0x0112 ist das Tag "Orientation"; der Wert steht direkt im Eintrag.
    if (read16(entry) === 0x0112) return read16(entry + 8);
  }

  return 1;
}

/** JPEG: Segmente ueberspringen, bis der Start-of-Frame kommt. */
function readJpeg(buffer: Buffer): ImageDimensions | null {
  let offset = 2;
  let orientation = 1;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    // Fuellbytes sowie Marker ohne Nutzlast (Restart, Start/Ende des Bildes).
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (isStartOfFrame(marker) && offset + 9 <= buffer.length) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return ROTATED_ORIENTATIONS.has(orientation) ? { width: height, height: width } : { width, height };
    }

    // APP1 mit "Exif\0\0" - davor steht die Ausrichtung, die den Rahmen dreht.
    if (marker === 0xe1 && buffer.toString("latin1", offset + 4, offset + 10) === "Exif\0\0") {
      orientation = readExifOrientation(buffer, offset + 10);
    }

    offset += 2 + length;
  }

  return null;
}

function readWebp(buffer: Buffer): ImageDimensions | null {
  const chunk = buffer.toString("latin1", 12, 16);

  // Verlustbehaftet: Masse im VP8-Bitstrom, je 14 Bit.
  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  // Verlustfrei: 14 Bit Breite und 14 Bit Hoehe, jeweils minus eins gespeichert.
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  // Erweitert: 24 Bit je Kante, ebenfalls minus eins.
  if (chunk === "VP8X" && buffer.length >= 30) {
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }

  return null;
}

/**
 * Breite und Hoehe eines Bildes, oder null bei unbekanntem oder beschaedigtem
 * Format. Der Puffer muss nur den Anfang der Datei enthalten.
 */
export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;

  // PNG: nach der Signatur folgt der IHDR-Block mit den Massen.
  if (buffer.toString("latin1", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.toString("latin1", 0, 3) === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  if (buffer.toString("latin1", 0, 4) === "RIFF" && buffer.toString("latin1", 8, 12) === "WEBP") {
    return readWebp(buffer);
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpeg(buffer);
  }

  return null;
}
