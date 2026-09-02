/**
 * Die Bilderwand der Startseite (Issue #81).
 *
 * Form und Grenzen stehen hier, weil beide Seiten sie brauchen: die Route
 * app/api/mosaic/route.ts, die die Kacheln zusammenstellt, und
 * components/repair-mosaic.tsx, das sie zeigt.
 */

/**
 * Wie viele Kacheln hoechstens ausgeliefert werden.
 *
 * Nicht wirklich *alle* Einreichungen: Ein Raster aus tausend Fotos waere ein
 * Vielfaches der uebrigen Startseite an Daten, und keine davon liesse sich
 * noch erkennen. Es sind die juengsten - die vollstaendige Auswertung steht
 * auf /stats, und die Bildunterschrift verweist darauf.
 */
export const MOSAIC_MAX_TILES = 40;

/**
 * Ab wie vielen freigegebenen Fotos die Wand ueberhaupt erscheint.
 *
 * Darunter zeigt die Startseite weiter die Kategorienliste: Eine "Wand" aus
 * neun Bildern sieht nicht nach vielen Reparaturen aus, sondern nach wenigen -
 * sie wuerde das Gegenteil dessen erzaehlen, wofuer sie da ist.
 */
export const MOSAIC_MIN_AVAILABLE = 100;

export type MosaicTile = {
  id: string;
  category: string;
  imageUrl: string;
  /** Leer, wenn die Moderation keinen Alternativtext gepflegt hat. */
  alt: string;
};

export type MosaicPayload = {
  /** Freigegebene Reparaturen insgesamt - auch die ohne Foto. */
  total: number;
  /** Davon mit Foto; daran entscheidet die Startseite, ob die Wand steht. */
  withImage: number;
  tiles: MosaicTile[];
};
