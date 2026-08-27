"use client";

import { FormEvent } from "react";
import { useJsonResource } from "@/lib/use-json-resource";

type ManagedPartner = { id: string; name: string; website_url: string; logo_path: string | null; sort_order: number };

/** Pflege der Partnerlogos auf der Startseite. */
export default function PartnerPanel({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<{ partners: ManagedPartner[] }>("/api/admin/partners", "Partner konnten nicht geladen werden.");
  const partners = data?.partners ?? [];

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch("/api/admin/partners", { method: "POST", body: new FormData(form) });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Partner konnte nicht gespeichert werden.");
      return;
    }

    form.reset();
    onStatus("Partner wurde hinzugefuegt.");
    reload();
  }

  async function deletePartner(partner: ManagedPartner) {
    if (!window.confirm(`Partner ${partner.name} entfernen?`)) return;
    const response = await fetch(`/api/admin/partners?id=${encodeURIComponent(partner.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Partner konnte nicht entfernt werden.");
      return;
    }

    onStatus("Partner wurde entfernt.");
    reload();
  }

  return (
    <div className="admin-stack">
      <form className="partner-form" onSubmit={createPartner}>
        <label>Name<input name="name" maxLength={120} required /></label>
        <label>Website<input name="websiteUrl" type="url" placeholder="https://" required /></label>
        <label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required /><small>Transparentes PNG, WebP oder SVG, maximal 1 MB.</small></label>
        <button className="button button-primary" type="submit">Partner hinzufügen</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {isLoading ? <p className="queue-empty">Partner werden geladen.</p> : (
        <div className="partner-admin-list">
          {partners.length === 0 && <p className="queue-empty">Noch keine zusaetzlichen Partner.</p>}
          {partners.map((partner) => (
            <div key={partner.id}>
              <span>{partner.name}</span>
              <button className="text-button" type="button" onClick={() => void deletePartner(partner)}>Entfernen</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
