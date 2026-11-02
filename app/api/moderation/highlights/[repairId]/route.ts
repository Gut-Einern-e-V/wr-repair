import { revalidatePath } from "next/cache";
import { isRepairId } from "@/lib/share";
import { highlightColumns, missingForStatus, parseHighlightUpdate, type HighlightRow } from "@/lib/story-highlights";
import { copyImageForPublication, removePublishedImage } from "@/lib/story-highlights-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireHighlightAccess } from "../access";

type Context = { params: Promise<{ repairId: string }> };

/* Ueberall, wo Geschichten stehen: Startseite, Uebersicht, Einzelseiten, Sitemap. */
function revalidateStories() {
  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath("/stories/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

/**
 * Text, Reihenfolge oder Stufe eines Highlights aendern.
 *
 * Der Wechsel nach `published` kopiert das Foto in den oeffentlichen Bucket;
 * der Wechsel weg davon nimmt die Kopie wieder heraus. /stories wird in beiden
 * Faellen neu aufgebaut.
 */
export async function PATCH(request: Request, context: Context) {
  const access = await requireHighlightAccess();
  if (!access.ok) return access.response;

  const { repairId } = await context.params;
  if (!isRepairId(repairId)) return Response.json({ error: "Ungültige Reparatur." }, { status: 400 });

  const parsed = parseHighlightUpdate(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: currentData } = await supabase.from("story_highlights").select(highlightColumns).eq("repair_id", repairId).maybeSingle();
  const current = currentData as unknown as HighlightRow | null;
  if (!current) return Response.json({ error: "Highlight nicht gefunden." }, { status: 404 });

  const { update } = parsed;
  const next = {
    status: update.status ?? current.status,
    title: update.title ?? current.title,
    teaser: update.teaser ?? current.teaser,
    body: update.body ?? current.body,
  };

  const missing = missingForStatus(next.status, next);
  if (missing.length) {
    return Response.json({ error: `Dafür fehlt noch: ${missing.join(", ")}.` }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    ...next,
    ...(update.note !== undefined ? { note: update.note } : {}),
    ...(update.sortOrder !== undefined ? { sort_order: update.sortOrder } : {}),
    updated_by: access.currentAdmin.user.id,
    updated_at: new Date().toISOString(),
  };

  const publishing = next.status === "published" && current.status !== "published";
  const unpublishing = next.status !== "published" && current.status === "published";

  if (publishing) {
    const { data: repair } = await supabase.from("repairs").select("image_path, consent_publication, status").eq("id", repairId).maybeSingle();
    if (!repair || repair.status !== "approved" || !repair.consent_publication) {
      return Response.json({ error: "Die Reparatur ist nicht (mehr) zur Veröffentlichung freigegeben." }, { status: 409 });
    }
    try {
      const image = await copyImageForPublication(supabase, repairId, repair.image_path);
      Object.assign(row, {
        public_image_path: image.path,
        public_image_width: image.width,
        public_image_height: image.height,
        published_at: new Date().toISOString(),
      });
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 502 });
    }
  }

  if (unpublishing) {
    await removePublishedImage(supabase, current.public_image_path);
    Object.assign(row, { public_image_path: null, public_image_width: null, public_image_height: null, published_at: null });
  }

  const { error } = await supabase.from("story_highlights").update(row).eq("repair_id", repairId);
  if (error) return Response.json({ error: "Das Highlight konnte nicht gespeichert werden." }, { status: 502 });

  if (publishing || unpublishing || current.status === "published") {
    revalidateStories();
  }

  return Response.json({ ok: true });
}

/** Aus dem Eimer nehmen. Die Reparatur selbst bleibt, eine oeffentliche Bildkopie verschwindet. */
export async function DELETE(_request: Request, context: Context) {
  const access = await requireHighlightAccess();
  if (!access.ok) return access.response;

  const { repairId } = await context.params;
  if (!isRepairId(repairId)) return Response.json({ error: "Ungültige Reparatur." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("story_highlights").select("status, public_image_path").eq("repair_id", repairId).maybeSingle();
  if (!data) return Response.json({ ok: true });

  await removePublishedImage(supabase, data.public_image_path);
  const { error } = await supabase.from("story_highlights").delete().eq("repair_id", repairId);
  if (error) return Response.json({ error: "Das Highlight konnte nicht entfernt werden." }, { status: 502 });

  if (data.status === "published") revalidateStories();
  return Response.json({ ok: true });
}
