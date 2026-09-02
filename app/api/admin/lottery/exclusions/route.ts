import { requireSuperadmin } from "@/lib/admin-auth";
import { normalizeEmail } from "@/lib/lottery";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Die Ausschlussliste des Gewinnspiels (Issue #45).
 *
 * Das Projektteam und alle, die an der Durchfuehrung mitwirken, koennen nicht
 * gewinnen - so steht es in den Teilnahmebedingungen. Ohne eine Liste muesste
 * das bei jeder Ziehung jemand im Kopf haben; mit ihr faellt es vor dem Zug
 * auf und nicht danach.
 */

/**
 * Entweder eine ganze Adresse oder eine mit `@` beginnende Domain. Bewusst
 * keine Platzhalter: Eine Regel, die niemand mehr liest, schliesst am Ende
 * die Falschen aus.
 */
function validPattern(value: string) {
  if (value.startsWith("@")) return /^@[^@\s]+\.[^@\s]+$/.test(value);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export async function POST(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const body = await request.json() as { pattern?: unknown; note?: unknown };
  const pattern = normalizeEmail(typeof body.pattern === "string" ? body.pattern : "");
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!validPattern(pattern)) {
    return Response.json(
      { error: "Trage eine ganze Adresse ein (anna@example.org) oder eine Domain mit fuehrendem @ (@example.org)." },
      { status: 400 },
    );
  }
  if (note.length > 200) {
    return Response.json({ error: "Die Notiz darf hoechstens 200 Zeichen haben." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("lottery_exclusions").insert({ pattern, note: note || null });

  if (error) {
    // 23505 ist der eindeutige Index auf `pattern`.
    if (error.code === "23505") {
      return Response.json({ error: `${pattern} steht schon auf der Liste.` }, { status: 409 });
    }
    return Response.json({ error: "Der Ausschluss konnte nicht gespeichert werden. Wurde die Migration ausgefuehrt?" }, { status: 502 });
  }

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return Response.json({ error: authorization.error }, { status: authorization.status });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Es fehlt, welcher Ausschluss gemeint ist." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("lottery_exclusions").delete().eq("id", id);
  if (error) return Response.json({ error: "Der Ausschluss konnte nicht entfernt werden." }, { status: 502 });

  return Response.json({ ok: true });
}
