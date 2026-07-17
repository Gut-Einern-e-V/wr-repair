import { type AppRole, requireSuperadmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const roles = new Set<AppRole>(["moderator", "admin", "superadmin"]);

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET() {
  const authorization = await requireSuperadmin();
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
    users: (authData.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? "",
      displayName: names.get(user.id) ?? null,
      roles: assignedRoles.get(user.id) ?? [],
      createdAt: user.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as AppRole;

  if (!email || password.length < 12 || !roles.has(role)) {
    return errorResponse("Bitte gib eine E-Mail, ein Passwort mit mindestens 12 Zeichen und eine Rolle an.", 400);
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
  const authorization = await requireSuperadmin();
  if (!authorization.authorized) {
    return errorResponse(authorization.error, authorization.status);
  }

  const body = await request.json() as { userId?: string; role?: AppRole };
  if (!body.userId || !body.role || !roles.has(body.role)) {
    return errorResponse("Ungueltige Benutzer- oder Rollenangabe.", 400);
  }

  if (body.userId === authorization.currentAdmin.user.id) {
    return errorResponse("Die eigene Rolle kann nicht in dieser Ansicht geaendert werden.", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", body.userId);
  const { error: insertError } = await supabase.from("user_roles").insert({ user_id: body.userId, role: body.role });

  if (deleteError || insertError) {
    return errorResponse("Die Rolle konnte nicht geaendert werden.", 502);
  }

  return Response.json({ ok: true });
}