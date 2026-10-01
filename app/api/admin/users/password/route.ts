import { requireAdmin } from "@/lib/admin-auth";
import { generateTemporaryPassword, withMustChangePassword } from "@/lib/password-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

/**
 * Passwort vergessen, ohne Mailversand: Eine Admin-Person setzt ein neues
 * temporaeres Passwort und gibt es persoenlich weiter. Beim naechsten Login
 * muss die Person ein eigenes waehlen.
 *
 * Das Passwort erzeugt der Server und gibt es genau einmal zurueck. So taucht
 * es weder in einem Formularfeld noch im Browserverlauf auf, und niemand
 * denkt sich ein schwaches aus.
 *
 * Rechte wie beim Rollenwechsel: Admins setzen nur Moderationskonten zurueck,
 * sonst koennten sie ein Admin- oder Superadmin-Konto uebernehmen. Das eigene
 * Konto aendert man auf der Passwortseite.
 */
export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const body = await request.json().catch(() => ({})) as { userId?: string };
  if (!body.userId) {
    return errorResponse("Konto fehlt.", 400);
  }

  if (body.userId === authorization.currentAdmin.user.id) {
    return errorResponse("Das eigene Passwort änderst du unter „Passwort“ in der Kopfzeile.", 400);
  }

  const supabase = createSupabaseAdminClient();

  if (!authorization.currentAdmin.roles.includes("superadmin")) {
    const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", body.userId);
    if (roleError) {
      return errorResponse("Das Konto konnte nicht geprüft werden.", 502);
    }
    if ((roleRows ?? []).some((row) => row.role !== "moderator")) {
      return errorResponse("Nur Superadmins dürfen Passwörter von Admin-Konten zurücksetzen.", 403);
    }
  }

  const { data: existing, error: loadError } = await supabase.auth.admin.getUserById(body.userId);
  if (loadError || !existing.user) {
    return errorResponse("Das Konto wurde nicht gefunden.", 404);
  }

  const password = generateTemporaryPassword();
  const { error } = await supabase.auth.admin.updateUserById(body.userId, {
    password,
    app_metadata: withMustChangePassword(existing.user.app_metadata, true),
  });

  if (error) {
    return errorResponse("Das Passwort konnte nicht zurückgesetzt werden.", 502);
  }

  return Response.json({ password });
}
