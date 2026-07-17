import { defaultPartners } from "@/lib/default-partners";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("partners")
      .select("id, name, website_url, logo_path")
      .order("sort_order")
      .order("created_at");

    if (error || !data?.length) {
      return Response.json({ partners: defaultPartners });
    }

    return Response.json({
      partners: data.filter((partner) => partner.logo_path).map((partner) => ({
        id: partner.id,
        name: partner.name,
        websiteUrl: partner.website_url,
        logoUrl: supabase.storage.from("partner-logos").getPublicUrl(partner.logo_path!).data.publicUrl,
      })),
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } });
  } catch {
    return Response.json({ partners: defaultPartners });
  }
}
