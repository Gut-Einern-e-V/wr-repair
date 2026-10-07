/**
 * Rechenwege der Rueckschau-Sharepics: Zeitraeume, Aufbereitung der Antwort
 * von `recap_stats()` und die Balken des Verlaufs.
 *
 * Wie lib/sharepics.ts ohne Datenbank und ohne Satori testbar. Gezeichnet wird
 * in components/sharepics/sharepic-card.tsx.
 */

import { berlinDay, shiftDay } from "./public-stats";

/** Zeitraum der Rueckschau: die letzten 7 Tage, die letzte volle Woche oder alles. */
export type RecapPeriod = "7d" | "week" | "all";
export const recapPeriodOrder: RecapPeriod[] = ["7d", "week", "all"];

export const recapPeriods: Record<RecapPeriod, { label: string; hint: string }> = {
  "7d": { label: "Letzte 7 Tage", hint: "Endet heute" },
  week: { label: "Letzte Woche", hint: "Montag bis Sonntag, abgeschlossen" },
  all: { label: "Seit Anfang an", hint: "Von der ersten Reparatur bis heute" },
};

export function isRecapPeriod(value: unknown): value is RecapPeriod {
  return typeof value === "string" && value in recapPeriods;
}

/** Die Grafik der Rueckschau. */
export type RecapView = "total" | "success" | "share" | "money" | "timeline" | "stack";
export const recapViewOrder: RecapView[] = ["total", "success", "share", "money", "timeline", "stack"];

export const recapViews: Record<RecapView, { label: string; hint: string }> = {
  total: { label: "Gesamtzahl", hint: "Eine große Zahl mit Vergleich" },
  success: { label: "Geglückt / gescheitert", hint: "Erfolgsquote und Zahlen" },
  share: { label: "Anteil", hint: "Gesamt: Kategorien · Stadt: Anteil an NRW" },
  money: { label: "Gespartes Geld", hint: "Wert der reparierten Dinge" },
  timeline: { label: "Verlauf", hint: "Balken je Tag" },
  stack: { label: "Verlauf nach Kategorie", hint: "Balken je Tag, nach Kategorie gestapelt" },
};

export function isRecapView(value: unknown): value is RecapView {
  return typeof value === "string" && value in recapViews;
}

export type RecapRange = { start: string | null; end: string };

/**
 * Der Kalenderabschnitt eines Zeitraums, in Berliner Tagen.
 *
 * - `7d`: heute und die sechs Tage davor.
 * - `week`: die letzte abgeschlossene Woche, Montag bis Sonntag. Am Montag ist
 *   das die Woche, die gestern endete, nie die gerade begonnene.
 * - `all`: ohne Anfang - die Datenbank nimmt die erste Reparatur. Wer einen
 *   festen Start der Aktion kennt, gibt ihn als `campaignStart` mit.
 */
export function recapRange(period: RecapPeriod, now: Date, campaignStart: string | null = null): RecapRange {
  const today = berlinDay(now);
  switch (period) {
    case "7d":
      return { start: shiftDay(today, -6), end: today };
    case "week": {
      /* 0 = Sonntag ... 6 = Samstag; Tage seit dem letzten Montag. */
      const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
      const sinceMonday = (weekday + 6) % 7;
      const end = shiftDay(today, -sinceMonday - 1);
      return { start: shiftDay(end, -6), end };
    }
    case "all":
      return { start: campaignStart ? berlinDay(new Date(campaignStart)) : null, end: today };
  }
}

export type RecapDay = {
  date: string;
  succeeded: number;
  failed: number;
  categories: Record<string, number>;
};

export type RecapStats = {
  succeeded: number;
  failed: number;
  minutesSaved: number;
  valueSavedEuros: number;
  categories: Record<string, number>;
  /** Gelungene Reparaturen in ganz NRW im selben Zeitraum. */
  nrwSucceeded: number;
  /** Gelungene im gleich langen Zeitraum davor; `null` bei "seit Anfang an". */
  previousSucceeded: number | null;
  timeline: RecapDay[];
};

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, toNumber(count)]));
}

/** Liest die Antwort von `recap_stats()` defensiv, wie `readPublicStats`. */
export function readRecapStats(aggregate: unknown): RecapStats {
  const record = (aggregate && typeof aggregate === "object" ? aggregate : {}) as Record<string, unknown>;
  const timeline = Array.isArray(record.timeline) ? record.timeline : [];
  return {
    succeeded: toNumber(record.succeeded),
    failed: toNumber(record.failed),
    minutesSaved: toNumber(record.minutesSaved),
    valueSavedEuros: toNumber(record.valueSavedEuros),
    categories: toCounts(record.categories),
    nrwSucceeded: toNumber(record.nrwSucceeded),
    previousSucceeded: record.previousSucceeded === null || record.previousSucceeded === undefined ? null : toNumber(record.previousSucceeded),
    timeline: timeline.flatMap((entry): RecapDay[] => {
      if (!entry || typeof entry !== "object") return [];
      const day = entry as Record<string, unknown>;
      if (typeof day.date !== "string") return [];
      return [{ date: day.date, succeeded: toNumber(day.succeeded), failed: toNumber(day.failed), categories: toCounts(day.categories) }];
    }),
  };
}

