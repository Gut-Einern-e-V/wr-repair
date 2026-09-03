import { CLAIM_LEASE_SECONDS, getModerationColumns, requireModerationAccess, signRepairImages, toModerationRepair, type ModerationRow } from "@/lib/moderation";
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

  const { data, error } = await supabase
    .rpc("claim_next_repair", {
      p_moderator: access.currentAdmin.user.id,
      p_lease_seconds: CLAIM_LEASE_SECONDS,
      p_skip: skip,
      p_expected_ip_region: expectedIpRegion,
    })
    .select(await getModerationColumns(supabase))
    .maybeSingle();
  const claimed = data as unknown as ModerationRow | null;

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
      .not("kreis", "is", null)
      /* Dieselbe Bedingung wie in `claim_next_repair()` (Issue #87): Eine
         Einreichung, bei der ein Herkunftssignal aus dem Land herauszeigt,
         gehoert in die Liste und nicht in die Wischschlange - und darf hier
         deshalb auch nicht mitgezaehlt werden. Die Spalte ist generiert; die
         Formel steht in supabase/migrations/202609030002_origin_signals.sql. */
      .not("origin_signals_outside", "is", true);
    if (expectedIpRegion) {
      pending = pending.or(`origin_ip_region.is.null,origin_ip_region.eq.${expectedIpRegion}`);
    }
    const { count, error: countError } = await pending;
    /* Bei einem Fehler lieber gar keine Zahl als eine falsche: Solange
       Migration 202609030002 nicht ausgerollt ist, kennt PostgREST die
       generierte Spalte nicht und weist die ganze Abfrage ab. Eine "0" waere
       dann die Aussage "nichts mehr zu tun" - und das waere gelogen. */
    remaining = countError ? null : count ?? 0;
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
