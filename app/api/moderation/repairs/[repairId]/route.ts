import { requireModerator } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const statuses = new Set(["approved", "rejected"]);

export async function PATCH(request: Request, context: RouteContext<"/api/moderation/repairs/[repairId]">) {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const { repairId } = await context.params;
  const body = await request.json() as { status?: string; moderatorComment?: string };
  const moderatorComment = body.moderatorComment?.trim() ?? "";

  if (!body.status || !statuses.has(body.status) || moderatorComment.length > 1000) {
    return Response.json({ error: "Ungueltige Moderationsdaten." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("id, image_path, consent_publication")
    .eq("id", repairId)
    .single();

  if (repairError || !repair) {
    return Response.json({ error: "Einreichung nicht gefunden." }, { status: 404 });
  }

  if (body.status === "approved" && !repair.consent_publication) {
    return Response.json({ error: "Ohne Veroeffentlichungszustimmung kann die Einreichung nicht freigegeben werden." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("repairs")
    .update({
      status: body.status,
      moderator_comment: moderatorComment || null,
      moderated_by: authorization.currentAdmin.user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", repairId);

  if (updateError) {
    return Response.json({ error: "Moderationsentscheidung konnte nicht gespeichert werden." }, { status: 502 });
  }

  if (body.status === "rejected") {
    const { error: storageError } = await supabase.storage.from("repair-images").remove([repair.image_path]);
    if (storageError) {
      return Response.json({ ok: true, imageDeleted: false });
    }
  }

  return Response.json({ ok: true, imageDeleted: true });
}