/**
 * Veraenderung gegenueber dem Zeitraum davor in ganzen Prozent.
 *
 * `null`, wenn es nichts zu vergleichen gibt: kein Vorzeitraum oder davor
 * keine Reparatur - "+400 %" von 1 auf 5 ist kein Satz fuer ein Bild.
 */
export function recapChange(current: number, previous: number | null): number | null {
  if (previous === null || previous < 10) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Erfolgsquote in ganzen Prozent, nach unten gerundet wie `goalPercent`. */
export function recapSuccessPercent(succeeded: number, failed: number): number {
  const attempted = succeeded + failed;
  return attempted > 0 ? Math.floor((succeeded / attempted) * 100) : 0;
}

/** Anteil in Prozent mit einer Nachkommastelle unter 10 %, sonst ganz. */
export function recapSharePercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  const value = (part / whole) * 100;
  return value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
}

export type RecapBar = {
  /** Erster Tag des Balkens; bei zusammengefassten Tagen der Anfang. */
  date: string;
  succeeded: number;
  failed: number;
  categories: Record<string, number>;
};

/**
 * Fasst den Verlauf auf hoechstens `max` Balken zusammen.
 *
 * Eine Woche bleibt bei 7 Tagesbalken, "seit Anfang an" ueber mehrere Monate
 * wird zu Mehrtagesbalken - 120 Balken waeren auf 1080 Pixeln Striche. Die
 * Gruppen sind gleich gross und enden mit dem letzten Tag, damit der juengste
 * Balken nie unvollstaendig ist; angefangen wird also eher mit einem kurzen
 * ersten Balken.
 */
export function bucketTimeline(timeline: RecapDay[], max: number): RecapBar[] {
  if (timeline.length === 0) return [];
  const size = Math.ceil(timeline.length / max);
  const bars: RecapBar[] = [];
  for (let end = timeline.length; end > 0; end -= size) {
    const slice = timeline.slice(Math.max(0, end - size), end);
    const categories: Record<string, number> = {};
    for (const day of slice) for (const [key, amount] of Object.entries(day.categories)) categories[key] = (categories[key] ?? 0) + amount;
    bars.unshift({
      date: slice[0].date,
      succeeded: slice.reduce((sum, day) => sum + day.succeeded, 0),
      failed: slice.reduce((sum, day) => sum + day.failed, 0),
      categories,
    });
  }
  return bars;
}

/**
 * Die Kategorien, die einen gestapelten Balken bekommen: die groessten
 * `limit`, der Rest wird zu "other" zusammengefasst. Sonst braeuchte die
 * Legende elf Farben.
 */
export function stackCategories(totals: Record<string, number>, limit: number): string[] {
  return Object.entries(totals)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, limit)
    .map(([key]) => key);
}

/** Beispielzahlen fuer die Vorschau, wie `demoStats`. */
export function demoRecap(period: RecapPeriod, now: Date): RecapStats {
  const range = recapRange(period, now);
  const length = period === "all" ? 28 : 7;
  const first = range.start ?? shiftDay(range.end, -(length - 1));
  const weights = [0.7, 0.9, 1.1, 1, 1.3, 1.6, 1.2];
  const keys = ["bicycle", "textiles", "household_appliances", "computers_and_phones", "furniture", "other"];
  const shares = [0.32, 0.24, 0.18, 0.14, 0.08, 0.04];
  const base = period === "all" ? 110 : 62;
  const timeline: RecapDay[] = Array.from({ length }, (_, index) => {
    const succeeded = Math.round(base * weights[index % weights.length] * (period === "all" ? 0.6 + index / length : 1));
    return {
      date: shiftDay(first, index),
      succeeded,
      failed: Math.round(succeeded * 0.12),
      categories: Object.fromEntries(keys.map((key, i) => [key, Math.round(succeeded * shares[i])])),
    };
  });
  const succeeded = timeline.reduce((sum, day) => sum + day.succeeded, 0);
  const categories: Record<string, number> = {};
  for (const day of timeline) for (const [key, amount] of Object.entries(day.categories)) categories[key] = (categories[key] ?? 0) + amount;
  return {
    succeeded,
    failed: timeline.reduce((sum, day) => sum + day.failed, 0),
    minutesSaved: succeeded * 54,
    valueSavedEuros: succeeded * 118,
    categories,
    nrwSucceeded: Math.round(succeeded * 4.6),
    previousSucceeded: period === "all" ? null : Math.round(succeeded * 0.84),
    timeline,
  };
}
