import { getAppSettings } from "@/lib/app-settings";
import { defaultPartners } from "@/lib/default-partners";
import { publicRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** Anfragen je Minute und IP-Adresse im Normalbetrieb (Issue #80). */
const PARTNERS_LIMIT_PER_MINUTE = 120;

export async function GET(request: Request) {
  const { publicThrottle } = await getAppSettings();
  const limit = publicRateLimit(request, "partners", publicThrottle, PARTNERS_LIMIT_PER_MINUTE);
  if (!limit.allowed) {
    return Response.json(
      { error: "Zu viele Abfragen. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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
