import { requireSuperadmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("lottery_entries")
    .select("id, repair_id, name, email, winner, drawn_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Die Verlosungseintraege konnten nicht geladen werden." }, { status: 502 });
  }

  return Response.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json() as { action?: unknown };
  if (body.action !== "draw") {
    return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: eligible, error: listError } = await supabase
    .from("lottery_entries")
    .select("id")
    .eq("winner", false);

  if (listError) {
    return Response.json({ error: "Verlosung konnte nicht gestartet werden." }, { status: 502 });
  }

  if (!eligible || eligible.length === 0) {
    return Response.json({ error: "Fuer die Verlosung liegt keine Anmeldung vor." }, { status: 409 });
  }

  const winner = eligible[Math.floor(Math.random() * eligible.length)];

  const { error: updateError } = await supabase
    .from("lottery_entries")
    .update({ winner: true, drawn_at: new Date().toISOString() })
    .eq("id", winner.id);

  if (updateError) {
    return Response.json({ error: "Gewinner konnte nicht gespeichert werden." }, { status: 502 });
  }

  const { data: winnerData, error: fetchError } = await supabase
    .from("lottery_entries")
    .select("id, repair_id, name, email, drawn_at")
    .eq("id", winner.id)
    .single();

  if (fetchError) {
    return Response.json({ error: "Gewinnerdaten konnten nicht geladen werden." }, { status: 502 });
  }

  return Response.json({ winner: winnerData });
}
