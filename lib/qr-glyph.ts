import QRCode from "qrcode";

/**
 * QR-Code als SVG-Pfad statt als PNG-Data-URL (Issue #92).
 *
 * Der Aufsteller wird gedruckt und in vier Hintergrundvarianten ausgegeben. Ein
 * PNG braucht dafuer feste Pixelmasse und feste Farben; ein Pfad skaliert
 * verlustfrei auf jedes Format und nimmt seine Farbe aus CSS.
 */
export type QrGlyph = {
  /** Kantenlaenge in Modulen, Ruhezone eingerechnet. Das ist die viewBox. */
  size: number;
  /** Ein einziges `d`-Attribut mit allen dunklen Modulen. */
  path: string;
};

/**
 * Die Ruhezone betraegt laut Norm vier Module. Die alte Vorlage stand auf 1 und
 * war damit unter der Vorgabe - Scanner brauchen den Rand, um den Code vom
 * Untergrund zu trennen.
 */
const QUIET_ZONE_MODULES = 4;

export function buildQrGlyph(text: string, quietZone = QUIET_ZONE_MODULES): QrGlyph {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const { size, data } = modules;
  const parts: string[] = [];

  /* Waagerechte Laufweiten zusammenfassen: Ein Rechteck pro Modul blaeht das
     `d`-Attribut auf ein Vielfaches auf, ohne dass sich am Bild etwas aendert. */
  for (let row = 0; row < size; row += 1) {
    let runStart = -1;
    for (let column = 0; column <= size; column += 1) {
      const isDark = column < size && data[row * size + column] === 1;
      if (isDark && runStart < 0) runStart = column;
      if (!isDark && runStart >= 0) {
        const width = column - runStart;
        parts.push(`M${runStart + quietZone} ${row + quietZone}h${width}v1h-${width}z`);
        runStart = -1;
      }
    }
  }

  return { size: size + quietZone * 2, path: parts.join("") };
}
