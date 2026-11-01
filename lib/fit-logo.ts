import sharp from "sharp";
import { readImageDimensions } from "./image-dimensions";

/**
 * Hochgeladene Partnerlogos auf eine Kantenlaenge bringen, die jedes Geraet
 * anzeigen kann (Issue #174).
 *
 * Das 1-MB-Limit begrenzt nur die Dateigroesse, nicht die Pixelzahl: Ein
 * einfarbiges PNG mit 22.521 x 7.496 Pixeln wiegt unter 1 MB. Solche Dateien
 * lehnt der Bildoptimierer von Next ab und liefert sie im Original aus - und
 * iPhones muessen sie zum Anzeigen auf Hunderte Megabyte entpacken. Der Tab
 * stuerzte ab, sobald die Partnerleiste im Footer lud.
 *
 * Verkleinert wird nur, was zu gross ist. Kleinere Logos bleiben Byte fuer
 * Byte, wie sie hochgeladen wurden. SVGs haben keine Pixel und gehen durch.
 */

/** Groesser wird kein Logo gezeigt: Kacheln sind hoechstens 180 Pixel breit. */
export const MAX_LOGO_EDGE = 1200;

export type LogoType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

/**
 * Das Logo, wenn noetig verkleinert, oder null, wenn die Datei sich nicht
 * lesen laesst.
 */
export async function fitLogo(input: Buffer, type: LogoType): Promise<Buffer | null> {
  if (type === "image/svg+xml") return input;

  const dimensions = readImageDimensions(input);
  if (!dimensions) return null;
  if (Math.max(dimensions.width, dimensions.height) <= MAX_LOGO_EDGE) return input;

  try {
    const image = sharp(input).rotate().resize({ width: MAX_LOGO_EDGE, height: MAX_LOGO_EDGE, fit: "inside" });
    if (type === "image/png") return await image.png({ compressionLevel: 9 }).toBuffer();
    if (type === "image/jpeg") return await image.jpeg({ quality: 90 }).toBuffer();
    return await image.webp({ quality: 90 }).toBuffer();
  } catch {
    // Beschaedigt oder ueber der Pixelgrenze von sharp (rund 268 Megapixel).
    return null;
  }
}
