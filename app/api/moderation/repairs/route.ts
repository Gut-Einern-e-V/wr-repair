import { requireModerator } from "@/lib/admin-auth";
import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";
import { repairCategoryValues } from "@/lib/repair-catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const statuses = new Set(["pending", "approved", "rejected"]);
const categoriesSet = new Set(repairCategoryValues as string[]);
const MAX_LIMIT = 200;

const columns =
  "id, category, brand_model, performed_by, story, repair_succeeded, image_path, image_alt_text, tags, consent_publication, status, location_region, moderator_comment, created_at, entry_time";

/** PostgREST-Filter brauchen maskierte Sonderzeichen im `ilike`-Muster. */
function escapeLike(value: string) {
  return value.replace(/[\\%_,()]/g, (match) => `\\${match}`);
}

export async function GET(request: Request) {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const isAdmin = authorization.currentAdmin.roles.some((role) => ["admin", "superadmin"].includes(role));
  if (!isAdmin && (await getConfiguredSubmissionWindow()).status !== "open") {
    return Response.json({ error: "Moderation ist nur waehrend des Einreichungszeitraums moeglich." }, { status: 403 });
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
  let query = supabase.from("repairs").select(columns).eq("status", status);

  if (category) query = query.eq("category", category);
  if (consent) query = query.eq("consent_publication", consent === "yes");
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    query = query.or(`brand_model.ilike.${pattern},story.ilike.${pattern}`);
  }

  const { data: repairs, error } = await query.order("entry_time", { ascending: oldestFirst }).limit(limit);

  if (error) {
    return Response.json({ error: "Einreichungen konnten nicht geladen werden." }, { status: 502 });
  }

  const imagePaths = (repairs ?? []).filter((repair) => repair.image_path).map((repair) => repair.image_path as string);
  const { data: signedUrls, error: urlError } = imagePaths.length
    ? await supabase.storage.from("repair-images").createSignedUrls(imagePaths, 900)
    : { data: [], error: null };

  if (urlError) {
    return Response.json({ error: "Bilder konnten nicht geladen werden." }, { status: 502 });
  }

  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));

  // Moderator*innen sollen sich auf die einzelne Einreichung konzentrieren;
  // wie voll die Warteschlange ist, geht nur Admins etwas an (Issue #10).
  let counts: Record<string, number> | null = null;
  if (isAdmin) {
    const [pending, approved, rejected] = await Promise.all(
      ["pending", "approved", "rejected"].map((value) =>
        supabase.from("repairs").select("id", { count: "exact", head: true }).eq("status", value),
      ),
    );
    counts = { pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
  }

  return Response.json({
    repairs: (repairs ?? []).map((repair) => ({
      ...repair,
      imageUrl: repair.image_path ? (urls.get(repair.image_path) ?? null) : null,
    })),
    counts,
    truncated: (repairs ?? []).length === limit,
  });
}
