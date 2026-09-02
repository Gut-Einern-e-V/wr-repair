"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { useJsonResource } from "@/lib/use-json-resource";
import type { PrizeView, WinnerView } from "@/lib/lottery-store";
import type { AdminSettings } from "./campaign-panel";
import PrizePanel from "./prize-panel";

type Exclusion = { id: string; pattern: string; note: string | null; created_at: string };

type Overview = {
  prizes: PrizeView[];
  exclusions: Exclusion[];
  counts: { entries: number; pending: number; eligible: number; people: number; winners: number };
};

/**
 * Das Gewinnspiel im Backend (Issue #45).
 *
 * Vier Dinge an einer Stelle, in der Reihenfolge, in der man sie braucht:
 * wer das Gewinnspiel veranstaltet, was es zu gewinnen gibt, wer nicht
 * gewinnen kann, und die Ziehung selbst.
 *
 * Gezogen wird je Preis. Der frueher hier stehende Knopf "Gewinn auslosen" zog
 * irgendeine Person, ohne festzuhalten, was sie gewonnen hatte - damit liess
 * sich hinterher nichts verschicken.
 */
function WinnerCard({
  winner,
  isBusy,
  onRedraw,
  onWithdraw,
}: {
  winner: WinnerView;
  isBusy: boolean;
  onRedraw: (entryId: string) => void;
  onWithdraw: (entryId: string) => void;
}) {
  return (
    <div className="lottery-winner">
      <p><strong>{winner.name}</strong> &mdash; <a href={`mailto:${winner.email}`}>{winner.email}</a></p>
      {/* Herkunft, Gegenstand und Geschichte stehen dabei, weil die Mails von
          Hand geschrieben werden - und weil bei der Buehnenziehung genau das
          die Geschichte ist, die erzaehlt wird. */}
      {winner.repair && (
        <p className="lottery-winner-repair">
          {repairCategoryLabel(winner.repair.category)}
          {winner.repair.brandModel ? ` · ${winner.repair.brandModel}` : ""}
          {winner.repair.kreis ? ` · ${winner.repair.kreis}` : " · ohne Ortsangabe"}
          {winner.repair.succeeded ? "" : " · Reparatur nicht gelungen"}
        </p>
      )}
      {winner.repair?.story && <p className="lottery-winner-story">„{winner.repair.story}“</p>}
      <p className="quota-note">Gezogen am {winner.drawnAt ? new Date(winner.drawnAt).toLocaleString("de-DE") : "–"}</p>
      <div className="lottery-winner-actions">
        {/* Der Fall, fuer den es diesen Knopf gibt: Es wurde jemand gezogen,
            der nicht gewinnen durfte - jemand aus dem Team etwa. Die Person
            wird dabei ausgeschlossen, sonst kaeme sie beim naechsten Zug
            sofort wieder heraus. */}
        <button className="text-button" type="button" disabled={isBusy} onClick={() => onRedraw(winner.entryId)}>Neu ziehen</button>
        <button className="text-button" type="button" disabled={isBusy} onClick={() => onWithdraw(winner.entryId)}>Ziehung zurücknehmen</button>
      </div>
    </div>
  );
}

function OrganizerCard({
  settings,
  onSaved,
  onStatus,
  onError,
}: {
  settings: AdminSettings;
  onSaved: (next: Partial<AdminSettings>) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [organizer, setOrganizer] = useState(settings.lotteryOrganizer);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotteryOrganizer: organizer }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Der Veranstalter konnte nicht gespeichert werden.");
        return;
      }

      onStatus("Der Veranstalter des Gewinnspiels wurde gespeichert.");
      onSaved({ lotteryOrganizer: organizer, stored: { ...settings.stored, lotteryOrganizer: Boolean(organizer.name?.trim()) } });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-card" aria-labelledby="organizer-heading">
      <div className="admin-card-head">
        <h3 id="organizer-heading">Veranstalter</h3>
        <span className="section-index">{settings.stored.lotteryOrganizer ? "Eingetragen" : "Steht noch aus"}</span>
      </div>
      <p>Diese Angaben stehen in den Teilnahmebedingungen auf <Link href="/gewinnspiel">/gewinnspiel</Link>. Solange sie leer sind, schreibt die Seite offen, dass der Veranstalter noch nicht feststeht – sie erfindet nichts.</p>
      <form className="campaign-form" onSubmit={save}>
        <label>Name<input maxLength={200} value={organizer.name ?? ""} placeholder="z. B. CSCP gGmbH" onChange={(event) => setOrganizer({ ...organizer, name: event.target.value })} /></label>
        <label>Anschrift<input maxLength={300} value={organizer.address ?? ""} placeholder="Straße, PLZ Ort" onChange={(event) => setOrganizer({ ...organizer, address: event.target.value })} /></label>
        <label>Kontaktadresse<input type="email" maxLength={200} value={organizer.email ?? ""} placeholder="noch offen" onChange={(event) => setOrganizer({ ...organizer, email: event.target.value })} /></label>
        <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Speichert ..." : "Veranstalter speichern"}</button>
      </form>
    </section>
  );
}

