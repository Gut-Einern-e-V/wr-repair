import { coarsenCoordinates, type AnonymizedPoint } from "./geo-anonymize";
import { repairCategoryValues, type RepairCategory } from "./repair-catalog";

/**
 * Strichlisten von Repair-Cafes (Issue #158).
 *
 * Manche Cafes zaehlen auf Papier statt im Formular. Das Team traegt die Liste
 * im Admin-Backend nach: Anzahl je Kategorie, dazu Ort und Tag. Jede
 * Reparatur wird danach eine eigene Zeile in `repairs` - so zaehlt sie
 * ueberall mit, ohne dass die Statistik eine zweite Quelle kennen muss.
 *
 * Die Pruefung steht hier und nicht in der Route, damit sie ohne Datenbank
 * testbar ist.
 */

/** Tag an jeder nachgetragenen Reparatur. Haelt sie aus der Galerie: ohne Foto und Namen waeren das nur gleiche Kacheln. */
export const TALLY_TAG = "strichliste";

/** Mehr schafft kein Repair-Cafe an einem Tag in einer Kategorie - eine groessere Zahl ist ein Tippfehler. */
export const MAX_PER_CATEGORY = 500;
export const MAX_PER_SHEET = 1000;

export type TallyCounts = Partial<Record<RepairCategory, number>>;

export type TallySheet = {
  cafeName: string;
  address: string | null;
  eventDate: string;
  point: AnonymizedPoint;
  counts: TallyCounts;
  total: number;
  /** Mit Adresse nimmt jede Reparatur der Liste als eigenes Los teil - wie bei jeder Einreichung. */
  lottery: { name: string; email: string } | null;
};

type Result = { ok: true; sheet: TallySheet } | { ok: false; error: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value.trim().replace(",", "."));
  return Number.NaN;
}

/** Ein Kalendertag "JJJJ-MM-TT", den es gibt. `today` ebenso, damit der Test nicht am Datum haengt. */
export function isPastOrToday(date: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  return date <= today;
}

/**
 * Zeitpunkt, unter dem die Reparaturen gezaehlt werden.
 *
 * Mittags UTC liegt in Berlin sommers wie winters am selben Kalendertag -
 * und die Tagesstatistik rechnet in Europe/Berlin (202609020001).
 */
export function eventTimestamp(date: string) {
  return `${date}T12:00:00Z`;
}

export function parseTallySheet(input: unknown, today: string): Result {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const cafeName = text(body.cafeName);
  if (!cafeName || cafeName.length > 160) return { ok: false, error: "Bitte den Namen des Repair-Cafés angeben (höchstens 160 Zeichen)." };

  const address = text(body.address);
  if (address.length > 300) return { ok: false, error: "Die Adresse ist zu lang (höchstens 300 Zeichen)." };

  const eventDate = text(body.eventDate);
  if (!isPastOrToday(eventDate, today)) return { ok: false, error: "Bitte ein gültiges Datum angeben, das nicht in der Zukunft liegt." };

  const point = coarsenCoordinates(number(body.lat), number(body.lon));
  if (!point) return { ok: false, error: "Bitte Koordinaten angeben oder die Adresse suchen lassen." };

  const rawCounts = (body.counts && typeof body.counts === "object" ? body.counts : {}) as Record<string, unknown>;
  const counts: TallyCounts = {};
  let total = 0;
  for (const [category, raw] of Object.entries(rawCounts)) {
    if (raw === "" || raw === null || raw === undefined) continue;
    if (!repairCategoryValues.includes(category as RepairCategory)) return { ok: false, error: `Unbekannte Kategorie: ${category}` };
    const amount = number(raw);
    if (!Number.isInteger(amount) || amount < 0 || amount > MAX_PER_CATEGORY) {
      return { ok: false, error: `Anzahlen müssen ganze Zahlen zwischen 0 und ${MAX_PER_CATEGORY} sein.` };
    }
    if (amount > 0) {
      counts[category as RepairCategory] = amount;
      total += amount;
    }
  }
  if (total === 0) return { ok: false, error: "Bitte mindestens eine Reparatur eintragen." };
  if (total > MAX_PER_SHEET) return { ok: false, error: `Eine Liste darf höchstens ${MAX_PER_SHEET} Reparaturen enthalten.` };

  let lottery: TallySheet["lottery"] = null;
  if (body.lottery === true) {
    const email = text(body.lotteryEmail).toLowerCase();
    if (!emailPattern.test(email) || email.length > 254) return { ok: false, error: "Für das Gewinnspiel braucht es eine gültige E-Mail-Adresse." };
    const name = text(body.lotteryName) || cafeName;
    if (name.length > 200) return { ok: false, error: "Der Name für das Gewinnspiel ist zu lang (höchstens 200 Zeichen)." };
    lottery = { name, email };
  }

  return { ok: true, sheet: { cafeName, address: address || null, eventDate, point, counts, total, lottery } };
}

/** Eine Kategorie je Reparatur, in der Reihenfolge des Katalogs. */
export function expandCounts(counts: TallyCounts): RepairCategory[] {
  return repairCategoryValues.flatMap((category) => Array<RepairCategory>(counts[category] ?? 0).fill(category));
}
