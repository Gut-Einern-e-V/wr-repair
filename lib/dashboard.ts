/**
 * Datenmodell und reine Helfer fuer das Buehnen-Dashboard unter /stats.
 *
 * Das Dashboard laeuft stundenlang auf einem Beamer. Deshalb laedt der Client
 * genau einmal einen vollstaendigen Snapshot und danach nur noch schlanke
 * Deltas. Die Zusammenfuehrung passiert in `mergeDashboardDelta` und ist
 * bewusst frei von Seiteneffekten, damit sie testbar bleibt.
 */

export type DashboardHighlight = {
  id: string;
  category: string;
  brandModel: string | null;
  imageUrl: string | null;
  imageAltText: string | null;
  approvedAt: string | null;
};

/**
 * Anonymisierte Herkunftszelle mit der Zahl der Reparaturen darin.
 *
 * Nur Zellen oberhalb der k-Anonymitaetsschwelle werden ueberhaupt
 * ausgeliefert (siehe `dashboard_stats()`), einzelne Reparaturen sind darin
 * nicht mehr unterscheidbar.
 */
export type DashboardCell = { lat: number; lon: number; count: number };

export type DashboardSnapshot = {
  total: number;
  goal: number;
  succeeded: number;
  withStory: number;
  minutesSaved: number;
  valueSavedEuros: number;
  categories: Record<string, number>;
  performedBy: Record<string, number>;
  timeline: { date: string; total: number }[];
  cells: DashboardCell[];
  highlights: DashboardHighlight[];
  /** ISO-Zeitstempel der juengsten beruecksichtigten Freigabe. */
  cursor: string | null;
  generatedAt: string;
};


export type DashboardDelta = {
  total: number;
  added: DashboardHighlight[];
  categories: Record<string, number>;
  cursor: string | null;
  generatedAt: string;
};

/** Anzahl der Highlights, die fuer den Spotlight vorgehalten werden. */
export const MAX_HIGHLIGHTS = 24;

/** Zielwert des Weltrekordversuchs, ueber `NEXT_PUBLIC_RECORD_GOAL` anpassbar. */
export function getRecordGoal(): number {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_RECORD_GOAL ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

function mergeCounts(base: Record<string, number>, extra: Record<string, number>) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

/**
 * Fuehrt ein Delta in den vorhandenen Snapshot ein. Bereits bekannte Eintraege
 * werden ignoriert, damit ein doppelt ausgeliefertes CDN-Delta die Zahlen nicht
 * verfaelscht.
 */
export function mergeDashboardDelta(snapshot: DashboardSnapshot, delta: DashboardDelta): DashboardSnapshot {
  const known = new Set(snapshot.highlights.map((item) => item.id));
  const added = delta.added.filter((item) => !known.has(item.id));

  return {
    ...snapshot,
    total: Math.max(snapshot.total, delta.total),
    categories: added.length === delta.added.length
      ? mergeCounts(snapshot.categories, delta.categories)
      : snapshot.categories,
    highlights: [...added, ...snapshot.highlights].slice(0, MAX_HIGHLIGHTS),
    cursor: delta.cursor ?? snapshot.cursor,
    generatedAt: delta.generatedAt,
  };
}

/**
 * Liefert die Indizes der Ziffern, die sich zwischen zwei Zahlen geaendert
 * haben. Nur diese Stellen "explodieren" in der Zaehler-Animation.
 * Der Vergleich erfolgt rechtsbuendig, damit ein Stellenwechsel
 * (999 -> 1000) nicht alle Ziffern markiert.
 */
export function changedDigitIndices(previous: number, next: number): number[] {
  const nextDigits = String(Math.max(0, Math.trunc(next)));
  const previousDigits = String(Math.max(0, Math.trunc(previous)));
  const changed: number[] = [];

  for (let index = 0; index < nextDigits.length; index += 1) {
    const fromEnd = nextDigits.length - 1 - index;
    const previousDigit = previousDigits[previousDigits.length - 1 - fromEnd];
    if (previousDigit !== nextDigits[index]) {
      changed.push(index);
    }
  }

  return changed;
}

/** Fortschritt in Prozent, auf 0..100 begrenzt. */
export function goalProgress(total: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (total / goal) * 100));
}

/** Menschenlesbare Dauer aus Minuten, z. B. "1.204 h". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.round(minutes / 60).toLocaleString("de-DE")} h`;
}
