import { removeRepairImage, requireModerationAccess } from "@/lib/moderation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { repairCategoryValues } from "@/lib/repair-catalog";

const statuses = new Set(["approved", "rejected"]);

/**
 * Zusaetzlich fuer Admins und Superadmins: eine bereits entschiedene
 * Einreichung wieder oeffnen oder umentscheiden (Issue #58).
 *
 * Eine Ablehnung ist damit keine Sackgasse mehr. Wer sich beschwert, kann
 * wieder eingesetzt werden - das Bild ist dann zwar geloescht, die Reparatur
 * zaehlt aber trotzdem. Fuer Moderator*innen bleibt es bei der einen
 * Entscheidung: Sonst haette jede Ablehnung eine offene Gegentuer.
 */
const adminStatuses = new Set(["approved", "rejected", "pending"]);
const categoriesSet = new Set(repairCategoryValues as string[]);
const validPerformedBy = new Set(["alone", "with_support", "by_someone"]);

type Metadata = {
  category?: string;
  imageAltText?: string;
  tags?: string[];
  brandModel?: string;
  durationMinutes?: string;
  itemValueEuros?: string;
  performedBy?: string;
  story?: string;
  repairSucceeded?: boolean;
};

function isOptionalString(value: unknown, maxLength: number, allowEmpty = true) {
  return value === undefined || (typeof value === "string" && value.trim().length <= maxLength && (allowEmpty || Boolean(value.trim())));
}

