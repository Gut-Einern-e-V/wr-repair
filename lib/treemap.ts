/**
 * Squarified Treemap.
 *
 * Balken sind fuer zwoelf Kategorien, von denen anfangs die meisten bei null
 * stehen, die schlechteste Darstellung: acht leere Zeilen, vier kurze Striche.
 * Eine Flaechenaufteilung nutzt denselben Platz vollstaendig, laesst leere
 * Kategorien einfach weg und ist auf einer Projektion aus zehn Metern noch
 * lesbar - die groesste Kategorie ist die groesste Flaeche.
 *
 * Verfahren nach Bruls, Huizing, van Wijk (2000): Die Kacheln werden reihenweise
 * gelegt, und eine Reihe wird genau so lange gefuellt, wie sich das
 * Seitenverhaeltnis der schlechtesten Kachel dadurch verbessert. Das ergibt
 * Kacheln nahe am Quadrat statt langer Schlitze.
 */

export type TreemapInput = { key: string; value: number };
export type TreemapRect = { key: string; value: number; x: number; y: number; width: number; height: number };

/** Schlechtestes Seitenverhaeltnis einer Reihe, wenn sie an `side` anliegt. */
function worstAspect(row: number[], side: number): number {
  let sum = 0;
  let min = Infinity;
  let max = 0;
  for (const area of row) {
    sum += area;
    if (area < min) min = area;
    if (area > max) max = area;
  }
  if (sum <= 0 || side <= 0 || min <= 0) return Infinity;

  const sumSquared = sum * sum;
  const sideSquared = side * side;
  return Math.max((sideSquared * max) / sumSquared, sumSquared / (sideSquared * min));
}

/**
 * Verteilt die Werte auf Rechtecke, die zusammen die Flaeche `width` x `height`
 * genau ausfuellen.
 *
 * Werte kleiner oder gleich null entfallen; die Reihenfolge ist absteigend nach
 * Wert und bei Gleichstand nach Schluessel, damit dieselben Daten immer dasselbe
 * Bild ergeben und die Kacheln zwischen zwei Aktualisierungen nicht springen.
 */
export function treemap(inputs: TreemapInput[], width: number, height: number): TreemapRect[] {
  if (width <= 0 || height <= 0) return [];

  const items = inputs
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value || left.key.localeCompare(right.key, "de"));

  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (items.length === 0 || total <= 0) return [];

  // Werte in Flaechen umrechnen, damit Reihenbreiten direkt herausfallen.
  const areas = items.map((item) => (item.value / total) * width * height);
  const rects: TreemapRect[] = [];

  let free = { x: 0, y: 0, width, height };
  let index = 0;

  while (index < areas.length) {
    const side = Math.min(free.width, free.height);

    // Reihe so lange verlaengern, wie das schlechteste Seitenverhaeltnis sinkt.
    const row = [areas[index]];
    let next = index + 1;
    while (next < areas.length && worstAspect([...row, areas[next]], side) <= worstAspect(row, side)) {
      row.push(areas[next]);
      next += 1;
    }

    const rowArea = row.reduce((sum, area) => sum + area, 0);
    const isLast = index + row.length >= areas.length;

    if (free.width >= free.height) {
      // Reihe als Spalte an den linken Rand der Restflaeche.
      const columnWidth = isLast ? free.width : rowArea / free.height;
      let y = free.y;
      row.forEach((area, offset) => {
        const item = items[index + offset];
        const isLastInRow = offset === row.length - 1;
        const cellHeight = isLastInRow ? free.y + free.height - y : area / columnWidth;
        rects.push({ key: item.key, value: item.value, x: free.x, y, width: columnWidth, height: cellHeight });
        y += cellHeight;
      });
      free = { x: free.x + columnWidth, y: free.y, width: free.width - columnWidth, height: free.height };
    } else {
      const rowHeight = isLast ? free.height : rowArea / free.width;
      let x = free.x;
      row.forEach((area, offset) => {
        const item = items[index + offset];
        const isLastInRow = offset === row.length - 1;
        const cellWidth = isLastInRow ? free.x + free.width - x : area / rowHeight;
        rects.push({ key: item.key, value: item.value, x, y: free.y, width: cellWidth, height: rowHeight });
        x += cellWidth;
      });
      free = { x: free.x, y: free.y + rowHeight, width: free.width, height: free.height - rowHeight };
    }

    index += row.length;
  }

  return rects;
}
