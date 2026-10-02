import type { SubmissionWindow } from "./submission-window";

/**
 * Wann die veroeffentlichte Preisliste verbindlich wird (Issue #110).
 *
 * Die rechtliche Pruefung der Teilnahmebedingungen hat einen Punkt
 * hervorgehoben, der bis dahin nur eine gute Absicht war: Art und Anzahl der
 * Gewinne gehoeren zu den wesentlichen Bedingungen einer Verlosung. Wer sich
 * zur Teilnahme entscheidet, tut das im Vertrauen auf die Liste, die er
 * gesehen hat - sie darf danach nicht mehr zu seinen Lasten schrumpfen.
 *
 * Deshalb steht die Regel hier und nicht nur in einem Satz auf der Seite: Ein
 * Versprechen, das allein von der Sorgfalt der Verwaltung abhaengt, ist im
 * Zweifel keines. Ergaenzen bleibt jederzeit moeglich - ein zusaetzlicher
 * Preis ist fuer Teilnehmende nie ein Nachteil.
 */

/**
 * Ist die Liste bereits verbindlich?
 *
 * Massgeblich ist der Beginn der Teilnahme, nicht ihr Ende: Von da an konnte
 * jemand die Liste gesehen und sich auf sie verlassen haben. Nach dem Ende
 * gilt sie erst recht weiter, denn dann steht die Ziehung noch aus.
 *
 * Ohne eingestellten Zeitraum (`invalid`) ist nichts verbindlich - dann hat
 * die Teilnahme nie begonnen, und die Verwaltung soll die Liste aufraeumen
 * koennen.
 */
export function isPrizeListBinding(window: Pick<SubmissionWindow, "status">): boolean {
  return window.status === "open" || window.status === "after";
}

/** Warum ein Preis jetzt nicht mehr entfernt werden darf - oder null. */
export function prizeRemovalRefusal(binding: boolean): string | null {
  if (!binding) return null;
  return "Die Teilnahme läuft bereits. Ein veröffentlichter Preis darf jetzt nicht mehr entfernt werden - so steht es in den Teilnahmebedingungen. Preise hinzufügen und beschreiben geht weiterhin.";
}

/** Warum eine Aenderung an einem Preis jetzt nicht mehr zulaessig ist - oder null. */
export function prizeQuantityRefusal(binding: boolean, previousQuantity: number, nextQuantity: number): string | null {
  if (!binding || nextQuantity >= previousQuantity) return null;
  return `Die Teilnahme läuft bereits. Die Anzahl eines veröffentlichten Preises darf jetzt nicht mehr verringert werden (bisher ${previousQuantity}, gewünscht ${nextQuantity}). Erhöhen geht weiterhin.`;
}

/**
 * Der Satz ueber der Preisliste auf /gewinnspiel.
 *
 * Er steht hier und nicht in der Seite, weil er die Zusage traegt: Art und
 * Anzahl der Gewinne gehoeren zu den wesentlichen Bedingungen einer
 * Verlosung, und ein Satz, der das sagt, sollte pruefbar sein, ohne die Seite
 * zu bauen.
 *
 * Zweigeteilt, weil dasselbe Versprechen vor und nach dem Start verschieden
 * klingt: Vor dem Start waechst die Liste wirklich noch; ab dem Start waere
 * dieselbe Ankuendigung eine Einladung zum Misstrauen, weil sie offenliesse,
 * ob auch wieder etwas verschwinden kann. Die Zusage ist bewusst einseitig -
 * dazukommen ja, wegfallen nein - und gilt nicht nur auf dem Papier: Das
 * Backend laesst ab dem Start weder das Entfernen noch das Verringern zu.
 *
 * `startLabel` ist der fertig formatierte Tag oder null, wenn kein Zeitraum
 * eingestellt ist. Die Seite formatiert ihn, damit hier keine Zeitzone steht.
 */
export function prizeListLead(binding: boolean, startLabel: string | null, total: number): string {
  const start = startLabel ? ` am ${startLabel}` : "";

  /* Keine Preise und die Teilnahme laeuft schon: Dann ist etwas kaputt, denn
     bis zum Start muss die Liste stehen. Erfundene Beispiele waeren hier
     genau die Irrefuehrung, die die Preisliste verhindern soll. */
  if (total <= 0) {
    return binding
      ? "Die Preisliste lässt sich gerade nicht anzeigen. Das liegt an uns und nicht daran, dass es nichts zu gewinnen gäbe – schreib uns, dann nennen wir dir die Preise."
      : `Die Preise werden von Unternehmen und Initiativen aus der Region gestiftet und stehen hier, sobald sie feststehen – spätestens zum Start der Teilnahme${start}. Die Beispiele unten zeigen, woran wir dabei denken.`;
  }

  if (binding) {
    return `Unter allen gültigen Teilnahmen werden ${total === 1 ? "der folgende Preis" : `die folgenden ${total} Preise`} verlost. Mit dem Start der Teilnahme${start} ist diese Liste verbindlich: Es können weitere Preise dazukommen, gestrichen oder in der Anzahl verringert wird keiner.`;
  }

  return `Die Preise werden von Unternehmen und Initiativen aus der Region gestiftet; bis jetzt ${total === 1 ? "steht ein Gewinn" : `stehen ${total} Gewinne`} fest. Bis zum Start der Teilnahme${start} können weitere dazukommen. Ab dem Start ist die Liste verbindlich: Dann wird kein aufgeführter Preis mehr gestrichen und keine Anzahl mehr verringert.`;
}

