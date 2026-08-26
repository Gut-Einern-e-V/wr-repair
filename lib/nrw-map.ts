/**
 * Stilisierte NRW-Karte fuer das Buehnen-Dashboard.
 *
 * Die Plattform speichert bewusst keine Koordinaten zu einer Einreichung
 * (EXIF-GPS wird nur zur Regionspruefung ausgewertet und nie persistiert,
 * siehe lib/exif.ts). Die Karte zeigt deshalb eine *symbolische* Verteilung:
 * Jede Reparatur bekommt aus ihrer ID eine deterministische Position im
 * Umfeld eines NRW-Ballungsraums. Gleiche ID ergibt immer denselben Punkt,
 * damit die Wolke zwischen zwei Renderings nicht springt.
 */

export type LatLon = { lat: number; lon: number };

/** Grob vereinfachte Aussenkontur von NRW (im Uhrzeigersinn, ab Nordwesten). */
export const nrwOutline: LatLon[] = [
  { lat: 51.83, lon: 6.03 },
  { lat: 51.87, lon: 6.2 },
  { lat: 52.05, lon: 6.72 },
  { lat: 52.22, lon: 6.69 },
  { lat: 52.26, lon: 7.06 },
  { lat: 52.28, lon: 7.3 },
  { lat: 52.4, lon: 8.1 },
  { lat: 52.47, lon: 8.62 },
  { lat: 52.35, lon: 8.93 },
  { lat: 52.2, lon: 9.1 },
  { lat: 51.85, lon: 9.45 },
  { lat: 51.55, lon: 9.3 },
  { lat: 51.3, lon: 9.1 },
  { lat: 51.2, lon: 8.6 },
  { lat: 50.95, lon: 8.55 },
  { lat: 50.75, lon: 8.3 },
  { lat: 50.7, lon: 7.9 },
  { lat: 50.65, lon: 7.6 },
  { lat: 50.62, lon: 7.2 },
  { lat: 50.5, lon: 6.95 },
  { lat: 50.35, lon: 6.5 },
  { lat: 50.5, lon: 6.2 },
  { lat: 50.72, lon: 6.02 },
  { lat: 51.05, lon: 5.87 },
  { lat: 51.25, lon: 6.05 },
  { lat: 51.45, lon: 6.08 },
  { lat: 51.65, lon: 5.95 },
];

/**
 * Ballungsraeume mit relativem Gewicht. Das Gewicht steuert nur, wie dicht die
 * symbolische Punktwolke dort erscheint, und bildet ungefaehr die
 * Bevoelkerungsverteilung ab.
 */
