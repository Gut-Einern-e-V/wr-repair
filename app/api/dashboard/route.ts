import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/app-settings";
import { KREIS_MIN_FOR_LABEL, MAX_HIGHLIGHTS, readCells, type DashboardDelta, type DashboardHighlight, type DashboardSnapshot } from "@/lib/dashboard";

/**
 * Datenquelle des Buehnen-Dashboards.
 *
 * Zwei Modi, damit ein dauerhaft laufender Beamer-Screen Supabase nicht flutet:
 *
 * - ohne Parameter: vollstaendiger Snapshot, aggregiert in einer einzigen
 *   Datenbankfunktion (`dashboard_stats`), CDN-cachebar fuer alle Zuschauer.
 * - `?since=<ISO>`: nur die seither freigegebenen Eintraege. Der Client haelt
 *   seinen Stand damit aktuell, ohne den Snapshot erneut zu ziehen.
 *
 * Zusaetzlich haelt das Modul einen kurzen In-Memory-Cache, der Anfragen
 * abfaengt, die am CDN vorbeilaufen (z. B. beim ersten Aufruf pro Region).
 */

const SNAPSHOT_TTL_MS = 20_000;
const DELTA_TTL_MS = 5_000;
const DELTA_LIMIT = 50;
const SIGNED_URL_TTL_SECONDS = 900;

type CacheEntry<T> = { value: T; expiresAt: number };

let snapshotCache: CacheEntry<DashboardSnapshot> | null = null;
const deltaCache = new Map<string, CacheEntry<DashboardDelta>>();

/**
 * Zuletzt bekannte Reparaturzahlen je Kreis, gemerkt aus dem Snapshot.
 *
 * Der Delta-Pfad ruft das Aggregat bewusst nicht auf - genau das macht ihn
 * billig. Fuer die Ortsangabe braucht er die Schwelle trotzdem. Ist noch kein
 * Snapshot durch diese Instanz gelaufen, bleibt die Karte leer und die Eintraege
 * bekommen keinen Ort. Das ist die richtige Richtung: im Zweifel weniger
 * veroeffentlichen, der naechste Snapshot traegt ihn nach.
 */
let lastKreisTotals: Record<string, number> = {};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type RepairRow = {
  id: string;
  category: string;
  brand_model: string | null;
  image_path: string | null;
  image_alt_text: string | null;
  created_at: string | null;
  moderated_at: string | null;
  kreis: string | null;
};

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, toNumber(count)]));
}

/** Ergaenzt fehlende Tage, damit die Zeitachse immer 30 Balken hat. */
function fillTimeline(rows: unknown): { date: string; total: number }[] {
  const known = new Map<string, number>();
  if (Array.isArray(rows)) {
    for (const row of rows as { date?: string; total?: unknown }[]) {
      if (row?.date) known.set(row.date, toNumber(row.total));
    }
  }

  const timeline: { date: string; total: number }[] = [];
  const now = Date.now();
  for (let day = 29; day >= 0; day -= 1) {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(now - day * 86_400_000));
    timeline.push({ date, total: known.get(date) ?? 0 });
  }
  return timeline;
}

/**
 * Ortsangabe eines einzelnen Eintrags als sichtbarer Text - oder `null`.
 *
 * Der Kreis steht bereits als Spalte auf der Zeile (einmalig bei der
 * Einreichung aus der anonymisierten Zelle hergeleitet, siehe
 * `app/api/repairs/route.ts`) und wird hier nur noch gegen die
 * k-Anonymitaetsschwelle geprueft: Genannt wird er nur, wenn ihm mindestens
 * `KREIS_MIN_FOR_LABEL` freigegebene Reparaturen zugeordnet sind - ein
 * benannter Einzeleintrag mit Kategorie und Zeitstempel ist identifizierender
 * als eine aggregierte Kartenzahl, die diese Schwelle nicht mehr hat (siehe
 * `dashboard_stats()`). Fuer die Landeposition der Punktwolke gilt diese
 * Schwelle nicht - siehe `mapKreis` in `toHighlights()`.
 */
function toKreis(row: RepairRow, busyKreise: Record<string, number>): string | null {
  if (!row.kreis) return null;
  return (busyKreise[row.kreis] ?? 0) >= KREIS_MIN_FOR_LABEL ? row.kreis : null;
}

async function toHighlights(
  supabase: SupabaseAdmin,
  rows: RepairRow[],
  busyKreise: Record<string, number>,
): Promise<DashboardHighlight[]> {
  const paths = rows.map((row) => row.image_path).filter((path): path is string => Boolean(path));
  const signed = paths.length
    ? await supabase.storage.from("repair-images").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: [], error: null };

  const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    brandModel: row.brand_model,
    imageUrl: row.image_path ? (urls.get(row.image_path) ?? null) : null,
    imageAltText: row.image_alt_text,
    submittedAt: row.created_at,
    approvedAt: row.moderated_at,
    kreis: toKreis(row, busyKreise),
    mapKreis: row.kreis,
  }));
}

// `created_at` ist der Einreichungszeitpunkt und damit die Angabe, die das
// Laufband zeigt. `moderated_at` bleibt trotzdem dabei: Daran haengen die
// Reihenfolge der Deltas und der Cursor.
const highlightColumns =
  "id, category, brand_model, image_path, image_alt_text, created_at, moderated_at, kreis";

