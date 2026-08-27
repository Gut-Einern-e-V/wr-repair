"use client";

import { FormEvent } from "react";
import { useJsonResource } from "@/lib/use-json-resource";

type Role = "moderator" | "admin" | "superadmin";
type ManagedUser = { id: string; email: string; displayName: string | null; roles: Role[]; createdAt: string; lastSignInAt: string | null };
type UsersResponse = { users: ManagedUser[]; currentUserId: string; canManageAdmins: boolean };

const roleLabels: Record<Role, string> = { moderator: "Moderation", admin: "Admin", superadmin: "Superadmin" };

/**
 * Konten anlegen und Rollen vergeben. Admins laden Moderator*innen ein,
 * Admin- und Superadmin-Rechte bleiben Superadmins vorbehalten.
 */
export default function TeamSettings({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<UsersResponse>("/api/admin/users", "Benutzer konnten nicht geladen werden.");
  const users = data?.users ?? [];
  const canManageAdmins = data?.canManageAdmins ?? false;
  const currentUserId = data?.currentUserId ?? "";
  const assignableRoles: Role[] = canManageAdmins ? ["moderator", "admin", "superadmin"] : ["moderator"];

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/admin/users", { method: "POST", body: new FormData(form) });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Benutzer konnte nicht angelegt werden.");
      return;
    }

    form.reset();
    onStatus("Konto wurde angelegt. Gib das temporaere Passwort persoenlich weiter.");
    reload();
  }

  async function updateRole(userId: string, role: Role) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Rolle konnte nicht geaendert werden.");
      return;
    }

    onStatus("Rolle wurde aktualisiert.");
    reload();
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Konto ${user.email} endgültig löschen?`)) return;
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Konto konnte nicht geloescht werden.");
      return;
    }

    onStatus("Konto wurde geloescht.");
    reload();
  }

  return (
    <div className="admin-stack">
      <form className="user-form" onSubmit={createUser}>
        <label>Name<input name="displayName" type="text" maxLength={100} /></label>
        <label>E-Mail<input name="email" type="email" required /></label>
        <label>Temporäres Passwort<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
        <label>Rolle
          <select name="role" defaultValue="moderator">
            {assignableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>
        <button className="button button-primary" type="submit">Konto anlegen</button>
      </form>
      {data && !canManageAdmins && <p className="form-notice">Als Admin kannst du Moderator*innen einladen. Admin- und Superadmin-Rechte vergibt eine Superadministration.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {isLoading ? <p className="queue-empty">Team wird geladen.</p> : (
        <div className="user-table" role="region" aria-label="Benutzer und Rollen">
          {users.map((user) => {
            const role = user.roles[0] ?? "moderator";
            const locked = user.id === currentUserId || (!canManageAdmins && user.roles.some((value) => value !== "moderator"));

            return (
              <div className="user-row" key={user.id}>
                <div>
                  <strong>{user.displayName ?? "Ohne Namen"}</strong>
                  <span>{user.email} · {user.roles.length ? user.roles.map((value) => roleLabels[value]).join(", ") : "Keine Rolle"} · {user.lastSignInAt ? `zuletzt ${new Date(user.lastSignInAt).toLocaleDateString("de-DE")}` : "noch nie angemeldet"}</span>
                </div>
                <div className="user-row-actions">
                  <select aria-label={`Rolle von ${user.email}`} value={role} disabled={locked} onChange={(event) => void updateRole(user.id, event.target.value as Role)}>
                    {(canManageAdmins ? ["moderator", "admin", "superadmin"] as Role[] : [role]).map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
                  </select>
                  {canManageAdmins && user.id !== currentUserId && <button className="text-button" type="button" onClick={() => void deleteUser(user)}>Löschen</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
