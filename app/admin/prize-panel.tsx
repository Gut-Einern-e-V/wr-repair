"use client";

import { FormEvent, useState } from "react";
import { nextFreePlace, placeLabel, PRIZE_PLACE_LIMIT } from "@/lib/prize-list";
import { useJsonResource } from "@/lib/use-json-resource";

/**
 * Die Preise des Gewinnspiels pflegen (Issues #45, #98, #99).
 *
 * Sie werden gestiftet und stehen oft erst kurz vor dem Start fest - deshalb
 * ein Formular im Backend statt einer Liste im Quelltext. Was hier eingetragen
 * wird, steht unmittelbar auf /gewinnspiel.
 *
 * Die Liste war eine Karte je Preis, jede mit dem ganzen Formular darin. Bei
 * zwanzig Preisen scrollte man minutenlang (Issue #99). Jetzt eine Zeile je
 * Preis - Bild, Titel, das Wichtigste daneben - und das Formular erst, wenn
 * jemand "Bearbeiten" drueckt.
 *
 * Seit Issue #119 hat jeder Preis einen Platz oder einen Bereich ("10.-20.
 * Platz"); der Bereich ist die Anzahl, und sortiert wird nach dem Platz.
 *
 * Ab dem Start der Teilnahme fehlt das "Entfernen" und die Anzahl geht nur
 * noch nach oben (Issue #110). Das entscheidet die Route und nicht dieses
 * Formular - hier steht nur, warum der Knopf weg ist. Ein Knopf, der erst
 * nach dem Klick sagt, dass er nicht darf, waere eine Falle; einer, der
 * kommentarlos fehlt, ein Raetsel.
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
  image_path: string | null;
  photoUrl: string | null;
  quantity: number;
  is_main: boolean;
  place_from: number;
  place_to: number;
};

/**
 * Ein Formular fuer beide Faelle - neu anlegen und aendern.
 *
 * Getrennte Formulare waeren zwei Orte, an denen dieselben Regeln stehen; beim
 * naechsten Feld waere eines davon veraltet.
 */
function PrizeForm({
  prize,
  binding,
  canOverride,
  suggestedPlace,
  onSubmit,
  submitLabel,
}: {
  prize?: ManagedPrize;
  /** Fuer einen neuen Preis: der erste freie Platz hinter allen anderen. */
  suggestedPlace?: number;
  /** Laeuft die Teilnahme schon? Dann ist die eingetragene Anzahl die Untergrenze. */
  binding: boolean;
  /** Superadmin: Die Anzahl darf trotz laufender Teilnahme sinken, mit Begruendung. */
  canOverride?: boolean;
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
      {/* Das Foto zeigt den Gewinn und steht deshalb bei jedem Preis - anders
          als das Logo, das der stiftenden Organisation gehoert (Issue #99). */}
      <label>Foto des Gewinns
        <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" />
        <small>PNG, WebP oder JPG, maximal 1 MB. {prize?.photoUrl ? "Leer lassen behält das vorhandene Foto." : "Ohne Foto steht auf der Seite nur der Text."}</small>
      </label>
      {prize?.photoUrl && (
        <label className="choice">
          <input name="remove-photo" type="checkbox" value="true" />
          <span>Foto entfernen</span>
        </label>
      )}
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
          <label>Logo der stiftenden Stelle
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            <small>Transparentes PNG, WebP, JPG oder SVG, maximal 1 MB. {prize?.logoUrl ? "Leer lassen behält das vorhandene Logo." : "Optional."}</small>
          </label>
          {prize?.logoUrl && (
            <label className="choice">
              <input name="remove-logo" type="checkbox" value="true" />
              <span>Logo entfernen</span>
            </label>
          )}
        </>
      )}
      {/* Zwei Felder statt einer Anzahl (Issue #119): "Platz 10 bis 20" sind elf
          gleiche Gewinne, und so oft wird dafuer auch gezogen. */}
      <div className="prize-places">
        <label>Platz<input name="placeFrom" type="number" inputMode="numeric" min={1} max={PRIZE_PLACE_LIMIT} step={1} required defaultValue={prize?.place_from ?? suggestedPlace ?? 1} /></label>
        <label>bis Platz<input name="placeTo" type="number" inputMode="numeric" min={1} max={PRIZE_PLACE_LIMIT} step={1} placeholder="–" defaultValue={prize && prize.place_to !== prize.place_from ? prize.place_to : ""} /></label>
        <small>
          Für einen einzelnen Platz „bis“ leer lassen. Ein Bereich wie 10 bis 20 heißt: elf gleiche Gewinne. Jeder Platz von 1 bis {PRIZE_PLACE_LIMIT} kann nur einem Preis gehören.
          {binding && prize && !canOverride ? ` Die Teilnahme läuft – der Bereich darf wachsen, aber nicht kleiner werden als ${prize.quantity} ${prize.quantity === 1 ? "Platz" : "Plätze"}.` : ""}
          {" "}Ist der Platz schon vergeben, rücken die folgenden Preise automatisch nach hinten.
        </small>
      </div>
      {binding && prize && canOverride && (
        <label>Begründung, falls die Anzahl sinkt
          <input name="overrideReason" maxLength={200} placeholder="z. B. nicht lieferbar" />
          <small>Die Teilnahme läuft. Nur Superadmins dürfen die Anzahl trotzdem verringern; die Begründung wird protokolliert.</small>
        </label>
      )}
      <label className="choice">
        <input name="isMain" type="checkbox" value="true" defaultChecked={prize?.is_main ?? false} />
        <span><strong>Hauptpreis</strong> – wird auf der Bühne gezogen und nicht mit den kleinen Preisen zusammen.</span>
      </label>
      <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Speichert ..." : submitLabel}</button>
    </form>
  );
}

