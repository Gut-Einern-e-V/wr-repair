import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isRepairId } from "@/lib/share";

export type PublicRepairStatus = {
  id: string;
  status: "pending" | "approved" | "rejected";
  category: string;
  productName: string | null;
  story: string | null;
  repairSucceeded: boolean;
  imageUrl: string | null;
};

/**
 * Oeffentlicher Statusblick auf eine Einreichung. Vor der Freigabe werden nur
 * Kategorie und Status gezeigt, damit ueber die Seite keine unmoderierten
 * Inhalte oder personenbezogenen Daten oeffentlich werden.
 */
export async function getPublicRepairStatus(repairId: string): Promise<PublicRepairStatus | null> {
  if (!isRepairId(repairId)) {
    return null;
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return null;
  }

  const { data: repair, error } = await supabase
    .from("repairs")
    .select("id, category, brand_model, story, repair_succeeded, image_path, status")
    .eq("id", repairId)
    .maybeSingle();

  if (error || !repair) {
    return null;
  }

  const isApproved = repair.status === "approved";
  let imageUrl: string | null = null;

  if (isApproved && repair.image_path) {
    const { data: signed } = await supabase.storage
      .from("repair-images")
      .createSignedUrl(repair.image_path, 300);
    imageUrl = signed?.signedUrl ?? null;
  }

  return {
    id: repair.id,
    status: repair.status,
    category: repair.category,
    productName: isApproved ? repair.brand_model : null,
    story: isApproved ? repair.story : null,
    repairSucceeded: repair.repair_succeeded,
    imageUrl,
  };
}
