import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BucketUsage = { id: string; objects: number; bytes: number };
type SubmissionFailure = {
  id: string;
  created_at: string;
  stage: string;
  reason: string;
  detail: string | null;
  ip_region: string | null;
  repair_id: string | null;
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

  const [database, storage, auth, usageProbe, failureProbe] = await Promise.all([
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
        .select("id, created_at, stage, reason, detail, ip_region, repair_id")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw new Error(error.message);
      return (data ?? []) as SubmissionFailure[];
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
        id: "captcha",
        label: "Friendly Captcha",
        ok: Boolean(process.env.FRIENDLY_CAPTCHA_API_KEY && process.env.NEXT_PUBLIC_FRIENDLY_CAPTCHA_SITEKEY),
        ms: null,
        detail: process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === "false" ? "Captcha ist per Konfiguration abgeschaltet." : null,
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
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
