import type { CSSProperties } from "react";
import shapes from "./category-pictogram-shapes.json";
import { repairCategoryLabel } from "@/lib/repair-catalog";

/**
 * Piktogramm je Reparaturkategorie (Issue #58).
 *
 * Wo eine Einreichung kein Bild hat, stand bisher eine graue Flaeche oder der
 * erste Buchstabe der Kategorie. Ohne Foto ist eine Einreichung aber nicht
 * weniger wert - und seit Ablehnungen ihr Bild verlieren, gibt es solche
 * Eintraege regelmaessig. Das Zeichen sagt wenigstens, worum es ging.
 *
 * Das ist das *Bedienzeichen*: klein, nur Kontur, und es nimmt die Farbe seiner
 * Umgebung an. Wo Platz fuer ein Bild ist, steht stattdessen das gerenderte
 * Motiv - siehe components/category-motif.tsx.
 *
 * Bewusst gezeichnete Pfade statt Dateien in public/: Es sind zwoelf Zeichen,
 * sie sollen die Farbe ihrer Umgebung annehmen (hell auf der Buehne, dunkel im
 * Backend) und in jeder Groesse scharf bleiben.
 */

/**
 * Alle Zeichen auf demselben Raster von 24x24 gezeichnet, alle nur Kontur.
 *
 * Sie liegen als JSON daneben, weil drei Stellen dieselbe Quelle brauchen und
 * nur eine davon React ist: diese Komponente, das Vorschaubild einer geteilten
 * Reparatur (app/reparatur/[id]/opengraph-image.tsx) und der Generator der
 * Platzhalter-Motive (scripts/build-category-motifs.mjs), der als reines
 * Node-Skript kein TSX lesen kann.
 *
 * Der Inhalt steht damit weiterhin im Repository und kommt nie von aussen -
 * die Komponente setzt ihn ohne Umweg in das <svg>.
 */
export const categoryPictogramShapes: Record<string, string> = shapes;

/** Unbekannte Kategorien fallen auf "Anderes" zurueck, statt eine Luecke zu lassen. */
export function categoryPictogramShape(category: string) {
  return categoryPictogramShapes[category] ?? categoryPictogramShapes.other;
}

export type CategoryPictogramProps = {
  category: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Steht die Kategorie daneben schon als Text, ist das Zeichen Schmuck und
   * wird von Screenreadern uebersprungen. Sonst ist es die einzige Angabe an
   * dieser Stelle und bekommt eine Beschriftung.
   */
  decorative?: boolean;
};

export function CategoryPictogram({ category, className, style, decorative = false }: CategoryPictogramProps) {
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
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": `Sinnbild der Kategorie ${repairCategoryLabel(category)}` })}
      dangerouslySetInnerHTML={{ __html: categoryPictogramShape(category) }}
    />
  );
}

/**
 * Dasselbe Zeichen als vollstaendige SVG-Datei.
 *
 * Fuer Stellen ohne React: `next/og` rendert kein JSX-SVG, nimmt aber ein Bild
 * mit `data:`-Adresse entgegen.
 */
export function categoryPictogramSvg(category: string, color: string, size = 24) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"`
    + ` fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`
    + `${categoryPictogramShape(category)}</svg>`;
}
