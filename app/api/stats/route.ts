import { createSupabaseAdminClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1_000;

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Der Statistikdienst ist noch nicht konfiguriert." }, { status: 503 });
  }

  const { count, error: countError } = await supabase
    .from("repairs")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  if (countError) {
    return Response.json({ error: "Die Statistik konnte nicht geladen werden." }, { status: 502 });
  }

  const categories: Record<string, number> = {};
  const total = count ?? 0;

  for (let start = 0; start < total; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("repairs")
      .select("category")
      .eq("status", "approved")
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      return Response.json({ error: "Die Statistik konnte nicht geladen werden." }, { status: 502 });
    }

    for (const repair of data ?? []) {
      categories[repair.category] = (categories[repair.category] ?? 0) + 1;
    }
  }

  return Response.json(
    { total, categories },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
  );
}