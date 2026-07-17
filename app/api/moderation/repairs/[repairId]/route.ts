import { requireModerator } from "@/lib/admin-auth";
import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const statuses = new Set(["approved", "rejected"]);
const categories = new Set([
  "electrical_appliances",
  "household_appliances",
  "computers_and_communication",
  "bicycles",
  "furniture",
  "textiles_and_clothing",
  "tools",
  "toys_and_leisure",
  "other",
]);

type Metadata = {
  category?: string;
  productName?: string;
  description?: string;
  imageAltText?: string;
  tags?: string[];
};

function isOptionalString(value: unknown, maxLength: number, allowEmpty = true) {
  return value === undefined || (typeof value === "string" && value.trim().length <= maxLength && (allowEmpty || Boolean(value.trim())));
}

export async function PATCH(request: Request, context: { params: Promise<{ repairId: string }> }) {
  const authorization = await requireModerator();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  if (!authorization.currentAdmin.roles.includes("superadmin") && (await getConfiguredSubmissionWindow()).status !== "open") {
    return Response.json({ error: "Moderation ist nur waehrend des Einreichungszeitraums moeglich." }, { status: 403 });
  }

  const { repairId } = await context.params;
  const body = await request.json() as { status?: string; moderatorComment?: string; metadata?: Metadata };
  const moderatorComment = typeof body.moderatorComment === "string" ? body.moderatorComment.trim() : "";

  if (body.status !== undefined && (!statuses.has(body.status) || !isOptionalString(body.moderatorComment, 1000))) {
    return Response.json({ error: "Ungueltige Moderationsdaten." }, { status: 400 });
  }

  if (!body.status && !body.metadata) {
    return Response.json({ error: "Keine Aenderung angegeben." }, { status: 400 });
  }

  const metadata = body.metadata;
  if (metadata !== undefined && (typeof metadata !== "object" || Array.isArray(metadata))) {
    return Response.json({ error: "Ungueltige Metadaten." }, { status: 400 });
  }

  if (metadata && (
    (metadata.category !== undefined && (typeof metadata.category !== "string" || !categories.has(metadata.category)))
    || !isOptionalString(metadata.productName, 120)
    || !isOptionalString(metadata.description, 2_000, false)
    || !isOptionalString(metadata.imageAltText, 250)
    || (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.length > 12 || metadata.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 40)))
  )) {
    return Response.json({ error: "Ungueltige Metadaten." }, { status: 400 });
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

  if (metadata) {
    const { error: metadataError } = await supabase
      .from("repairs")
      .update({
        ...(metadata.category !== undefined ? { category: metadata.category } : {}),
        ...(metadata.productName !== undefined ? { product_name: metadata.productName.trim() || null } : {}),
        ...(metadata.description !== undefined ? { description: metadata.description.trim() } : {}),
        ...(metadata.imageAltText !== undefined ? { image_alt_text: metadata.imageAltText.trim() || null } : {}),
        ...(metadata.tags !== undefined ? { tags: metadata.tags.map((tag) => tag.trim()).filter(Boolean) } : {}),
      })
      .eq("id", repairId);

    if (metadataError) {
      return Response.json({ error: "Die Metadaten konnten nicht gespeichert werden." }, { status: 502 });
    }
  }

  if (!body.status) {
    return Response.json({ ok: true });
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