/** Optionales numerisches Freitextfeld, wie es aus einem `<input type="number">` kommt. */
function isOptionalNumericString(value: unknown, min: number, max: number) {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  if (value.trim() === "") return true;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

export async function DELETE(request: Request, context: { params: Promise<{ repairId: string }> }) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const { repairId } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("id, image_path")
    .eq("id", repairId)
    .single();

  if (repairError || !repair) {
    return Response.json({ error: "Einreichung nicht gefunden." }, { status: 404 });
  }

  if (repair.image_path) {
    await supabase.storage.from("repair-images").remove([repair.image_path]);
  }

  const { error: deleteError } = await supabase.from("repairs").delete().eq("id", repairId);
  if (deleteError) {
    return Response.json({ error: "Einreichung konnte nicht geloescht werden." }, { status: 502 });
  }

  return Response.json({ ok: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ repairId: string }> }) {
  const access = await requireModerationAccess();
  if (!access.ok) {
    return access.response;
  }

  const { repairId } = await context.params;
  const body = await request.json() as { status?: string; moderatorComment?: string; metadata?: Metadata; deleteImage?: boolean };
  const moderatorComment = typeof body.moderatorComment === "string" ? body.moderatorComment.trim() : "";

  const allowedStatuses = access.isAdmin ? adminStatuses : statuses;
  if (body.status !== undefined && (!allowedStatuses.has(body.status) || !isOptionalString(body.moderatorComment, 1000))) {
    return Response.json({ error: "Ungueltige Moderationsdaten." }, { status: 400 });
  }

  if (!body.status && !body.metadata) {
    return Response.json({ error: "Keine Aenderung angegeben." }, { status: 400 });
  }

  /* Freigeben und dabei das Foto loeschen - ein Handgriff statt zwei
     (Issue #49). Nur mit einer Freigabe zusammen sinnvoll: Ohne Entscheidung
     ist es die reine Loeschung, und die hat eine eigene Route. */
  if (body.deleteImage !== undefined && (typeof body.deleteImage !== "boolean" || (body.deleteImage && body.status !== "approved"))) {
    return Response.json({ error: "Das Foto laesst sich nur zusammen mit einer Freigabe loeschen." }, { status: 400 });
  }

  const metadata = body.metadata;
  if (metadata !== undefined && (typeof metadata !== "object" || Array.isArray(metadata))) {
    return Response.json({ error: "Ungueltige Metadaten." }, { status: 400 });
  }

  if (metadata && (
    (metadata.category !== undefined && (typeof metadata.category !== "string" || !categoriesSet.has(metadata.category)))
    || !isOptionalString(metadata.imageAltText, 250)
    || (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.length > 12 || metadata.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 40)))
    || !isOptionalString(metadata.brandModel, 200)
    || !isOptionalNumericString(metadata.durationMinutes, 1, 9999)
    || !isOptionalNumericString(metadata.itemValueEuros, 0, 999_999)
    || (metadata.performedBy !== undefined && (typeof metadata.performedBy !== "string" || (metadata.performedBy !== "" && !validPerformedBy.has(metadata.performedBy))))
    || !isOptionalString(metadata.story, 2000)
    || (metadata.repairSucceeded !== undefined && typeof metadata.repairSucceeded !== "boolean")
  )) {
    return Response.json({ error: "Ungueltige Metadaten." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: repair, error: repairError } = await supabase
    .from("repairs")
    .select("id, image_path, consent_publication, status")
    .eq("id", repairId)
    .single();

  if (repairError || !repair) {
    return Response.json({ error: "Einreichung nicht gefunden." }, { status: 404 });
  }

  /* Moderator*innen entscheiden nur ueber Offenes; Admins duerfen auch eine
     getroffene Entscheidung wieder aufmachen. */
  if (body.status && repair.status !== "pending" && !access.isAdmin) {
    return Response.json({ error: decidedElsewhere(repair.status) }, { status: 409 });
  }

  if (body.status && body.status === repair.status) {
    return Response.json({ error: "Diese Einreichung steht bereits auf diesem Stand." }, { status: 409 });
  }

  if (body.status === "approved" && !repair.consent_publication) {
    return Response.json({ error: "Ohne Veroeffentlichungszustimmung kann die Einreichung nicht freigegeben werden." }, { status: 400 });
  }

  /* Das Bild geht vor der Freigabe, nicht danach: Wuerde erst freigegeben und
     dann geloescht, waere es fuer die Dauer der zweiten Anfrage oeffentlich -
     also genau das, was dieser Weg verhindern soll. Scheitert die Freigabe
     danach an einem Rennen, ist das Foto trotzdem weg; das ist die richtige
     Richtung, denn wer zuerst entschieden hat, hat es entweder freigegeben
     (dann sollte es weg sein) oder abgelehnt (dann waere es ohnehin
     geloescht worden). */
  if (body.deleteImage && repair.image_path && !await removeRepairImage(supabase, repairId, repair.image_path)) {
    return Response.json({ error: "Das Bild konnte nicht aus dem Speicher geloescht werden. Die Einreichung bleibt offen." }, { status: 502 });
  }

  if (metadata) {
    const { error: metadataError } = await supabase
      .from("repairs")
      .update({
        ...(metadata.category !== undefined ? { category: metadata.category } : {}),
        ...(metadata.imageAltText !== undefined ? { image_alt_text: metadata.imageAltText.trim() || null } : {}),
        ...(metadata.tags !== undefined ? { tags: metadata.tags.map((tag) => tag.trim()).filter(Boolean) } : {}),
        ...(metadata.brandModel !== undefined ? { brand_model: metadata.brandModel.trim() || null } : {}),
        ...(metadata.durationMinutes !== undefined
          ? { duration_minutes: metadata.durationMinutes.trim() ? Number.parseFloat(metadata.durationMinutes) : null }
          : {}),
        ...(metadata.itemValueEuros !== undefined
          ? { item_value_euros: metadata.itemValueEuros.trim() ? Number.parseFloat(metadata.itemValueEuros) : null }
          : {}),
        ...(metadata.performedBy !== undefined ? { performed_by: metadata.performedBy || null } : {}),
        ...(metadata.story !== undefined ? { story: metadata.story.trim() || null } : {}),
        ...(metadata.repairSucceeded !== undefined ? { repair_succeeded: metadata.repairSucceeded } : {}),
      })
      .eq("id", repairId);

    if (metadataError) {
      return Response.json({ error: "Die Metadaten konnten nicht gespeichert werden." }, { status: 502 });
    }
  }

  if (!body.status) {
    return Response.json({ ok: true });
  }

  // Die Bedingung auf den zuvor gelesenen Stand entscheidet das Rennen zweier
  // gleichzeitiger Sitzungen: Nur die erste Entscheidung aendert eine Zeile,
  // die zweite bekommt 409 statt die erste zu ueberschreiben (Issue #38).
  // Mit der Entscheidung faellt auch der Anspruch.
  const { data: decided, error: updateError } = await supabase
    .from("repairs")
    .update({
      status: body.status,
      moderator_comment: moderatorComment || null,
      /* Auch beim Zurueckholen fortgeschrieben: Wer eine Einreichung wieder
         geoeffnet hat, ist der letzte Stand der Bearbeitung. Die Pruefspalten
         verlangen die beiden Angaben ohnehin, sobald wieder entschieden wird. */
      moderated_by: access.currentAdmin.user.id,
      moderated_at: new Date().toISOString(),
      claimed_by: null,
      claimed_at: null,
    })
    .eq("id", repairId)
    .eq("status", repair.status)
    .select("id");

  if (updateError) {
    return Response.json({ error: "Moderationsentscheidung konnte nicht gespeichert werden." }, { status: 502 });
  }

  if (!decided?.length) {
    const { data: current } = await supabase.from("repairs").select("status").eq("id", repairId).single();
    return Response.json({ error: decidedElsewhere(current?.status ?? "") }, { status: 409 });
  }

  if (body.status === "rejected" && !body.deleteImage && repair.image_path && !await removeRepairImage(supabase, repairId, repair.image_path)) {
    return Response.json({ ok: true, imageDeleted: false });
  }

  return Response.json({ ok: true, imageDeleted: true });
}

function decidedElsewhere(status: string) {
  const decision = status === "approved" ? "freigegeben" : status === "rejected" ? "abgelehnt" : "entschieden";
  return `Diese Einreichung hat inzwischen jemand anderes ${decision}.`;
}
