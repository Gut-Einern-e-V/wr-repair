import * as exifr from "exifr";

export type ImageExif = {
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
};

/**
 * Extracts GPS coordinates and capture timestamp from an image buffer.
 * Returns null values for fields that are absent or could not be parsed.
 * EXIF data is never persisted to the database.
 */
export async function extractExif(buffer: ArrayBuffer): Promise<ImageExif> {
  try {
    const result = await (exifr as unknown as { parse(input: ArrayBuffer, options: object): Promise<Record<string, unknown> | undefined> })
      .parse(buffer, { gps: true, tiff: false, ifd1: false, exif: ["DateTimeOriginal", "CreateDate"] });

    if (!result) {
      return { latitude: null, longitude: null, capturedAt: null };
    }

    const latitude = typeof result["latitude"] === "number" ? result["latitude"] : null;
    const longitude = typeof result["longitude"] === "number" ? result["longitude"] : null;

    const rawDate = result["DateTimeOriginal"] ?? result["CreateDate"];
    let capturedAt: string | null = null;
    if (rawDate instanceof Date) {
      capturedAt = rawDate.toISOString();
    } else if (typeof rawDate === "string" && rawDate) {
      capturedAt = rawDate;
    }

    return { latitude, longitude, capturedAt };
  } catch {
    return { latitude: null, longitude: null, capturedAt: null };
  }
}
