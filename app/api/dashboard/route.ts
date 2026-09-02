import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publicRateLimit } from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/app-settings";
import { MAX_HIGHLIGHTS, readCells, type DashboardDelta, type DashboardHighlight, type DashboardKreisDay, type DashboardSnapshot } from "@/lib/dashboard";

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

/**
 * Anfragen je Minute und IP-Adresse im Normalbetrieb. Hoeher als bei
 * `/api/stats`, weil eine laufende Buehne vier Deltas je Minute abfragt und bei
 * einer Veranstaltung mehrere Zuschauer hinter derselben Adresse stecken.
 */
const DASHBOARD_LIMIT_PER_MINUTE = 240;

const SNAPSHOT_TTL_MS = 20_000;
const DELTA_TTL_MS = 5_000;
const DELTA_LIMIT = 50;
const SIGNED_URL_TTL_SECONDS = 900;

type CacheEntry<T> = { value: T; expiresAt: number };

/**
 * Je Bildvariante ein eigener Eintrag: Eine Antwort ohne Bild-URLs darf nicht
 * fuer eine Anfrage mit `?images=1` durchgereicht werden - und umgekehrt waere
 * es Verschwendung.
 */
const snapshotCache = new Map<string, CacheEntry<DashboardSnapshot>>();
const deltaCache = new Map<string, CacheEntry<DashboardDelta>>();

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
  location_lat: number | string | null;
  location_lon: number | string | null;
};

/** `numeric`-Spalten kommen je nach Treiber als Zahl oder als Zeichenkette. */
function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

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
 * Kreis und Herkunftszelle stehen bereits als Spalten auf der Zeile - einmalig
 * bei der Einreichung aus der im Browser anonymisierten Koordinate hergeleitet,
 * siehe `app/api/repairs/route.ts`. Sie werden unveraendert weitergereicht: Die
 * frueher hier sitzende Schwelle (Name erst ab fuenf Reparaturen je Kreis) ist
 * entfallen, siehe `DashboardHighlight.kreis`.
 *
 * Bild-URLs entstehen nur auf Anforderung. Sie kosten einen zusaetzlichen
 * Aufruf bei Supabase und sind der groesste Teil der Antwort - das Dashboard
 * zeigt Einzelbilder aber nur, wenn der Spotlight eingeschaltet ist, und der
 * ist es standardmaessig nicht.
 */
async function toHighlights(
  supabase: SupabaseAdmin,
  rows: RepairRow[],
  withImages: boolean,
): Promise<DashboardHighlight[]> {
  const paths = withImages
    ? rows.map((row) => row.image_path).filter((path): path is string => Boolean(path))
    : [];
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
    kreis: row.kreis,
    lat: toCoordinate(row.location_lat),
    lon: toCoordinate(row.location_lon),
  }));
}

/**
 * Die Reparaturen, die fuer den Rekord zaehlen (Issue #77).
 *
 * Dieselbe Auswahl wie in `dashboard_stats()`: freigegeben *und* gelungen. Sie
 * steht hier auch fuer das Laufband und den Delta-Pfad, nicht nur fuer die
 * Summen - sonst zoege am grossen Zaehler ein Eintrag vorbei, den er selbst
 * nicht mitzaehlt, und die Kategoriezahlen des Deltas liefen gegen das
 * Aggregat.
 */
const countedRepairs = { status: "approved", repair_succeeded: true };

// `created_at` ist der Einreichungszeitpunkt und damit die Angabe, die das
// Laufband zeigt. `moderated_at` bleibt trotzdem dabei: Daran haengen die
// Reihenfolge der Deltas und der Cursor.
const highlightColumns =
  "id, category, brand_model, image_path, image_alt_text, created_at, moderated_at, kreis, location_lat, location_lon";

/** Bester Tag aus dem Aggregat - fehlt er, hat die Aktion noch keinen. */
function toBestDay(value: unknown): DashboardSnapshot["bestDay"] {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const total = toNumber(record.total);
  if (typeof record.date !== "string" || total <= 0) return null;

  return { date: record.date, total };
}

/**
 * Bester Ortstag aus dem Aggregat (Issue #75). `null`, solange keiner
 * feststeht - und ebenso, solange Migration 202609020001 nicht ausgerollt ist:
 * Dann fehlt das Feld, und die Buehne laeuft allein gegen den hinterlegten
 * Wert, statt mit einer halben Angabe.
 */
function toBestKreisDay(value: unknown): DashboardKreisDay | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const total = toNumber(record.total);
  if (typeof record.date !== "string" || typeof record.kreis !== "string" || total <= 0) return null;

  return { date: record.date, kreis: record.kreis, total };
}

