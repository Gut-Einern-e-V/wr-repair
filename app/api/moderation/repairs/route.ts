import { repairCategoryValues } from "@/lib/repair-catalog";
import { getModerationColumns, requireModerationAccess, signRepairImages, toModerationRepair, type ModerationRow } from "@/lib/moderation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/app-settings";

const statuses = new Set(["pending", "approved", "rejected"]);
const categoriesSet = new Set(repairCategoryValues as string[]);
const MAX_LIMIT = 200;

/** PostgREST-Filter brauchen maskierte Sonderzeichen im `ilike`-Muster. */
function escapeLike(value: string) {
  return value.replace(/[\\%_,()]/g, (match) => `\\${match}`);
}

export async function GET(request: Request) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "pending";
  const category = params.get("category") ?? "";
  const consent = params.get("consent") ?? "";
  const search = (params.get("q") ?? "").trim();
  const parsedLimit = Number.parseInt(params.get("limit") ?? "", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT) : 100;
  const oldestFirst = params.get("sort") !== "newest";

  if (!statuses.has(status)) {
    return Response.json({ error: "Ungueltiger Statusfilter." }, { status: 400 });
  }
  if (category && !categoriesSet.has(category)) {
    return Response.json({ error: "Ungueltiger Kategoriefilter." }, { status: 400 });
  }
  if (search.length > 120) {
    return Response.json({ error: "Der Suchbegriff ist zu lang." }, { status: 400 });
  }
  if (consent && consent !== "yes" && consent !== "no") {
    return Response.json({ error: "Ungueltiger Zustimmungsfilter." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // Fuer den Herkunfts-Abgleich in der Moderation: dieselbe Gebietskonfiguration,
  // gegen die beim Einreichen geprueft wurde.
  const { region } = await getAppSettings();
  let query = supabase.from("repairs").select(await getModerationColumns(supabase)).eq("status", status);

  if (category) query = query.eq("category", category);
  if (consent) query = query.eq("consent_publication", consent === "yes");
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    query = query.or(`brand_model.ilike.${pattern},story.ilike.${pattern}`);
  }

  const { data, error } = await query.order("entry_time", { ascending: oldestFirst }).limit(limit);
  const repairs = (data ?? []) as unknown as ModerationRow[];

  if (error) {
    return Response.json({ error: "Einreichungen konnten nicht geladen werden." }, { status: 502 });
  }

  const { urls, error: urlError } = await signRepairImages(supabase, repairs);
  if (urlError) {
    return Response.json({ error: "Bilder konnten nicht geladen werden." }, { status: 502 });
  }

  // Moderator*innen sollen sich auf die einzelne Einreichung konzentrieren;
  // wie voll die Warteschlange ist, geht nur Admins etwas an (Issue #10).
  let counts: Record<string, number> | null = null;
  if (access.isAdmin) {
    const [pending, approved, rejected] = await Promise.all(
      ["pending", "approved", "rejected"].map((value) =>
        supabase.from("repairs").select("id", { count: "exact", head: true }).eq("status", value),
      ),
    );
    counts = { pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
  }

  return Response.json({
    repairs: repairs.map((repair) => toModerationRepair(repair, urls, access.currentAdmin.user.id, region)),
    counts,
    truncated: repairs.length === limit,
  });
}
