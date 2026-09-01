import type { CSSProperties } from "react";

/**
 * Piktogramm je Reparaturkategorie (Issue #58).
 *
 * Wo eine Einreichung kein Bild hat, stand bisher eine graue Flaeche oder der
 * erste Buchstabe der Kategorie. Ohne Foto ist eine Einreichung aber nicht
 * weniger wert - und seit Ablehnungen ihr Bild verlieren, gibt es solche
 * Eintraege regelmaessig. Das Zeichen sagt wenigstens, worum es ging.
 *
 * Bewusst gezeichnete Pfade statt Dateien in public/: Es sind zwoelf Zeichen,
 * sie sollen die Farbe ihrer Umgebung annehmen (hell auf der Buehne, dunkel im
 * Backend) und in jeder Groesse scharf bleiben.
 */

import { repairCategoryLabel } from "@/lib/repair-catalog";

/* Alle Pfade auf demselben Raster von 24x24 gezeichnet, alle nur Kontur. */
const pictograms: Record<string, React.ReactNode> = {
  bicycle: <>
    <circle cx="5.5" cy="16" r="4.2" />
    <circle cx="18.5" cy="16" r="4.2" />
    <path d="M5.5 16h5.2l3.6-7.6L18.5 16M9 8.4h4.6M14.3 8.4l-3.6 7.6" />
  </>,
  computers_and_phones: <>
    <path d="M3.2 6.2h11.6v8H3.2zM2 17h13" />
    <path d="M17.2 8.6h4.6v11h-4.6zM19 17.6h1" />
  </>,
  photo_video_car: <>
    <path d="M2.6 8.4h4.2l1.6-2.2h7.2l1.6 2.2h4.2v10.4H2.6z" />
    <circle cx="12" cy="13.4" r="3.4" />
  </>,
  household_appliances: <>
    <path d="M4.6 3.4h14.8v17.2H4.6z" />
    <circle cx="12" cy="13.4" r="4.4" />
    <path d="M8.2 7h.1M11 7h.1" />
  </>,
  furniture: <>
    <path d="M7 3.4h10v5H7zM7.6 8.4v4.2M16.4 8.4v4.2M5.6 12.6h12.8v2.2H5.6zM7.4 14.8V21M16.6 14.8V21" />
  </>,
  sharpening: <>
    <path d="M2.6 18.4h18.8" />
    <path d="M5.6 15.4 15.4 3.4l3.2 3.2-8.8 8.8z" />
  </>,
  jewelry_glasses: <>
    <circle cx="6.4" cy="14.2" r="3.6" />
    <circle cx="17.6" cy="14.2" r="3.6" />
    <path d="M10 13.4h4M2.8 11.4 5 7.6M21.2 11.4 19 7.6" />
  </>,
  /* Kuscheltier statt Ball: Ein Kreis mit Naehten sah aus wie ein Globus. */
  toys: <>
    <circle cx="12" cy="14.2" r="6.2" />
    <circle cx="6.6" cy="6.8" r="2.8" />
    <circle cx="17.4" cy="6.8" r="2.8" />
    <path d="M10 13.2h.1M14 13.2h.1M10.4 16.4a2.2 2.2 0 0 0 3.2 0" />
  </>,
  textiles: <>
    <path d="M8.6 3.4 4 6l1.9 3.4 2.1-1.1V20.6h8V8.3l2.1 1.1L20 6l-4.6-2.6a3.4 3.4 0 0 1-6.8 0z" />
  </>,
  watches: <>
    <circle cx="12" cy="12" r="5.4" />
    <path d="M12 9.2V12l2 1.4M9.2 6.8 9.6 3.2h4.8l.4 3.6M9.2 17.2l.4 3.6h4.8l.4-3.6" />
  </>,
  tools: <>
    <path d="M17.6 3.3a5 5 0 0 0-6 6.8l-8 8a2 2 0 1 0 2.8 2.8l8-8a5 5 0 0 0 6.8-6l-3 3-2.7-.7-.7-2.7z" />
  </>,
  other: <>
    <path d="M4 7.6 12 3.4l8 4.2v8.8L12 20.6l-8-4.2z" />
    <path d="M4 7.6 12 11.8l8-4.2M12 11.8v8.8" />
  </>,
};

export type CategoryPictogramProps = {
  category: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Zeichen zur Kategorie. Unbekannte Kategorien fallen auf "Anderes" zurueck,
 * damit ein spaeter ergaenzter Wert keine Luecke hinterlaesst.
 *
 * `role="img"` mit Beschriftung statt `aria-hidden`: Das Zeichen steht dort,
 * wo sonst das Bild waere, und ist damit die einzige Angabe zur Kategorie an
 * dieser Stelle.
 */
export function CategoryPictogram({ category, className, style }: CategoryPictogramProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`Sinnbild der Kategorie ${repairCategoryLabel(category)}`}
    >
      {pictograms[category] ?? pictograms.other}
    </svg>
  );
}
