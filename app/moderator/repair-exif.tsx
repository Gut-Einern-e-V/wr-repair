"use client";

import { useEffect, useRef, useState } from "react";

type ImageExif = { latitude: number | null; longitude: number | null; capturedAt: string | null };

function useImageExif(imageUrl: string | null): ImageExif | null {
  const [exif, setExif] = useState<ImageExif | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUrl || urlRef.current === imageUrl) return;
    urlRef.current = imageUrl;

    void (async () => {
      try {
        const { parse } = await import("exifr") as unknown as { parse(input: string, opts: object): Promise<Record<string, unknown> | undefined> };
        const result = await parse(imageUrl, { gps: true, tiff: false, ifd1: false, exif: ["DateTimeOriginal", "CreateDate"] });
        if (!result) { setExif({ latitude: null, longitude: null, capturedAt: null }); return; }
        const latitude = typeof result["latitude"] === "number" ? result["latitude"] : null;
        const longitude = typeof result["longitude"] === "number" ? result["longitude"] : null;
        const rawDate = result["DateTimeOriginal"] ?? result["CreateDate"];
        const capturedAt = rawDate instanceof Date ? rawDate.toISOString() : (typeof rawDate === "string" && rawDate ? rawDate : null);
        setExif({ latitude, longitude, capturedAt });
      } catch {
        setExif({ latitude: null, longitude: null, capturedAt: null });
      }
    })();
  }, [imageUrl]);

  return exif;
}

/** Aufnahmedatum und GPS aus dem Bild - Belege fuer die Standortpruefung. */
export default function RepairExif({ imageUrl }: { imageUrl: string }) {
  const exif = useImageExif(imageUrl);
  if (!exif) return null;
  const hasGps = exif.latitude !== null && exif.longitude !== null;

  return (
    <>
      {exif.capturedAt && <div><dt>Aufnahmedatum</dt><dd>{new Date(exif.capturedAt).toLocaleString("de-DE")}</dd></div>}
      {hasGps && <div><dt>GPS-Koordinaten</dt><dd><a href={`https://www.openstreetmap.org/?mlat=${exif.latitude}&mlon=${exif.longitude}&zoom=14`} target="_blank" rel="noopener noreferrer">{(exif.latitude as number).toFixed(5)}, {(exif.longitude as number).toFixed(5)}</a></dd></div>}
    </>
  );
}
