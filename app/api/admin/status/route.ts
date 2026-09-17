import { requireAdmin } from "@/lib/admin-auth";
import { readPrizes } from "@/lib/lottery-store";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BucketUsage = { id: string; objects: number; bytes: number };
type SubmissionFailure = {
  id: string;
  created_at: string;
  /** Fehlt, solange die Migration 202609170002 nicht ausgerollt ist. */
  last_at?: string | null;
  hits?: number | null;
  stage: string;
  reason: string;
  detail: string | null;
  ip_region: string | null;
  repair_id: string | null;
};
/** Eine Einreichung, die unterwegs verlorenging (Issue #107). */
type AbandonedRow = {
  id: string;
  created_at: string;
  last_at: string;
  attempts: number;
  stage: string;
  reason: string;
  ip_region: string | null;
  kreis: string | null;
  origin_source: string | null;
  category: string | null;
  brand_model: string | null;
  duration_minutes: number | null;
  item_value_euros: number | null;
  performed_by: string | null;
  story: string | null;
  has_image: boolean;
  wants_lottery: boolean;
};
type Usage = {
  databaseBytes: number;
  buckets: BucketUsage[];
  repairs: { pending: number; approved: number; rejected: number };
  accounts: number;
  partners: number;
};

/** Free-tier defaults; override per project with the documented env variables. */
function quotaBytes(name: string, fallbackMb: number) {
  const parsed = Number.parseFloat(process.env[name] ?? "");
  const megabytes = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMb;
  return Math.round(megabytes * 1024 * 1024);
}

