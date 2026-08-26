/**
 * Anonymisierung von Herkunftskoordinaten.
 *
 * Zweck: Das Buehnen-Dashboard soll grob zeigen, aus welchen Gegenden
 * Reparaturen kommen, ohne dass ein einzelner Beitrag auf einen Haushalt
 * zurueckfuehrbar ist. Dafuer wird jede Koordinate auf eine feste Zelle von
 * rund {@link CELL_SIZE_KM} Kilometern geschnappt.
 *
 * Warum Raster statt reinem Zufallsversatz: Ein zufaelliger Offset um den
 * echten Punkt mittelt sich heraus, sobald mehrere Einreichungen vom selben
 * Ort kommen - der Mittelwert konvergiert gegen die Wahrheit. Das Raster ist
 * dagegen idempotent: derselbe Ort ergibt immer dieselbe Zelle, egal wie oft
 * er eingereicht wird. Der zusaetzliche Versatz ist deshalb *nicht* zufaellig,
 * sondern aus der Zellnummer abgeleitet. Er dient allein der Optik, damit die
 * Punkte auf der Karte nicht sichtbar auf einem Gitter sitzen.
 *
 * Die Idempotenz hat einen zweiten Nutzen: Weil der Browser anonymisiert und
 * nur das Ergebnis sendet, kann der Server per {@link isAnonymizedPoint}
 * pruefen, ob ein Wert wirklich aus dieser Funktion stammt. Beliebig genaue
 * Koordinaten fallen dabei durch.
 */

import { hashString, seededRandom } from "./hash";

export type AnonymizedPoint = { lat: number; lon: number };

/** Kantenlaenge einer Rasterzelle in Kilometern. */
export const CELL_SIZE_KM = 5;

/** Nachkommastellen der gespeicherten Werte (~110 m) - deckt sich mit numeric(6,3). */
const DECIMALS = 3;

/** Kilometer pro Breitengrad. Fuer den Zweck hier reicht die Kugelnaeherung. */
const KM_PER_DEGREE_LAT = 111.32;

/**
 * Anteil der Zellbreite, um den ein Punkt maximal aus der Zellmitte versetzt
 * wird. Bewusst unter 0.5, damit der Punkt seine Zelle nie verlaesst - sonst
 * waere das Verfahren nicht mehr idempotent.
 */
const JITTER_FRACTION = 0.34;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Kantenlaenge einer Zelle in Grad, bezogen auf ein Breitenband. */
function cellSize(latIndex: number, latStep: number): number {
  // Laengengrade ruecken zu den Polen hin zusammen; ohne diese Korrektur
  // waeren die Zellen im Norden deutlich schmaler als im Sueden.
  //
  // Wichtig: Die Stauchung wird aus der *Bandmitte* berechnet, nicht aus der
  // Eingabebreite. Sonst haengt die Zellbreite vom Rohwert ab und ein zweiter
  // Durchlauf mit dem bereits geschnappten Punkt landete in einer anderen
  // Spalte - das Verfahren waere nicht mehr idempotent.
  const bandLat = (latIndex + 0.5) * latStep;
  const shrink = Math.max(Math.cos((bandLat * Math.PI) / 180), 0.01);
  return latStep / shrink;
}

/**
 * Schnappt eine Koordinate auf den Repraesentanten ihrer Rasterzelle.
 *
 * Gibt `null` zurueck, wenn die Eingabe keine brauchbare Koordinate ist.
 * Die Rueckgabe ist bewusst grob: Sie beschreibt eine Gegend, keinen Ort.
 */
export function anonymizeCoordinates(lat: unknown, lon: unknown): AnonymizedPoint | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  // Exakte Nullkoordinaten stammen praktisch immer aus kaputten EXIF-Feldern.
  if (lat === 0 && lon === 0) return null;

  const latStep = CELL_SIZE_KM / KM_PER_DEGREE_LAT;
  const latIndex = Math.floor(lat / latStep);
  const lonStep = cellSize(latIndex, latStep);
  const lonIndex = Math.floor(lon / lonStep);

  // Versatz aus der Zellnummer, nicht aus dem Zufallsgenerator: Zwei Punkte
  // derselben Zelle erhalten denselben Versatz und bleiben ununterscheidbar.
  const random = seededRandom(hashString(`cell:${latIndex}:${lonIndex}`));
  const offsetLat = (random() - 0.5) * 2 * JITTER_FRACTION;
  const offsetLon = (random() - 0.5) * 2 * JITTER_FRACTION;

  return {
    lat: roundTo((latIndex + 0.5 + offsetLat) * latStep, DECIMALS),
    lon: roundTo((lonIndex + 0.5 + offsetLon) * lonStep, DECIMALS),
  };
}

/**
 * Prueft, ob ein Punkt bereits das Ergebnis von {@link anonymizeCoordinates}
 * ist. Genutzt vom Upload-Endpunkt, um vom Browser gelieferte Werte zu
 * verifizieren, statt ihnen zu vertrauen.
 */
export function isAnonymizedPoint(lat: unknown, lon: unknown): boolean {
  const snapped = anonymizeCoordinates(lat, lon);
  return snapped !== null && snapped.lat === lat && snapped.lon === lon;
}

/**
 * Liest die von Vercel gesetzten Geo-Header und gibt sie anonymisiert zurueck.
 * Diese Angaben sind ohnehin nur stadtgenau; das Raster vereinheitlicht sie
 * lediglich mit der EXIF-Quelle.
 */
export function anonymizeRequestOrigin(request: Request): AnonymizedPoint | null {
  const lat = Number.parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
  const lon = Number.parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
  return anonymizeCoordinates(lat, lon);
}
