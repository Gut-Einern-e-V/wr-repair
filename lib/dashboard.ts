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
  /**
   * Zeitpunkt der Einreichung. Das ist die Angabe, die nach aussen zaehlt: Sie
   * sagt, wann repariert wurde.
   */
  submittedAt: string | null;
  /**
   * Zeitpunkt der Freigabe. Rein intern - daran haengt die Reihenfolge der
   * Deltas und der Cursor, damit kein Eintrag beim Nachladen uebersprungen wird.
   * Ausserdem entscheidet er ueber die Marke "neu" im Laufband.
   */
  approvedAt: string | null;
  /**
   * Kreis oder kreisfreie Stadt der Reparatur - oder `null`.
   *
   * Wird nur gesetzt, wenn in diesem Kreis mindestens `KREIS_MIN_FOR_LABEL`
   * freigegebene Reparaturen liegen. Damit gilt dieselbe Zusage wie fuer die
   * Karte: Eine sichtbare Ortsangabe steht immer fuer eine Gruppe, nie fuer
   * eine einzelne Person. Feiner als der Kreis wird es nirgends.
   */
  kreis: string | null;
};

/** Ab so vielen Reparaturen je Kreis darf sein Name am Eintrag stehen. */
export const KREIS_MIN_FOR_LABEL = 5;

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
  /**
   * Das Einreichungsfenster, aus derselben Quelle wie die Zugangspruefung der
   * Route - der Countdown behauptet damit nie etwas anderes als das Formular.
   * Der Start wird gebraucht, um zu zeigen, wie viel der Zeit schon vorbei ist.
   */
  campaign: { startAt: string | null; endAt: string | null };
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

/** Fenster, in dem ein Eintrag im Laufband als aktuell gilt. */
export const TICKER_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

/**
 * Beschraenkt das Laufband auf Reparaturen der letzten 24 Stunden.
 *
 * Gemessen wird am *Einreichungszeitpunkt*, nicht an der Freigabe: Das Band soll
 * sagen, was gerade repariert wurde, nicht was die Moderation gerade abgearbeitet
 * hat. Die Folge ist beabsichtigt: Wird ein alter Beitrag heute freigegeben,
 * laeuft er nicht mit - "vor 39 Tagen" ist kein Live-Band.
 *
 * Ist nichts Aktuelles dabei, bleibt die Liste leer und der Platzhalter sagt das.
 */
export function recentHighlights(
  highlights: DashboardHighlight[],
  nowMs: number,
  maxAgeMs: number = TICKER_MAX_AGE_MS,
): DashboardHighlight[] {
  // Vor dem ersten Uhrentakt ist kein Alter berechenbar. Dann die volle Liste
  // zeigen statt fuer einen Frame ein leeres Band.
  if (nowMs <= 0) return highlights;

  return highlights.filter((item) => {
    if (!item.submittedAt) return false;

    const then = Date.parse(item.submittedAt);
    if (Number.isNaN(then)) return false;

    // Eine Minute Vorlauf: Die Uhr des Anzeigerechners kann leicht abweichen.
    const age = nowMs - then;
    return age >= -60_000 && age <= maxAgeMs;
  });
}

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

/** Fenster, in dem ein frisch freigegebener Eintrag die Marke "neu" traegt. */
export const FRESH_APPROVAL_MS = 15 * 60 * 1_000;

/**
 * Ist der Eintrag gerade erst freigegeben worden?
 *
 * Hier zaehlt bewusst die Freigabe und nicht die Einreichung: "neu" heisst auf
 * der Buehne, dass gerade etwas dazugekommen *ist* - unabhaengig davon, wann
 * repariert wurde.
 */
export function isFreshlyApproved(iso: string | null, nowMs: number, windowMs = FRESH_APPROVAL_MS): boolean {
  if (!iso || nowMs <= 0) return false;

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return false;

  const age = nowMs - then;
  return age >= -60_000 && age <= windowMs;
}

