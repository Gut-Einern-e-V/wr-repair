/**
 * Sharepics fuer Instagram-Storys: Motive, Rechenwege und Texte.
 *
 * Gezeichnet werden die Bilder in app/moderator/sharepics/image/route.tsx,
 * zusammengestellt im Studio unter /moderator/sharepics. Hier steht nur, was
 * ohne Datenbank und ohne Satori testbar ist - genau wie beim Teilbild einer
 * einzelnen Reparatur (lib/share-visual.ts), dessen Grundfarben die Motive
 * uebernehmen.
 *
 * Die Zahlen kommen aus denselben Aggregaten wie `/api/stats`. Niemand soll
 * einen Zwischenstand von Hand abtippen: Wer ein Bild herunterlaedt, bekommt
 * den Stand dieses Augenblicks, und die Zeile "Stand: ..." sagt, welcher das
 * war.
 */

import type { PublicStats } from "./public-stats";
import { berlinDay, shiftDay } from "./public-stats";
import { shareVisualGroundOrder, type ShareVisualGround } from "./share-visual";

export type SharepicMotif =
  | "launch"
  | "countdown"
  | "categories"
  | "kreise"
  | "today"
  | "milestone"
  | "impact"
  | "final"
  | "kreis"
  | "duel"
  | "lottery"
  | "howto";

/** Was ein Motiv ausser Grundfarbe und Ueberschrift noch einstellen laesst. */
export type SharepicParam = "kreis" | "kreisB" | "milestone";

export type SharepicMotifSpec = {
  label: string;
  hint: string;
  group: "Start" | "Laufend" | "Finale" | "Extras";
  params: SharepicParam[];
  ground: ShareVisualGround;
  /** Braucht das Motiv Zahlen? Ohne Zahlen gibt es keine "Stand"-Zeile. */
  live: boolean;
};

export const sharepicMotifs: Record<SharepicMotif, SharepicMotifSpec> = {
  launch: { label: "Start", hint: "Heute geht’s los", group: "Start", params: [], ground: "yellow", live: false },
  countdown: { label: "Countdown", hint: "Noch X Tage", group: "Laufend", params: [], ground: "ink", live: true },
  categories: { label: "Kategorien", hint: "Was am meisten repariert wird", group: "Laufend", params: [], ground: "mint", live: true },
  kreise: { label: "Städte & Kreise", hint: "Rangliste der Orte", group: "Laufend", params: [], ground: "paper", live: true },
  today: { label: "Tagesbilanz", hint: "Heute, bester Tag, Rekord", group: "Laufend", params: [], ground: "yellow", live: true },
  milestone: { label: "Meilenstein", hint: "z. B. 1.000 Reparaturen", group: "Laufend", params: ["milestone"], ground: "mint", live: true },
  impact: { label: "Wirkung", hint: "Stunden, Euro, Erfolgsquote", group: "Laufend", params: [], ground: "paper", live: true },
  final: { label: "Endergebnis", hint: "Rückblick nach dem Ende", group: "Finale", params: [], ground: "ink", live: true },
  kreis: { label: "Eine Stadt", hint: "Stand und Platz eines Orts", group: "Extras", params: ["kreis"], ground: "mint", live: true },
  duel: { label: "Stadt-Duell", hint: "Zwei Orte gegeneinander", group: "Extras", params: ["kreis", "kreisB"], ground: "yellow", live: true },
  lottery: { label: "Gewinnspiel", hint: "Reparieren und gewinnen", group: "Extras", params: [], ground: "mint", live: false },
  howto: { label: "So geht’s", hint: "Drei Schritte, Platz für den Link", group: "Extras", params: [], ground: "paper", live: false },
};

export const sharepicMotifOrder = Object.keys(sharepicMotifs) as SharepicMotif[];

export function isSharepicMotif(value: unknown): value is SharepicMotif {
  return typeof value === "string" && value in sharepicMotifs;
}

/** Instagram-Story: 1080 Pixel breit, 9:16. */
export const SHAREPIC_SIZE = { width: 1080, height: 1920 } as const;

/**
 * Schutzraeume oben und unten, in Pixeln des fertigen Bildes.
 *
 * Instagram legt in der Story oben Profilzeile und Fortschrittsbalken ueber
 * das Bild, unten das Antwortfeld. Was dort steht, ist verdeckt - also steht
 * dort nichts, was man lesen muss.
 */
export const SHAREPIC_SAFE = { top: 250, bottom: 280 } as const;

/* --- Anfrage -------------------------------------------------------------- */

