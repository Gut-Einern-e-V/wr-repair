import { isRepairId } from "@/lib/share";
import { loadHighlights } from "@/lib/story-highlights-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireHighlightAccess } from "./access";

/** Alle Highlights im Eimer, mit Reparatur und Foto. */
export async function GET() {
  const access = await requireHighlightAccess();
  if (!access.ok) return access.response;

  const { highlights, error } = await loadHighlights(createSupabaseAdminClient(), { signSeconds: 900 });
  if (error) return Response.json({ error: "Highlights konnten nicht geladen werden." }, { status: 502 });

  return Response.json({ highlights });
}

/**
 * Eine freigegebene Reparatur in den Highlight-Eimer legen.
 *
 * Nur mit Zustimmung zur Veroeffentlichung - ohne sie darf die Geschichte
 * weder auf die Buehne noch auf die Seite. Die Geschichte wird als
 * Ausgangsfassung uebernommen, damit das Glaetten am Original ansetzt.
 */
export async function POST(request: Request) {
  const access = await requireHighlightAccess();
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null) as { repairId?: unknown } | null;
  const repairId = typeof body?.repairId === "string" ? body.repairId : "";
  if (!isRepairId(repairId)) return Response.json({ error: "Ungültige Reparatur." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: repair } = await supabase
    .from("repairs")
    .select("id, status, consent_publication, story")
    .eq("id", repairId)
    .maybeSingle();

  if (!repair) return Response.json({ error: "Reparatur nicht gefunden." }, { status: 404 });
  if (repair.status !== "approved") return Response.json({ error: "Nur freigegebene Reparaturen können Highlights werden." }, { status: 409 });
  if (!repair.consent_publication) return Response.json({ error: "Ohne Zustimmung zur Veröffentlichung geht das nicht." }, { status: 409 });

  const { data: last } = await supabase.from("story_highlights").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("story_highlights").insert({
    repair_id: repairId,
    body: (repair.story ?? "").trim().slice(0, 6000),
    sort_order: (last?.sort_order ?? 0) + 10,
    created_by: access.currentAdmin.user.id,
    updated_by: access.currentAdmin.user.id,
  });

  if (error) {
    return error.code === "23505"
      ? Response.json({ error: "Diese Reparatur ist schon im Eimer." }, { status: 409 })
      : Response.json({ error: "Das Highlight konnte nicht angelegt werden." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
