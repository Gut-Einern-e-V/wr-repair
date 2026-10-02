import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/auth";
import { mustChangePassword } from "@/lib/password-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type AppRole = "moderator" | "admin" | "superadmin";

export async function getCurrentAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    throw new Error("Could not load user roles.");
  }

  return { user, roles: (roleRows ?? []).map((row) => row.role as AppRole) };
}

/* Mit temporaerem Passwort geht nur der Passwortwechsel selbst
   (app/api/auth/password, der getCurrentAdmin direkt nutzt). Die Seiten leitet
   proxy.ts um, die Schnittstellen sperren hier. */
const passwordChangePending = { authorized: false as const, error: "Bitte wähle zuerst ein eigenes Passwort.", status: 403 };

export async function requireModerator() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return { authorized: false as const, error: "Nicht angemeldet.", status: 401 };
  }

  if (mustChangePassword(currentAdmin.user)) {
    return passwordChangePending;
  }

  if (!currentAdmin.roles.some((role) => ["moderator", "admin", "superadmin"].includes(role))) {
    return { authorized: false as const, error: "Keine Moderationsberechtigung.", status: 403 };
  }

  return { authorized: true as const, currentAdmin };
}

export async function requireAdmin() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return { authorized: false as const, error: "Nicht angemeldet.", status: 401 };
  }

  if (mustChangePassword(currentAdmin.user)) {
    return passwordChangePending;
  }

  if (!currentAdmin.roles.some((role) => ["admin", "superadmin"].includes(role))) {
    return { authorized: false as const, error: "Dieses Konto hat keine Verwaltungsberechtigung.", status: 403 };
  }

  return { authorized: true as const, currentAdmin };
}

export async function requireSuperadmin() {
  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    return { authorized: false as const, error: "Nicht angemeldet.", status: 401 };
  }

  if (mustChangePassword(currentAdmin.user)) {
    return passwordChangePending;
  }

  if (!currentAdmin.roles.includes("superadmin")) {
    return { authorized: false as const, error: "Nur Superadmins dürfen Benutzer verwalten.", status: 403 };
  }

  return { authorized: true as const, currentAdmin };
}