async function timed<T>(run: () => Promise<T>) {
  const startedAt = Date.now();
  try {
    const value = await run();
    return { ok: true as const, ms: Date.now() - startedAt, value };
  } catch (error) {
    return { ok: false as const, ms: Date.now() - startedAt, error: error instanceof Error ? error.message : "Unbekannter Fehler" };
  }
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Die Supabase-Zugangsdaten sind nicht konfiguriert." }, { status: 503 });
  }

  const [database, storage, auth, lottery, usageProbe, failureProbe, abandonedProbe] = await Promise.all([
    timed(async () => {
      const { error } = await supabase.from("campaign_settings").select("id").limit(1);
      if (error) throw new Error(error.message);
      return true;
    }),
    timed(async () => {
      const { error } = await supabase.storage.from("repair-images").list("", { limit: 1 });
      if (error) throw new Error(error.message);
      return true;
    }),
    timed(async () => {
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw new Error(error.message);
      return true;
    }),
    /* Die Preistabelle, genau wie die Gewinnspielseite sie liest (Issue #99).
       Faellt diese Abfrage aus - eine fehlende Migration etwa -, steht auf
       /gewinnspiel keine Preisliste, und von aussen sieht das aus wie "es
       sind eben noch keine Preise eingetragen". Hier steht dann der Grund. */
    timed(async () => {
      const { rows, error } = await readPrizes(supabase);
      if (error) throw new Error(error.message);
      return rows?.length ?? 0;
    }),
    timed(async () => {
      const { data, error } = await supabase.rpc("system_usage");
      if (error) throw new Error(error.message);
      return data as Usage;
    }),
    /* Was beim Einreichen schiefging (Issue #64). Nach dem User-Test war das
       nicht mehr feststellbar, weil jeder Fehler nur als deutsche Meldung im
       Browser landete und danach vergessen war. Hier stehen die letzten
       Vorfaelle - ohne Inhalte, ohne Personenbezug, nur Grund und Zeitpunkt. */
    timed(async () => {
      const { data, error } = await supabase
        .from("submission_failures")
        .select("id, created_at, last_at, hits, stage, reason, detail, ip_region, repair_id")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) {
        /* Vor der Migration 202609170002 gibt es die beiden Zaehlspalten noch
           nicht, und PostgREST beantwortet die Auswahl dann mit einem Fehler.
           Lieber die Liste ohne Zaehler als eine leere Kachel mit dem Hinweis,
           irgendeine Migration fehle. */
        const fallback = await supabase
          .from("submission_failures")
          .select("id, created_at, stage, reason, detail, ip_region, repair_id")
          .order("created_at", { ascending: false })
          .limit(25);
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data ?? []) as SubmissionFailure[];
      }
      return (data ?? []) as SubmissionFailure[];
    }),
    /* Und daneben die Einreichungen selbst, soweit sie bis zum Abbruch
       eingetragen waren (Issue #107). Das Fehlerprotokoll sagt, woran es lag;
       diese Liste sagt, was verlorenging - und erlaubt, es von Hand
       nachzutragen. */
    timed(async () => {
      const { data, error } = await supabase
        .from("abandoned_submissions")
        .select("id, created_at, last_at, attempts, stage, reason, ip_region, kreis, origin_source, category, brand_model, duration_minutes, item_value_euros, performed_by, story, has_image, wants_lottery")
        .order("last_at", { ascending: false })
        .limit(25);
      if (error) throw new Error(error.message);
      return (data ?? []) as AbandonedRow[];
    }),
  ]);

  const usage = usageProbe.ok ? usageProbe.value : null;
  const storageBytes = (usage?.buckets ?? []).reduce((sum, bucket) => sum + Number(bucket.bytes ?? 0), 0);
  const storageQuota = quotaBytes("SUPABASE_STORAGE_QUOTA_MB", 1024);
  const databaseQuota = quotaBytes("SUPABASE_DB_QUOTA_MB", 500);

  return Response.json({
    services: [
      { id: "database", label: "Datenbank", ok: database.ok, ms: database.ms, detail: database.ok ? null : database.error },
      { id: "storage", label: "Datei-Speicher", ok: storage.ok, ms: storage.ms, detail: storage.ok ? null : storage.error },
      { id: "auth", label: "Anmeldung", ok: auth.ok, ms: auth.ms, detail: auth.ok ? null : auth.error },
      {
        id: "lottery",
        label: "Verlosung",
        ok: lottery.ok,
        ms: lottery.ms,
        detail: lottery.ok
          ? (lottery.value === 0
              /* Was "kein Preis" bedeutet, haengt seit Issue #110 vom
                 Zeitpunkt ab: Vor dem Start zeigt die Seite Beispiele, ab
                 dem Start ist eine leere Liste ein Versaeumnis - dann muss
                 jeder Preis dort stehen. */
              ? "Kein Preis eingetragen - vor dem Start zeigt die Gewinnspielseite Beispiele, ab dem Start fehlt dort die zugesagte Preisliste."
              : `${lottery.value} ${lottery.value === 1 ? "Preis" : "Preise"} eingetragen`)
          : `Die Preise sind nicht lesbar, /gewinnspiel zeigt deshalb keine Preisliste: ${lottery.error}`,
      },
      /* Der Spam-Schutz gilt nur als in Ordnung, wenn er auch eingeschaltet ist
         (Issue #59). Vorher genuegten die beiden Schluessel in der Umgebung:
         Stand `NEXT_PUBLIC_CAPTCHA_ENABLED` auf "false" - der ausdruecklich
         vorgesehene Notausgang -, zeigte der Systemstatus trotzdem ein gruenes
         Feld und nur eine Randnotiz. Genau so ist der Bypass wochenlang
         unbemerkt stehengeblieben. */
      {
        id: "captcha",
        label: "Friendly Captcha",
        ok: Boolean(process.env.FRIENDLY_CAPTCHA_API_KEY && process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY)
          && process.env.NEXT_PUBLIC_CAPTCHA_ENABLED !== "false",
        ms: null,
        detail: process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === "false"
          ? "Captcha ist per Konfiguration abgeschaltet (NEXT_PUBLIC_CAPTCHA_ENABLED=false). Einreichungen laufen ohne Spam-Schutz."
          : null,
      },
    ],
    usage: usage
      ? {
          storage: { usedBytes: storageBytes, quotaBytes: storageQuota, buckets: usage.buckets.map((bucket) => ({ ...bucket, bytes: Number(bucket.bytes ?? 0), objects: Number(bucket.objects ?? 0) })) },
          database: { usedBytes: Number(usage.databaseBytes ?? 0), quotaBytes: databaseQuota },
          repairs: usage.repairs,
          accounts: Number(usage.accounts ?? 0),
          partners: Number(usage.partners ?? 0),
        }
      : null,
    usageError: usageProbe.ok ? null : "Die Belegung konnte nicht gelesen werden. Wurde die Migration ausgefuehrt?",
    submissionFailures: failureProbe.ok
      ? failureProbe.value.map((row) => ({
          id: row.id,
          at: row.created_at,
          lastAt: row.last_at ?? row.created_at,
          hits: row.hits ?? 1,
          stage: row.stage,
          reason: row.reason,
          detail: row.detail,
          ipRegion: row.ip_region,
          // Nur ob, nicht welche: Die Einreichung selbst gehoert in die
          // Moderation, nicht in den Systemstatus.
          incomplete: Boolean(row.repair_id),
        }))
      : [],
    submissionFailuresError: failureProbe.ok ? null : "Das Einreichungsprotokoll konnte nicht gelesen werden. Wurde die Migration ausgefuehrt?",
    abandonedSubmissions: abandonedProbe.ok
      ? abandonedProbe.value.map((row) => ({
          id: row.id,
          at: row.created_at,
          lastAt: row.last_at,
          attempts: row.attempts,
          stage: row.stage,
          reason: row.reason,
          ipRegion: row.ip_region,
          kreis: row.kreis,
          originSource: row.origin_source,
          category: row.category,
          brandModel: row.brand_model,
          durationMinutes: row.duration_minutes,
          itemValueEuros: row.item_value_euros === null ? null : Number(row.item_value_euros),
          performedBy: row.performed_by,
          story: row.story,
          hasImage: row.has_image,
          wantsLottery: row.wants_lottery,
        }))
      : [],
    abandonedSubmissionsError: abandonedProbe.ok ? null : "Die abgebrochenen Einreichungen konnten nicht gelesen werden. Wurde die Migration 202609170002 ausgefuehrt?",
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
