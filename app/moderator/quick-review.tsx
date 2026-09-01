"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryPictogram } from "@/components/category-pictogram";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import MetadataFields from "./metadata-fields";
import { claimNextRepair, decideRepair, releaseRepairClaim, saveRepairMetadata } from "./moderation-api";
import { draftFromRepair, missingImageNote, performedByLabel, type MetadataDraft, type ModerationRepair,
  originWarning,
} from "./repair-types";

const SWIPE_THRESHOLD = 90;

type Decision = "approved" | "rejected";
type Queue =
  | { state: "loading" }
  | { state: "ready"; repair: ModerationRepair }
  | { state: "empty"; skipped: number }
  | { state: "error"; message: string };

/**
 * Eine Karte samt Kommentar, Angaben und Wischgeste. Der Zustand haengt an der
 * Einreichung: Die Karte wird mit `key={repair.id}` neu aufgebaut, damit
 * Kommentar, Entwurf und Wischversatz beim Weiterblaettern zurueckfallen.
 */
function QuickCard({
  repair,
  isBusy,
  onDecide,
  onLater,
  onSaveMetadata,
}: {
  repair: ModerationRepair;
  isBusy: boolean;
  onDecide: (status: Decision, comment: string) => void;
  onLater: () => void;
  onSaveMetadata: (draft: MetadataDraft) => Promise<boolean>;
}) {
  const [comment, setComment] = useState("");
  const [draft, setDraft] = useState<MetadataDraft>(() => draftFromRepair(repair));
  const [isSaving, setIsSaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  // Tastatur statt Maus: Der Listener ruft nur Callbacks, deshalb entsteht kein
  // synchrones setState im Effektkoerper.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (isBusy) return;

      if (event.key === "ArrowRight" && repair.consent_publication) { event.preventDefault(); onDecide("approved", comment); }
      if (event.key === "ArrowLeft") { event.preventDefault(); onDecide("rejected", comment); }
      if (event.key === "ArrowDown") { event.preventDefault(); onLater(); }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [repair, comment, isBusy, onDecide, onLater]);

  function endDrag() {
    const offset = drag;
    startX.current = null;
    setDrag(0);
    if (isBusy) return;
    if (offset > SWIPE_THRESHOLD && repair.consent_publication) onDecide("approved", comment);
    if (offset < -SWIPE_THRESHOLD) onDecide("rejected", comment);
  }

  async function save() {
    setIsSaving(true);
    try {
      await onSaveMetadata(draft);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div
        className="quick-card"
        style={{ transform: `translateX(${drag}px) rotate(${drag / 40}deg)` }}
        onPointerDown={(event) => { startX.current = event.clientX; }}
        onPointerMove={(event) => { if (startX.current !== null) setDrag(event.clientX - startX.current); }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className={`quick-verdict is-approve${drag > SWIPE_THRESHOLD ? " is-active" : ""}`} aria-hidden="true">Freigeben</div>
        <div className={`quick-verdict is-reject${drag < -SWIPE_THRESHOLD ? " is-active" : ""}`} aria-hidden="true">Ablehnen</div>
        {repair.imageUrl
          // eslint-disable-next-line @next/next/no-img-element -- Signierte Storage-URL ohne feste Groesse.
          ? <img src={repair.imageUrl} alt="Eingereichtes Reparaturbild" draggable={false} />
          : <div className="missing-image">
              <CategoryPictogram category={repair.category} />
              <span>{missingImageNote(repair)}</span>
            </div>}
        <div className="quick-body">
          <p className="section-index">
            {repairCategoryLabel(repair.category)}
            {repair.origin?.kreis ? ` · ${repair.origin.kreis}` : repair.location_region ? ` · ${repair.location_region}` : ""}
            {/* Sollte hier nicht mehr auftauchen: `claim_next_repair()` gibt nur
                Einreichungen mit eindeutiger Herkunft aus. Der Hinweis bleibt
                als Anzeige stehen, falls Datenbank und Konsole je verschiedener
                Meinung sind - dann steht er auf der Karte, statt still
                durchzulaufen. */}
            {originWarning(repair) && <span className="status-chip is-pending">{originWarning(repair)}</span>}
          </p>
          <h3>{repair.brand_model || "Marke/Modell unbekannt"}</h3>
          {repair.story && <p className="quick-story">{repair.story}</p>}
          <dl>
            <div><dt>Durchgeführt</dt><dd>{performedByLabel(repair.performed_by)}</dd></div>
            <div><dt>Erfolg</dt><dd>{repair.repair_succeeded ? "Ja" : "Nein"}</dd></div>
            <div><dt>Veröffentlichung</dt><dd>{repair.consent_publication ? "Zugestimmt" : "Keine Zustimmung"}</dd></div>
          </dl>
        </div>
      </div>

      <details className="quick-panel">
        <summary>Angaben ändern</summary>
        <MetadataFields draft={draft} onChange={setDraft} />
        <button className="button button-secondary" type="button" disabled={isSaving} onClick={() => void save()}>
          {isSaving ? "Wird gespeichert" : "Angaben speichern"}
        </button>
      </details>

      <details className="quick-panel">
        <summary>Moderationskommentar{comment.trim() ? " · ausgefüllt" : ", optional"}</summary>
        <textarea value={comment} maxLength={1000} aria-label="Moderationskommentar" onChange={(event) => setComment(event.target.value)} />
      </details>

      {!repair.consent_publication && <p className="moderator-comment">Ohne Veröffentlichungszustimmung ist nur eine Ablehnung möglich.</p>}

      <div className="quick-actions">
        <button className="button button-secondary" type="button" disabled={isBusy} onClick={() => onDecide("rejected", comment)}>Ablehnen</button>
        <button className="button button-secondary" type="button" disabled={isBusy} onClick={onLater}>Später</button>
        <button className="button button-primary" type="button" disabled={isBusy || !repair.consent_publication} onClick={() => onDecide("approved", comment)}>Freigeben</button>
      </div>
    </>
  );
}

/**
 * Schnellpruefung: eine Einreichung pro Karte, Entscheidung per Klick oder
 * Wischgeste.
 *
 * Geladen wird genau die Karte, die gerade dran ist - nicht die ganze
 * Warteschlange auf Vorrat. Der Server haelt die Einreichung fuer diese Sitzung
 * fest, damit nicht zwei Moderator*innen dieselbe Karte bearbeiten (Issue #38).
 * Fuer Moderator*innen bleibt die Laenge der Warteschlange unsichtbar (Issue
 * #10) - sichtbar ist nur die naechste Karte.
 *
 * Einreichungen mit unklarer Herkunft kommen hier gar nicht an: Ueber die
 * entscheidet man in der Tabelle, wo Karte, Quelle und Verbindung nebeneinander
 * stehen. Ausgewaehlt wird das in `claim_next_repair()`. Deshalb darf der
 * Leerlauf hier nicht "nichts mehr offen" behaupten - in der Tabelle kann noch
 * einiges liegen.
 */
export default function QuickReview({ showProgress, onOpenTable }: { showProgress: boolean; onOpenTable: () => void }) {
  const [queue, setQueue] = useState<Queue>({ state: "loading" });
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // Zurueckgestellte Einreichungen ueberspringt der Server, solange diese
  // Sitzung laeuft. Ein Ref, weil die Liste kein Rendern ausloesen muss.
  const skipped = useRef<string[]>([]);
  const held = useRef<string | null>(null);

  const loadNext = useCallback(async () => {
    const result = await claimNextRepair(skipped.current);

    if (!result.ok) {
      held.current = null;
      setQueue({ state: "error", message: result.error });
      return;
    }

    held.current = result.data.repair?.id ?? null;
    setRemaining(result.data.remaining);
    setQueue(result.data.repair ? { state: "ready", repair: result.data.repair } : { state: "empty", skipped: skipped.current.length });
  }, []);

  useEffect(() => { void loadNext(); }, [loadNext]);

  // Beim Verlassen der Schnellpruefung faellt der Anspruch sofort zurueck,
  // statt bis zum Ablauf der Frist zu blockieren.
  useEffect(() => {
    function release() {
      if (held.current) {
        releaseRepairClaim(held.current);
        held.current = null;
      }
    }

    window.addEventListener("pagehide", release);
    return () => { window.removeEventListener("pagehide", release); release(); };
  }, []);

  const decide = useCallback(async (status: Decision, comment: string) => {
    const current = held.current;
    if (!current) return;

    setIsBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await decideRepair(current, status, comment);

      if (!result.ok && !result.conflict) {
        setError(result.error);
        return;
      }

      held.current = null;
      setNotice(result.ok
        ? (status === "approved" ? "Freigegeben." : "Abgelehnt.")
        : result.error);
      if (result.ok && result.data.imageDeleted === false) {
        setError("Die Einreichung wurde abgelehnt, aber das Bild muss noch manuell gelöscht werden.");
      }

      setQueue({ state: "loading" });
      await loadNext();
    } finally {
      setIsBusy(false);
    }
  }, [loadNext]);

  const later = useCallback(async () => {
    const current = held.current;
    if (!current) return;

    setIsBusy(true);
    setNotice("");
    setError("");

    try {
      skipped.current = [...skipped.current, current].slice(-100);
      releaseRepairClaim(current);
      held.current = null;
      setQueue({ state: "loading" });
      await loadNext();
    } finally {
      setIsBusy(false);
    }
  }, [loadNext]);

  // Sonst waeren zurueckgestellte Einreichungen bis zum Neuladen der Seite weg.
  const showPostponed = useCallback(async () => {
    skipped.current = [];
    setQueue({ state: "loading" });
    await loadNext();
  }, [loadNext]);

  const saveMetadata = useCallback(async (draft: MetadataDraft) => {
    const current = held.current;
    if (!current) return false;

    setError("");
    const result = await saveRepairMetadata(current, draft);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    setNotice("Angaben gespeichert.");
    return true;
  }, []);

  return (
    <div className="quick-review">
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {queue.state === "loading" && <p className="queue-empty">Nächste Einreichung wird geholt.</p>}
      {queue.state === "error" && <p className="queue-empty">{queue.message}</p>}
      {queue.state === "empty" && (
        <>
          <p className="queue-empty">
            {queue.skipped
              ? "Außer den zurückgestellten ist hier nichts mehr zu entscheiden."
              : "Hier ist nichts mehr zu entscheiden. Danke für die Moderation."}
          </p>
          {queue.skipped > 0 && (
            <button className="button button-secondary" type="button" onClick={() => void showPostponed()}>Zurückgestellte noch einmal zeigen</button>
          )}
          <p className="queue-empty">
            Einreichungen, bei denen die Herkunft unklar ist, stehen nicht in der Schnellprüfung –
            über die entscheidest du in der Tabelle, wo Karte, Quelle und Verbindung zu sehen sind.
          </p>
          <button className="button button-secondary" type="button" onClick={onOpenTable}>In der Tabelle nachsehen</button>
        </>
      )}

      {queue.state === "ready" && (
        <QuickCard
          key={queue.repair.id}
          repair={queue.repair}
          isBusy={isBusy}
          onDecide={(status, comment) => void decide(status, comment)}
          onLater={() => void later()}
          onSaveMetadata={saveMetadata}
        />
      )}

      <p className="quick-hint">
        Pfeil rechts gibt frei, Pfeil links lehnt ab, Pfeil runter stellt zurück. Wischen geht auch.
        {showProgress && remaining !== null ? ` Noch ${remaining} in dieser Warteschlange.` : ""}
      </p>
    </div>
  );
}