/** Bester Tag aus dem Aggregat - fehlt er, hat die Aktion noch keinen. */
function toBestDay(value: unknown): DashboardSnapshot["bestDay"] {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const total = toNumber(record.total);
  if (typeof record.date !== "string" || total <= 0) return null;

  return { date: record.date, total };
}

async function loadSnapshot(
  supabase: SupabaseAdmin,
  campaign: DashboardSnapshot["campaign"],
  goal: number,
  dayRecord: number | null,
): Promise<DashboardSnapshot | null> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error || !data) return null;

  const aggregate = data as Record<string, unknown>;
  const cells = readCells(aggregate.cells);
  const busyKreise = toCounts(aggregate.kreise);
  lastKreisTotals = busyKreise;

  const { data: recent } = await supabase
    .from("repairs")
    .select(highlightColumns)
    .eq("status", "approved")
    .order("moderated_at", { ascending: false })
    .limit(MAX_HIGHLIGHTS);

  return {
    total: toNumber(aggregate.total),
    goal,
    succeeded: toNumber(aggregate.succeeded),
    withStory: toNumber(aggregate.withStory),
    minutesSaved: toNumber(aggregate.minutesSaved),
    valueSavedEuros: toNumber(aggregate.valueSavedEuros),
    categories: toCounts(aggregate.categories),
    performedBy: toCounts(aggregate.performedBy),
    timeline: fillTimeline(aggregate.timeline),
    today: toNumber(aggregate.today),
    bestDay: toBestDay(aggregate.bestDay),
    dayRecord,
    cells,
    kreise: busyKreise,
    highlights: await toHighlights(supabase, (recent ?? []) as RepairRow[], busyKreise),
    campaign,
    cursor: typeof aggregate.cursor === "string" ? aggregate.cursor : null,
    generatedAt: new Date().toISOString(),
  };
}

async function loadDelta(supabase: SupabaseAdmin, since: string): Promise<DashboardDelta | null> {
  const { count, error: countError } = await supabase
    .from("repairs")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  if (countError) return null;

  // Der Tagesstand kommt aus der Datenbank statt aus einer Berechnung hier:
  // Die Grenze des Berliner Kalendertages haengt an der Zeitzone, und die kennt
  // Postgres verlaesslicher als ein Node-Prozess in UTC (siehe
  // `dashboard_today()`).
  const { data: todayCount, error: todayError } = await supabase.rpc("dashboard_today");

  const { data, error } = await supabase
    .from("repairs")
    .select(highlightColumns)
    .eq("status", "approved")
    .gt("moderated_at", since)
    .order("moderated_at", { ascending: true })
    .limit(DELTA_LIMIT);

  if (error) return null;

  const rows = (data ?? []) as RepairRow[];
  const categories: Record<string, number> = {};
  for (const row of rows) {
    categories[row.category] = (categories[row.category] ?? 0) + 1;
  }

  const highlights = await toHighlights(supabase, rows, lastKreisTotals);

  return {
    total: count ?? 0,
    // Null statt 0, wenn der Tagesstand nicht zu holen war: Der Client behaelt
    // dann seinen letzten Wert, statt den Tageszaehler auf null zu ziehen.
    today: todayError ? null : toNumber(todayCount),
    added: [...highlights].reverse(),
    categories,
    cursor: rows.at(-1)?.moderated_at ?? since,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const settings = await getAppSettings();
  const campaign = settings.submissionWindow;
  if (campaign.status !== "open") {
    return Response.json(
      { error: "Das Live-Dashboard ist nur waehrend des Weltrekordversuchs verfuegbar.", code: "outside-campaign-window" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = rateLimit(request, "dashboard", { limit: 240, windowMs: 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const since = new URL(request.url).searchParams.get("since");
  const sinceDate = since ? new Date(since) : null;
  const isDelta = Boolean(sinceDate && !Number.isNaN(sinceDate.valueOf()));
  const now = Date.now();

  if (!isDelta && snapshotCache && snapshotCache.expiresAt > now) {
    return Response.json(snapshotCache.value, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } });
  }

  if (isDelta) {
    const cached = deltaCache.get(since as string);
    if (cached && cached.expiresAt > now) {
      return Response.json(cached.value, { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } });
    }
  }

  let supabase: SupabaseAdmin;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Der Dashboard-Dienst ist noch nicht konfiguriert." }, { status: 503 });
  }

  if (isDelta) {
    const delta = await loadDelta(supabase, (sinceDate as Date).toISOString());
    if (!delta) {
      return Response.json({ error: "Die Live-Daten konnten nicht geladen werden." }, { status: 502 });
    }

    // Nur wenige Cursor gleichzeitig vorhalten, sonst waechst die Map unbegrenzt.
    if (deltaCache.size > 50) deltaCache.clear();
    deltaCache.set(since as string, { value: delta, expiresAt: now + DELTA_TTL_MS });

    return Response.json(delta, { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } });
  }

  const snapshot = await loadSnapshot(supabase, {
    startAt: campaign.startAt?.toISOString() ?? null,
    endAt: campaign.endAt?.toISOString() ?? null,
  }, settings.recordGoal, settings.dayRecord);
  if (!snapshot) {
    return Response.json({ error: "Die Live-Daten konnten nicht geladen werden." }, { status: 502 });
  }

  snapshotCache = { value: snapshot, expiresAt: now + SNAPSHOT_TTL_MS };
  return Response.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } });
}