export type SharepicRequest = {
  motif: SharepicMotif;
  ground: ShareVisualGround;
  kreis: string | null;
  kreisB: string | null;
  /** Feste Meilensteinzahl; null heisst: aus dem Stand ableiten. */
  milestone: number | null;
  /** Eigene Ueberschrift, eine Zeile je Aufkleber; null heisst: Vorgabe. */
  headline: string[] | null;
  /** Beispielzahlen statt Live-Daten - das Bild traegt dann ein Wasserzeichen. */
  demo: boolean;
  download: boolean;
};

/** Hoechstens drei Aufkleber mit je 24 Zeichen, sonst passt es nicht mehr. */
export const HEADLINE_MAX_LINES = 3;
export const HEADLINE_MAX_CHARS = 24;

export function parseHeadline(value: string | null): string[] | null {
  if (!value) return null;
  const lines = value
    .split(/\r?\n|\|/)
    .map((line) => line.trim().slice(0, HEADLINE_MAX_CHARS))
    .filter(Boolean)
    .slice(0, HEADLINE_MAX_LINES);
  return lines.length ? lines : null;
}

function parseName(value: string | null) {
  const trimmed = value?.trim().slice(0, 60);
  return trimmed ? trimmed : null;
}

export function parseSharepicRequest(params: URLSearchParams): SharepicRequest {
  const motifParam = params.get("motif");
  const motif = isSharepicMotif(motifParam) ? motifParam : "launch";
  const groundParam = params.get("ground");
  const ground = shareVisualGroundOrder.includes(groundParam as ShareVisualGround)
    ? groundParam as ShareVisualGround
    : sharepicMotifs[motif].ground;
  const milestone = Number.parseInt(params.get("milestone") ?? "", 10);

  return {
    motif,
    ground,
    kreis: parseName(params.get("kreis")),
    kreisB: parseName(params.get("kreisB")),
    milestone: Number.isFinite(milestone) && milestone > 0 ? milestone : null,
    headline: parseHeadline(params.get("headline")),
    demo: params.get("demo") === "1",
    download: params.get("download") === "1",
  };
}

export function sharepicFileName(motif: SharepicMotif, now: Date) {
  return `reparaturrekord-nrw-${motif}-${berlinDay(now)}.png`;
}

/* --- Rechenwege ----------------------------------------------------------- */

export type RankedEntry = { key: string; count: number };

/** Groesste zuerst, bei Gleichstand alphabetisch - damit die Reihenfolge stabil ist. */
export function rankEntries(record: Record<string, number>, limit = Number.POSITIVE_INFINITY): RankedEntry[] {
  return Object.entries(record)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "de"))
    .slice(0, limit);
}

export type KreisStanding = { name: string; count: number; rank: number | null; of: number; today: number };

/**
 * Stand eines Orts. Der Platz teilt sich bei Gleichstand - zwei Orte mit je
 * 40 Reparaturen stehen beide auf Platz 3, nicht auf 3 und 4.
 */
export function kreisStanding(stats: Pick<PublicStats, "kreise" | "todayKreise">, name: string): KreisStanding {
  const ranked = rankEntries(stats.kreise);
  const count = stats.kreise[name] ?? 0;
  const rank = count > 0 ? ranked.filter((entry) => entry.count > count).length + 1 : null;
  return { name, count, rank, of: ranked.length, today: stats.todayKreise[name] ?? 0 };
}

/** Anteil am Ziel in ganzen Prozent, nach unten gerundet: 99,6 % ist noch nicht geschafft. */
export function goalPercent(total: number, goal: number) {
  return goal > 0 ? Math.floor((total / goal) * 100) : 0;
}

/**
 * Der zuletzt erreichte runde Meilenstein.
 *
 * Bis 10.000 die Stufen, die man feiern mag; darueber jeder volle Tausender.
 * Unter 100 gibt es noch keinen - dann ist die Zahl selbst der Meilenstein.
 */
export function autoMilestone(total: number) {
  const steps = [100, 250, 500, 750, 1_000, 1_500, 2_000, 2_500, 3_000, 4_000, 5_000, 6_000, 7_500, 10_000];
  if (total > 10_000) return Math.floor(total / 1_000) * 1_000;
  return [...steps].reverse().find((step) => step <= total) ?? total;
}

export type Countdown = {
  /** Worauf gezaehlt wird. */
  target: "start" | "end" | "over";
  value: number;
  unit: "Tage" | "Tag" | "Stunden" | "Stunde";
};

