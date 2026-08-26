import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_GALLERY_ITEMS = 6;

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Die Galerie ist noch nicht konfiguriert." }, { status: 503 });
  }

  const { data: repairs, error } = await supabase
    .from("repairs")
    .select("id, category, brand_model, image_alt_text, image_path, created_at")
    .eq("status", "approved")
    .order("moderated_at", { ascending: false })
    .limit(MAX_GALLERY_ITEMS);

  if (error) {
    return Response.json({ error: "Die Galerie konnte nicht geladen werden." }, { status: 502 });
  }

  const imagePaths = (repairs ?? []).filter((r) => r.image_path).map((r) => r.image_path as string);
  const { data: signedUrls, error: urlError } = imagePaths.length
    ? await supabase.storage.from("repair-images").createSignedUrls(imagePaths, 300)
    : { data: [], error: null };

  if (urlError) {
    return Response.json({ error: "Die Galeriebilder konnten nicht geladen werden." }, { status: 502 });
  }

  const urls = new Map((signedUrls ?? []).map((item) => [item.path, item.signedUrl]));
  return Response.json(
    {
      repairs: (repairs ?? []).map((repair) => ({
        id: repair.id,
        category: repair.category,
        productName: repair.brand_model,
        description: null,
        imageAltText: repair.image_alt_text,
        imageUrl: repair.image_path ? (urls.get(repair.image_path) ?? null) : null,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } },
  );
}