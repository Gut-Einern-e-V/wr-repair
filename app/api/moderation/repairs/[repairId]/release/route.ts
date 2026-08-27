import { requireModerationAccess } from "@/lib/moderation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Anspruch auf eine Einreichung zurueckgeben: beim Zurueckstellen, beim
 * Wechsel in die Tabelle und beim Verlassen der Seite (Issue #38). Ohne diesen
 * Weg bliebe die Einreichung bis zum Ablauf der Frist fuer alle anderen
 * unsichtbar.
 */
export async function POST(request: Request, context: { params: Promise<{ repairId: string }> }) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const { repairId } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("repairs")
    .update({ claimed_by: null, claimed_at: null })
    .eq("id", repairId)
    .eq("status", "pending")
    .eq("claimed_by", access.currentAdmin.user.id);

  if (error) {
    return Response.json({ error: "Der Anspruch konnte nicht zurueckgegeben werden." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
