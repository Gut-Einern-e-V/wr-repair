/**
 * Reihenfolge von Hand aendern (Issue #98).
 *
 * Unterstuetzer und Preise standen schon immer nach einer Spalte `sort_order`,
 * nur liess sie sich nirgends aendern: Die Partner hatten gar kein Feld dafuer,
 * die Preise ein Zahlenfeld, in das man erst hineindenken muss. Zwei Pfeile je
 * Eintrag brauchen das nicht.
 *
 * Die Rechnung steht hier und nicht in der Route, weil sie ohne Datenbank
 * pruefbar ist - und weil sie einen Fallstrick hat: Alle Zeilen kommen mit
 * `sort_order` 0 auf die Welt. Ein Tausch zweier Nullen ist kein Tausch. Es
 * wird deshalb bei jeder Verschiebung die ganze Liste neu durchnummeriert.
 */

export type Ordered = { id: string; sort_order: number };

export type OrderDirection = "up" | "down";

export function isOrderDirection(value: unknown): value is OrderDirection {
  return value === "up" || value === "down";
}

/**
 * Einen Eintrag eine Position verschieben.
 *
 * `items` steht in der Reihenfolge, in der die Liste angezeigt wird. Zurueck
 * kommen nur die Zeilen, deren Zahl sich tatsaechlich aendert - nach oben
 * geschoben ist das oft die halbe Liste, weil vorher ueberall dieselbe Null
 * stand. `null` heisst: nichts zu tun, weil der Eintrag schon am Rand steht
 * oder gar nicht in der Liste ist.
 */
export function reorder(items: Ordered[], id: string, direction: OrderDirection): Ordered[] | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return null;

  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];

  return moved
    .map((item, position) => ({ id: item.id, sort_order: position, previous: item.sort_order }))
    .filter((row) => row.sort_order !== row.previous)
    .map(({ id, sort_order }) => ({ id, sort_order }));
}
