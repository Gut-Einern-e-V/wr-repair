import { requireModerationAccess } from "@/lib/moderation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** Wie weit um den Eingang herum gesucht wird. Ein zweiter Sendevorgang folgt meist binnen Minuten. */
const WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** `ilike` ohne Platzhalter: Gross- und Kleinschreibung egal, sonst genau gleich. */
function literalPattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Einreichungen, die nach derselben Reparatur aussehen (Issue #167).
 *
 * Gebraucht fuer den Hinweis "VORSICHT DOPPELEINREICHUNG?": Die Moderation
 * soll nicht von Hand suchen muessen, ob dieselbe Reparatur schon einmal da
 * ist. Gleiche Kategorie im Abstand von drei Tagen, dazu gleiches Geraet -
 * oder, wo das fehlt, gleicher Text. Ohne beides waere jede Fahrradreparatur
 * derselben Woche ein Treffer, und die Liste sagte nichts mehr.
 */
export async function GET(_request: Request, context: { params: Promise<{ repairId: string }> }) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const { repairId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("id, category, brand_model, story, created_at")
    .eq("id", repairId)
    .single();

  if (repairError || !repair) {
    return Response.json({ error: "Einreichung nicht gefunden." }, { status: 404 });
  }

  if (!repair.brand_model && !repair.story) {
    return Response.json({ similar: [] });
  }

  const createdAt = new Date(repair.created_at).getTime();
  let query = supabase
    .from("repairs")
    .select("id, brand_model, created_at, status, kreis")
    .neq("id", repair.id)
    .eq("category", repair.category)
    .gte("created_at", new Date(createdAt - WINDOW_MS).toISOString())
    .lte("created_at", new Date(createdAt + WINDOW_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(5);

  query = repair.brand_model
    ? query.ilike("brand_model", literalPattern(repair.brand_model))
    : query.eq("story", repair.story);

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: "Ähnliche Einreichungen konnten nicht geladen werden." }, { status: 502 });
  }

  return Response.json({ similar: data ?? [] });
}
