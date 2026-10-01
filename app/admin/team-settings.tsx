"use client";

import { FormEvent, useState } from "react";
import { buildWelcomeMail, buildWelcomeMailto, MODERATION_GUIDE_PATH } from "@/lib/moderation-onboarding";
import { getSiteUrl } from "@/lib/share";
import { useJsonResource } from "@/lib/use-json-resource";

type Role = "moderator" | "admin" | "superadmin";
type ManagedUser = { id: string; email: string; displayName: string | null; roles: Role[]; createdAt: string; lastSignInAt: string | null; mustChangePassword: boolean };
type UsersResponse = { users: ManagedUser[]; currentUserId: string; canManageAdmins: boolean };

const roleLabels: Record<Role, string> = { moderator: "Moderation", admin: "Admin", superadmin: "Superadmin" };

/**
 * Konten anlegen und Rollen vergeben. Admins legen Moderationskonten an,
 * Admin- und Superadmin-Rechte bleiben Superadmins vorbehalten.
 */
export default function TeamSettings({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<UsersResponse>("/api/admin/users", "Konten konnten nicht geladen werden.");
  const users = data?.users ?? [];
  const canManageAdmins = data?.canManageAdmins ?? false;
  const currentUserId = data?.currentUserId ?? "";
  const assignableRoles: Role[] = canManageAdmins ? ["moderator", "admin", "superadmin"] : ["moderator"];
  // Das zuletzt angelegte Konto: Dafuer gibt es Anleitung und Willkommensmail.
  const [created, setCreated] = useState<{ email: string; displayName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // Ein frisch zurueckgesetztes Passwort - es steht nur hier, bis die Ansicht wechselt.
  const [reset, setReset] = useState<{ email: string; password: string } | null>(null);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setCreated(null);
    const response = await fetch("/api/admin/users", { method: "POST", body: formData });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Konto konnte nicht angelegt werden.");
      return;
    }

    form.reset();
    setReset(null);
    setCreated({ email: String(formData.get("email") ?? ""), displayName: String(formData.get("displayName") ?? "") });
    setCopied(false);
    onStatus("Konto wurde angelegt. Gib das temporäre Passwort persönlich weiter – beim ersten Login wählt die Person ein eigenes.");
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

  async function resetPassword(user: ManagedUser) {
    if (!window.confirm(`Neues temporäres Passwort für ${user.email} erzeugen? Das bisherige gilt dann nicht mehr.`)) return;
    setReset(null);
    const response = await fetch("/api/admin/users/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const payload = await response.json() as { error?: string; password?: string };

    if (!response.ok || !payload.password) {
      onError(payload.error ?? "Das Passwort konnte nicht zurückgesetzt werden.");
      return;
    }

    setCreated(null);
    setReset({ email: user.email, password: payload.password });
    onStatus("Neues temporäres Passwort erzeugt. Gib es persönlich weiter.");
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

  const welcomeMail = created ? buildWelcomeMail({ ...created, siteUrl: getSiteUrl(window.location.origin) }) : null;

  async function copyWelcomeMail() {
    if (!welcomeMail) return;
    try {
      await navigator.clipboard.writeText(`${welcomeMail.subject}\n\n${welcomeMail.body}`);
      setCopied(true);
    } catch {
      onError("Text konnte nicht kopiert werden.");
    }
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
      {reset && (
        <div className="onboarding-panel" role="region" aria-label="Neues temporäres Passwort">
          <p><strong>Neues Passwort für {reset.email}</strong>Gib es persönlich oder am Telefon weiter, nicht per Mail. Beim nächsten Login wählt die Person ein eigenes. Dieses Passwort wird nur jetzt angezeigt.</p>
          <code className="temp-password">{reset.password}</code>
          <div className="admin-links">
            <button className="button button-secondary" type="button" onClick={() => setReset(null)}>Ausblenden</button>
          </div>
        </div>
      )}
      {created && welcomeMail && (
        <div className="onboarding-panel" role="region" aria-label="Willkommenspaket">
          <p><strong>Willkommenspaket für {created.displayName || created.email}</strong>Schick die Willkommensmail und gib das Passwort persönlich weiter. Mail und Anleitung erklären Login, Benachrichtigungen auf jedem Gerät und das Prüfen.</p>
          <div className="admin-links">
            <a className="button button-primary" href={buildWelcomeMailto(welcomeMail, created.email)}>Willkommensmail öffnen</a>
            <button className="button button-secondary" type="button" onClick={() => void copyWelcomeMail()}>{copied ? "Kopiert" : "Mailtext kopieren"}</button>
            <a className="button button-secondary" href={MODERATION_GUIDE_PATH} target="_blank" rel="noopener">Anleitung (PDF)</a>
          </div>
        </div>
      )}
      <p className="onboarding-hint"><a href={MODERATION_GUIDE_PATH} target="_blank" rel="noopener">Anleitung für neue Moderator*innen (PDF)</a> – Login, Benachrichtigungen auf iPhone, Android und Computer, Prüfen.</p>
      {data && !canManageAdmins && <p className="form-notice">Als Admin kannst du Konten fuer die Moderation anlegen. Admin- und Superadmin-Rechte vergibt eine Superadministration.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {isLoading ? <p className="queue-empty">Team wird geladen.</p> : (
        <div className="user-table" role="region" aria-label="Konten und Rollen">
          {users.map((user) => {
            const role = user.roles[0] ?? "moderator";
            const locked = user.id === currentUserId || (!canManageAdmins && user.roles.some((value) => value !== "moderator"));

            return (
              <div className="user-row" key={user.id}>
                <div>
                  <strong>{user.displayName ?? "Ohne Namen"}</strong>
                  <span>{user.email}{user.mustChangePassword ? " · temporäres Passwort" : ""} · {user.roles.length ? user.roles.map((value) => roleLabels[value]).join(", ") : "Keine Rolle"} · {user.lastSignInAt ? `zuletzt ${new Date(user.lastSignInAt).toLocaleDateString("de-DE")}` : "noch nie angemeldet"}</span>
                </div>
                <div className="user-row-actions">
                  <select aria-label={`Rolle von ${user.email}`} value={role} disabled={locked} onChange={(event) => void updateRole(user.id, event.target.value as Role)}>
                    {(canManageAdmins ? ["moderator", "admin", "superadmin"] as Role[] : [role]).map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
                  </select>
                  {user.id !== currentUserId && (canManageAdmins || user.roles.every((value) => value === "moderator")) && (
                    <button className="text-button" type="button" onClick={() => void resetPassword(user)}>Passwort zurücksetzen</button>
                  )}
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
