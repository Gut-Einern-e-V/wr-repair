"use client";

import { useEffect, useState, type ReactNode } from "react";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { MOSAIC_MIN_AVAILABLE, type MosaicPayload } from "@/lib/mosaic";

/**
 * Die Wand aus freigegebenen Reparaturfotos (Issue #81).
 *
 * Sie steht dort, wo bisher die Kurzauswertung nach Kategorien stand - die
 * sagte dasselbe wie /stats, nur weniger. Ein Raster echter Fotos zeigt
 * stattdessen das, was keine Zahl zeigen kann: dass hinter jedem Zaehlerstand
 * ein Gegenstand steckt.
 *
 * Solange zu wenige Fotos vorliegen, bleibt es bei {@link fallback}. Die
 * Entscheidung faellt hier und nicht auf der Startseite, weil erst die Antwort
 * der Route verraet, wie viele es sind.
 */
export function RepairMosaic({ fallback }: { fallback: ReactNode }) {
  const [wall, setWall] = useState<MosaicPayload | null>(null);

  /* Einmal je Seitenaufruf. Die Wand ist kein Live-Stand: Sie wird auf dem
     Server zehn Minuten lang wiederverwendet, ein Nachladen im Takt des
     Zaehlers brauchte also nur Anfragen und zeigte dasselbe Bild. */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/mosaic");
        if (!response.ok) return;
        const payload = await response.json() as MosaicPayload;
        if (!cancelled) setWall(payload);
      } catch {
        // Ohne Wand bleibt die Kategorienliste stehen - das ist kein Fehler,
        // den jemand sehen muesste.
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  if (!wall || wall.withImage < MOSAIC_MIN_AVAILABLE || wall.tiles.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <div className="repair-wall">
      <div className="repair-wall-grid">
        {wall.tiles.map((tile) => (
          /* eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-Adresse, die sich mit jedem Zwischenspeicherlauf aendert; next/image wuerde sie jedes Mal neu optimieren. */
          <img
            key={tile.id}
            src={tile.imageUrl}
            alt={tile.alt}
            title={repairCategoryLabel(tile.category)}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
      <p className="repair-wall-note">
        Die {wall.tiles.length} jüngsten von {wall.total.toLocaleString("de-DE")} freigegebenen Reparaturen.
      </p>
    </div>
  );
}