/**
 * Wie viele Gewinne insgesamt verlost werden.
 *
 * Nicht die Zahl der Zeilen: Ein Preis mit der Anzahl zehn ist zehn Gewinne,
 * und genau diese Zahl gehoert auf die oeffentliche Seite.
 */
export function totalPrizeCount(prizes: { quantity: number }[]): number {
  return prizes.reduce((sum, prize) => sum + (Number.isFinite(prize.quantity) ? Math.max(0, prize.quantity) : 0), 0);
}

/**
 * Platzierungen (Issue #119).
 *
 * Ein Preis belegt einen Platz ("1. Platz") oder einen Bereich ("10.–20.
 * Platz") - der Bereich ist dann auch seine Anzahl: Zehn gleiche Gutscheine
 * sind die Plaetze zehn bis neunzehn und nicht ein Platz mit einer Zahl
 * daneben, die jemand getrennt pflegen und mit den Plaetzen abgleichen muesste.
 * Nach den Plaetzen richtet sich die Reihenfolge auf der Seite und im Backend,
 * Pfeile zum Sortieren gibt es fuer Preise deshalb nicht mehr.
 *
 * Jeder Platz gehoert hoechstens einem Preis. Die Datenbank sichert das mit
 * einer Ausschlussbedingung ab; die Pruefung hier ist dafuer da, dass die
 * Fehlermeldung sagt, mit welchem Preis sich die Plaetze ueberschneiden.
 */
export const PRIZE_PLACE_LIMIT = 50;

export type PrizePlaces = { placeFrom: number; placeTo: number };

/** Wie viele Gewinne ein Bereich ist. */
export function placesQuantity({ placeFrom, placeTo }: PrizePlaces): number {
  return placeTo - placeFrom + 1;
}

/** "1. Platz" oder "10.–20. Platz". */
export function placeLabel({ placeFrom, placeTo }: PrizePlaces): string {
  return placeFrom === placeTo ? `${placeFrom}. Platz` : `${placeFrom}.–${placeTo}. Platz`;
}

/**
 * Die Plaetze aus dem Formular lesen. "Bis" ist freiwillig: leer heisst, der
 * Preis belegt genau einen Platz.
 */
export function parsePlaces(fromRaw: unknown, toRaw: unknown): PrizePlaces | { error: string } {
  const from = Number(String(fromRaw ?? "").trim());
  const toText = String(toRaw ?? "").trim();
  const to = toText ? Number(toText) : from;

  if (!Number.isInteger(from) || from < 1 || from > PRIZE_PLACE_LIMIT) {
    return { error: `Der Platz muss eine ganze Zahl zwischen 1 und ${PRIZE_PLACE_LIMIT} sein.` };
  }
  if (!Number.isInteger(to) || to > PRIZE_PLACE_LIMIT) {
    return { error: `„Bis Platz“ muss eine ganze Zahl bis ${PRIZE_PLACE_LIMIT} sein.` };
  }
  if (to < from) {
    return { error: `„Bis Platz“ (${to}) liegt vor „Platz“ (${from}). Für einen einzelnen Platz „bis“ leer lassen.` };
  }
  return { placeFrom: from, placeTo: to };
}

/** Der erste Preis, dessen Plaetze sich mit diesen ueberschneiden - oder null. */
export function placeConflict<T extends PrizePlaces & { id: string }>(places: PrizePlaces, others: T[], ownId?: string): T | null {
  return others.find((other) => other.id !== ownId
    && other.placeFrom <= places.placeTo
    && places.placeFrom <= other.placeTo) ?? null;
}

/** Der erste freie Platz hinter allen vergebenen - Vorschlag fuer einen neuen Preis. */
export function nextFreePlace(prizes: PrizePlaces[]): number {
  return prizes.reduce((highest, prize) => Math.max(highest, prize.placeTo), 0) + 1;
}

/**
 * Plaetze fuer Zeilen, die noch keine haben.
 *
 * Zwischen Deployment und Migration fehlen die Spalten (Issue #119). Dann
 * gelten die Preise in ihrer bisherigen Reihenfolge als lueckenlos
 * hintereinander platziert - genau so fuellt die Migration sie auch auf.
 */
export function derivePlaces<T extends { quantity: number }>(prizes: T[]): (T & PrizePlaces)[] {
  let next = 1;
  return prizes.map((prize) => {
    const quantity = Math.max(1, Number.isFinite(prize.quantity) ? prize.quantity : 1);
    const placed = { ...prize, placeFrom: next, placeTo: next + quantity - 1 };
    next += quantity;
    return placed;
  });
}
