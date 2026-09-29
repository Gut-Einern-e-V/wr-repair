import { unstable_cache } from "next/cache";
import { defaultPartners, type Partner } from "./default-partners";
import { createSupabaseAdminClient } from "./supabase/server";

export const PARTNERS_TAG = "partners";

const readPartners = unstable_cache(
  async (): Promise<Partner[]> => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("partners")
      .select("id, name, website_url, logo_path")
      .order("sort_order")
      .order("created_at");

    /* Ein Fehler wird geworfen statt in die Voreinstellung verwandelt: So
       landet er nicht im Cache, und die naechste Anfrage versucht es neu. */
    if (error) throw error;

    const partners = (data ?? []).filter((partner) => partner.logo_path).map((partner) => ({
      id: partner.id,
      name: partner.name,
      websiteUrl: partner.website_url,
      logoUrl: supabase.storage.from("partner-logos").getPublicUrl(partner.logo_path!).data.publicUrl,
    }));
    return partners.length ? partners : defaultPartners;
  },
  ["partners"],
  { revalidate: 300, tags: [PARTNERS_TAG] },
);

/**
 * Die Unterstuetzenden in der Reihenfolge aus dem Admin-Backend.
 *
 * Seit die Logos in jedem Footer stehen, wird die Liste auf dem Server geholt
 * und mit dem HTML ausgeliefert - vorher lud jede Logowand sie im Browser nach.
 * Aenderungen im Backend invalidieren den Cache per `revalidateTag(PARTNERS_TAG)`
 * sofort, spaetestens greift die Frist.
 */
export async function getPartners(): Promise<Partner[]> {
  try {
    return await readPartners();
  } catch {
    return defaultPartners;
  }
}