/** Verbleibende Zeit bis zur Deadline, zerlegt fuer die Anzeige. */
export type Countdown = { days: number; hours: number; minutes: number; totalMs: number; expired: boolean };

/**
 * Restzeit bis zum Ende des Einreichungsfensters.
 *
 * Ohne Deadline oder nach ihrem Ablauf ist `expired` gesetzt; die Anzeige
 * schreibt dann keine negativen Zahlen, sondern sagt, dass Schluss ist.
 */
export function countdownTo(deadlineIso: string | null, nowMs: number): Countdown | null {
  if (!deadlineIso || nowMs <= 0) return null;

  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return null;

  const totalMs = Math.max(0, deadline - nowMs);
  return {
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor((totalMs % 86_400_000) / 3_600_000),
    minutes: Math.floor((totalMs % 3_600_000) / 60_000),
    totalMs,
    expired: deadline <= nowMs,
  };
}

/**
 * Verbleibende Zeit als ein lesbarer Ausdruck.
 *
 * Drei Zahlenkaesten nebeneinander lesen sich wie eine Bahnhofsuhr. Auf einer
 * Buehne zaehlt die groebste Einheit, die noch etwas aussagt - und erst wenn es
 * knapp wird, ruecken Stunden und Minuten in den Vordergrund.
 */
export function formatRemaining(countdown: Countdown): string {
  if (countdown.expired) return "vorbei";
  if (countdown.totalMs < 60_000) return "weniger als 1 Min.";

  if (countdown.days >= 1) {
    const days = countdown.days === 1 ? "1 Tag" : `${countdown.days} Tage`;
    return countdown.hours > 0 ? `${days}, ${countdown.hours} Std.` : days;
  }

  if (countdown.hours >= 1) {
    return countdown.minutes > 0 ? `${countdown.hours} Std., ${countdown.minutes} Min.` : `${countdown.hours} Std.`;
  }

  return `${countdown.minutes} Min.`;
}

/**
 * Anteil des Einreichungsfensters, der schon vergangen ist, in Prozent.
 *
 * Erst im Vergleich mit dem Fortschritt zum Ziel wird aus der Restzeit eine
 * Aussage: Sind wir schneller als die Uhr oder langsamer?
 */
export function campaignElapsed(startIso: string | null, endIso: string | null, nowMs: number): number | null {
  if (!startIso || !endIso || nowMs <= 0) return null;

  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  return Math.min(100, Math.max(0, ((nowMs - start) / (end - start)) * 100));
}

/** Steht der Rekord im Verhaeltnis zur verbrauchten Zeit gut oder schlecht da? */
export type PaceVerdict = { state: "ahead" | "onTrack" | "behind"; gap: number };

/**
 * Vergleicht Zielfortschritt und Zeitverbrauch.
 *
 * `gap` ist der Abstand in Prozentpunkten. Die Schwelle von zwei Punkten haelt
 * die Anzeige ruhig: Ohne sie kippte die Aussage bei jedem einzelnen Eintrag
 * zwischen "vor" und "hinter dem Plan" hin und her.
 */
export function paceVerdict(goalPercentValue: number, elapsedPercent: number): PaceVerdict {
  const gap = goalPercentValue - elapsedPercent;
  if (gap > 2) return { state: "ahead", gap };
  if (gap < -2) return { state: "behind", gap };
  return { state: "onTrack", gap };
}

/**
 * Noetiges Tempo in Reparaturen je Stunde, um das Ziel rechtzeitig zu erreichen.
 *
 * `null` heisst: Die Frage stellt sich nicht - entweder ist das Ziel schon
 * erreicht, oder es ist keine Restzeit mehr uebrig, in der man es schaffen
 * koennte. In beiden Faellen waere eine Zahl irrefuehrend.
 */
export function requiredPerHour(total: number, goal: number, remainingMs: number): number | null {
  const missing = goal - total;
  if (missing <= 0 || remainingMs <= 0) return null;

  return missing / (remainingMs / 3_600_000);
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
