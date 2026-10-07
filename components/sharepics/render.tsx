import { ImageResponse } from "next/og";
import { getAppSettings } from "@/lib/app-settings";
import { readPrizes } from "@/lib/lottery-store";
import { totalPrizeCount } from "@/lib/prize-list";
import { readPublicStats, timelineRange, type PublicStats } from "@/lib/public-stats";
import { demoRecap, readRecapStats, recapRange, type RecapStats } from "@/lib/sharepic-recap";
import { demoStats, rankEntries, sharepicFileName, sharepicFormats, sharepicMotifs, type SharepicRequest } from "@/lib/sharepics";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sharepicFonts } from "./fonts";
import { sharepicLogos } from "./logos";
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

/**
 * Die Zahlen der Rueckschau - nur fuer die Motive, die sie zeichnen.
 *
 * Fuer "Rueckschau Stadt" ohne Ortsangabe gilt wie bei "Eine Stadt" der
 * Ort auf Platz 1; der Name steht schon fest, bevor das Bild gezeichnet wird,
 * weil die Datenbank nach ihm filtert.
 */
async function loadRecap(sharepic: SharepicRequest, stats: PublicStats, now: Date): Promise<{ recap: RecapStats; kreis: string | null }> {
  const kreis = sharepic.motif === "recapKreis" ? sharepic.kreis ?? rankEntries(stats.kreise, 1)[0]?.key ?? null : null;
  if (sharepic.demo) return { recap: demoRecap(sharepic.period, now), kreis: kreis ?? "Wuppertal" };

  const range = recapRange(sharepic.period, now, stats.campaign.startAt);
  const { data, error } = await createSupabaseAdminClient().rpc("recap_stats", {
    range_start: range.start,
    range_end: range.end,
    kreis_filter: kreis,
  });
  if (error) throw new Error(error.message);
  return { recap: readRecapStats(data), kreis };
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

  let recap: { recap: RecapStats; kreis: string | null } | null = null;
  if (sharepicMotifs[sharepic.motif].params.includes("period")) {
    try {
      recap = await loadRecap(sharepic, stats, now);
    } catch (error) {
      console.error("Sharepics: Rückschau konnte nicht geladen werden.", error);
      return new Response("Die Rückschau konnte nicht geladen werden.", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  }

  const [fonts, logos] = await Promise.all([sharepicFonts(), sharepicLogos()]);

  return new ImageResponse(
    <SharepicCard request={sharepic} stats={stats} now={now} domain={domain} logos={logos} prizeCount={loaded.prizeCount || (sharepic.demo ? 25 : 0)} recap={recap?.recap ?? null} recapKreis={recap?.kreis ?? null} />,
    {
      width: sharepicFormats[sharepic.format].width,
      height: sharepicFormats[sharepic.format].height,
      fonts,
      headers: {
        "Cache-Control": cacheControl,
        ...(sharepic.download ? { "Content-Disposition": `attachment; filename="${sharepicFileName(sharepic.motif, sharepic.format, sharepic.lang, now)}"` } : {}),
      },
    },
  );
}
