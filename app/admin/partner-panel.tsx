"use client";

import { FormEvent, useState } from "react";
import { useJsonResource } from "@/lib/use-json-resource";
import OrderControls from "./order-controls";

type ManagedPartner = { id: string; name: string; website_url: string; logo_path: string | null; logoUrl: string | null; sort_order: number };

/**
 * Pflege der Partnerlogos auf der Startseite und auf /supporters.
 *
 * Die Reihenfolge steht seit Issue #98 nicht mehr nur in der Datenbank: Zwei
 * Pfeile je Eintrag verschieben ihn um eine Position, gespeichert wird
 * unmittelbar. Die Liste steht oben und das Formular darunter zusammengefaltet
 * - sortiert wird oefter als hinzugefuegt.
 */
export default function PartnerPanel({ onStatus, onError }: { onStatus: (message: string) => void; onError: (message: string) => void }) {
  const { data, error, isLoading, reload } = useJsonResource<{ partners: ManagedPartner[] }>("/api/admin/partners", "Partner konnten nicht geladen werden.");
  const [busy, setBusy] = useState("");
  const partners = data?.partners ?? [];

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy("new");
    try {
      const response = await fetch("/api/admin/partners", { method: "POST", body: new FormData(form) });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Partner konnte nicht gespeichert werden.");
        return;
      }

      form.reset();
      onStatus("Partner wurde hinzugefuegt.");
      reload();
    } finally {
      setBusy("");
    }
  }

  async function movePartner(partner: ManagedPartner, direction: "up" | "down") {
    setBusy(partner.id);
    try {
      const response = await fetch("/api/admin/partners/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: partner.id, direction }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Die Reihenfolge konnte nicht gespeichert werden.");
        return;
      }

      onStatus(`${partner.name} wurde verschoben.`);
      reload();
    } finally {
      setBusy("");
    }
  }

  async function deletePartner(partner: ManagedPartner) {
    if (!window.confirm(`Partner ${partner.name} entfernen?`)) return;
    setBusy(partner.id);
    try {
      const response = await fetch(`/api/admin/partners?id=${encodeURIComponent(partner.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Partner konnte nicht entfernt werden.");
        return;
      }

      onStatus("Partner wurde entfernt.");
      reload();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-card" aria-labelledby="partner-heading">
        <div className="admin-card-head"><h3 id="partner-heading">Unterstützer</h3><span className="section-index">{partners.length} eingetragen</span></div>
        <p>Diese Logos stehen auf der Startseite und auf der Unterstützungsseite – in der Reihenfolge, in der sie hier stehen. Solange kein Partner eingetragen ist, gilt die Liste aus dem Quelltext.</p>

        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading ? <p className="queue-empty">Partner werden geladen.</p> : (
          <div className="sortable-list">
            {partners.length === 0 && <p className="queue-empty">Noch keine zusaetzlichen Partner.</p>}
            {partners.map((partner, index) => (
              <div className="sortable-row" key={partner.id}>
                <OrderControls
                  label={partner.name}
                  isFirst={index === 0}
                  isLast={index === partners.length - 1}
                  isBusy={busy !== ""}
                  onMove={(direction) => void movePartner(partner, direction)}
                />
                <span className="sortable-thumb">
                  {/* Logo aus dem oeffentlichen Eimer, Groesse steht im CSS. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {partner.logoUrl ? <img src={partner.logoUrl} alt="" /> : <span className="sortable-thumb-empty" aria-hidden="true">–</span>}
                </span>
                <span className="sortable-title">
                  <strong>{partner.name}</strong>
                  <a href={partner.website_url} target="_blank" rel="noreferrer">{partner.website_url}</a>
                </span>
                <button className="text-button" type="button" disabled={busy !== ""} onClick={() => void deletePartner(partner)}>Entfernen</button>
              </div>
            ))}
          </div>
        )}

        <details className="metadata-editor">
          <summary>Partner hinzufügen</summary>
          <form className="partner-form" onSubmit={createPartner}>
            <label>Name<input name="name" maxLength={120} required /></label>
            <label>Website<input name="websiteUrl" type="url" placeholder="https://" required /></label>
            <label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required /><small>Transparentes PNG, WebP oder SVG, maximal 1 MB.</small></label>
            <button className="button button-primary" type="submit" disabled={busy === "new"}>{busy === "new" ? "Speichert ..." : "Partner hinzufügen"}</button>
          </form>
        </details>
      </section>
    </div>
  );
}
