"use client";

import { useEffect, useRef, useState } from "react";
import { repairCategoryLabel } from "@/lib/repair-catalog";
import { performedByLabel, type ModerationRepair } from "./repair-types";

const SWIPE_THRESHOLD = 90;

type DecideHandler = (repairId: string, status: "approved" | "rejected", comment: string) => Promise<void>;

/**
 * Eine Karte samt Kommentar und Wischgeste. Der Zustand haengt an der
 * Einreichung: Die Karte wird mit `key={repair.id}` neu aufgebaut, damit
 * Kommentar und Wischversatz beim Weiterblaettern zurueckfallen.
 */
function QuickCard({ repair, isBusy, onDecide, onLater, canPostpone }: { repair: ModerationRepair; isBusy: boolean; onDecide: DecideHandler; onLater: () => void; canPostpone: boolean }) {
  const [comment, setComment] = useState("");
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  // Tastatur statt Maus: Der Listener ruft nur Callbacks, deshalb entsteht kein
  // synchrones setState im Effektkoerper.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (isBusy) return;

      if (event.key === "ArrowRight" && repair.consent_publication) { event.preventDefault(); void onDecide(repair.id, "approved", comment); }
      if (event.key === "ArrowLeft") { event.preventDefault(); void onDecide(repair.id, "rejected", comment); }
      if (event.key === "ArrowDown" && canPostpone) { event.preventDefault(); onLater(); }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [repair, comment, isBusy, canPostpone, onDecide, onLater]);

  function endDrag() {
    const offset = drag;
    startX.current = null;
    setDrag(0);
    if (isBusy) return;
    if (offset > SWIPE_THRESHOLD && repair.consent_publication) void onDecide(repair.id, "approved", comment);
    if (offset < -SWIPE_THRESHOLD) void onDecide(repair.id, "rejected", comment);
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
          : <div className="missing-image">Kein Bild eingereicht</div>}
        <div className="quick-body">
          <p className="section-index">{repairCategoryLabel(repair.category)}{repair.location_region ? ` · ${repair.location_region}` : ""}</p>
          <h3>{repair.brand_model || "Marke/Modell unbekannt"}</h3>
          {repair.story && <p className="quick-story">{repair.story}</p>}
          <dl>
            <div><dt>Durchgeführt</dt><dd>{performedByLabel(repair.performed_by)}</dd></div>
            <div><dt>Erfolg</dt><dd>{repair.repair_succeeded ? "Ja" : "Nein"}</dd></div>
            <div><dt>Veroeffentlichung</dt><dd>{repair.consent_publication ? "Zugestimmt" : "Keine Zustimmung"}</dd></div>
          </dl>
        </div>
      </div>
      <label className="comment-label">Moderationskommentar, optional<textarea value={comment} maxLength={1000} onChange={(event) => setComment(event.target.value)} /></label>
      <div className="quick-actions">
        <button className="button button-secondary" type="button" disabled={isBusy} onClick={() => void onDecide(repair.id, "rejected", comment)}>Ablehnen</button>
        <button className="button button-secondary" type="button" disabled={!canPostpone} onClick={onLater}>Später</button>
        <button className="button button-primary" type="button" disabled={isBusy || !repair.consent_publication} onClick={() => void onDecide(repair.id, "approved", comment)}>Freigeben</button>
      </div>
      {!repair.consent_publication && <p className="moderator-comment">Ohne Veroeffentlichungszustimmung ist nur eine Ablehnung moeglich.</p>}
    </>
  );
}

/**
 * Schnellpruefung: eine Einreichung pro Karte, Entscheidung per Klick oder
 * Wischgeste. Fuer Moderator*innen bleibt die Laenge der Warteschlange bewusst
 * unsichtbar (Issue #10) - sichtbar ist nur die naechste Karte.
 */
export default function QuickReview({
  repairs,
  showProgress,
  isBusy,
  onDecide,
}: {
  repairs: ModerationRepair[];
  showProgress: boolean;
  isBusy: boolean;
  onDecide: DecideHandler;
}) {
  const [cursor, setCursor] = useState(0);
  // Entschiedene Karten fallen aus der Liste; der Zeiger wird deshalb bei jedem
  // Render an die aktuelle Laenge angelegt statt in einem Effekt korrigiert.
  const index = Math.min(cursor, Math.max(repairs.length - 1, 0));
  const repair = repairs[index] as ModerationRepair | undefined;

  if (!repair) {
    return <p className="queue-empty">Keine offenen Einreichungen. Danke fuer die Moderation.</p>;
  }

  return (
    <div className="quick-review">
      <QuickCard
        key={repair.id}
        repair={repair}
        isBusy={isBusy}
        onDecide={onDecide}
        canPostpone={index < repairs.length - 1}
        onLater={() => setCursor(index + 1)}
      />
      <p className="quick-hint">
        Pfeil rechts gibt frei, Pfeil links lehnt ab, Pfeil runter legt zurueck. Wischen geht auch.
        {showProgress ? ` Karte ${index + 1} von ${repairs.length}.` : ""}
      </p>
    </div>
  );
}
