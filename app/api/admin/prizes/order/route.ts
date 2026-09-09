import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { isOrderDirection, reorder, type Ordered } from "@/lib/sort-order";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Die Reihenfolge der Preise aendern (Issue #98).
 *
 * Bisher stand dafuer ein Zahlenfeld im Preisformular. Es funktionierte, wenn
 * man sich die Zahlen aller anderen Preise merkte - sonst nicht. Zwei Pfeile
 * je Preis brauchen das nicht.
 *
 * Verschoben wird innerhalb der eigenen Gruppe: Hauptpreise stehen auf der
 * Gewinnspielseite vor den kleinen (`is_main desc, sort_order`), ein Pfeil
 * kann daran nichts aendern. Wer einen Preis ueber die Hauptpreise hinaus
 * heben will, macht ihn zum Hauptpreis.
 */
export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json().catch(() => ({})) as { id?: unknown; direction?: unknown };
  if (typeof body.id !== "string" || !body.id || !isOrderDirection(body.direction)) {
    return Response.json({ error: "Es fehlt, welcher Preis wohin verschoben werden soll." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: moving, error: readError } = await supabase
    .from("lottery_prizes")
    .select("id, is_main")
    .eq("id", body.id)
    .maybeSingle();

  if (readError) return Response.json({ error: "Der Preis konnte nicht gelesen werden." }, { status: 502 });
  if (!moving) return Response.json({ error: "Diesen Preis gibt es nicht (mehr)." }, { status: 404 });

  const { data, error } = await supabase
    .from("lottery_prizes")
    .select("id, sort_order")
    .eq("is_main", moving.is_main)
    .order("sort_order")
    .order("created_at");

  if (error) return Response.json({ error: "Die Preise konnten nicht gelesen werden." }, { status: 502 });

  const changes = reorder((data ?? []) as Ordered[], body.id, body.direction);
  if (!changes) return Response.json({ ok: true, moved: false });

  for (const row of changes) {
    const { error: writeError } = await supabase.from("lottery_prizes").update({ sort_order: row.sort_order }).eq("id", row.id);
    if (writeError) return Response.json({ error: "Die Reihenfolge konnte nicht gespeichert werden." }, { status: 502 });
  }

  // Dieselbe Reihenfolge steht oeffentlich auf /gewinnspiel.
  revalidatePath("/gewinnspiel");
  return Response.json({ ok: true, moved: true });
}
