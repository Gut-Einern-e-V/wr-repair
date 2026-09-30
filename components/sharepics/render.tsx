import { ImageResponse } from "next/og";
import { getAppSettings } from "@/lib/app-settings";
import { readPrizes } from "@/lib/lottery-store";
import { totalPrizeCount } from "@/lib/prize-list";
import { readPublicStats, timelineRange, type PublicStats } from "@/lib/public-stats";
import { SHAREPIC_SIZE, demoStats, sharepicFileName, type SharepicRequest } from "@/lib/sharepics";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sharepicFonts } from "./fonts";
import { SharepicCard } from "./sharepic-card";

/**
 * Zeichnet ein Sharepic als PNG - fuer beide Bildrouten, die der Moderation
 * (app/moderator/sharepics/image) und die oeffentliche (app/sharepics/image).
 *
 * Was eine Route zeichnen darf, entscheidet sie selbst ueber die Anfrage, die
 * sie hereinreicht: Die oeffentliche kommt aus `parsePublicSharepicRequest`
 * und hat weder eigene Ueberschrift noch Beispielzahlen.
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

export async function renderSharepic(sharepic: SharepicRequest, { domain, cacheControl }: { domain: string; cacheControl: string }) {
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
    <SharepicCard request={sharepic} stats={stats} now={now} domain={domain} prizeCount={loaded.prizeCount || (sharepic.demo ? 25 : 0)} />,
    {
      ...SHAREPIC_SIZE,
      fonts: await sharepicFonts(),
      headers: {
        "Cache-Control": cacheControl,
        ...(sharepic.download ? { "Content-Disposition": `attachment; filename="${sharepicFileName(sharepic.motif, now)}"` } : {}),
      },
    },
  );
}
