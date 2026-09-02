"use client";

import { FormEvent, useState } from "react";
import { useJsonResource } from "@/lib/use-json-resource";

/**
 * Die Preise des Gewinnspiels pflegen (Issue #45).
 *
 * Sie werden gestiftet und stehen oft erst kurz vor dem Start fest - deshalb
 * ein Formular im Backend statt einer Liste im Quelltext. Was hier eingetragen
 * wird, steht unmittelbar auf /gewinnspiel.
 */

export type ManagedPrize = {
  id: string;
  title: string;
  description: string | null;
  sponsor_name: string | null;
  sponsor_kind: "organisation" | "person";
  sponsor_website: string | null;
  logo_path: string | null;
  logoUrl: string | null;
  quantity: number;
  is_main: boolean;
  sort_order: number;
};

/**
 * Ein Formular fuer beide Faelle - neu anlegen und aendern.
 *
 * Getrennte Formulare waeren zwei Orte, an denen dieselben Regeln stehen; beim
 * naechsten Feld waere eines davon veraltet.
 */
function PrizeForm({
  prize,
  onSubmit,
  submitLabel,
}: {
  prize?: ManagedPrize;
  onSubmit: (form: HTMLFormElement) => Promise<boolean>;
  submitLabel: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [sponsorKind, setSponsorKind] = useState(prize?.sponsor_kind ?? "organisation");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSaving(true);
    try {
      if (await onSubmit(form) && !prize) form.reset();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="prize-form" onSubmit={submit}>
      {prize && <input type="hidden" name="id" value={prize.id} />}
      <label>Preis<input name="title" maxLength={160} required defaultValue={prize?.title ?? ""} /></label>
      <label>Kurzbeschreibung
        <textarea name="description" maxLength={600} rows={2} defaultValue={prize?.description ?? ""} />
        <small>Steht auf der Gewinnspielseite unter dem Titel. Ein bis zwei Sätze.</small>
      </label>
      <label>Gestiftet von
        <select name="sponsorKind" value={sponsorKind} onChange={(event) => setSponsorKind(event.target.value as "organisation" | "person")}>
          <option value="organisation">Organisation oder Unternehmen</option>
          <option value="person">Privatperson</option>
        </select>
      </label>
      <label>Name der stiftenden Stelle<input name="sponsorName" maxLength={160} defaultValue={prize?.sponsor_name ?? ""} /></label>
      {/* Bei einer Privatperson bleiben Website und Logo aus: Ein Logo hat sie
          nicht, und ein Link auf eine Privatperson waere eine Veroeffentlichung,
          die niemand zugesagt hat. */}
      {sponsorKind === "organisation" && (
        <>
          <label>Website der stiftenden Stelle<input name="sponsorWebsite" type="url" placeholder="https://" defaultValue={prize?.sponsor_website ?? ""} /></label>
          <label>Logo
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            <small>Transparentes PNG, WebP, JPG oder SVG, maximal 1 MB. {prize?.logoUrl ? "Leer lassen behält das vorhandene Logo." : "Optional."}</small>
          </label>
        </>
      )}
      <label>Anzahl<input name="quantity" type="number" min={1} max={999} step={1} defaultValue={prize?.quantity ?? 1} />
        <small>So oft wird für diesen Preis gezogen.</small>
      </label>
      <label>Reihenfolge<input name="sortOrder" type="number" step={1} defaultValue={prize?.sort_order ?? 0} />
        <small>Kleinere Zahlen stehen weiter oben.</small>
      </label>
      <label className="choice">
        <input name="isMain" type="checkbox" value="true" defaultChecked={prize?.is_main ?? false} />
        <span><strong>Hauptpreis</strong> – wird auf der Bühne gezogen und nicht mit den kleinen Preisen zusammen.</span>
      </label>
      <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Speichert ..." : submitLabel}</button>
    </form>
  );
}

export default function PrizePanel({
  onStatus,
  onError,
  onChanged,
}: {
  onStatus: (message: string) => void;
  onError: (message: string) => void;
  /** Die Ziehung darunter zeigt dieselben Preise und muss mitbekommen, dass sie sich geaendert haben. */
  onChanged: () => void;
}) {
  const { data, error, isLoading, reload } = useJsonResource<{ prizes: ManagedPrize[] }>("/api/admin/prizes", "Die Preise konnten nicht geladen werden.");
  const prizes = data?.prizes ?? [];

  async function send(method: "POST" | "PATCH", form: HTMLFormElement, success: string) {
    const response = await fetch("/api/admin/prizes", { method, body: new FormData(form) });
    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Der Preis konnte nicht gespeichert werden.");
      return false;
    }

    onStatus(success);
    reload();
    onChanged();
    return true;
  }

  async function removePrize(prize: ManagedPrize) {
    if (!window.confirm(`„${prize.title}“ entfernen?`)) return;
    const response = await fetch(`/api/admin/prizes?id=${encodeURIComponent(prize.id)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Der Preis konnte nicht entfernt werden.");
      return;
    }

    onStatus("Der Preis wurde entfernt.");
    reload();
    onChanged();
  }

  return (
    <div className="admin-stack">
      <section className="admin-card" aria-labelledby="prize-new-heading">
        <div className="admin-card-head"><h3 id="prize-new-heading">Preis hinzufügen</h3><span className="section-index">{prizes.length} eingetragen</span></div>
        <p>Was hier steht, erscheint auf der öffentlichen Gewinnspielseite – mit Logo, wenn eines hinterlegt ist. Die Ziehung weiter unten zieht für jeden Preis so oft, wie seine Anzahl sagt.</p>
        <PrizeForm onSubmit={(form) => send("POST", form, "Der Preis wurde hinzugefügt.")} submitLabel="Preis hinzufügen" />
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      {isLoading ? <p className="queue-empty">Preise werden geladen.</p> : prizes.length === 0 ? (
        <p className="queue-empty">Noch keine Preise eingetragen. Bis dahin steht auf der Gewinnspielseite, dass die Liste noch wächst.</p>
      ) : (
        <div className="prize-admin-list">
          {prizes.map((prize) => (
            <section className="admin-card" key={prize.id}>
              <div className="admin-card-head">
                <h3>{prize.title}</h3>
                <span className="section-index">{prize.is_main ? "Hauptpreis · " : ""}{prize.quantity}&times;</span>
              </div>
              {prize.description && <p>{prize.description}</p>}
              <p className="quota-note">
                {prize.sponsor_name
                  ? `Gestiftet von ${prize.sponsor_name}${prize.sponsor_kind === "person" ? " (Privatperson)" : ""}.`
                  : "Ohne Angabe zur stiftenden Stelle."}
                {prize.logoUrl ? " Logo hinterlegt." : ""}
              </p>
              <details className="metadata-editor">
                <summary>Bearbeiten</summary>
                <PrizeForm prize={prize} onSubmit={(form) => send("PATCH", form, "Der Preis wurde gespeichert.")} submitLabel="Änderungen speichern" />
                <button className="text-button" type="button" onClick={() => void removePrize(prize)}>Preis entfernen</button>
              </details>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
