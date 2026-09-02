import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { publicRateLimit } from "@/lib/rate-limit";
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

/**
 * Anfragen je Minute und IP-Adresse im Normalbetrieb. Grosszuegig, weil bei
 * einer Veranstaltung alle Geraete hinter derselben Adresse stecken - ein
 * Infodisplay braucht davon eine alle fuenf Minuten.
 */
const STATS_LIMIT_PER_MINUTE = 120;

export async function GET(request: Request) {
  const settings = await getAppSettings();
  const campaign = settings.submissionWindow;
  /* Waehrend und nach dem Zeitraum. Vorher gibt es nichts zu zeigen, und die
     Zahl null als "Live-Stand" waere irrefuehrend; danach ist die Zahl das
     Ergebnis und bleibt offen - die Startseite und der Rueckblick unter /stats
     leben davon (Issue #66). */
  if (campaign.status !== "open" && campaign.status !== "after") {
    return Response.json(
      { error: "Die oeffentliche Statistik ist ab dem Start des Weltrekordversuchs verfuegbar.", code: "outside-campaign-window" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  /* Vorgabe der Route im Normalbetrieb; im Schonmodus gilt die engere Grenze
     aus dem Backend (siehe lib/rate-limit.ts und docs/public-api.md). */
  const limit = publicRateLimit(request, "repair-stats", settings.publicThrottle, STATS_LIMIT_PER_MINUTE);
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

  // Beide Status garantieren beide Grenzen; das Fallback haelt nur den Typ
  // zufrieden.
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

  /* Nach dem Zeitraum kommt nur noch dazu, was die Moderation nachtraeglich
     freigibt - deutlich seltener als waehrend der Aktion. Ein laengeres
     Zwischenlager spart Abfragen, ohne dass jemand etwas davon merkt. */
  const maxAge = campaign.status === "after" ? 1_800 : 300;
  return Response.json(stats, { headers: { "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=60` } });
}
