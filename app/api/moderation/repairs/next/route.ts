import { CLAIM_LEASE_SECONDS, moderationColumns, requireModerationAccess, signRepairImages, toModerationRepair } from "@/lib/moderation";
import { getAppSettings } from "@/lib/app-settings";
import { expectedIpRegionTag } from "@/lib/origin-check";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SKIP = 100;

/**
 * Naechste offene Einreichung fuer die Schnellpruefung - genau eine, und mit
 * Anspruch darauf.
 *
 * Die Warteschlange wird bewusst nicht mehr am Stueck geladen: Das hat pro
 * Aufruf bis zu hundert signierte Bild-URLs erzeugt, deren Bilder niemand
 * ansieht, und zwei gleichzeitige Sitzungen haben dieselben Einreichungen
 * bearbeitet (Issue #38). Deshalb POST statt GET: Der Aufruf veraendert etwas.
 *
 * Einreichungen mit unklarer Herkunft bleiben aussen vor - ueber die entscheidet
 * man in der Listenfreigabe, wo Karte, Quelle und Verbindung nebeneinander
 * stehen. Die Auswahl trifft `claim_next_repair()`, siehe
 * supabase/migrations/202608280004_quick_review_clear_origin.sql.
 */
export async function POST(request: Request) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => ({})) as { skip?: unknown };
  const skip = Array.isArray(body.skip) ? body.skip : [];

  if (skip.length > MAX_SKIP || skip.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    return Response.json({ error: "Ungueltige Liste zurueckgestellter Einreichungen." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { region } = await getAppSettings();
  // Derselbe Tag, gegen den die Konsole "Verbindung woanders" meldet.
  const expectedIpRegion = expectedIpRegionTag(region);

  const { data: claimed, error } = await supabase
    .rpc("claim_next_repair", {
      p_moderator: access.currentAdmin.user.id,
      p_lease_seconds: CLAIM_LEASE_SECONDS,
      p_skip: skip,
      p_expected_ip_region: expectedIpRegion,
    })
    .select(moderationColumns)
    .maybeSingle();

  if (error) {
    return Response.json({ error: "Die naechste Einreichung konnte nicht geladen werden." }, { status: 502 });
  }

  // Wie voll die Warteschlange ist, sehen nur Admins (Issue #10). Gezaehlt wird
  // dieselbe Menge, die die Schnellpruefung auch ausgibt - sonst stuende dort
  // "noch 20 offen" neben einer leeren Schlange, weil die 20 in der Liste
  // liegen.
  let remaining: number | null = null;
  if (access.isAdmin) {
    let pending = supabase
      .from("repairs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .not("kreis", "is", null);
    if (expectedIpRegion) {
      pending = pending.or(`origin_ip_region.is.null,origin_ip_region.eq.${expectedIpRegion}`);
    }
    const { count } = await pending;
    remaining = count ?? 0;
  }

  if (!claimed) {
    return Response.json({ repair: null, remaining });
  }

  const { urls, error: urlError } = await signRepairImages(supabase, [claimed]);
  if (urlError) {
    return Response.json({ error: "Das Bild konnte nicht geladen werden." }, { status: 502 });
  }

  return Response.json({ repair: toModerationRepair(claimed, urls, access.currentAdmin.user.id, region), remaining });
}