export const nrwHubs: { name: string; lat: number; lon: number; weight: number; radius: number }[] = [
  { name: "Köln", lat: 50.94, lon: 6.96, weight: 11, radius: 0.22 },
  { name: "Düsseldorf", lat: 51.23, lon: 6.78, weight: 8, radius: 0.18 },
  { name: "Dortmund", lat: 51.51, lon: 7.47, weight: 8, radius: 0.18 },
  { name: "Essen", lat: 51.46, lon: 7.01, weight: 7, radius: 0.16 },
  { name: "Duisburg", lat: 51.43, lon: 6.76, weight: 6, radius: 0.14 },
  { name: "Wuppertal", lat: 51.26, lon: 7.15, weight: 9, radius: 0.2 },
  { name: "Bochum", lat: 51.48, lon: 7.22, weight: 5, radius: 0.13 },
  { name: "Bielefeld", lat: 52.02, lon: 8.53, weight: 5, radius: 0.22 },
  { name: "Bonn", lat: 50.74, lon: 7.1, weight: 5, radius: 0.16 },
  { name: "Münster", lat: 51.96, lon: 7.63, weight: 5, radius: 0.24 },
  { name: "Aachen", lat: 50.78, lon: 6.08, weight: 4, radius: 0.18 },
  { name: "Mönchengladbach", lat: 51.19, lon: 6.44, weight: 4, radius: 0.16 },
  { name: "Gelsenkirchen", lat: 51.52, lon: 7.09, weight: 3, radius: 0.11 },
  { name: "Krefeld", lat: 51.33, lon: 6.56, weight: 3, radius: 0.13 },
  { name: "Hagen", lat: 51.36, lon: 7.47, weight: 3, radius: 0.14 },
  { name: "Hamm", lat: 51.68, lon: 7.82, weight: 3, radius: 0.16 },
  { name: "Siegen", lat: 50.88, lon: 8.02, weight: 3, radius: 0.2 },
  { name: "Paderborn", lat: 51.72, lon: 8.75, weight: 3, radius: 0.22 },
  { name: "Recklinghausen", lat: 51.61, lon: 7.2, weight: 3, radius: 0.14 },
  { name: "Solingen", lat: 51.17, lon: 7.08, weight: 3, radius: 0.1 },
  { name: "Remscheid", lat: 51.18, lon: 7.19, weight: 3, radius: 0.1 },
  { name: "Leverkusen", lat: 51.03, lon: 6.99, weight: 2, radius: 0.11 },
  { name: "Minden", lat: 52.29, lon: 8.92, weight: 2, radius: 0.16 },
  { name: "Detmold", lat: 51.94, lon: 8.88, weight: 2, radius: 0.18 },
  { name: "Arnsberg", lat: 51.4, lon: 8.06, weight: 2, radius: 0.24 },
  { name: "Kleve", lat: 51.79, lon: 6.14, weight: 2, radius: 0.2 },
  { name: "Euskirchen", lat: 50.66, lon: 6.79, weight: 2, radius: 0.2 },
  { name: "Höxter", lat: 51.78, lon: 9.38, weight: 1, radius: 0.14 },
];

const totalHubWeight = nrwHubs.reduce((sum, hub) => sum + hub.weight, 0);

export const nrwBounds = nrwOutline.reduce(
  (bounds, point) => ({
    latMin: Math.min(bounds.latMin, point.lat),
    latMax: Math.max(bounds.latMax, point.lat),
    lonMin: Math.min(bounds.lonMin, point.lon),
    lonMax: Math.max(bounds.lonMax, point.lon),
  }),
  { latMin: 90, latMax: -90, lonMin: 180, lonMax: -180 },
);

/** Mittlere Breite fuer die Laengengrad-Stauchung der Plattkarte. */
const latitudeScale = Math.cos(((nrwBounds.latMin + nrwBounds.latMax) / 2) * (Math.PI / 180));

/**
 * Projiziert Lat/Lon in normalisierte Koordinaten (0..1), y zeigt nach unten.
 * Das Seitenverhaeltnis bleibt erhalten; die kuerzere Achse wird zentriert.
 */
export function projectToUnitSquare(point: LatLon): { x: number; y: number } {
  const width = (nrwBounds.lonMax - nrwBounds.lonMin) * latitudeScale;
  const height = nrwBounds.latMax - nrwBounds.latMin;
  const size = Math.max(width, height);

  const x = ((point.lon - nrwBounds.lonMin) * latitudeScale + (size - width) / 2) / size;
  const y = (nrwBounds.latMax - point.lat + (size - height) / 2) / size;
  return { x, y };
}

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

/**
 * Symbolische Position einer Einreichung auf der Karte, abgeleitet aus der ID.
 * Es handelt sich ausdruecklich nicht um den echten Reparaturort.
 */
export function symbolicPosition(id: string): { x: number; y: number; hub: string } {
  const random = seededRandom(hashString(id));
  let pick = random() * totalHubWeight;
  let hub = nrwHubs[nrwHubs.length - 1];

  for (const candidate of nrwHubs) {
    pick -= candidate.weight;
    if (pick <= 0) {
      hub = candidate;
      break;
    }
  }

  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * hub.radius;
  const projected = projectToUnitSquare({
    lat: hub.lat + Math.sin(angle) * distance,
    lon: hub.lon + (Math.cos(angle) * distance) / latitudeScale,
  });

  return { ...projected, hub: hub.name };
}