export default function LotteryPanel({
  settings,
  onSaved,
  onStatus,
  onError,
}: {
  settings: AdminSettings;
  onSaved: (next: Partial<AdminSettings>) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { data, error, isLoading, reload } = useJsonResource<Overview>("/api/admin/lottery", "Der Stand der Verlosung konnte nicht geladen werden.");
  const [busy, setBusy] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newNote, setNewNote] = useState("");

  const prizes = data?.prizes ?? [];
  const counts = data?.counts;
  const mainPrizes = prizes.filter((prize) => prize.isMain);
  const smallPrizes = prizes.filter((prize) => !prize.isMain);
  const openSmall = smallPrizes.filter((prize) => prize.open > 0);

  async function post(body: Record<string, unknown>, key: string, success: string) {
    setBusy(key);
    try {
      const response = await fetch("/api/admin/lottery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; notice?: string; winners?: WinnerView[] };

      if (!response.ok) {
        onError(payload.error ?? "Die Ziehung konnte nicht ausgeführt werden.");
        return;
      }

      onStatus(payload.notice ?? success);
      reload();
    } finally {
      setBusy("");
    }
  }

  function draw(prize: PrizeView) {
    const question = prize.open === 1
      ? `Für „${prize.title}“ ziehen?`
      : `Für „${prize.title}“ ${prize.open} Personen ziehen?`;
    if (!window.confirm(question)) return;
    void post({ action: "draw", prizeId: prize.id }, `draw-${prize.id}`, `Für „${prize.title}“ wurde gezogen.`);
  }

  async function drawAllSmall() {
    if (!window.confirm(`Für alle ${openSmall.length} noch offenen kleinen Preise ziehen? Hauptpreise bleiben für die Bühne liegen.`)) return;
    setBusy("draw-all");
    try {
      for (const prize of openSmall) {
        const response = await fetch("/api/admin/lottery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "draw", prizeId: prize.id }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          onError(payload.error ?? `Für „${prize.title}“ konnte nicht gezogen werden.`);
          reload();
          return;
        }
      }
      onStatus("Für alle kleinen Preise wurde gezogen.");
      reload();
    } finally {
      setBusy("");
    }
  }

  function redraw(entryId: string) {
    if (!window.confirm("Neu ziehen? Die bisher gezogene Person wird dabei von der Verlosung ausgeschlossen.")) return;
    void post({ action: "redraw", entryId }, `redraw-${entryId}`, "Es wurde neu gezogen.");
  }

  function withdraw(entryId: string) {
    if (!window.confirm("Ziehung zurücknehmen? Der Preis ist danach wieder offen, die Person von der Verlosung ausgeschlossen.")) return;
    void post({ action: "withdraw", entryId }, `withdraw-${entryId}`, "Die Ziehung wurde zurückgenommen.");
  }

  async function addExclusion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("exclusion");

    try {
      const response = await fetch("/api/admin/lottery/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: newPattern, note: newNote }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        onError(payload.error ?? "Der Ausschluss konnte nicht gespeichert werden.");
        return;
      }

      setNewPattern("");
      setNewNote("");
      onStatus("Der Ausschluss wurde gespeichert.");
      reload();
    } finally {
      setBusy("");
    }
  }

  async function removeExclusion(rule: Exclusion) {
    if (!window.confirm(`${rule.pattern} von der Ausschlussliste nehmen?`)) return;
    const response = await fetch(`/api/admin/lottery/exclusions?id=${encodeURIComponent(rule.id)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({})) as { error?: string };

    if (!response.ok) {
      onError(payload.error ?? "Der Ausschluss konnte nicht entfernt werden.");
      return;
    }

    onStatus("Der Ausschluss wurde entfernt.");
    reload();
  }

  return (
    <div className="admin-stack">
      <OrganizerCard settings={settings} onSaved={onSaved} onStatus={onStatus} onError={onError} />

      <PrizePanel onStatus={onStatus} onError={onError} onChanged={reload} />

      <section className="admin-card" aria-labelledby="exclusions-heading">
        <div className="admin-card-head"><h3 id="exclusions-heading">Ausschlussliste</h3><span className="section-index">{data?.exclusions.length ?? 0} Einträge</span></div>
        <p>Das Projektteam und alle, die an der Durchführung mitwirken, können nicht gewinnen – so steht es in den Teilnahmebedingungen. Wer hier steht, wird bei der Ziehung übersprungen. Eine ganze Adresse (<code>anna@example.org</code>) oder ein ganzes Haus (<code>@example.org</code>).</p>
        <form className="campaign-form" onSubmit={addExclusion}>
          <label>Adresse oder Domain<input value={newPattern} maxLength={320} required placeholder="@gut-einern.org" onChange={(event) => setNewPattern(event.target.value)} /></label>
          <label>Notiz<input value={newNote} maxLength={200} placeholder="z. B. Projektteam" onChange={(event) => setNewNote(event.target.value)} /></label>
          <button className="button button-secondary" type="submit" disabled={busy === "exclusion"}>{busy === "exclusion" ? "Speichert ..." : "Ausschluss hinzufügen"}</button>
        </form>
        {(data?.exclusions.length ?? 0) > 0 && (
          <div className="partner-admin-list">
            {data?.exclusions.map((rule) => (
              <div key={rule.id}>
                <span>{rule.pattern}{rule.note ? ` · ${rule.note}` : ""}</span>
                <button className="text-button" type="button" onClick={() => void removeExclusion(rule)}>Entfernen</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-card" aria-labelledby="draw-heading">
        <div className="admin-card-head"><h3 id="draw-heading">Ziehung</h3><span className="section-index">{counts ? `${counts.winners} gezogen` : ""}</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {isLoading && <p className="form-notice">Der Stand der Verlosung wird geladen.</p>}
        {counts && (
          <p>
            {counts.entries.toLocaleString("de-DE")} Anmeldungen insgesamt.
            Teilnahmeberechtigt sind {counts.eligible.toLocaleString("de-DE")} Lose von {counts.people.toLocaleString("de-DE")} Personen –
            gezählt werden nur Anmeldungen zu freigegebenen Reparaturen, ohne bereits Gezogene und ohne die Ausschlussliste.
            {counts.pending > 0 && ` ${counts.pending.toLocaleString("de-DE")} Anmeldungen warten noch auf die Moderation und können später dazukommen.`}
          </p>
        )}

        <div className="admin-links">
          <a className="button button-secondary" href="/api/admin/lottery/export">Gewinner*innen als CSV exportieren</a>
          {mainPrizes.length > 0 && <Link className="button button-secondary" href="/tombola">Bühnenziehung öffnen</Link>}
          {openSmall.length > 0 && (
            <button className="button button-primary" type="button" disabled={busy !== ""} onClick={() => void drawAllSmall()}>
              {busy === "draw-all" ? "Zieht ..." : `Für alle ${openSmall.length} kleinen Preise ziehen`}
            </button>
          )}
        </div>

        {prizes.length === 0 && !isLoading && <p className="queue-empty">Ohne Preise gibt es nichts zu ziehen. Trage oben einen ein.</p>}

        {prizes.map((prize) => (
          <section className="lottery-prize" key={prize.id}>
            <div className="admin-card-head">
              <h4>{prize.title}</h4>
              <span className="section-index">
                {prize.isMain ? "Hauptpreis · " : ""}
                {prize.winners.length} von {prize.quantity} vergeben
              </span>
            </div>
            {prize.winners.map((winner) => (
              <WinnerCard
                key={winner.entryId}
                winner={winner}
                isBusy={busy !== ""}
                onRedraw={redraw}
                onWithdraw={withdraw}
              />
            ))}
            {prize.open > 0 ? (
              <button className="button button-secondary" type="button" disabled={busy !== ""} onClick={() => draw(prize)}>
                {busy === `draw-${prize.id}` ? "Zieht ..." : prize.open === 1 ? "Ziehen" : `${prize.open} Personen ziehen`}
              </button>
            ) : (
              <p className="quota-note">Vollständig vergeben.</p>
            )}
            {prize.isMain && prize.open > 0 && <p className="quota-note">Hauptpreis – gedacht für die Bühnenziehung, hier aber genauso ziehbar.</p>}
          </section>
        ))}
      </section>
    </div>
  );
}
