"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { defaultLotteryOrganizer } from "@/lib/organisation";
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
 * Das Gewinnspiel im Backend (Issues #45 und #99).
 *
 * Vier Dinge an einer Stelle, in der Reihenfolge, in der man sie braucht:
 * wer das Gewinnspiel veranstaltet, was es zu gewinnen gibt, wer nicht
 * gewinnen kann, und die Ziehung selbst.
 *
 * Gezogen wird je Preis. Der frueher hier stehende Knopf "Gewinn auslosen" zog
 * irgendeine Person, ohne festzuhalten, was sie gewonnen hatte - damit liess
 * sich hinterher nichts verschicken.
 *
 * Seit Issue #99 kommen Admins hierher, nicht nur Superadmins - und die Liste
 * der Gezogenen ist eine Zeile je Person statt einer Karte: Bei zweihundert
 * Gewinnen war die alte Ansicht nicht mehr zu ueberblicken. Die
 * Reparaturgeschichte steht weiterhin dabei, nur eingeklappt.
 */

/** Kurzfassung der Reparatur, aus der eine Anmeldung kam. */
function repairLine(winner: WinnerView) {
  if (!winner.repair) return "ohne Reparatur";
  return [
    repairCategoryLabel(winner.repair.category),
    winner.repair.brandModel || null,
    winner.repair.kreis || "ohne Ortsangabe",
    winner.repair.succeeded ? null : "nicht gelungen",
  ].filter(Boolean).join(" · ");
}

function WinnerRow({
  winner,
  canDraw,
  isBusy,
  onRedraw,
  onWithdraw,
}: {
  winner: WinnerView;
  canDraw: boolean;
  isBusy: boolean;
  onRedraw: (entryId: string) => void;
  onWithdraw: (entryId: string) => void;
}) {
  return (
    <div className="winner-row">
      <span className="winner-person">
        <strong>{winner.name}</strong>
        <a href={`mailto:${winner.email}`}>{winner.email}</a>
      </span>
      {/* Herkunft und Gegenstand stehen dabei, weil die Mails von Hand
          geschrieben werden - und weil bei der Buehnenziehung genau das die
          Geschichte ist, die erzaehlt wird. */}
      <span className="quota-note">{repairLine(winner)}</span>
      <span className="quota-note">{winner.drawnAt ? new Date(winner.drawnAt).toLocaleString("de-DE") : "–"}</span>
      {canDraw && (
        <span className="winner-actions">
          {/* Der Fall, fuer den es diesen Knopf gibt: Es wurde jemand gezogen,
              der nicht gewinnen durfte - jemand aus dem Team etwa. Die Person
              wird dabei ausgeschlossen, sonst kaeme sie beim naechsten Zug
              sofort wieder heraus. */}
          <button className="text-button" type="button" disabled={isBusy} onClick={() => onRedraw(winner.entryId)}>Neu ziehen</button>
          <button className="text-button" type="button" disabled={isBusy} onClick={() => onWithdraw(winner.entryId)}>Zurücknehmen</button>
        </span>
      )}
      {winner.repair?.story && (
        <details className="winner-story">
          <summary>Geschichte</summary>
          <p>„{winner.repair.story}“</p>
        </details>
      )}
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
      onSaved({ lotteryOrganizer: organizer, stored: { ...settings.stored, lotteryOrganizer: Boolean(organizer.name.trim()) } });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-card" aria-labelledby="organizer-heading">
      <div className="admin-card-head">
        <h3 id="organizer-heading">Veranstalter</h3>
        <span className="section-index">{settings.stored.lotteryOrganizer ? "Eingetragen" : "Vorgabe"}</span>
      </div>
      <p>Diese Angaben stehen in den Teilnahmebedingungen auf <Link href="/gewinnspiel">/gewinnspiel</Link>. Ein Feld, das du leerst, fällt auf die Vorgabe zurück – das ist {defaultLotteryOrganizer.name}, {defaultLotteryOrganizer.address}, {defaultLotteryOrganizer.email}. Leer bleibt keines: Ein Gewinnspiel ohne benannten Veranstalter gibt es nicht.</p>
      <form className="campaign-form" onSubmit={save}>
        <label>Name<input maxLength={200} value={organizer.name} placeholder={defaultLotteryOrganizer.name} onChange={(event) => setOrganizer({ ...organizer, name: event.target.value })} /></label>
        <label>Anschrift<input maxLength={300} value={organizer.address} placeholder={defaultLotteryOrganizer.address} onChange={(event) => setOrganizer({ ...organizer, address: event.target.value })} /></label>
        <label>Kontaktadresse<input type="email" maxLength={200} value={organizer.email} placeholder={defaultLotteryOrganizer.email} onChange={(event) => setOrganizer({ ...organizer, email: event.target.value })} /></label>
        <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Speichert ..." : "Veranstalter speichern"}</button>
      </form>
    </section>
  );
}

export default function LotteryPanel({
  settings,
  canDraw,
  onSaved,
  onStatus,
  onError,
}: {
  settings: AdminSettings;
  /** Ziehen, neu ziehen, zuruecknehmen: nur Superadmins (Issue #99). */
  canDraw: boolean;
  onSaved: (next: Partial<AdminSettings>) => void;
  onStatus: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { data, error, isLoading, reload } = useJsonResource<Overview>("/api/admin/lottery", "Der Stand der Verlosung konnte nicht geladen werden.");
  const [busy, setBusy] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newNote, setNewNote] = useState("");
  const [filter, setFilter] = useState("");

  const prizes = useMemo(() => data?.prizes ?? [], [data]);
  const counts = data?.counts;
  const mainPrizes = prizes.filter((prize) => prize.isMain);
  const openSmall = prizes.filter((prize) => !prize.isMain && prize.open > 0);

  /* Suchen statt scrollen: Bei vielen Gewinnen ist die haeufigste Frage nicht
     "wer hat alles gewonnen", sondern "hat diese eine Person gewonnen"
     (Issue #99). Gefiltert wird ueber Name und Adresse, im Browser - die
     Liste liegt ohnehin schon da. */
  const needle = filter.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!needle) return prizes;
    return prizes
      .map((prize) => ({
        ...prize,
        winners: prize.winners.filter((winner) =>
          winner.name.toLowerCase().includes(needle) || winner.email.toLowerCase().includes(needle)),
      }))
      .filter((prize) => prize.winners.length > 0);
  }, [prizes, needle]);

  const matches = shown.reduce((sum, prize) => sum + prize.winners.length, 0);

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
        <details className="metadata-editor">
          <summary>Ausschluss hinzufügen</summary>
          <form className="campaign-form" onSubmit={addExclusion}>
            <label>Adresse oder Domain<input value={newPattern} maxLength={320} required placeholder="@cscp.org" onChange={(event) => setNewPattern(event.target.value)} /></label>
            <label>Notiz<input value={newNote} maxLength={200} placeholder="z. B. Projektteam" onChange={(event) => setNewNote(event.target.value)} /></label>
            <button className="button button-secondary" type="submit" disabled={busy === "exclusion"}>{busy === "exclusion" ? "Speichert ..." : "Ausschluss hinzufügen"}</button>
          </form>
        </details>
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
        {/* Ohne diesen Satz sucht eine Admin die Knoepfe, die es fuer sie nicht
            gibt, und haelt es fuer einen Fehler. */}
        {!canDraw && <p className="quota-note">Ziehen, neu ziehen und zurücknehmen sind Superadmins vorbehalten. Preise, Ausschlussliste und der Stand stehen dir offen.</p>}

        <div className="admin-links">
          <a className="button button-secondary" href="/api/admin/lottery/export">Gewinnliste als CSV exportieren</a>
          {canDraw && mainPrizes.length > 0 && <Link className="button button-secondary" href="/tombola">Bühnenziehung öffnen</Link>}
          {canDraw && openSmall.length > 0 && (
            <button className="button button-primary" type="button" disabled={busy !== ""} onClick={() => void drawAllSmall()}>
              {busy === "draw-all" ? "Zieht ..." : `Für alle ${openSmall.length} kleinen Preise ziehen`}
            </button>
          )}
        </div>

        {prizes.length === 0 && !isLoading && <p className="queue-empty">Ohne Preise gibt es nichts zu ziehen. Trage oben einen ein.</p>}

        {(counts?.winners ?? 0) > 0 && (
          <div className="winner-filter">
            <label>Gezogene suchen<input type="search" value={filter} placeholder="Name oder E-Mail-Adresse" onChange={(event) => setFilter(event.target.value)} /></label>
            {needle && <p className="quota-note" role="status">{matches === 1 ? "Ein Treffer" : `${matches} Treffer`} für „{filter.trim()}“.</p>}
          </div>
        )}

        {needle && matches === 0 && <p className="queue-empty">Niemand mit „{filter.trim()}“ wurde gezogen.</p>}

        {shown.map((prize) => (
          <section className="lottery-prize" key={prize.id}>
            <div className="admin-card-head">
              <h4>{prize.title}</h4>
              <span className="section-index">
                {prize.isMain ? "Hauptpreis · " : ""}
                {prize.winners.length} von {prize.quantity} vergeben
              </span>
            </div>
            {prize.winners.length > 0 && (
              /* Eingeklappt, solange niemand hinsieht - offen, sobald gefiltert
                 wird: Ein Treffer, den man erst aufklappen muss, ist keiner. */
              <details className="winner-list" open={Boolean(needle) || prize.winners.length <= 3}>
                <summary>{prize.winners.length === 1 ? "Eine gezogene Person" : `${prize.winners.length} gezogene Personen`}</summary>
                {prize.winners.map((winner) => (
                  <WinnerRow
                    key={winner.entryId}
                    winner={winner}
                    canDraw={canDraw}
                    isBusy={busy !== ""}
                    onRedraw={redraw}
                    onWithdraw={withdraw}
                  />
                ))}
              </details>
            )}
            {prize.open > 0 ? (
              canDraw ? (
                <button className="button button-secondary" type="button" disabled={busy !== ""} onClick={() => draw(prize)}>
                  {busy === `draw-${prize.id}` ? "Zieht ..." : prize.open === 1 ? "Ziehen" : `${prize.open} Personen ziehen`}
                </button>
              ) : (
                <p className="quota-note">{prize.open === 1 ? "Ein Exemplar noch offen." : `${prize.open} Exemplare noch offen.`}</p>
              )
            ) : (
              <p className="quota-note">Vollständig vergeben.</p>
            )}
            {canDraw && prize.isMain && prize.open > 0 && <p className="quota-note">Hauptpreis – gedacht für die Bühnenziehung, hier aber genauso ziehbar.</p>}
          </section>
        ))}
      </section>
    </div>
  );
}
