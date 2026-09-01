/**
 * Zeichen fuer die Mitmachen-Schritte (Issue #70).
 *
 * Die drei Schritte auf der Startseite waren Nummer, Titel, Satz - drei
 * gleich aussehende Textbloecke. Ein Zeichen je Schritt gibt jedem Kasten auf
 * einen Blick eine eigene Gestalt.
 *
 * Gezeichnet wie die Kategoriezeichen in components/category-pictogram.tsx:
 * dasselbe Raster von 24x24, nur Kontur, Farbe aus der Umgebung. So sieht die
 * Seite ueberall gleich aus, ohne dass eine zweite Bildsprache dazukommt.
 */

const shapes = {
  /** Schraubenschluessel - dasselbe Zeichen wie die Kategorie "Werkzeug". */
  repair: "M17.6 3.3a5 5 0 0 0-6 6.8l-8 8a2 2 0 1 0 2.8 2.8l8-8a5 5 0 0 0 6.8-6l-3 3-2.7-.7-.7-2.7z",
  /** Kamera mit Pfeil nach oben: Foto machen und hochladen. */
  upload: "M2.6 8.4h4.2l1.6-2.2h7.2l1.6 2.2h4.2v10.4H2.6zM12 17.2v-6.6M9.4 13.2 12 10.6l2.6 2.6",
  /** Pokal: der Rekord selbst. */
  record: "M7.4 3.6h9.2v4.6a4.6 4.6 0 0 1-9.2 0zM7.4 5.2H4.6v1.4a3 3 0 0 0 3 3M16.6 5.2h2.8v1.4a3 3 0 0 1-3 3M12 12.8v3.6M8.6 20.4h6.8l-.8-4H9.4z",
  /** Geschenk: der Hinweis auf das Gewinnspiel. */
  gift: "M3.4 8.6h17.2v3.8H3.4zM4.8 12.4h14.4v8H4.8zM12 8.6v11.8M12 8.6C10.4 5 8.8 3.6 7.4 4.2c-1.4.6-1.2 3 4.6 4.4zM12 8.6c1.6-3.6 3.2-5 4.6-4.4 1.4.6 1.2 3-4.6 4.4z",
} as const;

export type StepIconName = keyof typeof shapes;

export function StepIcon({ name, className }: { name: StepIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={shapes[name]} />
    </svg>
  );
}
