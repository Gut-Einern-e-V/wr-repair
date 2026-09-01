/**
 * Aufbereitung der oeffentlichen Statistik hinter `/api/stats`.
 *
 * Die Route beliefert fremde Geraete - Infodisplays, Beamer im Repair-Cafe,
 * gebastelte LED-Anzeigen (siehe `docs/hardware-display-api.md`). Sie bekommt
 * deshalb nur Aggregate, nie einzelne Eintraege, und die Aufbereitung liegt
 * hier statt in der Route, damit sie ohne Datenbank testbar bleibt.
 */

export type PublicStatsDay = { date: string; total: number };

export type PublicStats = {
  /** Alle freigegebenen Reparaturen. */
  total: number;
  /** Ziel des Weltrekordversuchs. */
  goal: number;
  /** Einreichungen, die noch auf die Moderation warten. */
  pending: number;
  /** Stand des laufenden Berliner Kalendertages. */
  today: number;
  /** Bester Tag dieser Aktion vor heute - `null`, solange es keinen gibt. */
  bestDay: PublicStatsDay | null;
  /** Bisheriger Rekord aus frueheren Aktionen, sofern eingetragen. */
  dayRecord: number | null;
  /* Ab hier die Groessen fuer den Rueckblick nach dem Zeitraum (Issue #66).
     Sie stehen auch waehrend der Aktion in der Antwort - eine Schnittstelle,
     die je nach Datum andere Felder liefert, waere fuer angeschlossene Geraete
     eine Zumutung. */
  /** Reparaturen, die geglueckt sind. */
  succeeded: number;
  /** Einreichungen mit erzaehlter Geschichte. */
  withStory: number;
  /** Summe der angegebenen Reparaturzeit in Minuten. */
  minutesSaved: number;
  /** Summe des angegebenen Gegenstandswerts in Euro. */
  valueSavedEuros: number;
  /** Wer repariert hat: allein, mit Unterstuetzung, oder jemand anderes. */
  performedBy: Record<string, number>;
  categories: Record<string, number>;
  /** Reparaturzeit je Kategorie in Minuten - wie viel Zeit steckte in Uhren? */
  categoryMinutes: Record<string, number>;
  /** Alle Kreise und kreisfreien Staedte mit mindestens einer Reparatur. */
  kreise: Record<string, number>;
  /** Ein Eintrag je Tag des Einreichungszeitraums, Luecken als 0. */
  timeline: PublicStatsDay[];
  campaign: { startAt: string | null; endAt: string | null };
};

/**
 * Obergrenze der Zeitachse. Der Einreichungszeitraum ist frei einstellbar; ein
 * versehentlich auf Jahre gesetztes Fenster soll kein Antwortpaket erzeugen,
 * das ein Mikrocontroller nicht mehr parsen kann.
 */
export const MAX_TIMELINE_DAYS = 366;

/** Kalendertag in Berliner Zeit als `YYYY-MM-DD`. */
export function berlinDay(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Verschiebt einen Kalendertag um ganze Tage - reine Kalenderrechnung. */
export function shiftDay(day: string, days: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Der Abschnitt, den die Zeitachse abdeckt.
 *
 * Sie folgt dem Einreichungszeitraum und nicht mehr einem festen 30-Tage-
 * Fenster: Der Zeitraum ist im Backend einstellbar, und eine Achse, die
 * frueher beginnt als die Aktion, zeigt nur Nullen. Sie endet am heutigen Tag,
 * damit kuenftige Tage nicht als Einbruch erscheinen. Liegt der Zeitraum ganz
 * in der Zukunft, ist der Abschnitt leer.
 */
export function timelineRange(startAt: Date, endAt: Date, now = new Date()): { start: string; end: string } {
  const today = berlinDay(now);
  const campaignEnd = berlinDay(endAt);
  const end = campaignEnd < today ? campaignEnd : today;
  const campaignStart = berlinDay(startAt);
  const earliest = shiftDay(end, -(MAX_TIMELINE_DAYS - 1));

  return { start: campaignStart > earliest ? campaignStart : earliest, end };
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, toNumber(count)]));
}

function toDay(value: unknown): PublicStatsDay | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const total = toNumber(record.total);
  if (typeof record.date !== "string" || total <= 0) return null;

  return { date: record.date, total };
}

function toTimeline(value: unknown): PublicStatsDay[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    return typeof record.date === "string" ? [{ date: record.date, total: toNumber(record.total) }] : [];
  });
}

export type PublicStatsContext = {
  goal: number;
  dayRecord: number | null;
  campaign: { startAt: Date | null; endAt: Date | null };
};

/**
 * Formt das Aggregat aus `public_stats()` in die Antwort der Route.
 *
 * Alles wird defensiv gelesen: Laeuft eine Bereitstellung noch mit einer
 * aelteren Fassung der Datenbankfunktion, fehlen einzelne Felder - dann ist
 * das Feld leer statt die Antwort kaputt.
 */
export function readPublicStats(aggregate: unknown, context: PublicStatsContext): PublicStats {
  const record = (aggregate && typeof aggregate === "object" ? aggregate : {}) as Record<string, unknown>;

  return {
    total: toNumber(record.total),
    goal: context.goal,
    pending: toNumber(record.pending),
    today: toNumber(record.today),
    bestDay: toDay(record.bestDay),
    dayRecord: context.dayRecord,
    succeeded: toNumber(record.succeeded),
    withStory: toNumber(record.withStory),
    minutesSaved: toNumber(record.minutesSaved),
    valueSavedEuros: toNumber(record.valueSavedEuros),
    performedBy: toCounts(record.performedBy),
    categories: toCounts(record.categories),
    categoryMinutes: toCounts(record.categoryMinutes),
    kreise: toCounts(record.kreise),
    timeline: toTimeline(record.timeline),
    campaign: {
      startAt: context.campaign.startAt?.toISOString() ?? null,
      endAt: context.campaign.endAt?.toISOString() ?? null,
    },
  };
}
