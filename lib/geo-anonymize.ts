/**
 * Anonymisierung von Herkunftskoordinaten.
 *
 * Zweck: Das Buehnen-Dashboard soll zeigen, aus welchen Gegenden Reparaturen
 * kommen, ohne dass ein einzelner Beitrag auf einen Haushalt zurueckfuehrbar
 * ist. Dafuer bekommt jede Koordinate einen zufaelligen Versatz von bis zu
 * {@link BLUR_RADIUS_KM} Kilometern und wird auf {@link DECIMALS} Nachkomma-
 * stellen (~110 m) gerundet. Die Ausgangskoordinate verlaesst den Browser
 * nicht.
 *
 * Der Versatz ist gleichverteilt in einer Kreisflaeche um den echten Punkt.
 * Umgekehrt heisst das: Zu einem veroeffentlichten Punkt liegt der echte Ort
 * irgendwo in einer Flaeche von rund 3 km^2 - und zwar gleichverteilt, ohne
 * dass die Mitte wahrscheinlicher waere.
 *
 * ## Was dieses Verfahren nicht leistet
 *
 * Bis August 2026 wurde stattdessen auf ein 5-km-Raster geschnappt. Das hatte
 * zwei Eigenschaften, die hier bewusst aufgegeben wurden:
 *
 * 1. **Der Server konnte nachrechnen.** Ein Rasterwert ist reproduzierbar, ein
 *    Zufallsversatz nicht: Jede Koordinate ist ein plausibles Ergebnis. Der
 *    Server kann deshalb nur noch pruefen, dass ein gemeldeter Wert grob genug
 *    *aussieht* (siehe {@link isCoarsePoint}) - nicht mehr, dass er wirklich
 *    aus dieser Funktion stammt. Eine selbst gebaute Anfrage kann damit eine
 *    auf ~110 m genaue Koordinate einschleusen. Vorher fiel so etwas durch.
 * 2. **Wiederholung verriet nichts.** Im Raster bekamen alle Reparaturen
 *    derselben Zelle exakt denselben Wert. Zufaellige Versaetze mitteln sich
 *    dagegen heraus: Ballen sich n Punkte um denselben Ort, naehert ihr
 *    Mittelwert den echten Ort mit rund {@link BLUR_RADIUS_KM}/sqrt(n) an. Bei
 *    einem Repair-Cafe mit vielen Eintraegen ist das ein oeffentlicher Ort und
 *    unproblematisch; bei einem Haushalt mit wenigen Eintraegen bleibt der
 *    Fehler in der Groessenordnung eines Kilometers.
 *
 * Der Tausch war eine bewusste Entscheidung: Die Karte soll zeigen, wo
 * repariert wurde, und nicht nur, in welchem Kreis.
 */

export type AnonymizedPoint = { lat: number; lon: number };

/** Groesster moeglicher Versatz gegenueber dem echten Ort, in Kilometern. */
export const BLUR_RADIUS_KM = 1;

/** Nachkommastellen der gespeicherten Werte (~110 m) - deckt sich mit numeric(6,3). */
export const DECIMALS = 3;

/** Kilometer pro Breitengrad. Fuer den Zweck hier reicht die Kugelnaeherung. */
const KM_PER_DEGREE_LAT = 111.32;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Gleichverteilte Zufallszahl in [0, 1).
 *
 * Bewusst aus der Krypto-Quelle und nicht aus `Math.random()`: Deren Zustand
 * ist aus wenigen Ausgaben rekonstruierbar. Wer mehrere Einreichungen
 * derselben Sitzung sieht, koennte damit sonst die Versaetze zurueckrechnen -
 * und die Anonymisierung waere aufgehoben.
 */
function randomUnit(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 2 ** 32;
}

/**
 * Verschiebt eine Koordinate zufaellig und rundet sie.
 *
 * Gibt `null` zurueck, wenn die Eingabe keine brauchbare Koordinate ist. Die
 * Rueckgabe ist bewusst ungenau: Sie beschreibt eine Gegend, keinen Ort. Zwei
 * Aufrufe mit derselben Eingabe liefern verschiedene Ergebnisse - anders als
 * frueher ist die Funktion nicht idempotent, ein zweiter Durchlauf verschiebt
 * den Punkt ein weiteres Mal.
 */
export function anonymizeCoordinates(lat: unknown, lon: unknown): AnonymizedPoint | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  // Exakte Nullkoordinaten stammen praktisch immer aus kaputten EXIF-Feldern.
  if (lat === 0 && lon === 0) return null;

  // Wurzel aus dem Zufallswert, damit die Punkte ueber die Kreisflaeche
  // gleichverteilt sind. Ohne sie waere die Mitte deutlich dichter besetzt -
  // und damit der echte Ort wahrscheinlicher als sein Umfeld.
  const angle = randomUnit() * Math.PI * 2;
  const distance = Math.sqrt(randomUnit()) * BLUR_RADIUS_KM;
  const shrink = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);

  return {
    lat: roundTo(lat + (Math.sin(angle) * distance) / KM_PER_DEGREE_LAT, DECIMALS),
    lon: roundTo(lon + (Math.cos(angle) * distance) / (KM_PER_DEGREE_LAT * shrink), DECIMALS),
  };
}

/**
 * Rundet eine Koordinate, ohne sie zu verschieben.
 *
 * Fuer Angaben, die von vornherein keine Genauigkeit haben: Wer im Formular
 * einen Kreis auswaehlt, nennt keinen Ort, sondern eine Flaeche von der Groesse
 * eines Landkreises - dort gibt es nichts zu verschleiern. Ein zusaetzlicher
 * Versatz wuerde den Punkt nur ueber die Kreisgrenze schieben koennen und die
 * ausgewaehlte Angabe damit verfaelschen.
 *
 * Fuer echte Koordinaten - Standortabfrage, Foto-EXIF, IP-Herkunft - ist
 * {@link anonymizeCoordinates} zustaendig.
 */
export function coarsenCoordinates(lat: unknown, lon: unknown): AnonymizedPoint | null {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  if (lat === 0 && lon === 0) return null;

  return { lat: roundTo(lat, DECIMALS), lon: roundTo(lon, DECIMALS) };
}

/**
 * Prueft, ob ein Punkt grob genug ist, um gespeichert zu werden.
 *
 * Das ist alles, was der Server nach dem Wechsel vom Raster zum Zufallsversatz
 * noch pruefen kann (siehe Modulkopf): Ob ein Wert wirklich aus
 * {@link anonymizeCoordinates} stammt, laesst sich nicht mehr feststellen -
 * wohl aber, dass er nicht genauer ist, als die Anonymisierung ihn je
 * ausliefern wuerde. Eine rohe GPS-Koordinate mit fuenf Nachkommastellen
 * faellt damit durch, eine auf 110 m gerundete nicht.
 */
export function isCoarsePoint(lat: unknown, lon: unknown): boolean {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  if (lat === 0 && lon === 0) return false;

  return roundTo(lat, DECIMALS) === lat && roundTo(lon, DECIMALS) === lon;
}

/**
 * Liest die von Vercel gesetzten Geo-Header und gibt sie anonymisiert zurueck.
 *
 * Diese Angaben sind ohnehin nur stadtgenau. Der Versatz macht sie nicht
 * genauer - er verhindert nur, dass alle Einreichungen einer Stadt exakt auf
 * demselben Punkt liegen.
 */
export function anonymizeRequestOrigin(request: Request): AnonymizedPoint | null {
  const lat = Number.parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
  const lon = Number.parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
  return anonymizeCoordinates(lat, lon);
}
