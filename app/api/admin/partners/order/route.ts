import { requireAdmin } from "@/lib/admin-auth";
import { isOrderDirection, reorder, type Ordered } from "@/lib/sort-order";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Die Reihenfolge der Unterstuetzer aendern (Issue #98).
 *
 * Die Spalte `sort_order` gab es von Anfang an, ein Feld dafuer nicht: Wer die
 * Logos auf /supporters in eine bestimmte Ordnung bringen wollte, konnte es
 * nur ueber die Datenbank. Hier verschiebt ein Aufruf einen Eintrag um eine
 * Position, und die Liste wird dabei neu durchnummeriert - noetig, weil alle
 * Zeilen mit derselben Null anfangen (siehe lib/sort-order.ts).
 */
export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json().catch(() => ({})) as { id?: unknown; direction?: unknown };
  if (typeof body.id !== "string" || !body.id || !isOrderDirection(body.direction)) {
    return Response.json({ error: "Es fehlt, welcher Partner wohin verschoben werden soll." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, sort_order")
    .order("sort_order")
    .order("created_at");

  if (error) return Response.json({ error: "Die Partner konnten nicht gelesen werden." }, { status: 502 });

  const changes = reorder((data ?? []) as Ordered[], body.id, body.direction);
  // Schon am Rand der Liste: kein Fehler, nur nichts zu tun.
  if (!changes) return Response.json({ ok: true, moved: false });

  for (const row of changes) {
    const { error: writeError } = await supabase.from("partners").update({ sort_order: row.sort_order }).eq("id", row.id);
    if (writeError) return Response.json({ error: "Die Reihenfolge konnte nicht gespeichert werden." }, { status: 502 });
  }

  return Response.json({ ok: true, moved: true });
}
