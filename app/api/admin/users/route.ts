import { type AppRole, requireAdmin, requireSuperadmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const roles = new Set<AppRole>(["moderator", "admin", "superadmin"]);

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function loadRoles(supabase: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((row) => row.role as AppRole);
}

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: authData, error: authError }, { data: profiles, error: profileError }, { data: roleRows, error: roleError }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
    supabase.from("profiles").select("id, display_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (authError || profileError || roleError) {
    return errorResponse("Benutzer konnten nicht geladen werden.", 502);
  }

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const assignedRoles = new Map<string, AppRole[]>();
  for (const roleRow of roleRows ?? []) {
    const existing = assignedRoles.get(roleRow.user_id) ?? [];
    existing.push(roleRow.role as AppRole);
    assignedRoles.set(roleRow.user_id, existing);
  }

  return Response.json({
    currentUserId: authorization.currentAdmin.user.id,
    // Admins invite moderators; handing out admin rights stays with superadmins.
    canManageAdmins: authorization.currentAdmin.roles.includes("superadmin"),
    users: (authData.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? "",
      displayName: names.get(user.id) ?? null,
      roles: assignedRoles.get(user.id) ?? [],
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const isSuperadmin = authorization.currentAdmin.roles.includes("superadmin");
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as AppRole;

  if (!email || password.length < 12 || !roles.has(role)) {
    return errorResponse("Bitte gib eine E-Mail, ein Passwort mit mindestens 12 Zeichen und eine Rolle an.", 400);
  }

  if (!isSuperadmin && role !== "moderator") {
    return errorResponse("Nur Superadmins duerfen Admin- oder Superadmin-Konten anlegen.", 403);
  }

  const supabase = createSupabaseAdminClient();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) {
    return errorResponse("Das Konto konnte nicht angelegt werden.", 502);
  }

  const userId = created.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, display_name: displayName });
  const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role });

  if (profileError || roleError) {
    await supabase.auth.admin.deleteUser(userId);
    return errorResponse("Das Konto konnte nicht mit einer Rolle angelegt werden.", 502);
  }

  return Response.json({ id: userId }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const isSuperadmin = authorization.currentAdmin.roles.includes("superadmin");
  const body = await request.json() as { userId?: string; role?: AppRole };
  if (!body.userId || !body.role || !roles.has(body.role)) {
    return errorResponse("Ungueltige Benutzer- oder Rollenangabe.", 400);
  }

  if (body.userId === authorization.currentAdmin.user.id) {
    return errorResponse("Die eigene Rolle kann nicht in dieser Ansicht geaendert werden.", 400);
  }

  const supabase = createSupabaseAdminClient();

  if (!isSuperadmin) {
    // Admins may only move moderators around; they can neither grant nor revoke
    // admin rights, which would otherwise be a way to escalate their own.
    const currentRoles = await loadRoles(supabase, body.userId);
    if (body.role !== "moderator" || currentRoles.some((role) => role !== "moderator")) {
      return errorResponse("Nur Superadmins duerfen Admin-Rollen vergeben oder entziehen.", 403);
    }
  }

  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", body.userId);
  const { error: insertError } = await supabase.from("user_roles").insert({ user_id: body.userId, role: body.role });

  if (deleteError || insertError) {
    return errorResponse("Die Rolle konnte nicht geaendert werden.", 502);
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const userId = new URL(request.url).searchParams.get("id");
  if (!userId) {
    return errorResponse("Benutzer fehlt.", 400);
  }

  if (userId === authorization.currentAdmin.user.id) {
    return errorResponse("Das eigene Konto kann hier nicht geloescht werden.", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return errorResponse("Das Konto konnte nicht geloescht werden.", 502);
  }

  return Response.json({ ok: true });
}
