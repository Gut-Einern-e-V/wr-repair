import { removeRepairImage, requireModerationAccess } from "@/lib/moderation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Das Bild einer Einreichung loeschen, ohne die Einreichung anzutasten
 * (Issue #49).
 *
 * Zwei Anlaesse, ein Handgriff:
 *
 * - Auf einem Foto ist eine Person zu erkennen, die es nicht (mehr)
 *   veroeffentlicht sehen moechte. Fotos werden bewusst nicht verpixelt - wir
 *   wollen die stolzen Reparateur*innen zeigen -, also bleibt als Antwort auf
 *   eine Loeschanfrage nach DSGVO nur, das Bild wirklich zu entfernen.
 * - Die Moderation moechte eine Einreichung freigeben, bei der die Reparatur
 *   stimmt, das Foto aber nicht veroeffentlicht werden soll. "Zulassen, aber
 *   ohne Foto" ist damit ein Schritt vor der Freigabe statt einer eigenen
 *   Entscheidungsart.
 *
 * Die Reparatur selbst zaehlt in beiden Faellen weiter fuer den Rekord. Wer
 * die ganze Zeile loeschen will, nimmt DELETE eine Ebene hoeher.
 */
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

  /* Kein Bild ist kein Fehler der Anfrage, aber auch kein Erfolg: Wuerde hier
     stillschweigend "ok" stehen, bekaeme eine Einreichung ohne Foto den
     Vermerk, ihres sei geloescht worden. */
  if (!repair.image_path) {
    return Response.json({ error: "Zu dieser Einreichung liegt kein Bild vor." }, { status: 409 });
  }

  if (!await removeRepairImage(supabase, repairId, repair.image_path)) {
    return Response.json({ error: "Das Bild konnte nicht aus dem Speicher geloescht werden." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