/**
 * Wie lange es noch dauert.
 *
 * Gezaehlt werden Kalendertage in Berliner Zeit bis einschliesslich des
 * letzten Tages: Endet die Aktion am 31. Oktober um Mitternacht, ist am
 * 30. Oktober noch "2 Tage" (heute und morgen). Am letzten Tag selbst wird in
 * Stunden gezaehlt - "noch 1 Tag" liest sich dort wie "noch bis morgen".
 */
export function countdown(startAt: string | null, endAt: string | null, nowMs: number): Countdown | null {
  const start = startAt ? Date.parse(startAt) : Number.NaN;
  const end = endAt ? Date.parse(endAt) : Number.NaN;
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  const now = new Date(nowMs);
  if (nowMs >= end) return { target: "over", value: 0, unit: "Tage" };

  const target = nowMs < start ? "start" : "end";
  const targetMs = target === "start" ? start : end;
  /* Das Ende liegt oft genau auf Mitternacht; der letzte Tag ist dann der
     davor. Eine Millisekunde zurueck reicht dafuer. */
  const lastDay = berlinDay(new Date(target === "end" ? targetMs - 1 : targetMs));
  const today = berlinDay(now);
  const days = dayDistance(today, lastDay) + (target === "end" ? 1 : 0);

  if (target === "end" && days <= 1) {
    const hours = Math.max(1, Math.ceil((targetMs - nowMs) / 3_600_000));
    return { target, value: hours, unit: hours === 1 ? "Stunde" : "Stunden" };
  }
  return { target, value: days, unit: days === 1 ? "Tag" : "Tage" };
}

function dayDistance(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/* --- Formate -------------------------------------------------------------- */

const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

export function formatCount(value: number) {
  return numberFormat.format(Math.round(value));
}

export function formatHours(minutes: number) {
  return formatCount(minutes / 60);
}

const dayMonth = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "numeric", month: "long" });
const dayMonthTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** "1. Oktober" - ohne Jahr, das steht in der Story ohnehin im Datum. */
export function formatDay(value: string | Date) {
  return dayMonth.format(typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : value);
}

/**
 * Letzter Tag der Aktion. Endet sie um Mitternacht, ist das der Tag davor -
 * sonst stuende auf dem Bild "bis 1. November" fuer eine Oktoberaktion.
 */
export function formatLastDay(endAt: string) {
  return formatDay(new Date(Date.parse(endAt) - 1));
}

/** "1.–31. Oktober", oder "28. Oktober – 3. November" ueber einen Monatswechsel. */
export function formatPeriod(startAt: string, endAt: string) {
  const first = formatDay(startAt);
  const last = formatLastDay(endAt);
  const [firstDay, firstMonth] = first.split(" ");
  const [, lastMonth] = last.split(" ");
  return firstMonth === lastMonth ? `${firstDay}–${last}` : `${first} – ${last}`;
}

export function formatStand(now: Date) {
  return `Stand: ${dayMonthTime.format(now).replace(" um ", ", ")} Uhr`;
}

/* --- Beispielzahlen ------------------------------------------------------- */

/**
 * Zahlen fuer die Vorschau, solange es noch keine echten gibt - vor dem Start
 * sind alle Aggregate null, und ein Layout voller Nullen sagt nichts darueber,
 * wie das Bild spaeter aussieht. Bilder damit tragen ein Wasserzeichen.
 */
export function demoStats(now: Date): PublicStats {
  const today = berlinDay(now);
  return {
    total: 3_482,
    goal: 10_000,
    pending: 57,
    today: 214,
    bestDay: { date: shiftDay(today, -2), total: 391 },
    dayRecord: 450,
    todayKreise: { Wuppertal: 38, Köln: 31, Dortmund: 22, Solingen: 17 },
    bestKreisDay: { date: shiftDay(today, -2), kreis: "Wuppertal", total: 64 },
    attempted: 3_910,
    succeeded: 3_482,
    withStory: 812,
    minutesSaved: 187_400,
    valueSavedEuros: 412_900,
    performedBy: { self: 2_100, supported: 1_020, other: 362 },
    categories: {
      bicycle: 842,
      textiles: 611,
      household_appliances: 498,
      computers_and_phones: 437,
      furniture: 301,
      toys: 244,
      tools: 190,
      jewelry_glasses: 142,
      watches: 98,
      other: 119,
    },
    categoryMinutes: {},
    kreise: {
      Wuppertal: 512,
      Köln: 488,
      Dortmund: 331,
      Düsseldorf: 297,
      Solingen: 244,
      Remscheid: 201,
      Bochum: 188,
      Essen: 176,
      Bielefeld: 143,
      Münster: 139,
      Bonn: 121,
    },
    timeline: [],
    campaign: { startAt: null, endAt: null },
  };
}