/** Was in einer Zeile neben dem Titel steht - alles Kurze, nichts Ganzes. */
function prizeSummary(prize: ManagedPrize) {
  const parts = [`${placeLabel({ placeFrom: prize.place_from, placeTo: prize.place_to })}${prize.quantity > 1 ? ` (${prize.quantity}×)` : ""}`];
  if (prize.is_main) parts.push("Hauptpreis");
  if (prize.sponsor_name) parts.push(`von ${prize.sponsor_name}${prize.sponsor_kind === "person" ? " (privat)" : ""}`);
  else parts.push("ohne Angabe zur stiftenden Stelle");
  if (!prize.photoUrl) parts.push("kein Foto");
  return parts.join(" · ");
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
  const { data, error, isLoading, reload } = useJsonResource<{ prizes: ManagedPrize[]; binding: boolean; canOverride?: boolean }>("/api/admin/prizes", "Die Preise konnten nicht geladen werden.");
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState("");
  const prizes = data?.prizes ?? [];
  /* Im Zweifel gebunden: Solange die Antwort fehlt, ist der sichere Zustand
     der, in dem nichts verschwindet. Die Route entscheidet ohnehin selbst. */
  const binding = data?.binding ?? true;
  const canOverride = data?.canOverride ?? false;

  const suggestedPlace = Math.min(nextFreePlace(prizes.map((prize) => ({ placeFrom: prize.place_from, placeTo: prize.place_to }))), PRIZE_PLACE_LIMIT);

  async function send(method: "POST" | "PATCH", form: HTMLFormElement, success: string) {
    const response = await fetch("/api/admin/prizes", { method, body: new FormData(form) });
    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Der Preis konnte nicht gespeichert werden.");
      return false;
    }

    onStatus(success);
    setEditing("");
    reload();
    onChanged();
    return true;
  }

  async function removePrize(prize: ManagedPrize) {
    if (!window.confirm(`„${prize.title}“ entfernen?`)) return;
    let reasonQuery = "";
    if (binding) {
      const reason = window.prompt("Die Teilnahme läuft. Begründung für das Entfernen (z. B. nicht lieferbar):");
      if (!reason) return;
      reasonQuery = `&overrideReason=${encodeURIComponent(reason)}`;
    }
    setBusy(prize.id);
    try {
      const response = await fetch(`/api/admin/prizes?id=${encodeURIComponent(prize.id)}${reasonQuery}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Der Preis konnte nicht entfernt werden.");
        return;
      }

      onStatus("Der Preis wurde entfernt.");
      reload();
      onChanged();
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="admin-card" aria-labelledby="prize-heading">
      <div className="admin-card-head"><h3 id="prize-heading">Preise</h3><span className="section-index">{prizes.length} eingetragen</span></div>
      <p>Was hier steht, erscheint auf der öffentlichen Gewinnspielseite – mit Foto und mit dem Logo der stiftenden Organisation, wenn eines hinterlegt ist. Sortiert wird nach dem Platz – auf der Seite wie hier. Ein Bereich wie „10.–20. Platz“ steht für elf gleiche Gewinne; die Ziehung weiter unten zieht für jeden Preis so oft, wie er Plätze hat.</p>
      {/* Beide Saetze sagen dasselbe von zwei Seiten - vorher als Auftrag,
          nachher als Erklaerung fuer den fehlenden Knopf (Issue #110). */}
      {binding
        ? <p>Die Teilnahme läuft: Die Preisliste ist damit verbindlich. Preise lassen sich weiter hinzufügen, beschreiben und bebildern, auch die Anzahl darf steigen – entfernen oder verkleinern lässt sich keiner mehr. So steht es in den Teilnahmebedingungen.{canOverride ? " Ist ein Preis nicht lieferbar, kannst du als Superadmin ihn mit Begründung entfernen oder verkleinern; der Grund wird protokolliert und die öffentliche Seite nennt diese Ausnahme." : " Bei einem nicht lieferbaren Preis wende dich an einen Superadmin."}</p>
        : <p>Bis zum Start der Teilnahme muss jeder Preis hier stehen, mit Anzahl und einer Beschreibung, die erkennen lässt, was es ist. Ab dem Start ist die Liste verbindlich: Dann kommen nur noch Preise dazu, entfernt wird keiner mehr.</p>}

      {error && <p className="form-error" role="alert">{error}</p>}

      {isLoading ? <p className="queue-empty">Preise werden geladen.</p> : prizes.length === 0 ? (
        <p className="queue-empty">Noch keine Preise eingetragen. Bis dahin steht auf der Gewinnspielseite, dass die Liste noch wächst.</p>
      ) : (
        <div className="sortable-list">
          {prizes.map((prize) => (
            <div className="sortable-item" key={prize.id}>
              <div className="sortable-row">
                <span className="sortable-thumb">
                  {/* Erst das Foto des Gewinns, sonst das Logo - beides aus
                      dem oeffentlichen Speicher, Groesse steht im CSS. */}
                  {prize.photoUrl || prize.logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={prize.photoUrl ?? prize.logoUrl ?? ""} alt="" />
                    : <span className="sortable-thumb-empty" aria-hidden="true">–</span>}
                </span>
                <span className="sortable-title">
                  <strong>{prize.title}</strong>
                  <span className="quota-note">{prizeSummary(prize)}</span>
                </span>
                <span className="sortable-actions">
                  <button className="text-button" type="button" aria-expanded={editing === prize.id} onClick={() => setEditing(editing === prize.id ? "" : prize.id)}>
                    {editing === prize.id ? "Schließen" : "Bearbeiten"}
                  </button>
                  {(!binding || canOverride) && <button className="text-button" type="button" disabled={busy !== ""} onClick={() => void removePrize(prize)}>Entfernen</button>}
                </span>
              </div>
              {editing === prize.id && (
                <PrizeForm prize={prize} binding={binding} canOverride={canOverride} onSubmit={(form) => send("PATCH", form, "Der Preis wurde gespeichert.")} submitLabel="Änderungen speichern" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zusammengefaltet, weil oefter sortiert und geaendert wird als
          hinzugefuegt - und weil das Formular sonst die Liste nach unten
          druecken wuerde, um die es hier geht. */}
      <details className="metadata-editor">
        <summary>Preis hinzufügen</summary>
        <PrizeForm key={suggestedPlace} binding={binding} suggestedPlace={suggestedPlace} onSubmit={(form) => send("POST", form, "Der Preis wurde hinzugefügt.")} submitLabel="Preis hinzufügen" />
      </details>
    </section>
  );
}
