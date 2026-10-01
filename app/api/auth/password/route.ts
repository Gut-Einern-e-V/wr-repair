import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { mustChangePassword, passwordProblem, withMustChangePassword } from "@/lib/password-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

/* Prueft das bisherige Passwort mit einem eigenen Client ohne Sitzung: Ein
   erfolgreicher Login darf hier keine Cookies anfassen, er dient nur als
   Nachweis. */
async function passwordMatches(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return false;

  const client = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Eigenes Passwort aendern - fuer alle Backend-Konten, ohne Mail.
 *
 * Wer gerade mit einem temporaeren Passwort hereingekommen ist, hat es eben
 * erst eingegeben und muss es nicht noch einmal nennen. Sonst ist das bisherige
 * Passwort Pflicht, damit ein offen gelassenes Geraet nicht reicht, um das
 * Konto zu uebernehmen.
 *
 * Geschrieben wird mit dem Service-Schluessel, weil nur der die Markierung in
 * den `app_metadata` loeschen kann (siehe lib/password-policy.ts).
 */
export async function POST(request: Request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return errorResponse("Nicht angemeldet.", 401);
  }

  if (!currentAdmin.roles.length) {
    return errorResponse("Dieses Konto hat keine Backend-Rolle.", 403);
  }

  const body = await request.json().catch(() => ({})) as { currentPassword?: string; password?: string; repeat?: string };
  const password = String(body.password ?? "");
  const problem = passwordProblem(password, String(body.repeat ?? ""));
  if (problem) {
    return errorResponse(problem, 400);
  }

  const { user } = currentAdmin;
  const forced = mustChangePassword(user);

  if (!forced) {
    const currentPassword = String(body.currentPassword ?? "");
    if (!currentPassword || !user.email || !(await passwordMatches(user.email, currentPassword))) {
      return errorResponse("Das bisherige Passwort stimmt nicht.", 400);
    }
    if (currentPassword === password) {
      return errorResponse("Das neue Passwort muss sich vom bisherigen unterscheiden.", 400);
    }
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: withMustChangePassword(user.app_metadata, false),
  });

  if (error) {
    return errorResponse("Das Passwort konnte nicht geändert werden.", 502);
  }

  return Response.json({ ok: true });
}
