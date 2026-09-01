import type { CSSProperties } from "react";
import NextImage from "next/image";
import { CategoryPictogram } from "./category-pictogram";
import { categoryMotifSrc, MOTIF_SOURCE_SIZE } from "@/lib/category-motifs";

/**
 * Gerendertes Motiv einer Kategorie, auf heller Platte.
 *
 * Das Gegenstueck zum Strichzeichen (components/category-pictogram.tsx): Wo
 * Platz fuer ein Bild ist, steht das Motiv; wo es klein wird oder die Farbe
 * wechselt, bleibt es beim Zeichen. Unter etwa 64 Pixeln loesen sich die
 * Motive auf - Speichen, Zeiger und Objektive sind dort nur noch Flaeche.
 *
 * **Warum die Platte.** Die Motive sind auf Weiss gerendert und tragen viel
 * Schwarz: Reifen, Kameragehaeuse, Brillenfassung. Auf dem dunklen
 * Buehnengrund und auf den farbigen Kategorie-Kacheln verschwaende das. Die
 * helle Flaeche mit der Markenkontur gibt jedem Motiv denselben Grund, auf dem
 * es gerendert wurde - und liest sich wie ein Aufkleber, was zur Bildsprache
 * der Seite passt.
 *
 * **Rueckfall.** Fehlt die Datei, steht das Strichzeichen in derselben Platte.
 * Die Rahmen sind damit schon in ihrer endgueltigen Groesse gesetzt, bevor die
 * Motive vorliegen; getauscht wird nur die Grafik darin.
 *
 * Immer schmueckend: An jeder Einbaustelle steht die Kategorie daneben als
 * Text, deshalb bleibt das Bild fuer Screenreader aussen vor.
 */

export type CategoryMotifProps = {
  category: string;
  /** Kantenlaenge der Platte in Pixeln. */
  size: number;
  className?: string;
  /** Nur fuer Motive, die ohne Scrollen sichtbar sind. */
  priority?: boolean;
};

export function CategoryMotif({ category, size, className, priority = false }: CategoryMotifProps) {
  const src = categoryMotifSrc(category);

  return (
    /* Die Kantenlaenge kommt als Variable, nicht als width/height: Ein Inline-Stil
       laesst sich per Media Query nicht zuruecknehmen, und auf schmalen Kacheln
       braucht die Platte weniger Platz (Issue #70). */
    <span className={`category-motif${className ? ` ${className}` : ""}`} style={{ "--motif-size": `${size}px` } as CSSProperties}>
      {src
        ? <NextImage
            src={src}
            alt=""
            width={MOTIF_SOURCE_SIZE}
            height={MOTIF_SOURCE_SIZE}
            priority={priority}
            sizes={`${size}px`}
          />
        : <CategoryPictogram category={category} decorative />}
    </span>
  );
}
