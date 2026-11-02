import { requireAdmin } from "@/lib/admin-auth";
import { getAppSettings } from "@/lib/app-settings";
import { notifyModerators } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { RECOVERED_TAG, captchaRejectionTags } from "@/lib/submission-tags";

/**
 * Eine abgebrochene Einreichung in die Moderation holen (Issue #167).
 *
 * Bis hierhin stand eine verlorene Reparatur nur im Systemstatus und musste
 * von Hand abgetippt werden. Jetzt wird aus der Zeile eine offene Einreichung
 * mit dem Tag `nachgetragen` - und bei einer Captcha-Absage zusaetzlich mit
 * dem Doppel-Hinweis, denn genau dort ist die Reparatur oft doch schon da.
 *
 * Bewusst in die Moderation und nicht gleich freigegeben wie die Strichlisten:
 * Eingetragen hat sie nicht das Team, sondern jemand von aussen, und ob es
 * dieselbe Reparatur schon gibt, entscheidet erst der Vergleich dort.
 *
 * Gezaehlt wird am Tag der ersten Einreichung, nicht am Tag der Uebernahme.
 */
export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return Response.json({ error: authorization.error }, { status: authorization.status });

  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string" || !body.id) {
    return Response.json({ error: "Keine abgebrochene Einreichung angegeben." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: row, error: rowError } = await supabase
    .from("abandoned_submissions")
    .select("id, created_at, attempts, stage, reason, detail, client_key, kreis, origin_source, category, brand_model, duration_minutes, item_value_euros, performed_by, story, has_image, wants_lottery")
    .eq("id", body.id)
    .maybeSingle();

  if (rowError) return Response.json({ error: "Die abgebrochene Einreichung konnte nicht gelesen werden." }, { status: 502 });
  if (!row) return Response.json({ error: "Diese abgebrochene Einreichung gibt es nicht mehr." }, { status: 404 });
  if (!row.category) return Response.json({ error: "Ohne Kategorie lässt sich die Einreichung nicht übernehmen." }, { status: 400 });

  const settings = await getAppSettings();
  const tags = [
    RECOVERED_TAG,
    ...(row.reason === "captcha_invalid" ? captchaRejectionTags(row.detail) : []),
  ];
  // Was fehlt, steht im Kommentar - die Moderation soll nicht raten muessen,
  // warum es kein Foto gibt und wo das Los geblieben ist.
  const notes = [
    `Nachgetragen aus abgebrochener Einreichung (${row.reason}${row.detail ? `: ${row.detail}` : ""}, ${row.attempts} ${row.attempts === 1 ? "Versuch" : "Versuche"}).`,
    row.has_image ? "Das Foto wurde nicht gespeichert." : null,
    row.wants_lottery ? "Wollte am Gewinnspiel teilnehmen; Name und Mail sind nicht gespeichert." : null,
    "Ob die Reparatur gelungen ist, wurde nicht aufgehoben.",
  ].filter(Boolean).join(" ");

  const repairId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("repairs").insert({
    id: repairId,
    // Derselbe Schluessel wie der Sendevorgang: Eine zweite Uebernahme
    // scheitert damit am eindeutigen Index, und der Systemstatus blendet die
    // Zeile als angekommen aus.
    ...(row.client_key ? { client_key: row.client_key } : {}),
    category: row.category,
    brand_model: row.brand_model,
    duration_minutes: row.duration_minutes,
    item_value_euros: row.item_value_euros,
    performed_by: row.performed_by,
    story: row.story,
    // Die Tabelle haelt das Feld nicht fest; das Formular steht von sich aus
    // auf "gelungen". Der Kommentar sagt es, die Metadaten lassen es aendern.
    repair_succeeded: true,
    tags,
    image_path: null,
    // Ohne Zustimmung haette das Formular nicht abgeschickt.
    consent_publication: true,
    location_region: row.kreis ? settings.region.label : null,
    kreis: row.kreis,
    origin_source: row.origin_source,
    moderator_comment: notes,
    created_at: row.created_at,
    entry_time: row.created_at,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      await supabase.from("abandoned_submissions").delete().eq("id", row.id);
      return Response.json({ error: "Dieser Sendevorgang ist schon als Reparatur gespeichert." }, { status: 409 });
    }
    return Response.json({ error: "Die Einreichung konnte nicht übernommen werden." }, { status: 502 });
  }

  // Die Zeile hat ihren Zweck erfuellt. Ohne `client_key` bliebe sie sonst
  // stehen und liesse sich ein zweites Mal uebernehmen.
  await supabase.from("abandoned_submissions").delete().eq("id", row.id);

  try {
    const { count } = await supabase.from("repairs").select("id", { count: "exact", head: true }).eq("status", "pending");
    await notifyModerators({ title: "Neue Eintragung", count: count ?? 1, url: "/moderator" });
  } catch {
    // Die Uebernahme steht; eine fehlende Benachrichtigung aendert daran nichts.
  }

  return Response.json({ id: repairId }, { status: 201 });
}
