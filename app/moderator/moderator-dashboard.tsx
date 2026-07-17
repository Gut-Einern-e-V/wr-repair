"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { repairCategoryValues as repairCategories } from "@/lib/repair-catalog";

type Role = "moderator" | "admin" | "superadmin";
type ManagedUser = { id: string; email: string; displayName: string | null; roles: Role[]; createdAt: string };
type RepairStatus = "pending" | "approved" | "rejected";
type ModerationRepair = {
  id: string;
  category: string;
  product_name: string | null;
  description: string | null;
  image_alt_text: string | null;
  tags: string[];
  repair_succeeded: boolean;
  consent_publication: boolean;
  status: RepairStatus;
  location_region: string | null;
  moderator_comment: string | null;
  created_at: string;
  imageUrl: string | null;
};

const roleLabels: Record<Role, string> = { moderator: "Moderation", admin: "Admin", superadmin: "Superadmin" };
export default function ModeratorDashboard({ email, roles }: { email: string; roles: Role[] }) {
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = roles.some((role) => ["admin", "superadmin"].includes(role));
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [repairs, setRepairs] = useState<ModerationRepair[]>([]);
  const [repairStatus, setRepairStatus] = useState<RepairStatus>("pending");
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [metadataDrafts, setMetadataDrafts] = useState<Record<string, { category: string; productName: string; description: string; imageAltText: string; tags: string }>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function loadRepairs(nextStatus = repairStatus) {
    setIsLoadingRepairs(true);
    const response = await fetch(`/api/moderation/repairs?status=${nextStatus}`);
    const data = await response.json() as { repairs?: ModerationRepair[]; error?: string };
    setIsLoadingRepairs(false);

    if (!response.ok) {
      setError(data.error ?? "Einreichungen konnten nicht geladen werden.");
      return;
    }

    setRepairs(data.repairs ?? []);
  }

  async function loadUsers() {
    if (!isSuperadmin) {
      return;
    }

    const response = await fetch("/api/admin/users");
    if (!response.ok) {
      setError("Benutzer konnten nicht geladen werden.");
      return;
    }

    const data = await response.json() as { users: ManagedUser[] };
    setUsers(data.users);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/moderation/repairs?status=pending")
      .then(async (response) => {
        const data = await response.json() as { repairs?: ModerationRepair[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Einreichungen konnten nicht geladen werden.");
        }
        return data.repairs ?? [];
      })
      .then((data) => {
        if (!cancelled) {
          setRepairs(data);
          setIsLoadingRepairs(false);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setError(loadError.message);
          setIsLoadingRepairs(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    let cancelled = false;
    void fetch("/api/admin/users")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Benutzer konnten nicht geladen werden.");
        }

        return response.json() as Promise<{ users: ManagedUser[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUsers(data.users);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Benutzer konnten nicht geladen werden.");
        }
      });

    return () => { cancelled = true; };
  }, [isSuperadmin]);

  async function updateRepair(repairId: string, nextStatus: "approved" | "rejected") {
    setStatus("");
    setError("");
    const response = await fetch(`/api/moderation/repairs/${repairId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, moderatorComment: comments[repairId] ?? "" }),
    });
    const data = await response.json() as { error?: string; imageDeleted?: boolean };

    if (!response.ok) {
      setError(data.error ?? "Moderationsentscheidung konnte nicht gespeichert werden.");
      return;
    }

    setStatus(nextStatus === "approved" ? "Einreichung wurde freigegeben." : "Einreichung wurde abgelehnt.");
    if (data.imageDeleted === false) {
      setError("Die Einreichung wurde abgelehnt, aber das Bild muss noch manuell geloescht werden.");
    }
    await loadRepairs();
  }

  async function changeRepairStatus(nextStatus: RepairStatus) {
    setRepairStatus(nextStatus);
    setError("");
    await loadRepairs(nextStatus);
  }

  function getMetadataDraft(repair: ModerationRepair) {
    return metadataDrafts[repair.id] ?? {
      category: repair.category,
      productName: repair.product_name ?? "",
      description: repair.description ?? "",
      imageAltText: repair.image_alt_text ?? "",
      tags: repair.tags.join(", "),
    };
  }

  async function saveMetadata(repair: ModerationRepair) {
    setStatus("");
    setError("");
    const draft = getMetadataDraft(repair);
    const response = await fetch(`/api/moderation/repairs/${repair.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: {
          ...draft,
          tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        },
      }),
    });
    const data = await response.json() as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Die Metadaten konnten nicht gespeichert werden.");
      return;
    }

    setStatus("Metadaten wurden aktualisiert.");
    await loadRepairs();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    const form = event.currentTarget;
    const response = await fetch("/api/admin/users", { method: "POST", body: new FormData(form) });
    const data = await response.json() as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Benutzer konnte nicht angelegt werden.");
      return;
    }

    form.reset();
    setStatus("Benutzer wurde angelegt.");
    await loadUsers();
  }

  async function updateRole(userId: string, role: Role) {
    setStatus("");
    setError("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const data = await response.json() as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Rolle konnte nicht geaendert werden.");
      return;
    }

    setStatus("Rolle wurde aktualisiert.");
    await loadUsers();
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <main className="moderator-shell">
      <header className="moderator-header"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Reparaturrekord<br />NRW</span></Link><div><span>{email}</span><button className="text-button" type="button" onClick={() => void signOut()}>Abmelden</button></div></header>
      <section className="moderator-intro"><p className="section-index">Moderationsbereich</p><h1>Einreichungen im Blick.<br />Rollen unter Kontrolle.</h1></section>
      <section className="moderator-grid">
        <article className="moderator-panel"><p className="section-index">Deine Rolle</p><strong>{roles.map((role) => roleLabels[role]).join(", ")}</strong><p>Nur Superadmins koennen Konten und Berechtigungen verwalten.</p></article>
        <article className="moderator-panel"><p className="section-index">Warteschlange</p><strong>{isLoadingRepairs ? "Laedt ..." : `${repairs.length} Einreichungen`}</strong><p>Pruefe Bild, Beschreibung und Zustimmung vor der Freigabe.</p></article>
      </section>
      <section className="repair-queue" aria-labelledby="repair-queue-heading">
        <div className="section-heading"><div><p className="section-index">Moderation</p><h2 id="repair-queue-heading">Einreichungen pruefen</h2></div><div className="queue-tools">{isAdmin && <a className="button button-secondary" href="/api/admin/repairs/export">CSV exportieren</a>}<label className="filter-label">Status<select value={repairStatus} onChange={(event) => void changeRepairStatus(event.target.value as RepairStatus)}><option value="pending">Offen</option><option value="approved">Freigegeben</option><option value="rejected">Abgelehnt</option></select></label></div></div>
        {isLoadingRepairs ? <p className="queue-empty">Einreichungen werden geladen.</p> : repairs.length === 0 ? <p className="queue-empty">Keine Einreichungen in diesem Status.</p> : <div className="repair-list">{repairs.map((repair) => { const draft = getMetadataDraft(repair); return <article className="repair-review" key={repair.id}>{repair.imageUrl ? <img src={repair.imageUrl} alt="Eingereichtes Reparaturbild" /> : <div className="missing-image">Bild nicht verfuegbar</div>}<div><p className="section-index">{repair.category.replaceAll("_", " ")}</p><h3>{repair.product_name || "Reparatur ohne Produktname"}</h3><p>{repair.description || "Keine Beschreibung angegeben."}</p><dl><div><dt>Erfolg</dt><dd>{repair.repair_succeeded ? "Ja" : "Nein"}</dd></div><div><dt>Veroeffentlichung</dt><dd>{repair.consent_publication ? "Zugestimmt" : "Keine Zustimmung"}</dd></div>{repair.location_region && <div><dt>Region</dt><dd>{repair.location_region}</dd></div>}</dl><details className="metadata-editor"><summary>Metadaten bearbeiten</summary><div className="metadata-fields"><label>Kategorie<select value={draft.category} onChange={(event) => setMetadataDrafts({ ...metadataDrafts, [repair.id]: { ...draft, category: event.target.value } })}>{repairCategories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label><label>Produktname<input value={draft.productName} maxLength={120} onChange={(event) => setMetadataDrafts({ ...metadataDrafts, [repair.id]: { ...draft, productName: event.target.value } })} /></label><label>Beschreibung<textarea value={draft.description} maxLength={2000} onChange={(event) => setMetadataDrafts({ ...metadataDrafts, [repair.id]: { ...draft, description: event.target.value } })} /></label><label>Bildbeschreibung<input value={draft.imageAltText} maxLength={250} onChange={(event) => setMetadataDrafts({ ...metadataDrafts, [repair.id]: { ...draft, imageAltText: event.target.value } })} /></label><label>Tags, mit Komma getrennt<input value={draft.tags} onChange={(event) => setMetadataDrafts({ ...metadataDrafts, [repair.id]: { ...draft, tags: event.target.value } })} /></label></div><button className="button button-secondary" type="button" onClick={() => void saveMetadata(repair)}>Metadaten speichern</button></details>{repairStatus === "pending" && <><label className="comment-label">Moderationskommentar<textarea value={comments[repair.id] ?? ""} maxLength={1000} onChange={(event) => setComments({ ...comments, [repair.id]: event.target.value })} /></label><div className="review-actions"><button className="button button-primary" type="button" onClick={() => void updateRepair(repair.id, "approved")} disabled={!repair.consent_publication}>Freigeben</button><button className="button button-secondary" type="button" onClick={() => void updateRepair(repair.id, "rejected")}>Ablehnen</button></div></>}{repair.moderator_comment && <p className="moderator-comment">Kommentar: {repair.moderator_comment}</p>}</div></article>; })}</div>}
      </section>
      {isSuperadmin && <section className="user-management">
        <div className="section-heading"><div><p className="section-index">Benutzerverwaltung</p><h2>Team einladen</h2></div></div>
        <form className="user-form" onSubmit={createUser}>
          <label>Name<input name="displayName" type="text" maxLength={100} /></label>
          <label>E-Mail<input name="email" type="email" required /></label>
          <label>Temporäres Passwort<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
          <label>Rolle<select name="role" defaultValue="moderator"><option value="moderator">Moderation</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></label>
          <button className="button button-primary" type="submit">Konto anlegen</button>
        </form>
        {status && <p className="form-notice" role="status">{status}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="user-table" role="region" aria-label="Benutzer und Rollen">
          {users.map((managedUser) => <div className="user-row" key={managedUser.id}><div><strong>{managedUser.displayName ?? "Ohne Namen"}</strong><span>{managedUser.email}</span></div><select aria-label={`Rolle von ${managedUser.email}`} value={managedUser.roles[0] ?? "moderator"} onChange={(event) => void updateRole(managedUser.id, event.target.value as Role)}><option value="moderator">Moderation</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></div>)}
        </div>
      </section>}
    </main>
  );
}