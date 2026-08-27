/**
 * Name, ein garantiert innenliegender Referenzpunkt und ein sicherer
 * Streuradius je NRW-Kreis.
 *
 * Fuer die manuelle Kreis-Auswahl im Einreichungsformular. Bewusst getrennt
 * von `lib/nrw-map.ts`: das Formular braucht nur diese ~50 Punkte, nicht die
 * vollen (deutlich groesseren) Umriss-Polygone - ein Import von dort wuerde
 * sie unnoetig ins Client-Bundle der oeffentlichen Startseite ziehen.
 *
 * `radiusKm` ist so gewaehlt, dass eine zufaellige Streuung um den
 * Referenzpunkt (bis zu diesem Radius) nach dem vollen Anonymisierungs-Pfad -
 * `anonymizeCoordinates()` snappt zusaetzlich auf eine ~5-km-Rasterzelle und
 * jittert innerhalb dieser Zelle nochmal deterministisch - mit sehr hoher
 * Sicherheit im selben Kreis landet. Empirisch gegen `kreisForPoint()` nach
 * dem vollen Pfad geprueft (500 Zufallsstichproben je Kreis, 0 Fehlversuche,
 * siehe `nrw-kreise-list.test.ts`), nicht geometrisch exakt - fuer eine rein
 * dekorative Kartendarstellung reicht das. Kleinere/grenznahe Kreise wie
 * Rhein-Sieg-Kreis oder Duesseldorf haben deshalb einen kleineren Radius als
 * groessere, zentralere wie Koeln oder Dortmund.
 */
export const nrwKreiseList: { name: string; lat: number; lon: number; radiusKm: number }[] = [
  { name: "Bielefeld", lat: 52.006, lon: 8.529, radiusKm: 2.75 },
  { name: "Bochum", lat: 51.477, lon: 7.238, radiusKm: 1.25 },
  { name: "Bonn", lat: 50.699, lon: 7.102, radiusKm: 1 },
  { name: "Bottrop", lat: 51.578, lon: 6.918, radiusKm: 1.25 },
  { name: "Dortmund", lat: 51.505, lon: 7.483, radiusKm: 2.75 },
  { name: "Duisburg", lat: 51.436, lon: 6.709, radiusKm: 2.75 },
  { name: "Düsseldorf", lat: 51.241, lon: 6.832, radiusKm: 0.75 },
  { name: "Ennepe-Ruhr-Kreis", lat: 51.332, lon: 7.341, radiusKm: 2.75 },
  { name: "Essen", lat: 51.442, lon: 7.012, radiusKm: 2.25 },
  { name: "Gelsenkirchen", lat: 51.562, lon: 7.062, radiusKm: 1.5 },
  { name: "Hagen", lat: 51.34, lon: 7.479, radiusKm: 2.75 },
  { name: "Hamm", lat: 51.668, lon: 7.822, radiusKm: 1.5 },
  { name: "Herne", lat: 51.537, lon: 7.21, radiusKm: 2 },
  { name: "Hochsauerlandkreis", lat: 51.324, lon: 8.432, radiusKm: 2.75 },
  { name: "Köln", lat: 50.951, lon: 6.95, radiusKm: 2.75 },
  { name: "Krefeld", lat: 51.354, lon: 6.581, radiusKm: 2.75 },
  { name: "Kreis Borken", lat: 51.938, lon: 6.864, radiusKm: 2.75 },
  { name: "Kreis Coesfeld", lat: 51.848, lon: 7.391, radiusKm: 2.75 },
  { name: "Kreis Düren", lat: 50.811, lon: 6.445, radiusKm: 2.75 },
  { name: "Kreis Euskirchen", lat: 50.534, lon: 6.658, radiusKm: 2.75 },
  { name: "Kreis Gütersloh", lat: 51.955, lon: 8.36, radiusKm: 2.75 },
  { name: "Kreis Heinsberg", lat: 51.045, lon: 6.168, radiusKm: 2.75 },
  { name: "Kreis Herford", lat: 52.161, lon: 8.654, radiusKm: 2.75 },
  { name: "Kreis Höxter", lat: 51.676, lon: 9.178, radiusKm: 2.75 },
  { name: "Kreis Kleve", lat: 51.665, lon: 6.269, radiusKm: 2.25 },
  { name: "Kreis Lippe", lat: 51.984, lon: 9.02, radiusKm: 2.75 },
  { name: "Kreis Mettmann", lat: 51.243, lon: 6.951, radiusKm: 2.75 },
  { name: "Kreis Minden-Lübbecke", lat: 52.348, lon: 8.783, radiusKm: 2.75 },
  { name: "Kreis Olpe", lat: 51.087, lon: 7.987, radiusKm: 2.75 },
  { name: "Kreis Paderborn", lat: 51.644, lon: 8.745, radiusKm: 2.75 },
  { name: "Kreis Recklinghausen", lat: 51.661, lon: 7.123, radiusKm: 2.75 },
  { name: "Kreis Siegen-Wittgenstein", lat: 50.956, lon: 8.206, radiusKm: 2.75 },
  { name: "Kreis Soest", lat: 51.576, lon: 8.19, radiusKm: 2.75 },
  { name: "Kreis Steinfurt", lat: 52.192, lon: 7.586, radiusKm: 2.75 },
  { name: "Kreis Unna", lat: 51.525, lon: 7.749, radiusKm: 2.75 },
  { name: "Kreis Viersen", lat: 51.285, lon: 6.373, radiusKm: 2.75 },
  { name: "Kreis Warendorf", lat: 51.864, lon: 7.954, radiusKm: 2.75 },
  { name: "Kreis Wesel", lat: 51.62, lon: 6.598, radiusKm: 2.75 },
  { name: "Leverkusen", lat: 51.058, lon: 7.016, radiusKm: 1 },
  { name: "Märkischer Kreis", lat: 51.246, lon: 7.703, radiusKm: 2.75 },
  { name: "Mönchengladbach", lat: 51.161, lon: 6.427, radiusKm: 0.75 },
  { name: "Mülheim an der Ruhr", lat: 51.416, lon: 6.875, radiusKm: 2.25 },
  { name: "Münster", lat: 51.938, lon: 7.626, radiusKm: 1.75 },
  { name: "Oberbergischer Kreis", lat: 51.018, lon: 7.499, radiusKm: 2.75 },
  { name: "Oberhausen", lat: 51.455, lon: 6.819, radiusKm: 1.75 },
  { name: "Remscheid", lat: 51.182, lon: 7.219, radiusKm: 2 },
  { name: "Rhein-Erft-Kreis", lat: 50.896, lon: 6.729, radiusKm: 2.75 },
  { name: "Rhein-Kreis Neuss", lat: 51.151, lon: 6.628, radiusKm: 2.75 },
  { name: "Rhein-Sieg-Kreis", lat: 50.701, lon: 6.886, radiusKm: 0.25 },
  { name: "Rheinisch-Bergischer Kreis", lat: 51.029, lon: 7.199, radiusKm: 2.75 },
  { name: "Solingen", lat: 51.149, lon: 7.083, radiusKm: 1 },
  { name: "Städteregion Aachen", lat: 50.501, lon: 6.239, radiusKm: 1.5 },
  { name: "Wuppertal", lat: 51.24, lon: 7.175, radiusKm: 2.75 },
];
