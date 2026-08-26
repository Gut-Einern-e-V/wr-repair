/**
 * Kleine deterministische Hash- und Zufallshelfer ohne Abhaengigkeiten.
 *
 * Bewusst in einer eigenen Datei: sowohl das Buehnen-Dashboard als auch die
 * Geo-Anonymisierung im Browser-Bundle brauchen sie. Laegen sie weiterhin in
 * `lib/nrw-map.ts`, zoege das Einreichungsformular den kompletten Kartenumriss
 * samt Staedteliste in den Client-Bundle.
 */

/** Deterministischer 32-Bit-Hash (FNV-1a) einer Zeichenkette. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Erzeugt aus einem Seed eine Folge von Zufallswerten in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}
