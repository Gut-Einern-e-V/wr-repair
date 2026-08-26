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
 * Liefert die Indizes der Stellen, die sich zwischen zwei Zeichenketten
 * geaendert haben. Der Vergleich erfolgt rechtsbuendig, damit eine zusaetzliche
 * Stelle (999 -> 1.000) nur die tatsaechlich neuen Positionen markiert.
 *
 * Die Zaehlerwolke laesst genau diese Stellen auseinanderfliegen; alle uebrigen
 * bleiben ruhig stehen.
 */
export function changedSlotIndices(previous: string, next: string): number[] {
  const changed: number[] = [];

  for (let index = 0; index < next.length; index += 1) {
    const fromEnd = next.length - 1 - index;
    if (previous[previous.length - 1 - fromEnd] !== next[index]) {
      changed.push(index);
    }
  }

  return changed;
}

/**
 * Wie `changedSlotIndices`, aber fuer zwei Zahlen ohne Tausenderpunkte. Zaehlt
 * also reine Ziffernstellen.
 */
export function changedDigitIndices(previous: number, next: number): number[] {
  return changedSlotIndices(
    String(Math.max(0, Math.trunc(previous))),
    String(Math.max(0, Math.trunc(next))),
  );
}

/** Fortschritt in Prozent, auf 0..100 begrenzt - fuer die Breite des Balkens. */
export function goalProgress(total: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, (total / goal) * 100));
}

/**
 * Fortschritt in Prozent ohne Deckel - fuer die Beschriftung.
 *
 * Der Rekord ist mit dem Ziel nicht zu Ende: Wer 12.500 Reparaturen zaehlt, soll
 * 125 % lesen und nicht weiterhin 100 %.
 */
export function goalPercent(total: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, (total / goal) * 100);
}

/**
 * Fortschritt der laufenden Runde *ueber* dem Ziel, in Prozent.
 *
 * Damit bekommt der Ueberschuss einen eigenen Balken: Die erste Runde bleibt
 * vollstaendig gefuellt stehen, darueber laeuft eine zweite an.
 */
export function goalOverflow(total: number, goal: number): number {
  if (goal <= 0 || total <= goal) return 0;
  return Math.min(100, ((total - goal) % goal || goal) / goal * 100);
}

/**
 * Wie oft das Ziel vollstaendig erreicht wurde.
 *
 * Jede neue Runde ist ein Anlass zu feiern, nicht nur die erste.
 */
export function goalLaps(total: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.floor(total / goal);
}

/** Menschenlesbare Dauer aus Minuten, z. B. "1.204 h". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.round(minutes / 60).toLocaleString("de-DE")} h`;
}

/**
 * Kurze Zeitangabe fuer das Laufband, z. B. "vor 4 Min.".
 *
 * Zeitpunkte in der Zukunft koennen durch eine leicht abweichende Uhr des
 * Anzeigerechners entstehen und werden wie "jetzt" behandelt.
 */
export function formatRelativeTime(iso: string | null, nowMs: number): string {
  if (!iso) return "";

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const minutes = Math.floor(Math.max(0, nowMs - then) / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "vor 1 Tag" : `vor ${days} Tagen`;
}
