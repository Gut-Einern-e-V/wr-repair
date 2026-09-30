import { ImageResponse } from "next/og";
import { requireModerator } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { readPrizes } from "@/lib/lottery-store";
import { totalPrizeCount } from "@/lib/prize-list";
import { readPublicStats, timelineRange, type PublicStats } from "@/lib/public-stats";
import { getSiteUrl } from "@/lib/share";
import { SHAREPIC_SIZE, demoStats, parseSharepicRequest, sharepicFileName } from "@/lib/sharepics";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sharepicFonts } from "../fonts";
import { SharepicCard } from "../sharepic-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ein Sharepic als PNG im Story-Format (siehe lib/sharepics.ts).
 *
 * Nur fuer die Moderation: Die Zahlen darin sind zwar dieselben wie unter
 * `/api/stats`, aber die Route setzt auch eine frei waehlbare Ueberschrift
 * in die Markengestaltung. Offen erreichbar waere das ein Generator fuer
 * echt aussehende Grafiken mit beliebigem Text.
 */

async function loadStats(): Promise<{ stats: PublicStats; prizeCount: number }> {
  const settings = await getAppSettings();
  const campaign = settings.submissionWindow;
  const context = {
    goal: settings.recordGoal,
    dayRecord: settings.dayRecord,
    campaign: { startAt: campaign.startAt, endAt: campaign.endAt },
  };

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const range = timelineRange(campaign.startAt ?? now, campaign.endAt ?? now);
  const [statsResult, prizes] = await Promise.all([
    supabase.rpc("public_stats", { range_start: range.start, range_end: range.end }),
    readPrizes(supabase).catch(() => ({ rows: null })),
  ]);
  if (statsResult.error) throw new Error(statsResult.error.message);

  return { stats: readPublicStats(statsResult.data, context), prizeCount: totalPrizeCount(prizes.rows ?? []) };
}

function readableSiteUrl(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const protocol = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return getSiteUrl(host ? `${protocol}://${host}` : "").replace(/^https?:\/\//, "");
}

export async function GET(request: Request) {
  const auth = await requireModerator();
  if (!auth.authorized) {
    return new Response(auth.error, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }

  const sharepic = parseSharepicRequest(new URL(request.url).searchParams);
  const now = new Date();

  let loaded;
  try {
    loaded = await loadStats();
  } catch (error) {
    console.error("Sharepics: Statistik konnte nicht geladen werden.", error);
    return new Response("Die Statistik konnte nicht geladen werden.", { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  /* Beispielzahlen, aber der echte Zeitraum und das echte Ziel - damit
     Countdown und Fortschritt in der Vorschau trotzdem stimmen. */
  const stats = sharepic.demo
    ? { ...demoStats(now), goal: loaded.stats.goal, dayRecord: loaded.stats.dayRecord ?? 450, campaign: loaded.stats.campaign }
    : loaded.stats;

  return new ImageResponse(
    <SharepicCard request={sharepic} stats={stats} now={now} domain={readableSiteUrl(request)} prizeCount={loaded.prizeCount || (sharepic.demo ? 25 : 0)} />,
    {
      ...SHAREPIC_SIZE,
      fonts: await sharepicFonts(),
      headers: {
        "Cache-Control": "private, no-store",
        ...(sharepic.download ? { "Content-Disposition": `attachment; filename="${sharepicFileName(sharepic.motif, now)}"` } : {}),
      },
    },
  );
}
