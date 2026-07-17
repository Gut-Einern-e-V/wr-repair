import { requireModerator } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const statuses = new Set(["pending", "approved", "rejected"]);

export async function GET(request: Request) {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  if (!statuses.has(status)) {
    return Response.json({ error: "Ungueltiger Statusfilter." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: repairs, error } = await supabase
    .from("repairs")
    .select("id, category, product_name, context, description, repair_succeeded, image_path, consent_publication, status, location_region, moderator_comment, created_at, entry_time")
    .eq("status", status)
    .order("entry_time", { ascending: true })
    .limit(100);

  if (error) {
    return Response.json({ error: "Einreichungen konnten nicht geladen werden." }, { status: 502 });
  }

  const imagePaths = (repairs ?? []).map((repair) => repair.image_path);
  const { data: signedUrls, error: urlError } = imagePaths.length
    ? await supabase.storage.from("repair-images").createSignedUrls(imagePaths, 300)
    : { data: [], error: null };

  if (urlError) {
    return Response.json({ error: "Bilder konnten nicht geladen werden." }, { status: 502 });
  }

  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
  return Response.json({
    repairs: (repairs ?? []).map((repair) => ({
      ...repair,
      imageUrl: urls.get(repair.image_path) ?? null,
    })),
  });
}