import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAppSettings } from "@/lib/app-settings";
import { readPublicStats, timelineRange } from "@/lib/public-stats";

/**
 * Oeffentliche Statistik fuer fremde Anzeigen (siehe
 * `docs/hardware-display-api.md`).
 *
 * Ohne API-Key, deshalb ausschliesslich Aggregate: Gesamtzahl, Ziel,
 * Moderationsschlange, Tageswerte, Kategorien, Kreise und die Zeitachse des
 * Einreichungszeitraums. Die Zusammenfassung macht `public_stats()` in einer
 * einzigen Abfrage; die Route legt nur die Einstellungen daneben.
 */

export async function GET(request: Request) {
  const settings = await getAppSettings();
  const campaign = settings.submissionWindow;
  if (campaign.status !== "open") {
    return Response.json(
      { error: "Die oeffentliche Statistik ist nur waehrend des Weltrekordversuchs verfuegbar.", code: "outside-campaign-window" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = rateLimit(request, "repair-stats", { limit: 120, windowMs: 60 * 1_000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Statistikabfragen. Bitte versuche es gleich erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Der Statistikdienst ist noch nicht konfiguriert." }, { status: 503 });
  }

  // `status === "open"` garantiert beide Grenzen; das Fallback haelt nur den
  // Typ zufrieden.
  const range = timelineRange(campaign.startAt ?? new Date(), campaign.endAt ?? new Date());
  const { data, error } = await supabase.rpc("public_stats", { range_start: range.start, range_end: range.end });

  if (error || !data) {
    return Response.json({ error: "Die Statistik konnte nicht geladen werden." }, { status: 502 });
  }

  const stats = readPublicStats(data, {
    goal: settings.recordGoal,
    dayRecord: settings.dayRecord,
    campaign: { startAt: campaign.startAt, endAt: campaign.endAt },
  });

  return Response.json(stats, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
}
