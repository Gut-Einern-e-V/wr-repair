/**
 * Gerenderte Motive je Reparaturkategorie.
 *
 * Sie liegen als freigestellte Bilder im Repository unter public/categories/,
 * benannt nach dem Kategoriewert aus lib/repair-catalog.ts. Dieselbe Regel wie
 * bei den Bildern der Reparaturgeschichten (Issue #60): im Repository, mit dem
 * Deploy ausgeliefert, kein CMS und kein Bilderdienst.
 *
 * Diese Liste ist bewusst von Hand gefuehrt und nicht aus dem Ordner gelesen:
 * Die Motive werden in Client-Komponenten gebraucht (Startseite,
 * Schnellpruefung, Rueckblick), und die koennen zur Laufzeit nicht in das
 * Dateisystem sehen. Eine Kategorie, die hier fehlt, faellt auf das
 * Strichzeichen zurueck - es geht also nichts kaputt, solange erst ein Teil der
 * Motive vorliegt.
 *
 * Eine neue Datei also in public/categories/ ablegen *und* ihren Wert hier
 * eintragen. Der Test in lib/category-motifs.test.ts prueft beides gegen den
 * Ordner.
 */

export const MOTIF_DIRECTORY = "categories";

/**
 * Kantenlaenge, mit der die Dateien angelegt werden. Die Motive sind
 * quadratisch, damit dieselbe Datei ueberall in denselben Rahmen passt, ohne
 * dass ein Layout je Kategorie anders ausfaellt.
 */
export const MOTIF_SOURCE_SIZE = 512;

/** Kategorien, fuer die eine Datei vorliegt. */
export const categoriesWithMotif = new Set<string>([
  // Sobald die freigestellten Dateien in public/categories/ liegen, hier den
  // Kategoriewert eintragen, z. B. "bicycle".
]);

export function hasCategoryMotif(category: string) {
  return categoriesWithMotif.has(category);
}

/** Oeffentlicher Pfad des Motivs, oder null, solange es keines gibt. */
export function categoryMotifSrc(category: string): string | null {
  return hasCategoryMotif(category) ? `/${MOTIF_DIRECTORY}/${category}.png` : null;
}