async function loadSnapshot(
  supabase: SupabaseAdmin,
  campaign: DashboardSnapshot["campaign"],
  goal: number,
  dayRecord: number | null,
  withImages: boolean,
): Promise<DashboardSnapshot | null> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error || !data) return null;

  const aggregate = data as Record<string, unknown>;
  const cells = readCells(aggregate.cells);
  const kreise = toCounts(aggregate.kreise);

  const { data: recent } = await supabase
    .from("repairs")
    .select(highlightColumns)
    .match(countedRepairs)
    .order("moderated_at", { ascending: false })
    .limit(MAX_HIGHLIGHTS);

  return {
    total: toNumber(aggregate.total),
    goal,
    attempted: toNumber(aggregate.attempted),
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
    todayKreise: toCounts(aggregate.todayKreise),
    bestKreisDay: toBestKreisDay(aggregate.bestKreisDay),
    cells,
    kreise,
    highlights: await toHighlights(supabase, (recent ?? []) as RepairRow[], withImages),
    campaign,
    cursor: typeof aggregate.cursor === "string" ? aggregate.cursor : null,
    generatedAt: new Date().toISOString(),
  };
}

async function loadDelta(supabase: SupabaseAdmin, since: string, withImages: boolean): Promise<DashboardDelta | null> {
  const { count, error: countError } = await supabase
    .from("repairs")
    .select("id", { count: "exact", head: true })
    .match(countedRepairs);

  if (countError) return null;

  // Der Tagesstand kommt aus der Datenbank statt aus einer Berechnung hier:
  // Die Grenze des Berliner Kalendertages haengt an der Zeitzone, und die kennt
  // Postgres verlaesslicher als ein Node-Prozess in UTC (siehe
  // `dashboard_today()`).
  const { data: todayCount, error: todayError } = await supabase.rpc("dashboard_today");

  const { data, error } = await supabase
    .from("repairs")
    .select(highlightColumns)
    .match(countedRepairs)
    .gt("moderated_at", since)
    .order("moderated_at", { ascending: true })
    .limit(DELTA_LIMIT);

  if (error) return null;

  const rows = (data ?? []) as RepairRow[];
  const categories: Record<string, number> = {};
  for (const row of rows) {
    categories[row.category] = (categories[row.category] ?? 0) + 1;
  }

  const highlights = await toHighlights(supabase, rows, withImages);

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

  /* Vorgabe der Route im Normalbetrieb; im Schonmodus gilt die engere Grenze
     aus dem Backend (siehe lib/rate-limit.ts und docs/public-api.md). */
  const limit = publicRateLimit(request, "dashboard", settings.publicThrottle, DASHBOARD_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const since = params.get("since");
  // Bild-URLs nur, wenn sie auch gezeigt werden - siehe `toHighlights()`.
  const withImages = params.get("images") === "1";
  const sinceDate = since ? new Date(since) : null;
  const isDelta = Boolean(sinceDate && !Number.isNaN(sinceDate.valueOf()));
  const now = Date.now();
  const variant = withImages ? "images" : "plain";

  if (!isDelta) {
    const cached = snapshotCache.get(variant);
    if (cached && cached.expiresAt > now) {
      return Response.json(cached.value, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } });
    }
  }

  if (isDelta) {
    const cached = deltaCache.get(`${variant}:${since}`);
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
    const delta = await loadDelta(supabase, (sinceDate as Date).toISOString(), withImages);
    if (!delta) {
      return Response.json({ error: "Die Live-Daten konnten nicht geladen werden." }, { status: 502 });
    }

    // Nur wenige Cursor gleichzeitig vorhalten, sonst waechst die Map unbegrenzt.
    if (deltaCache.size > 50) deltaCache.clear();
    deltaCache.set(`${variant}:${since}`, { value: delta, expiresAt: now + DELTA_TTL_MS });

    return Response.json(delta, { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30" } });
  }

  const snapshot = await loadSnapshot(supabase, {
    startAt: campaign.startAt?.toISOString() ?? null,
    endAt: campaign.endAt?.toISOString() ?? null,
  }, settings.recordGoal, settings.dayRecord, withImages);
  if (!snapshot) {
    return Response.json({ error: "Die Live-Daten konnten nicht geladen werden." }, { status: 502 });
  }

  snapshotCache.set(variant, { value: snapshot, expiresAt: now + SNAPSHOT_TTL_MS });
  return Response.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } });
}
